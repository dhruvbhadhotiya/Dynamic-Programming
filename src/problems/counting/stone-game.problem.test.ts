import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import type { Rng } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import stoneGameModule from './stone-game.problem';
import type { StoneGameInput } from './stone-game.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: StoneGameInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const cleaned = raw
    .slice(0, 8)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 9) : 1,
    );
  if (cleaned.length === 0) return [1, 1];
  if (cleaned.length === 1) return [cleaned[0] ?? 1, cleaned[0] ?? 1];
  if (cleaned.length % 2 === 1) return cleaned.slice(0, cleaned.length - 1);
  return cleaned;
}

/**
 * Independent reference: exhaustive minimax over every take-left / take-right
 * sequence (at most 2^7 = 128 leaf paths for n = 8). The first player
 * maximizes the first player's own total while the second player minimizes
 * it. The result is the boolean firstWins.
 *
 * Answer-shape decision: runModuleChecks compares finalAnswer values with
 * toEqual, so a boolean answer works directly; the numeric score advantage
 * (2 * dp[0][n-1] - total) is carried in the final step vars instead of
 * replacing the boolean answer.
 */
function reference(input: StoneGameInput): boolean {
  const nums = normalize(input);
  const total = nums.reduce((acc, value) => acc + value, 0);
  const solve = (l: number, r: number, firstTurn: boolean, firstScore: number): number => {
    if (l > r) return firstScore;
    if (firstTurn) {
      return Math.max(
        solve(l + 1, r, false, firstScore + (nums[l] ?? 1)),
        solve(l, r - 1, false, firstScore + (nums[r] ?? 1)),
      );
    }
    return Math.min(
      solve(l + 1, r, true, firstScore),
      solve(l, r - 1, true, firstScore),
    );
  };
  return solve(0, nums.length - 1, true, 0) > total / 2;
}

function inputGenerator(rng: Rng): StoneGameInput {
  const pairs = rngInt(rng, 1, 4);
  const length = pairs * 2;
  const nums = Array.from({ length }, () => rngInt(rng, 1, 9));
  return { nums };
}

describe('stone-game module', () => {
  it('produces valid steps matching the exhaustive minimax reference on 20 seeded inputs', () => {
    runModuleChecks(stoneGameModule, reference, { cases: 20, seed: 1, inputGenerator });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(stoneGameModule.generateSteps({ nums: [5, 3, 4, 5] }, mode))).toBe(true);
    expect(finalAnswer(stoneGameModule.generateSteps({ nums: [5, 1] }, mode))).toBe(true);
    expect(finalAnswer(stoneGameModule.generateSteps({ nums: [3, 7, 2, 3] }, mode))).toBe(true);
    // NOTE: the task brief listed [1, 2] -> false, but taking 2 of 3 total
    // wins (2 > 1.5), so exhaustive minimax gives true. Asserted as true.
    expect(finalAnswer(stoneGameModule.generateSteps({ nums: [1, 2] }, mode))).toBe(true);
    expect(finalAnswer(stoneGameModule.generateSteps({ nums: [2, 4] }, mode))).toBe(true);
    expect(finalAnswer(stoneGameModule.generateSteps({ nums: [1, 1] }, mode))).toBe(false);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(stoneGameModule.quiz).toHaveLength(4);
    for (const question of stoneGameModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(stoneGameModule.defaultInput).toEqual({ nums: [5, 3, 4, 5] });
    expect(stoneGameModule.renderer).toBe('intervalTriangle');
    expect(stoneGameModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...stoneGameModule.defaultInput };
    expect(validateInput(stoneGameModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      stoneGameModule.code.python,
      stoneGameModule.code.javascript,
      stoneGameModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(14);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[12]).toContain('dp[l][r]');
      expect(lines[13]).toContain('dp[0][n - 1]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        stoneGameModule
          .generateSteps({ nums: [5, 3, 4, 5] }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
