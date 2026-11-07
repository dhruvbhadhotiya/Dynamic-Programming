import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import prefixSumModule from './prefix-sum-optimization.problem';
import type { PrefixSumInput } from './prefix-sum-optimization.problem';

const MODES: readonly Mode[] = ['tabulation'];

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalize(input: PrefixSumInput): PrefixSumInput {
  const raw = Array.isArray(input?.nums) && input.nums.length > 0 ? input.nums : [1, 2, 3, -3, 1];
  const nums = raw.slice(0, 8).map((v) => clampInt(v, -3, 9, 0));
  return { nums: nums.length > 0 ? nums : [1, 2, 3, -3, 1], target: clampInt(input?.target, -5, 15, 3) };
}

/** Independent reference: enumerate every subarray and count those summing to target. */
function reference(input: PrefixSumInput): number {
  const { nums, target } = normalize(input);
  let count = 0;
  for (let i = 0; i < nums.length; i += 1) {
    let total = 0;
    for (let j = i; j < nums.length; j += 1) {
      total += nums[j] ?? 0;
      if (total === target) count += 1;
    }
  }
  return count;
}

describe('prefix-sum-optimization module', () => {
  it('produces valid steps matching O(n^2) enumeration on 20 seeded inputs', () => {
    runModuleChecks(prefixSumModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns verified known values in %s mode', (mode) => {
    expect(finalAnswer(prefixSumModule.generateSteps({ nums: [1], target: 1 }, mode))).toBe(1);
    expect(finalAnswer(prefixSumModule.generateSteps({ nums: [0, 0, 0], target: 0 }, mode))).toBe(6);
    expect(finalAnswer(prefixSumModule.generateSteps({ nums: [1, 2, 3], target: 3 }, mode))).toBe(2);
    expect(finalAnswer(prefixSumModule.generateSteps({ nums: [-1, -1, 1], target: 0 }, mode))).toBe(1);
    expect(finalAnswer(prefixSumModule.generateSteps({ nums: [1, 2, 3, -3, 1], target: 3 }, mode))).toBe(4);
  });

  it('documents the default input answer as the verified 4', () => {
    // Verified: [1,2], [3], [1,2,3,-3] and [2,3,-3,1] all sum to 3.
    expect(finalAnswer(prefixSumModule.generateSteps(prefixSumModule.defaultInput, 'tabulation'))).toBe(4);
    expect(reference(prefixSumModule.defaultInput)).toBe(4);
  });

  it('normalizes bad inputs safely and agrees with the reference', () => {
    const messy: PrefixSumInput[] = [
      { nums: [1, Number.NaN, 2], target: 99 },
      { nums: [1.6, 2.4], target: 3.2 },
      { nums: [999, -999, 1, 2, 3, 4, 5, 6, 7, 8, 9], target: -999 },
      { nums: [], target: Number.NaN },
    ];
    for (const input of messy) {
      for (const mode of MODES) {
        expect(finalAnswer(prefixSumModule.generateSteps(input, mode)), JSON.stringify(input)).toBe(reference(input));
      }
    }
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(prefixSumModule.quiz).toHaveLength(4);
    for (const q of prefixSumModule.quiz) {
      expect(q.options.length).toBeGreaterThan(0);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(q.q.trim()).not.toBe('');
      expect(q.why.trim()).not.toBe('');
    }
  });

  it('has the required default input and metadata', () => {
    expect(prefixSumModule.id).toBe('prefix-sum-optimization');
    expect(prefixSumModule.category).toBe('advanced');
    expect(prefixSumModule.difficulty).toBe('medium');
    expect(prefixSumModule.renderer).toBe('table1d');
    expect(prefixSumModule.modes).toEqual(['tabulation']);
    expect(prefixSumModule.defaultInput).toEqual({ nums: [1, 2, 3, -3, 1], target: 3 });
    const values: Record<string, unknown> = { ...prefixSumModule.defaultInput };
    expect(validateInput(prefixSumModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid and aligned in all three snippets', () => {
    const snippets = [prefixSumModule.code.python, prefixSumModule.code.javascript, prefixSumModule.code.cpp];
    const minLines = Math.min(...snippets.map((s) => s.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(10);
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[2]).toContain('freq');
      expect(lines[9]).toContain('return count');
    }
    const maxCodeLine = Math.max(
      ...prefixSumModule.generateSteps(prefixSumModule.defaultInput, 'tabulation').map((s) => s.codeLine),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
