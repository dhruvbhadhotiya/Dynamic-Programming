/** Shared teaching panels: current-step explanation, step counter, variable watch. */

export type VariableValue = string | number | boolean;

export interface ExplanationBarProps {
  message: string;
  /** 1-based code line shared by every snippet. */
  codeLine?: number;
}

export interface StepCounterProps {
  /** 0-based player index; displayed as a 1-based step. */
  index: number;
  total: number;
}

export interface VariableWatchProps {
  vars: Record<string, VariableValue>;
}

export function ExplanationBar({ message, codeLine }: ExplanationBarProps) {
  return (
    <section aria-label="Current step explanation" className="card border-l-4 border-l-brand p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p
          aria-live="polite"
          aria-atomic="true"
          className="max-w-prose text-lg font-medium leading-8 text-ink sm:text-xl"
        >
          {message}
        </p>
        {codeLine !== undefined && (
          <span className="chip shrink-0 font-mono text-ink">
            <span aria-hidden>↳</span>
            <span>Line {codeLine}</span>
          </span>
        )}
      </div>
    </section>
  );
}

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function StepCounter({ index, total }: StepCounterProps) {
  const totalSteps = safeCount(total);
  const current = totalSteps === 0 ? 0 : Math.min(totalSteps, Math.max(1, safeCount(index) + 1));
  const percent = totalSteps === 0 ? 0 : Math.round((current / totalSteps) * 100);
  const label = `Step ${current} of ${totalSteps}`;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-ink">{label}</p>
        <p aria-hidden className="text-xs font-semibold tabular-nums text-muted">
          {percent}%
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Step progress"
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-valuenow={current}
        aria-valuetext={label}
        className="h-2.5 overflow-hidden rounded-full border border-line bg-canvas"
      >
        <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function VariableWatch({ vars }: VariableWatchProps) {
  const entries = Object.entries(vars);

  if (entries.length === 0) {
    return <p className="text-sm italic text-muted">No variables to watch yet.</p>;
  }

  return (
    <dl aria-label="Variables" className="flex flex-wrap gap-2">
      {entries.map(([name, value]) => {
        const isBoolean = typeof value === 'boolean';
        return (
          <div
            key={name}
            className={`chip max-w-full gap-2 ${
              isBoolean ? 'border-dashed border-ink/40 bg-line/30' : ''
            }`}
          >
            <dt className="shrink-0 text-muted">{name}</dt>
            <dd className="flex min-w-0 items-center gap-1 font-mono text-ink">
              {isBoolean && <span aria-hidden>{value ? '✓' : '✗'}</span>}
              <span className="break-words">{String(value)}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
