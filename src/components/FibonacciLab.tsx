import { useEffect, useState } from 'react';

export interface FibonacciLabProps {
  n: number;
  onNChange: (n: number) => void;
  autoPlay?: boolean;
  min?: number;
  max?: number;
}

const PLAY_INTERVAL_MS = 600;

function fib(k: number): number {
  if (k <= 0) return 0;
  if (k === 1) return 1;
  let a = 0;
  let b = 1;
  for (let i = 2; i <= k; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

/** Brute-force recursive calls: T(n) = 2 * fib(n + 1) - 1. */
function bruteForceCalls(n: number): number {
  return 2 * fib(n + 1) - 1;
}

/** Memo / tabulation computations: each fib(i) for 0 <= i <= n once. */
function efficientCalls(n: number): number {
  return n + 1;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function FibonacciLab({
  n,
  onNChange,
  autoPlay = false,
  min = 0,
  max = 15,
}: FibonacciLabProps) {
  const [playing, setPlaying] = useState<boolean>(Boolean(autoPlay));
  const clampedN = Math.min(max, Math.max(min, Math.trunc(n)));
  const fibValue = fib(clampedN);
  const bruteCalls = bruteForceCalls(clampedN);
  const efficientOps = efficientCalls(clampedN);
  const factor = efficientOps > 0 ? bruteCalls / efficientOps : 0;
  const efficientWidth = bruteCalls > 0
    ? Math.min(100, Math.max(2, (efficientOps / bruteCalls) * 100))
    : 100;

  useEffect(() => {
    if (!playing) return;
    if (prefersReducedMotion()) {
      setPlaying(false);
      return;
    }
    if (clampedN >= max) {
      setPlaying(false);
      return;
    }
    const timer = window.setInterval(() => {
      if (clampedN >= max) {
        setPlaying(false);
      } else {
        onNChange(clampedN + 1);
      }
    }, PLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing, clampedN, max, onNChange]);

  function togglePlay(): void {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (prefersReducedMotion()) {
      if (clampedN < max) onNChange(clampedN + 1);
      return;
    }
    if (clampedN >= max) onNChange(min);
    setPlaying(true);
  }

  return (
    <section aria-label="Fibonacci lab" className="card p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="fib-lab-n" className="text-sm font-semibold text-ink">
          n <span className="font-normal text-muted">(fib input)</span>
        </label>
        <input
          id="fib-lab-n"
          type="range"
          min={min}
          max={max}
          step={1}
          value={clampedN}
          onChange={(event) => onNChange(Number(event.target.value))}
          className="h-2 flex-1 cursor-pointer accent-[rgb(var(--brand))]"
          aria-label="n"
        />
        <output
          htmlFor="fib-lab-n"
          aria-label="n value"
          className="min-w-16 text-right text-sm font-bold tabular-nums text-ink"
        >
          n = {clampedN}
        </output>
        <button
          type="button"
          className="btn-primary"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
          <span>{playing ? 'Pause' : 'Play'}</span>
        </button>
      </div>

      <p className="mt-3 text-sm text-ink" aria-label="fib value">
        <strong>
          fib({clampedN}) = {fibValue}
        </strong>
      </p>

      <div className="mt-3 overflow-x-auto">
      <table
        aria-label={`Operation comparison for n = ${clampedN}`}
        className="w-full min-w-96 border-collapse text-sm"
      >
        <caption className="pb-2 text-left font-semibold text-ink">
          Calls / computations for n = {clampedN}
        </caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th scope="col" className="py-1 pr-2">Approach</th>
            <th scope="col" className="py-1 pr-2">Cost</th>
            <th scope="col" className="py-1">Relative</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line">
            <th scope="row" className="py-2 pr-2 font-semibold text-ink">
              <span aria-hidden="true" className="mr-1">↻</span>
              Brute force
            </th>
            <td className="py-2 pr-2 tabular-nums" aria-label="brute force calls">
              {bruteCalls} calls
            </td>
            <td className="py-2">
              <div className="h-3 w-full overflow-hidden rounded bg-line/60" aria-hidden="true">
                <div className="h-full bg-[rgb(var(--bad))]" style={{ width: '100%' }} />
              </div>
            </td>
          </tr>
          <tr className="border-b border-line">
            <th scope="row" className="py-2 pr-2 font-semibold text-ink">
              <span aria-hidden="true" className="mr-1">✓</span>
              Memoization
            </th>
            <td className="py-2 pr-2 tabular-nums" aria-label="memoization computations">
              {efficientOps} computations
            </td>
            <td className="py-2">
              <div className="h-3 w-full overflow-hidden rounded bg-line/60" aria-hidden="true">
                <div className="h-full bg-[rgb(var(--good))]" style={{ width: `${efficientWidth}%` }} />
              </div>
            </td>
          </tr>
          <tr>
            <th scope="row" className="py-2 pr-2 font-semibold text-ink">
              <span aria-hidden="true" className="mr-1">≡</span>
              Tabulation
            </th>
            <td className="py-2 pr-2 tabular-nums" aria-label="tabulation computations">
              {efficientOps} computations
            </td>
            <td className="py-2">
              <div className="h-3 w-full overflow-hidden rounded bg-line/60" aria-hidden="true">
                <div className="h-full bg-[rgb(var(--good))]" style={{ width: `${efficientWidth}%` }} />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      {bruteCalls > efficientOps ? (
        <p className="mt-3 text-sm text-ink" aria-label="fewer calls factor">
          <span aria-hidden="true" className="mr-1">★</span>
          Memo / tabulation: <strong>{factor.toFixed(1)} times fewer calls</strong> than brute force
          ({bruteCalls} → {efficientOps}).
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Each fib(i) is computed once, so memo / tabulation = n + 1 = {efficientOps} computations.
        </p>
      )}
    </section>
  );
}
