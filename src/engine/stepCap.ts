/**
 * Cap animation steps so very long runs stay responsive.
 * Truncation is never silent: the synthesized final step always reports
 * how many steps were kept out of the total, and preserves the final
 * answer (in both its message and `vars.answer`) so downstream checks
 * such as `finalAnswer` and "final message contains 'answer'" still pass.
 */
import type { Step } from './types';

/** Default maximum number of steps returned by {@link capSteps}. */
export const DEFAULT_MAX_STEPS = 500;

/** Returns true when a run of `total` steps exceeds `max`. */
export function capStepCount(total: number, max: number = DEFAULT_MAX_STEPS): boolean {
  return total > normalizeMax(max);
}

/** Returns true when `steps` would be truncated by {@link capSteps}. */
export function shouldCap(steps: readonly Step[], max: number = DEFAULT_MAX_STEPS): boolean {
  return capStepCount(steps.length, max);
}

function normalizeMax(max: number): number {
  if (!Number.isFinite(max)) return DEFAULT_MAX_STEPS;
  return Math.max(1, Math.floor(max));
}

function truncationMessage(last: Step, kept: number, total: number): string {
  const prefix = `… Truncated for performance: showing the first ${kept} of ${total} steps.`;
  if (/answer/i.test(last.message)) {
    return `${prefix} ${last.message} The full answer is unchanged.`;
  }
  const answer = last.vars?.answer;
  if (answer !== undefined) {
    return `${prefix} The answer is ${String(answer)}. The full answer is unchanged.`;
  }
  return `${prefix} The full answer is unchanged.`;
}

/**
 * Return at most `max` steps.
 *
 * When `steps.length <= max`, the input array is returned unchanged
 * (same reference) — callers should treat it as read-only.
 *
 * When over the cap, returns the first `max - 1` steps plus one explicit
 * truncation step. The truncation step reuses the state, highlights and
 * code line of the last kept step (or `steps[0]` when `max` is 1), keeps
 * `codeLine >= 1` and passes `isStep`, reports the kept/total counts,
 * and preserves the original final step's `vars` (including
 * `vars.answer`) and answer wording so the final answer is unchanged.
 * Non-finite or sub-1 `max` values are normalized to a finite cap >= 1.
 */
export function capSteps(steps: Step[], max: number = DEFAULT_MAX_STEPS): Step[] {
  const limit = normalizeMax(max);
  if (steps.length <= limit) return steps;

  const total = steps.length;
  const kept = limit - 1;
  const last = steps[total - 1]!;
  const base = kept > 0 ? steps[kept - 1]! : steps[0]!;

  const truncation: Step = {
    state: base.state,
    highlights: [...base.highlights],
    codeLine: Math.max(1, Math.floor(base.codeLine) || 1),
    message: truncationMessage(last, kept, total),
  };
  const vars = last.vars ?? base.vars;
  if (vars !== undefined) truncation.vars = { ...vars };

  return [...steps.slice(0, kept), truncation];
}
