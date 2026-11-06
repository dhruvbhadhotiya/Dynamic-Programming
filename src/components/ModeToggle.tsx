import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { Mode } from '../engine/types';

const MODE_ORDER: Mode[] = ['bruteforce', 'memo', 'tabulation'];

const MODE_META: Record<Mode, { label: string; symbol: string; hint: string }> = {
  bruteforce: {
    label: 'Brute force',
    symbol: '⌁',
    hint: 'Explores every branch, including repeated subproblems.',
  },
  memo: {
    label: 'Memoization',
    symbol: '▦',
    hint: 'Reuses overlapping subproblems by caching each answer.',
  },
  tabulation: {
    label: 'Tabulation',
    symbol: '▤',
    hint: 'Fills a table bottom-up so every cell is computed once.',
  },
};

const OPERATIONS_FORMAT = new Intl.NumberFormat('en-US');

export interface ModeToggleProps {
  modes: Mode[];
  mode: Mode;
  onChange: (mode: Mode) => void;
  /** Live count of work done by the current walkthrough. */
  operations: number;
  disabled?: boolean;
  className?: string;
}

function formatOperations(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  return OPERATIONS_FORMAT.format(safe);
}

export function ModeToggle({ modes, mode, onChange, operations, disabled = false, className }: ModeToggleProps) {
  const refs = useRef<Partial<Record<Mode, HTMLButtonElement | null>>>({});
  const available = MODE_ORDER.filter((item) => modes.includes(item));

  if (available.length === 0) return null;

  const active = available.includes(mode) ? mode : (available[0] ?? 'bruteforce');

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? available.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length;
    const next = available[nextIndex];
    if (!next) return;
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <section aria-label="Solution mode controls" className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Solution mode" className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
          {available.map((item, index) => {
            const selected = item === active;
            const meta = MODE_META[item];
            return (
              <button
                key={item}
                ref={(node) => {
                  refs.current[item] = node;
                }}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onChange(item)}
                onKeyDown={(event) => handleKey(event, index)}
                className={[
                  'min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  selected ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-line/60 hover:text-ink',
                ].join(' ')}
              >
                <span aria-hidden="true" className="mr-1.5">{meta.symbol}</span>
                {meta.label}
              </button>
            );
          })}
        </div>
        <p className="flex items-baseline gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <span className="font-semibold text-muted">Operations</span>
          <strong
            aria-live="polite"
            className="font-mono text-base tabular-nums text-ink"
          >
            {formatOperations(operations)}
          </strong>
        </p>
      </div>
      <p className="mt-2 text-xs text-muted">{MODE_META[active].hint}</p>
    </section>
  );
}
