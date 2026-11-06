import type { CellKind, CellValue, Highlight, Table2DState } from '../engine/types';
import { cellTokens } from '../styles/tokens';

interface Table2DProps {
  state: Table2DState;
  highlights: Highlight[];
  compact?: boolean;
}

const RANK: Record<CellKind, number> = { active: 0, dependency: 1, result: 2, base: 3, path: 4, pruned: 5 };
const cellKey = (row: number, col: number) => `${row}:${col}`;

function arrowToward(fromRow: number, fromCol: number, toRow: number, toCol: number): string | null {
  const dr = Math.sign(toRow - fromRow);
  const dc = Math.sign(toCol - fromCol);
  if (dr === 0 && dc === 0) return null;
  if (dr < 0) return dc < 0 ? '↖' : dc > 0 ? '↗' : '↑';
  if (dr > 0) return dc < 0 ? '↙' : dc > 0 ? '↘' : '↓';
  return dc < 0 ? '←' : '→';
}

function analyse(highlights: Highlight[]) {
  const active = highlights.find((h) => h.kind === 'active' && h.pos.length >= 2);
  const activeRow = active?.pos[0];
  const activeCol = active?.pos[1];
  const cells = new Map<string, Highlight>();
  const arrows = new Map<string, string>();
  for (const highlight of highlights) {
    const row = highlight.pos[0];
    const col = highlight.pos[1];
    if (row === undefined || col === undefined || row < 0 || col < 0) continue;
    const at = cellKey(row, col);
    const current = cells.get(at);
    if (!current || RANK[highlight.kind] < RANK[current.kind]) cells.set(at, highlight);
    if (highlight.kind === 'dependency' && activeRow !== undefined && activeCol !== undefined) {
      const arrow = arrowToward(row, col, activeRow, activeCol);
      if (arrow) arrows.set(at, arrow);
    }
  }
  return { cells, arrows };
}

function ValueView({ value }: { value: CellValue }) {
  if (value === null) {
    return (
      <>
        <span aria-hidden className="text-muted">·</span>
        <span className="sr-only">empty value</span>
      </>
    );
  }
  if (typeof value === 'boolean') return <>{value ? 'Yes' : 'No'}</>;
  return <>{value}</>;
}

export function Table2D({ state, highlights, compact = false }: Table2DProps) {
  const columnCount = state.values.reduce((max, row) => Math.max(max, row.length), state.colLabels?.length ?? 0);
  const hasRowHeaders = Boolean(state.rowLabels?.length || state.rowHeader);
  const showHead = hasRowHeaders || Boolean(state.colLabels?.length || state.colHeader);
  const { cells, arrows } = analyse(highlights);
  const cellClass = compact ? 'px-1.5 py-1 text-xs' : 'px-3 py-2 text-sm';
  const headClass = `border border-line bg-line/30 font-bold text-muted ${
    compact ? 'px-1.5 py-1 text-[10px]' : 'px-3 py-2 text-xs uppercase tracking-wide'
  }`;

  return (
    <div className="w-full overflow-x-auto" role="region" aria-label="2D table, scrolls horizontally" tabIndex={0}>
      <table
        className="w-full min-w-max border-collapse text-left"
        aria-label={state.caption ? undefined : '2D dynamic programming table'}
      >
        {state.caption && (
          <caption className="caption-top pb-2 text-left text-sm font-semibold text-ink">{state.caption}</caption>
        )}
        {showHead && (
          <thead>
            {state.colHeader && (
              <tr>
                {hasRowHeaders && <th scope="col" className={headClass} />}
                <th scope="col" colSpan={columnCount} className={headClass}>{state.colHeader}</th>
              </tr>
            )}
            <tr>
              {hasRowHeaders && <th scope="col" className={headClass}>{state.rowHeader ?? ''}</th>}
              {Array.from({ length: columnCount }, (_, col) => (
                <th key={col} scope="col" className={headClass}>{state.colLabels?.[col] ?? col}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {state.values.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {hasRowHeaders && (
                <th scope="row" className={headClass}>{state.rowLabels?.[rowIndex] ?? rowIndex}</th>
              )}
              {Array.from({ length: columnCount }, (_, col) => {
                const highlight = cells.get(cellKey(rowIndex, col));
                const token = highlight ? cellTokens[highlight.kind] : null;
                const arrow = arrows.get(cellKey(rowIndex, col));
                return (
                  <td
                    key={col}
                    data-kind={highlight?.kind ?? 'empty'}
                    className={`border align-top ${cellClass} ${token ? token.classes : 'bg-surface'}`}
                  >
                    <div className="flex min-h-8 flex-col gap-1">
                      <span className="font-mono font-semibold"><ValueView value={row[col] ?? null} /></span>
                      {token && highlight && (
                        <span className="inline-flex w-fit items-center gap-1 text-[10px] font-bold leading-tight">
                          <span aria-hidden>{token.symbol}</span>
                          <span>{highlight.label ?? token.label}</span>
                        </span>
                      )}
                      {arrow && (
                        <span
                          role="img"
                          aria-label="Depends on this cell; arrow points toward the active cell"
                          className="w-fit text-base font-black leading-none"
                        >
                          {arrow}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
