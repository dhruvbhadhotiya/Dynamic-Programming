import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import predictTheWinnerModule from './predict-the-winner.problem';
import type { PredictTheWinnerInput } from './predict-the-winner.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: PredictTheWinnerInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const nums = raw
    .slice(0, 8)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 9) : 1,
    );
  return nums.length > 0 ? nums : [1, 2];
}

/**
 * Independent reference: enumerate every take-left / take-right play sequence
 * (branching factor 2, n <= 8, so at most 256 leaves) with minimax on the
 * final difference P1 - P2. No DP table is reused.
 */
function reference(input: PredictTheWinnerInput): boolean {
  const nums = normalize(input);
  const n = nums.length;
  const solve = (l: number, r: number, p1: number, p2: number, turn: number): number => {
    if (l > r) return p1 - p2;
    if (turn === 0) {
      return Math.max(
        solve(l + 1, r, p1 + (nums[l] ?? 1), p2, 1),
        solve(l, r - 1, p1 + (nums[r] ?? 1), p2, 1),
      );
    }
    return Math.min(
      solve(l + 1, r, p1, p2 + (nums[l] ?? 1), 0),
      solve(l, r - 1, p1, p2 + (nums[r] ?? 1), 0),
    );
  };
  return solve(0, n - 1, 0, 0, 0) >= 0;
}

describe('predict-the-winner module', () => {
  // Answer-shape decision: the module's final vars.answer is the boolean
  // "Player 1 wins" (dp[0][n-1] * 2 >= total). The underlying scores are
  // exposed in the final step vars as p1 / p2 / margin / total, and the
  // final message states the boolean answer. runModuleChecks therefore
  // compares boolean against boolean; p1/p2 are checked separately below.

  it(
    'produces valid steps matching the exhaustive minimax reference on 20 seeded inputs',
    () => {
      runModuleChecks(predictTheWinnerModule, reference, { cases: 20, seed: 1 });
    },
    30000,
  );

  it.each(MODES)('returns known values in %s mode', (mode) => {
    // Mathematically correct under the stated recurrence / minimax:
    // [1, 2] -> true (take 2), [2, 1] -> true (take 2),
    // [1, 5, 2] -> false (best 3 vs 5), [2, 5, 2] -> false (best 4 vs 5).
    expect(finalAnswer(predictTheWinnerModule.generateSteps({ nums: [1, 2] }, mode))).toBe(true);
    expect(finalAnswer(predictTheWinnerModule.generateSteps({ nums: [2, 1] }, mode))).toBe(true);
    expect(finalAnswer(predictTheWinnerModule.generateSteps({ nums: [1, 5, 2] }, mode))).toBe(false);
    expect(finalAnswer(predictTheWinnerModule.generateSteps({ nums: [2, 5, 2] }, mode))).toBe(false);
    expect(finalAnswer(predictTheWinnerModule.generateSteps({ nums: [1, 5, 1, 2] }, mode))).toBe(true);
  });

  it.each(MODES)('exposes boolean answer with p1/p2 scores in %s mode', (mode) => {
    const steps = predictTheWinnerModule.generateSteps({ nums: [1, 5, 2] }, mode);
    const last = steps.at(-1);
    expect(typeof last?.vars?.answer).toBe('boolean');
    expect(last?.vars?.answer).toBe(false);
    expect(last?.vars?.p1).toBe(3);
    expect(last?.vars?.p2).toBe(5);
    expect(last?.vars?.margin).toBe(-2);
    expect(last?.message.toLowerCase()).toContain('answer');
  });

  it('normalizes out-of-range input safely and agrees with the reference', () => {
    const messy: PredictTheWinnerInput[] = [
      { nums: [] },
      { nums: [99, -3, 2.7] },
      { nums: [0, 0, 0] },
      { nums: [Number.NaN, 5] },
      { nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    ];
    for (const input of messy) {
      for (const mode of MODES) {
        expect(
          finalAnswer(predictTheWinnerModule.generateSteps(input, mode)),
          JSON.stringify(input),
        ).toBe(reference(input));
      }
    }
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(predictTheWinnerModule.quiz).toHaveLength(4);
    for (const question of predictTheWinnerModule.quiz) {
      expect(question.options.length).toBeGreaterThan(1);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput and metadata', () => {
    expect(predictTheWinnerModule.id).toBe('predict-the-winner');
    expect(predictTheWinnerModule.title).toBe('Predict the Winner');
    expect(predictTheWinnerModule.category).toBe('counting');
    expect(predictTheWinnerModule.difficulty).toBe('medium');
    expect(predictTheWinnerModule.renderer).toBe('intervalTriangle');
    expect(predictTheWinnerModule.modes).toEqual(['memo', 'tabulation']);
    expect(predictTheWinnerModule.defaultInput).toEqual({ nums: [1, 5, 2] });
    const values: Record<string, unknown> = { ...predictTheWinnerModule.defaultInput };
    expect(validateInput(predictTheWinnerModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      predictTheWinnerModule.code.python,
      predictTheWinnerModule.code.javascript,
      predictTheWinnerModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i][i]');
      expect(lines[8]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        predictTheWinnerModule.generateSteps({ nums: [1, 5, 2] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
