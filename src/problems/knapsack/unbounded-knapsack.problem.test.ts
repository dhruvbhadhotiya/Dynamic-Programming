import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import unboundedKnapsackModule from './unbounded-knapsack.problem';
import type { UnboundedKnapsackInput } from './unbounded-knapsack.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function reference(input: UnboundedKnapsackInput): number {
  const weights = (Array.isArray(input.weights) ? input.weights : [])
    .slice(0, 5)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 8) : 1));
  const values = (Array.isArray(input.values) ? input.values : [])
    .slice(0, 5)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 15) : 1));
  const count = Math.min(weights.length, values.length);
  const capacity =
    typeof input.capacity === 'number' && Number.isFinite(input.capacity)
      ? clampInt(input.capacity, 1, 12)
      : 1;

  const dp: number[] = new Array<number>(capacity + 1).fill(0);
  for (let c = 1; c <= capacity; c += 1) {
    let best = dp[c] ?? 0;
    for (let i = 0; i < count; i += 1) {
      const w = weights[i] ?? 1;
      const v = values[i] ?? 1;
      if (w <= c) best = Math.max(best, (dp[c - w] ?? 0) + v);
    }
    dp[c] = best;
  }
  return dp[capacity] ?? 0;
}

describe('unbounded-knapsack module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(unboundedKnapsackModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(
      finalAnswer(
        unboundedKnapsackModule.generateSteps(
          { weights: [2, 3, 4], values: [3, 4, 5], capacity: 8 },
          mode,
        ),
      ),
    ).toBe(12);
    expect(
      finalAnswer(
        unboundedKnapsackModule.generateSteps(
          { weights: [2, 3, 4], values: [3, 4, 5], capacity: 5 },
          mode,
        ),
      ),
    ).toBe(7);
    expect(
      finalAnswer(
        unboundedKnapsackModule.generateSteps(
          { weights: [5, 4, 6], values: [6, 5, 7], capacity: 5 },
          mode,
        ),
      ),
    ).toBe(6);
    expect(
      finalAnswer(
        unboundedKnapsackModule.generateSteps({ weights: [1], values: [10], capacity: 10 }, mode),
      ),
    ).toBe(100);
    expect(
      finalAnswer(
        unboundedKnapsackModule.generateSteps({ weights: [2, 3], values: [3, 4], capacity: 6 }, mode),
      ),
    ).toBe(9);
    expect(
      finalAnswer(
        unboundedKnapsackModule.generateSteps({ weights: [4, 6], values: [7, 10], capacity: 12 }, mode),
      ),
    ).toBe(21);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(unboundedKnapsackModule.quiz).toHaveLength(4);
    for (const question of unboundedKnapsackModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(unboundedKnapsackModule.defaultInput).toEqual({
      weights: [2, 3, 4],
      values: [3, 4, 5],
      capacity: 8,
    });
    expect(unboundedKnapsackModule.renderer).toBe('table2d');
    expect(unboundedKnapsackModule.modes).toEqual(['bruteforce', 'memo', 'tabulation']);
    const values: Record<string, unknown> = { ...unboundedKnapsackModule.defaultInput };
    expect(validateInput(unboundedKnapsackModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      unboundedKnapsackModule.code.python,
      unboundedKnapsackModule.code.javascript,
      unboundedKnapsackModule.code.cpp,
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
        unboundedKnapsackModule
          .generateSteps({ weights: [2, 3, 4], values: [3, 4, 5], capacity: 8 }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
