import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import minCostCutStickModule from './min-cost-cut-stick.problem';
import type { MinCostCutStickInput } from './min-cost-cut-stick.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: MinCostCutStickInput): { n: number; cuts: number[] } {
  const n =
    typeof input.n === 'number' && Number.isFinite(input.n) ? clampInt(input.n, 4, 12) : 4;
  const raw = Array.isArray(input.cuts) ? input.cuts : [];
  const seen = new Set<number>();
  const cuts: number[] = [];
  for (const value of raw) {
    if (cuts.length >= 6) break;
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const cut = Math.trunc(value);
    if (cut < 1 || cut > n - 1 || seen.has(cut)) continue;
    seen.add(cut);
    cuts.push(cut);
  }
  cuts.sort((a, b) => a - b);
  return { n, cuts };
}

function costOfOrder(order: number[], n: number): number {
  let total = 0;
  const segments: Array<[number, number]> = [[0, n]];
  for (const cut of order) {
    const index = segments.findIndex(([left, right]) => left < cut && cut < right);
    const segment = segments[index];
    if (!segment) continue;
    const [left, right] = segment;
    total += right - left;
    segments.splice(index, 1, [left, cut], [cut, right]);
  }
  return total;
}

/** Independent reference: try every order of cuts and simulate the segments. */
function reference(input: MinCostCutStickInput): number {
  const { n, cuts } = normalize(input);
  if (cuts.length === 0) return 0;
  let best = Number.POSITIVE_INFINITY;
  const visit = (remaining: number[], order: number[]): void => {
    if (remaining.length === 0) {
      best = Math.min(best, costOfOrder(order, n));
      return;
    }
    for (let i = 0; i < remaining.length; i += 1) {
      const cut = remaining[i];
      if (cut === undefined) continue;
      const rest = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      visit(rest, [...order, cut]);
    }
  };
  visit(cuts, []);
  return best;
}

describe('min-cost-cut-stick module', () => {
  it('produces valid steps matching the cut-order reference on 20 seeded inputs', () => {
    runModuleChecks(minCostCutStickModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(
      finalAnswer(minCostCutStickModule.generateSteps({ n: 7, cuts: [1, 3, 4, 5] }, mode)),
    ).toBe(16);
    expect(finalAnswer(minCostCutStickModule.generateSteps({ n: 5, cuts: [2, 4] }, mode))).toBe(8);
    expect(
      finalAnswer(minCostCutStickModule.generateSteps({ n: 4, cuts: [1, 2, 3] }, mode)),
    ).toBe(8);
    expect(finalAnswer(minCostCutStickModule.generateSteps({ n: 6, cuts: [] }, mode))).toBe(0);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(minCostCutStickModule.quiz).toHaveLength(4);
    for (const question of minCostCutStickModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(minCostCutStickModule.defaultInput).toEqual({ n: 7, cuts: [1, 3, 4, 5] });
    expect(minCostCutStickModule.renderer).toBe('intervalTriangle');
    expect(minCostCutStickModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...minCostCutStickModule.defaultInput };
    expect(validateInput(minCostCutStickModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      minCostCutStickModule.code.python,
      minCostCutStickModule.code.javascript,
      minCostCutStickModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i][j]');
      expect(lines[6]).toContain('return dp[0][m - 1]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        minCostCutStickModule
          .generateSteps({ n: 7, cuts: [1, 3, 4, 5] }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
