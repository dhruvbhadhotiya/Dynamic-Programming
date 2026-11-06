import type { Highlight, RecursionTreeState, TreeNode, TreeNodeKind } from '../engine/types';
import { cellTokens } from '../styles/tokens';

interface RecursionTreeProps {
  state: RecursionTreeState;
  highlights: Highlight[];
}

interface PlacedNode {
  node: TreeNode;
  index: number;
  depth: number;
  x: number;
}

const NODE_WIDTH = 112;
const NODE_HEIGHT = 76;
const X_STEP = 124;
const Y_STEP = 106;

const treeStyles: Record<TreeNodeKind, { classes: string; label: string; symbol: string }> = {
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

function layoutTree(nodes: TreeNode[]): { placed: PlacedNode[]; maxDepth: number; maxX: number } {
  const byId = new Map<string, { node: TreeNode; index: number }>();
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

export function RecursionTree({ state, highlights }: RecursionTreeProps) {
  const { placed, maxDepth, maxX } = layoutTree(state.nodes);
  const byIndex = new Map<number, PlacedNode>();
  const byId = new Map<string, PlacedNode>();
  for (const item of placed) {
    byIndex.set(item.index, item);
    byId.set(item.node.id, item);
  }

  const highlightAt = new Map<number, Highlight>();
  for (const highlight of highlights) {
    const index = highlight.pos[0];
    if (index !== undefined) highlightAt.set(index, highlight);
  }

  const focusPath = new Set<string>();
  for (const [index, highlight] of highlightAt) {
    if (highlight.kind !== 'active') continue;
    let current = byIndex.get(index);
    while (current && !focusPath.has(current.node.id)) {
      focusPath.add(current.node.id);
      current = current.node.parentId ? byId.get(current.node.parentId) : undefined;
    }
  }

  const width = Math.max(1, maxX + 1) * X_STEP - (X_STEP - NODE_WIDTH);
  const height = maxDepth * Y_STEP + NODE_HEIGHT;
  const memoCount = state.memoHits ?? state.nodes.filter((node) => node.kind === 'memo').length;

  return (
    <figure className="m-0 flex w-full flex-col gap-2" aria-label={state.caption ?? 'Recursion tree'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {state.caption ? <figcaption className="text-sm font-bold text-ink">{state.caption}</figcaption> : <span />}
        <div className="flex flex-wrap gap-1.5">
          <span className="chip">Nodes {state.nodes.length}</span>
          {memoCount > 0 ? (
            <span className="chip border-good/60 text-good">
              <span aria-hidden>↺</span> {memoCount} memo hits
            </span>
          ) : null}
        </div>
      </div>

      {placed.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          The recursion tree is empty.
        </p>
      ) : (
        <div
          className="max-w-full overflow-auto rounded-xl border border-line bg-canvas p-4"
          tabIndex={0}
          role="region"
          aria-label="Scrollable recursion tree"
        >
          <div
            role="tree"
            aria-label={state.caption ?? 'Recursion tree'}
            className="relative"
            style={{ width, height: Math.max(height, NODE_HEIGHT) }}
          >
            <svg aria-hidden="true" className="absolute inset-0 overflow-visible" width={width} height={height}>
              {placed.map((child) => {
                if (!child.node.parentId) return null;
                const parent = byId.get(child.node.parentId);
                if (!parent) return null;
                const focused = focusPath.has(parent.node.id) && focusPath.has(child.node.id);
                const dimmed = focusPath.size > 0 && !focused;
                return (
                  <line
                    key={`edge-${child.node.id}`}
                    x1={parent.x * X_STEP + NODE_WIDTH / 2}
                    y1={parent.depth * Y_STEP + NODE_HEIGHT}
                    x2={child.x * X_STEP + NODE_WIDTH / 2}
                    y2={child.depth * Y_STEP}
                    stroke={focused ? 'rgb(var(--brand))' : 'rgb(var(--line))'}
                    strokeWidth={focused ? 2.5 : 1.5}
                    strokeLinecap="round"
                    opacity={dimmed ? 0.3 : 1}
                  />
                );
              })}
            </svg>

            {placed.map(({ node, index, depth, x }) => {
              const highlight = highlightAt.get(index);
              const kind = node.kind ?? 'pending';
              const style = treeStyles[kind];
              const token = highlight ? cellTokens[highlight.kind] : null;
              const isMemo = kind === 'memo';
              const isActive = kind === 'active' || highlight?.kind === 'active';
              const statusLabel = isMemo ? 'Memo hit' : token ? token.label : style.label;
              const statusSymbol = isMemo ? '↺' : token ? token.symbol : style.symbol;
              const classes = token ? `${token.classes} ${token.ring}` : style.classes;
              const inFocus = focusPath.size === 0 || focusPath.has(node.id);
              const dimmed = focusPath.size > 0 && !inFocus;
              const label = `${node.label}${node.detail ? `, ${node.detail}` : ''}, ${statusLabel}, level ${depth + 1}`;

              return (
                <div
                  key={`${node.id}-${index}`}
                  role="treeitem"
                  aria-level={depth + 1}
                  aria-label={label}
                  aria-current={isActive ? 'step' : undefined}
                  data-focus-path={inFocus ? 'true' : 'false'}
                  data-node-kind={kind}
                  className={`absolute flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-2 py-1.5 text-center transition-opacity ${classes} ${
                    dimmed ? 'opacity-40' : ''
                  } ${isMemo ? 'border-double' : ''}`}
                  style={{ left: x * X_STEP, top: depth * Y_STEP, width: NODE_WIDTH, height: NODE_HEIGHT }}
                  title={node.detail}
                >
                  <span className="w-full truncate font-mono text-sm font-bold">{node.label}</span>
                  {node.detail ? <span className="w-full truncate text-[10px] text-muted">{node.detail}</span> : null}
                  <span className="mt-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide">
                    <span aria-hidden>{statusSymbol}</span>
                    <span>{statusLabel}</span>
                  </span>
                  {highlight?.label ? (
                    <span className="w-full truncate text-[9px] font-medium normal-case text-muted">{highlight.label}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </figure>
  );
}
