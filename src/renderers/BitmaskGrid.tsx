import type { BitmaskGridState, CellValue, Highlight } from '../engine/types';
import { cellTokens } from '../styles/tokens';

export interface BitmaskGridProps {
  state: BitmaskGridState;
  highlights: Highlight[];
  className?: string;
}

/** Later highlights win, matching the animation's "current state" semantics. */
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

function valueText(value: CellValue | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function toBinary(mask: number, bits: number): string {
  return mask.toString(2).padStart(bits, '0');
}

export function BitmaskGrid({ state, highlights, className = '' }: BitmaskGridProps) {
  const { bits, values, labels, caption } = state;

  if (!Number.isInteger(bits) || bits < 1) {
    return (
      <figure className={`m-0 flex w-full flex-col gap-2 ${className}`.trim()} aria-label={caption ?? 'Bitmask DP grid'}>
        {caption && <figcaption className="text-sm font-bold text-ink">{caption}</figcaption>}
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Bitmask grid needs at least 1 bit. Got {bits}.
        </p>
      </figure>
    );
  }

  const total = 2 ** bits;
  const compact = bits >= 5;
  const winners = winningHighlights(highlights, total);
  const positions = Array.from({ length: bits }, (_, i) => bits - 1 - i);
  const cellPad = compact ? 'px-1.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const headPad = compact ? 'px-1.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs uppercase tracking-wide';

  return (
    <figure className={`m-0 flex w-full flex-col gap-2 ${className}`.trim()} aria-label={caption ?? 'Bitmask DP grid'}>
      {caption && <figcaption className="text-sm font-bold text-ink">{caption}</figcaption>}

      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Bit positions, left to right
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Bit positions, left to right">
          {positions.map((position) => (
            <li
              key={position}
              className="rounded-lg border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-ink"
            >
              bit {position} = {2 ** position}
            </li>
          ))}
        </ul>
      </div>

      <div
        role="region"
        tabIndex={0}
        aria-label={caption ? `${caption} — scrollable bitmask table` : 'Scrollable bitmask table'}
        className={`max-w-full overflow-auto rounded-xl border border-line ${compact ? 'max-h-72' : 'max-h-96'}`}
      >
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-canvas">
            <tr>
              <th scope="col" className={`border border-line bg-line/30 font-bold text-muted ${headPad}`}>
                Mask (binary)
              </th>
              <th scope="col" className={`border border-line bg-line/30 font-bold text-muted ${headPad}`}>
                Decimal
              </th>
              <th scope="col" className={`border border-line bg-line/30 font-bold text-muted ${headPad}`}>
                Value
              </th>
              <th scope="col" className={`border border-line bg-line/30 font-bold text-muted ${headPad}`}>
                Label
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: total }, (_, mask) => {
              const highlight = winners.get(mask);
              const token = highlight ? cellTokens[highlight.kind] : undefined;
              const text = valueText(values[mask]);
              const label = labels?.[mask];
              const binary = toBinary(mask, bits);
              return (
                <tr key={mask} data-mask={mask} data-highlight={highlight?.kind ?? 'none'}>
                  <th scope="row" className={`border border-line font-mono font-bold text-ink ${cellPad}`}>
                    {binary}
                  </th>
                  <td className={`border border-line tabular-nums text-muted ${cellPad}`}>{mask}</td>
                  <td className={`border border-line align-top ${cellPad} ${token ? `${token.classes} ${token.ring}` : 'bg-surface'}`}>
                    <span className="flex flex-col gap-0.5">
                      {text === null ? (
                        <span role="img" aria-label="empty" className="text-lg leading-none text-muted">
                          ·
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-ink">{text}</span>
                      )}
                      {token && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                          <span aria-hidden="true">{token.symbol}</span>
                          <span>{token.label}</span>
                        </span>
                      )}
                      {highlight?.label && (
                        <span className="max-w-32 truncate text-[10px] font-medium normal-case text-muted" title={highlight.label}>
                          {highlight.label}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={`border border-line text-muted ${cellPad}`}>
                    {label ? <span className="block max-w-32 truncate" title={label}>{label}</span> : <span aria-hidden="true">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
