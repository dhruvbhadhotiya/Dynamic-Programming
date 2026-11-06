import type { CellValue, Highlight, StringAlignState } from '../engine/types';
import { cellTokens } from '../styles/tokens';

interface StringAlignProps {
  state: StringAlignState;
  highlights: Highlight[];
  compact?: boolean;
}

function displayValue(value: CellValue): string {
  if (value === null || value === '') return '·';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function StringAlign({ state, highlights, compact = false }: StringAlignProps) {
  const active = new Map<string, Highlight>();
  for (const highlight of highlights) active.set(highlight.pos.join(','), highlight);
  const columns = ['ε', ...Array.from(state.b)];
  const rows = ['ε', ...Array.from(state.a)];
  const cellSize = compact ? 'h-8 min-w-8 px-1 text-xs' : 'h-10 min-w-10 px-2 text-sm';

  return (
    <div className="w-full">
      <div
        className="max-w-full overflow-x-auto rounded-xl border border-line bg-canvas p-2"
        tabIndex={0}
        role="region"
        aria-label="Sequence alignment table"
      >
        <table className="w-full border-separate border-spacing-1 text-center">
          <caption className="sr-only">
            DP alignment for sequences a = {state.a || 'empty'} and b = {state.b || 'empty'}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-1 text-xs font-semibold text-muted">
                a \ b
              </th>
              {columns.map((char, col) => (
                <th
                  key={`col-${col}`}
                  scope="col"
                  className="min-w-8 p-1 text-xs font-bold text-muted"
                  aria-label={col === 0 ? 'b[0] = empty' : `b[${col}] = ${char}`}
                >
                  {char}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rowChar, row) => (
              <tr key={`row-${row}`}>
                <th
                  scope="row"
                  className="min-w-8 p-1 text-xs font-bold text-muted"
                  aria-label={row === 0 ? 'a[0] = empty' : `a[${row}] = ${rowChar}`}
                >
                  {rowChar}
                </th>
                {columns.map((_, col) => {
                  const highlight = active.get(`${row},${col}`);
                  const token = highlight ? cellTokens[highlight.kind] : undefined;
                  const value = state.values[row]?.[col] ?? null;
                  return (
                    <td
                      key={`cell-${row}-${col}`}
                      className={`rounded-lg border text-center font-semibold tabular-nums ${
                        token ? token.classes : 'border-line bg-surface text-ink'
                      } ${cellSize}`}
                      title={highlight ? `${token?.label}${highlight.label ? `: ${highlight.label}` : ''}` : undefined}
                      aria-label={`a[${row}], b[${col}]: ${displayValue(value)}${
                        token ? `, ${token.label}` : ''
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {displayValue(value)}
                        {token ? (
                          <span role="img" aria-label={token.label} className="text-[0.7em]">
                            {token.symbol}
                          </span>
                        ) : null}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state.caption ? (
        <p className="mt-2 text-center text-xs font-medium text-muted">{state.caption}</p>
      ) : null}
    </div>
  );
}
