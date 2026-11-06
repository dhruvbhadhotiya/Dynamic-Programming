import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import zeroOneKnapsackModule from './zero-one-knapsack.problem';
import type { ZeroOneKnapsackInput } from './zero-one-knapsack.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function reference(input: ZeroOneKnapsackInput): number {
  const weights = (Array.isArray(input.weights) ? input.weights : [])
    .slice(0, 6)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 10) : 1));
  const values = (Array.isArray(input.values) ? input.values : [])
    .slice(0, 6)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 20) : 1));
  const count = Math.min(weights.length, values.length);
  const capacity =
    typeof input.capacity === 'number' && Number.isFinite(input.capacity)
      ? clampInt(input.capacity, 1, 15)
      : 1;

  let best = 0;
  for (let mask = 0; mask < 1 << count; mask += 1) {
    let totalWeight = 0;
    let totalValue = 0;
    for (let i = 0; i < count; i += 1) {
      if ((mask & (1 << i)) !== 0) {
        totalWeight += weights[i] ?? 0;
        totalValue += values[i] ?? 0;
      }
    }
    if (totalWeight <= capacity) best = Math.max(best, totalValue);
  }
  return best;
}

describe('zero-one-knapsack module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(zeroOneKnapsackModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(
      finalAnswer(
        zeroOneKnapsackModule.generateSteps(
          { weights: [1, 3, 4, 5], values: [1, 4, 5, 7], capacity: 7 },
          mode,
        ),
      ),
    ).toBe(9);
    expect(
      finalAnswer(
        zeroOneKnapsackModule.generateSteps(
          { weights: [2, 3, 4], values: [3, 4, 5], capacity: 5 },
          mode,
        ),
      ),
    ).toBe(7);
    expect(
      finalAnswer(
        zeroOneKnapsackModule.generateSteps(
          { weights: [5, 4, 6], values: [6, 5, 7], capacity: 5 },
          mode,
        ),
      ),
    ).toBe(6);
    expect(
      finalAnswer(
        zeroOneKnapsackModule.generateSteps({ weights: [1], values: [10], capacity: 10 }, mode),
      ),
    ).toBe(10);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(zeroOneKnapsackModule.quiz).toHaveLength(4);
    for (const question of zeroOneKnapsackModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(zeroOneKnapsackModule.defaultInput).toEqual({
      weights: [1, 3, 4, 5],
      values: [1, 4, 5, 7],
      capacity: 7,
    });
    expect(zeroOneKnapsackModule.renderer).toBe('table2d');
    expect(zeroOneKnapsackModule.modes).toEqual(['bruteforce', 'memo', 'tabulation']);
    const values: Record<string, unknown> = { ...zeroOneKnapsackModule.defaultInput };
    expect(validateInput(zeroOneKnapsackModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      zeroOneKnapsackModule.code.python,
      zeroOneKnapsackModule.code.javascript,
      zeroOneKnapsackModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The compute line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][c]');
      expect(lines[7]).toContain('return dp[n][capacity]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        zeroOneKnapsackModule
          .generateSteps({ weights: [1, 3, 4, 5], values: [1, 4, 5, 7], capacity: 7 }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
