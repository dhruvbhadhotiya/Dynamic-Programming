import type { CellValue, Highlight, Table1DState } from '../engine/types';
import { cellTokens } from '../styles/tokens';

export interface Table1DProps {
  state: Table1DState;
  highlights: Highlight[];
  compact?: boolean;
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

function valueText(value: CellValue): string | null {
  if (value === null) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function ValueCell({
  index,
  value,
  highlight,
  compact,
}: {
  index: number;
  value: CellValue;
  highlight: Highlight | undefined;
  compact: boolean;
}) {
  const text = valueText(value);
  const token = highlight ? cellTokens[highlight.kind] : undefined;
  const aria = `Index ${index}: ${text ?? 'empty'}${token ? `, ${token.label} ${token.symbol}` : ''}`;

  return (
    <div
      role="group"
      aria-label={aria}
      className={[
        'flex flex-col items-center justify-center rounded-xl border-2 whitespace-nowrap',
        compact ? 'min-w-10 px-1.5 py-1' : 'min-w-14 px-2.5 py-1.5',
        token ? `${token.classes} ${token.ring}` : 'border-line bg-surface',
      ].join(' ')}
    >
      {text === null ? (
        <span role="img" aria-label="empty" className="text-lg leading-none text-muted">
          ·
        </span>
      ) : (
        <span className={`font-mono font-bold ${compact ? 'text-sm' : 'text-base'}`}>{text}</span>
      )}
      {token && (
        <span
          className={`inline-flex items-center gap-1 font-bold uppercase tracking-wide ${
            compact ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          <span aria-hidden="true">{token.symbol}</span>
          <span>{token.label}</span>
        </span>
      )}
      {highlight?.label && (
        <span className="max-w-28 truncate text-[10px] font-medium normal-case text-muted" title={highlight.label}>
          {highlight.label}
        </span>
      )}
    </div>
  );
}

export function Table1D({ state, highlights, compact = false }: Table1DProps) {
  const { values, labels, indexName, caption } = state;
  const winners = winningHighlights(highlights, values.length);

  return (
    <figure className="m-0 flex w-full flex-col gap-2" aria-label={caption ?? '1D dynamic programming table'}>
      {caption && <figcaption className="text-sm font-bold text-ink">{caption}</figcaption>}
      <div
        role="region"
        tabIndex={0}
        aria-label={caption ? `${caption} — scrollable table` : 'Scrollable 1D table'}
        className="max-w-full overflow-x-auto pb-1"
      >
        <div className="min-w-max">
          {indexName && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">{indexName}</p>
          )}
          <ol className={`flex items-start ${compact ? 'gap-1' : 'gap-1.5'}`} aria-label="Values by index">
            {values.map((value, index) => (
              <li key={index} className={`flex flex-col items-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
                <span aria-hidden="true" className="px-1 text-[11px] font-semibold tabular-nums text-muted">
                  {index}
                </span>
                <ValueCell index={index} value={value} highlight={winners.get(index)} compact={compact} />
                {labels?.[index] && (
                  <span className="max-w-28 truncate text-[11px] text-muted" title={labels[index]}>
                    {labels[index]}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </figure>
  );
}
