import { memo, useMemo } from 'react';
import type { CellValue, Highlight, TreeDPNode, TreeDPState, TreeNodeKind } from '../engine/types';
import { cellTokens } from '../styles/tokens';

export interface TreeDPProps {
  state: TreeDPState;
  highlights: Highlight[];
  className?: string;
}

interface PlacedNode {
  node: TreeDPNode;
  index: number;
  depth: number;
  x: number;
}

const NODE_WIDTH = 176;
const NODE_HEIGHT = 124;
const X_STEP = 188;
const Y_STEP = 152;

const kindStyles: Record<TreeNodeKind, { classes: string; label: string; symbol: string }> = {
  pending: {
    classes: 'border-line border-dashed bg-surface text-muted',
    label: 'Waiting',
    symbol: '…',
  },
  active: {
    classes: `${cellTokens.active.classes} ${cellTokens.active.ring}`,
    label: 'Active',
    symbol: cellTokens.active.symbol,
  },
  base: {
    classes: `${cellTokens.base.classes} ${cellTokens.base.ring}`,
    label: 'Base case',
    symbol: cellTokens.base.symbol,
  },
  memo: {
    classes: 'border-double border-4 border-good bg-good/10 text-ink',
    label: 'Memo hit',
    symbol: '↺',
  },
  pruned: {
    classes: `${cellTokens.pruned.classes} ${cellTokens.pruned.ring}`,
    label: 'Pruned',
    symbol: cellTokens.pruned.symbol,
  },
  done: {
    classes: 'border-line bg-canvas text-ink',
    label: 'Done',
    symbol: '✓',
  },
};

function formatCellValue(value: CellValue): string {
  return value === null ? 'null' : String(value);
}

function valuesText(node: TreeDPNode): string {
  const entries = node.values ? Object.entries(node.values) : [];
  return entries.map(([key, value]) => `${key}: ${formatCellValue(value)}`).join(', ');
}

function layoutTree(nodes: TreeDPNode[]): { placed: PlacedNode[]; maxDepth: number; maxX: number } {
  const byId = new Map<string, { node: TreeDPNode; index: number }>();
  nodes.forEach((node, index) => {
    if (!byId.has(node.id)) byId.set(node.id, { node, index });
  });

  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId) && node.parentId !== node.id) {
      const list = children.get(node.parentId) ?? [];
      list.push(node.id);
      children.set(node.parentId, list);
    }
  }

  const placed: PlacedNode[] = [];
  const seen = new Set<string>();
  let cursor = 0;

  const visit = (id: string, depth: number): number | null => {
    if (seen.has(id)) return null;
    const entry = byId.get(id);
    if (!entry) return null;
    seen.add(id);
    const childXs = (children.get(id) ?? [])
      .map((childId) => visit(childId, depth + 1))
      .filter((x): x is number => x !== null);
    const x = childXs.length === 0 ? cursor++ : childXs.reduce((total, value) => total + value, 0) / childXs.length;
    placed.push({ node: entry.node, index: entry.index, depth, x });
    return x;
  };

  for (const node of nodes) {
    if (!node.parentId || !byId.has(node.parentId)) visit(node.id, 0);
  }
  for (const node of nodes) {
    if (!seen.has(node.id)) visit(node.id, 0);
  }

  return {
    placed: placed.sort((a, b) => a.depth - b.depth || a.x - b.x),
    maxDepth: placed.reduce((max, item) => Math.max(max, item.depth), 0),
    maxX: placed.reduce((max, item) => Math.max(max, item.x), 0),
  };
}

function TreeDPView({ state, highlights, className = '' }: TreeDPProps) {
  const { placed, maxDepth, maxX, byId, highlightAt, summaries, withState } = useMemo(() => {
    const { placed: placedNodes, maxDepth: depth, maxX: x } = layoutTree(state.nodes);
    const idMap = new Map<string, PlacedNode>();
    for (const item of placedNodes) idMap.set(item.node.id, item);

    const highlightMap = new Map<number, Highlight>();
    for (const highlight of highlights) {
      const [index] = highlight.pos;
      if (highlight.pos.length === 1 && index !== undefined && index >= 0 && index < state.nodes.length) {
        highlightMap.set(index, highlight);
      }
    }

    return {
      placed: placedNodes,
      maxDepth: depth,
      maxX: x,
      byId: idMap,
      highlightAt: highlightMap,
      summaries: state.nodes.map((node) => valuesText(node)),
      withState: state.nodes.filter((node) => node.values && Object.keys(node.values).length > 0).length,
    };
  }, [state.nodes, highlights]);

  const width = Math.max(1, maxX + 1) * X_STEP - (X_STEP - NODE_WIDTH);
  const height = maxDepth * Y_STEP + NODE_HEIGHT;

  return (
    <figure className={`m-0 flex w-full flex-col gap-2 ${className}`.trim()} aria-label={state.caption ?? 'Tree DP'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {state.caption ? <figcaption className="text-sm font-bold text-ink">{state.caption}</figcaption> : <span />}
        <div className="flex flex-wrap gap-1.5">
          <span className="chip">Nodes {state.nodes.length}</span>
          {withState > 0 ? <span className="chip">{withState} with state</span> : null}
        </div>
      </div>

      {placed.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          The tree DP visualization is empty.
        </p>
      ) : (
        <div
          className="max-w-full overflow-auto rounded-xl border border-line bg-canvas p-4"
          tabIndex={0}
          role="region"
          aria-label="Scrollable tree DP"
        >
          <div
            role="tree"
            aria-label={state.caption ?? 'Tree DP'}
            className="relative"
            style={{ width, height: Math.max(height, NODE_HEIGHT) }}
          >
            <svg aria-hidden="true" className="absolute inset-0 overflow-visible" width={width} height={height}>
              {placed.map((child) => {
                if (!child.node.parentId) return null;
                const parent = byId.get(child.node.parentId);
                if (!parent) return null;
                return (
                  <line
                    key={`edge-${child.node.id}-${child.index}`}
                    x1={parent.x * X_STEP + NODE_WIDTH / 2}
                    y1={parent.depth * Y_STEP + NODE_HEIGHT}
                    x2={child.x * X_STEP + NODE_WIDTH / 2}
                    y2={child.depth * Y_STEP}
                    stroke="rgb(var(--line))"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {placed.map(({ node, index, depth, x }) => {
              const highlight = highlightAt.get(index);
              const kind = node.kind ?? 'pending';
              const style = kindStyles[kind];
              const token = highlight ? cellTokens[highlight.kind] : null;
              const classes = token ? `${token.classes} ${token.ring}` : style.classes;
              const values = node.values ? Object.entries(node.values) : [];
              const summary = summaries[index] ?? '';
              const label = `${node.label}${node.detail ? `, ${node.detail}` : ''}, ${style.label}${summary ? `, ${summary}` : ''}${highlight ? `, ${token?.label ?? ''}${highlight.label ? `, ${highlight.label}` : ''}` : ''}, level ${depth + 1}`;

              return (
                <div
                  key={`${node.id}-${index}`}
                  role="treeitem"
                  aria-level={depth + 1}
                  aria-label={label}
                  aria-current={highlight?.kind === 'active' ? 'step' : undefined}
                  data-node-kind={kind}
                  data-node-index={index}
                  data-node-highlight={highlight?.kind ?? 'none'}
                  className={`absolute flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-2 py-1.5 text-center ${classes}`}
                  style={{ left: x * X_STEP, top: depth * Y_STEP, width: NODE_WIDTH, height: NODE_HEIGHT }}
                  title={node.detail}
                >
                  <span className="w-full truncate font-mono text-sm font-bold">{node.label}</span>
                  {node.detail ? <span className="w-full truncate text-[10px] text-muted">{node.detail}</span> : null}
                  <span className="mt-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide">
                    <span aria-hidden>{style.symbol}</span>
                    <span>{style.label}</span>
                  </span>
                  {values.length > 0 ? (
                    <span className="mt-1 flex max-h-10 flex-wrap items-center justify-center gap-1 overflow-hidden">
                      {values.map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-full border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink"
                        >
                          {`${key}: ${formatCellValue(value)}`}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  {token ? (
                    <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
                      {`${token.symbol} ${token.label}`}
                    </span>
                  ) : null}
                  {highlight?.label ? (
                    <span className="w-full truncate text-[9px] font-medium normal-case text-muted">{highlight.label}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ul className="sr-only" aria-label={`${state.nodes.length} tree DP nodes`}>
        {state.nodes.map((node, index) => {
          const kind = node.kind ?? 'pending';
          const summary = summaries[index] ?? '';
          return (
            <li key={`${node.id}-${index}`}>
              {`${node.label}${node.detail ? `, ${node.detail}` : ''}, ${kindStyles[kind].label}${summary ? `, ${summary}` : ''}`}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

export const TreeDP = memo(TreeDPView);
