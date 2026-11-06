import type { CellKind, DagGraphState, GraphNode, Highlight } from '../engine/types';
import { cellTokens } from '../styles/tokens';

export interface DagGraphProps {
  state: DagGraphState;
  highlights: Highlight[];
  className?: string;
}

const VIEW_W = 600;
const VIEW_H = 380;

const NODE_STROKE: Record<CellKind, string> = {
  active: 'rgb(var(--brand))',
  dependency: 'rgb(var(--warn))',
  result: 'rgb(var(--good))',
  base: 'rgb(var(--ink) / 0.35)',
  path: 'rgb(var(--accent))',
  pruned: 'rgb(var(--bad))',
};

const NODE_FILL: Record<CellKind, string> = {
  active: 'rgb(var(--brand) / 0.15)',
  dependency: 'rgb(var(--warn) / 0.10)',
  result: 'rgb(var(--good) / 0.15)',
  base: 'rgb(var(--line) / 0.4)',
  path: 'rgb(var(--accent) / 0.10)',
  pruned: 'rgb(var(--bad) / 0.05)',
};

const EDGE_COLOR: Record<CellKind, string> = {
  active: 'rgb(var(--brand))',
  dependency: 'rgb(var(--warn))',
  result: 'rgb(var(--good))',
  base: 'rgb(var(--ink))',
  path: 'rgb(var(--accent))',
  pruned: 'rgb(var(--bad))',
};

function winningHighlights(highlights: Highlight[], length: number): Map<number, Highlight> {
  const winners = new Map<number, Highlight>();
  for (const highlight of highlights) {
    const [index] = highlight.pos;
    if (highlight.pos.length === 1 && index !== undefined && index >= 0 && index < length) {
      winners.set(index, highlight);
    }
  }
  return winners;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function nodeCenter(node: GraphNode): { cx: number; cy: number } {
  return { cx: clamp01(node.x) * VIEW_W, cy: clamp01(node.y) * VIEW_H };
}

function nodeSize(node: GraphNode): { w: number; h: number } {
  const w = Math.max(64, Math.min(150, node.label.length * 9 + 24));
  const h = node.detail ? 56 : 42;
  return { w, h };
}

function markerVariant(kind: CellKind | undefined): CellKind | 'default' {
  return kind ?? 'default';
}

export function DagGraph({ state, highlights, className = '' }: DagGraphProps) {
  const directed = state.directed ?? true;
  const nodeHighlights = winningHighlights(highlights, state.nodes.length);
  const edgeHighlights = winningHighlights(highlights, state.edges.length);
  const byId = new Map(state.nodes.map((node) => [node.id, node]));

  const markers: { variant: 'default' | CellKind; color: string }[] = [
    { variant: 'default', color: 'rgb(var(--muted))' },
    { variant: 'active', color: EDGE_COLOR.active },
    { variant: 'dependency', color: EDGE_COLOR.dependency },
    { variant: 'result', color: EDGE_COLOR.result },
    { variant: 'base', color: EDGE_COLOR.base },
    { variant: 'path', color: EDGE_COLOR.path },
    { variant: 'pruned', color: EDGE_COLOR.pruned },
  ];

  return (
    <figure className={`m-0 flex w-full flex-col gap-2 ${className}`.trim()} aria-label={state.caption ?? 'DAG graph'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {state.caption ? (
          <figcaption className="text-sm font-bold text-ink">{state.caption}</figcaption>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-1.5">
          <span className="chip">Nodes {state.nodes.length}</span>
          <span className="chip">Edges {state.edges.length}</span>
          <span className="chip">{directed ? 'Directed' : 'Undirected'}</span>
        </div>
      </div>

      {state.nodes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          The graph is empty.
        </p>
      ) : (
        <div
          className="max-w-full overflow-auto rounded-xl border border-line bg-canvas p-4"
          tabIndex={0}
          role="region"
          aria-label={state.caption ? `${state.caption} — scrollable graph` : 'Scrollable graph'}
        >
          <svg
            role="img"
            aria-label={state.caption ?? 'DAG graph'}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-auto w-full"
          >
            <title>{state.caption ?? 'DAG graph'}</title>
            <defs>
              {markers.map(({ variant, color }) => (
                <marker
                  key={variant}
                  id={`dag-arrow-${variant}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                </marker>
              ))}
            </defs>

            {state.edges.map((edge, index) => {
              const from = byId.get(edge.from);
              const to = byId.get(edge.to);
              if (!from || !to) return null;
              const highlight = edgeHighlights.get(index);
              const kind = highlight?.kind;
              const a = nodeCenter(from);
              const b = nodeCenter(to);
              const dx = b.cx - a.cx;
              const dy = b.cy - a.cy;
              const dist = Math.hypot(dx, dy) || 1;
              const inset = 30;
              const x1 = a.cx + (dx / dist) * inset;
              const y1 = a.cy + (dy / dist) * inset;
              const x2 = b.cx - (dx / dist) * inset;
              const y2 = b.cy - (dy / dist) * inset;
              const stroke = kind ? EDGE_COLOR[kind] : 'rgb(var(--muted))';
              const strokeWidth = kind === 'path' ? 3.5 : kind === 'dependency' ? 2.5 : kind ? 2.5 : 1.5;
              const strokeDasharray =
                kind === 'dependency'
                  ? '7 4'
                  : kind === 'pruned'
                    ? '3 3'
                    : edge.dashed
                      ? '5 4'
                      : undefined;
              const marker = markerVariant(kind);
              const edgeLabel = `Edge from ${from.label} to ${to.label}${edge.label ? `, ${edge.label}` : ''}${highlight ? `, ${cellTokens[highlight.kind].label}` : ''}${edge.dashed ? ', dashed' : ''}`;

              return (
                <g
                  key={`edge-${index}-${edge.from}-${edge.to}`}
                  role="group"
                  aria-label={edgeLabel}
                  data-edge-index={index}
                  data-edge-from={edge.from}
                  data-edge-to={edge.to}
                  data-edge-highlight={kind ?? 'none'}
                  data-edge-directed={directed ? 'true' : 'false'}
                >
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    opacity={kind === 'pruned' ? 0.7 : 1}
                    markerEnd={directed ? `url(#dag-arrow-${marker})` : undefined}
                    data-edge-line="true"
                    data-edge-dashed={edge.dashed ? 'true' : 'false'}
                  />
                  {edge.label ? (
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 4}
                      textAnchor="middle"
                      className="fill-ink"
                      fontSize="11"
                      fontWeight="600"
                      style={{ paintOrder: 'stroke', stroke: 'rgb(var(--canvas))', strokeWidth: 3 }}
                      data-edge-label="true"
                    >
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {state.nodes.map((node, index) => {
              const highlight = nodeHighlights.get(index);
              const token = highlight ? cellTokens[highlight.kind] : null;
              const { cx, cy } = nodeCenter(node);
              const { w, h } = nodeSize(node);
              const pruned = highlight?.kind === 'pruned';
              const ariaLabel = `${node.label}${node.detail ? `, ${node.detail}` : ''}${token ? `, ${token.label} ${token.symbol}` : ''}${highlight?.label ? `, ${highlight.label}` : ''}`;
              return (
                <g
                  key={`${node.id}-${index}`}
                  role="group"
                  aria-label={ariaLabel}
                  data-node-index={index}
                  data-node-id={node.id}
                  data-node-highlight={highlight?.kind ?? 'none'}
                >
                  <rect
                    x={cx - w / 2}
                    y={cy - h / 2}
                    width={w}
                    height={h}
                    rx="10"
                    stroke={highlight ? NODE_STROKE[highlight.kind] : 'rgb(var(--line))'}
                    strokeWidth={highlight ? 2.5 : 1.5}
                    strokeDasharray={highlight?.kind === 'dependency' || pruned ? '6 3' : undefined}
                    fill={highlight ? NODE_FILL[highlight.kind] : 'rgb(var(--surface))'}
                    opacity={pruned ? 0.75 : 1}
                  />
                  <text
                    x={cx}
                    y={cy - (node.detail ? 8 : token ? 4 : 4)}
                    textAnchor="middle"
                    className={pruned ? 'fill-muted' : 'fill-ink'}
                    fontSize="13"
                    fontWeight="700"
                    textDecoration={pruned ? 'line-through' : undefined}
                  >
                    {node.label}
                  </text>
                  {node.detail ? (
                    <text
                      x={cx}
                      y={cy + 8}
                      textAnchor="middle"
                      className="fill-muted"
                      fontSize="10"
                      textDecoration={pruned ? 'line-through' : undefined}
                    >
                      {node.detail}
                    </text>
                  ) : null}
                  {token ? (
                    <text
                      x={cx}
                      y={cy + (node.detail ? 22 : 16)}
                      textAnchor="middle"
                      className="fill-muted"
                      fontSize="8"
                      fontWeight="700"
                    >
                      {`${token.symbol} ${token.label}`}
                    </text>
                  ) : null}
                  {highlight?.label ? (
                    <text x={cx} y={cy + (node.detail ? 34 : token ? 28 : 22)} textAnchor="middle" className="fill-muted" fontSize="8">
                      {highlight.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <ul className="sr-only" aria-label={`${state.nodes.length} graph nodes`}>
        {state.nodes.map((node, index) => (
          <li
            key={`${node.id}-${index}`}
            role="listitem"
            aria-label={`${node.label}${node.detail ? `, ${node.detail}` : ''}`}
          >
            <span aria-hidden="true" />
          </li>
        ))}
      </ul>
    </figure>
  );
}
