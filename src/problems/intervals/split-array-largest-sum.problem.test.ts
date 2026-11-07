import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import splitArrayLargestSumModule from './split-array-largest-sum.problem';
import type { SplitArrayLargestSumInput } from './split-array-largest-sum.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: SplitArrayLargestSumInput): { nums: number[]; k: number } {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const nums = raw
    .slice(0, 6)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 0, 10) : 0,
    );
  const safeNums = nums.length > 0 ? nums : [1];
  const rawK =
    typeof input.k === 'number' && Number.isFinite(input.k) ? Math.trunc(input.k) : 1;
  return { nums: safeNums, k: clampInt(rawK, 1, safeNums.length) };
}

function popcount(mask: number): number {
  let count = 0;
  let value = mask;
  while (value > 0) {
    count += value & 1;
    value >>>= 1;
  }
  return count;
}

/** Independent reference: try every choice of k-1 cut positions. */
function reference(input: SplitArrayLargestSumInput): number {
  const { nums, k } = normalize(input);
  const n = nums.length;
  let best = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 1 << (n - 1); mask += 1) {
    if (popcount(mask) !== k - 1) continue;
    let current = 0;
    let largest = 0;
    for (let i = 0; i < n - 1; i += 1) {
      current += nums[i] ?? 0;
      if ((mask & (1 << i)) !== 0) {
        largest = Math.max(largest, current);
        current = 0;
      }
    }
    current += nums[n - 1] ?? 0;
    largest = Math.max(largest, current);
    best = Math.min(best, largest);
  }

  return best;
}

describe('split-array-largest-sum module', () => {
  it('produces valid steps matching the exhaustive cut reference on 20 seeded inputs', () => {
    runModuleChecks(splitArrayLargestSumModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(
      finalAnswer(
        splitArrayLargestSumModule.generateSteps({ nums: [7, 2, 5, 10, 8], k: 2 }, mode),
      ),
    ).toBe(18);
    expect(
      finalAnswer(splitArrayLargestSumModule.generateSteps({ nums: [1, 2, 3, 4, 5], k: 2 }, mode)),
    ).toBe(9);
    expect(
      finalAnswer(splitArrayLargestSumModule.generateSteps({ nums: [1, 4, 4], k: 3 }, mode)),
    ).toBe(4);
    expect(finalAnswer(splitArrayLargestSumModule.generateSteps({ nums: [1, 2, 3], k: 1 }, mode))).toBe(6);
    expect(finalAnswer(splitArrayLargestSumModule.generateSteps({ nums: [0, 0], k: 2 }, mode))).toBe(0);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(splitArrayLargestSumModule.quiz).toHaveLength(4);
    for (const question of splitArrayLargestSumModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(splitArrayLargestSumModule.defaultInput).toEqual({ nums: [7, 2, 5, 10, 8], k: 2 });
    expect(splitArrayLargestSumModule.renderer).toBe('table2d');
    expect(splitArrayLargestSumModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...splitArrayLargestSumModule.defaultInput };
    expect(validateInput(splitArrayLargestSumModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      splitArrayLargestSumModule.code.python,
      splitArrayLargestSumModule.code.javascript,
      splitArrayLargestSumModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[p][i]');
      expect(lines[6]).toContain('return dp[k][n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        splitArrayLargestSumModule
          .generateSteps({ nums: [7, 2, 5, 10, 8], k: 2 }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
