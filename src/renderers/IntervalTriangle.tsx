import { memo, useMemo } from 'react';
import type { CellKind, CellValue, Highlight, IntervalTriangleState } from '../engine/types';
import { cellTokens } from '../styles/tokens';

interface IntervalTriangleProps {
  state: IntervalTriangleState;
  highlights: Highlight[];
  compact?: boolean;
}

const RANK: Record<CellKind, number> = { active: 0, dependency: 1, result: 2, base: 3, path: 4, pruned: 5 };
const cellKey = (start: number, end: number) => `${start}:${end}`;

function winningHighlights(highlights: Highlight[], size: number): Map<string, Highlight> {
  const winners = new Map<string, Highlight>();
  for (const highlight of highlights) {
    if (highlight.pos.length < 2) continue;
    const start = highlight.pos[0] ?? -1;
    const end = highlight.pos[1] ?? -1;
    if (start < 0 || end < 0 || start >= size || end >= size || start > end) continue;
    const at = cellKey(start, end);
    const current = winners.get(at);
    if (!current || RANK[highlight.kind] < RANK[current.kind]) winners.set(at, highlight);
  }
  return winners;
}

const ValueView = memo(function ValueView({ value }: { value: CellValue }) {
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
});

function IntervalTriangleView({ state, highlights, compact = false }: IntervalTriangleProps) {
  const { values, rowLabels, colLabels, caption } = state;
  const size = Math.max(
    values.length,
    rowLabels?.length ?? 0,
    colLabels?.length ?? 0,
    values.reduce((max, row) => Math.max(max, row?.length ?? 0), 0),
  );
  const winners = useMemo(() => winningHighlights(highlights, size), [highlights, size]);
  const cellClass = compact ? 'px-1.5 py-1 text-xs' : 'px-3 py-2 text-sm';
  const headClass = `border border-line bg-line/30 font-bold text-muted ${
    compact ? 'px-1.5 py-1 text-[10px]' : 'px-3 py-2 text-xs uppercase tracking-wide'
  }`;

  if (size === 0) {
    return (
      <div className="w-full" role="region" aria-label="Interval triangle" tabIndex={0}>
        {caption && <p className="pb-2 text-left text-sm font-semibold text-ink">{caption}</p>}
        <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">
          No interval data to display.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto" role="region" aria-label="Interval triangle, scrolls horizontally" tabIndex={0}>
      <table
        className="w-full min-w-max border-collapse text-left"
        aria-label={caption ? undefined : 'Interval DP triangle (start \\ end)'}
      >
        {caption && (
          <caption className="caption-top pb-2 text-left text-sm font-semibold text-ink">{caption}</caption>
        )}
        <thead>
          <tr>
            <th scope="col" className={headClass}>{'start \\ end'}</th>
            {Array.from({ length: size }, (_, end) => (
              <th key={end} scope="col" className={headClass}>{colLabels?.[end] ?? end}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: size }, (_, start) => (
            <tr key={start}>
              <th scope="row" className={headClass}>{rowLabels?.[start] ?? start}</th>
              {Array.from({ length: size }, (_, end) => {
                if (end < start) {
                  return <td key={end} aria-hidden="true" className="border border-line bg-canvas" />;
                }
                const highlight = winners.get(cellKey(start, end));
                const token = highlight ? cellTokens[highlight.kind] : null;
                const value = values[start]?.[end] ?? null;
                return (
                  <td
                    key={end}
                    data-interval={cellKey(start, end)}
                    data-start={start}
                    data-end={end}
                    data-kind={highlight?.kind ?? 'empty'}
                    className={`border align-top ${cellClass} ${token ? token.classes : 'bg-surface'}`}
                  >
                    <div className="flex min-h-8 flex-col gap-1">
                      <span className="font-mono font-semibold"><ValueView value={value} /></span>
                      {token && highlight && (
                        <>
                          <span className="inline-flex w-fit items-center gap-1 text-[10px] font-bold leading-tight">
                            <span aria-hidden>{token.symbol}</span>
                            <span>{token.label}</span>
                          </span>
                          {highlight.label && (
                            <span className="text-[10px] font-medium text-muted">{highlight.label}</span>
                          )}
                        </>
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

export const IntervalTriangle = memo(IntervalTriangleView);
