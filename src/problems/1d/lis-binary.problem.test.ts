import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import lisBinaryModule from './lis-binary.problem';
import type { LisBinaryInput } from './lis-binary.problem';

const MODES: readonly Mode[] = ['bruteforce', 'tabulation'];

/** Independent reference: O(n^2) DP over pairs (j, i). */
function reference(input: LisBinaryInput): number {
  const nums = input.nums;
  if (nums.length === 0) return 0;
  const dp = nums.map(() => 1);
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if ((nums[j] ?? 0) < (nums[i] ?? 0)) {
        dp[i] = Math.max(dp[i] ?? 1, (dp[j] ?? 1) + 1);
      }
    }
  }
  return Math.max(...dp);
}

describe('lis-binary module', () => {
  it(
    'produces valid steps matching the reference on 20 seeded inputs',
    () => {
      runModuleChecks(lisBinaryModule, reference, { cases: 20, seed: 1 });
    },
    30000,
  );

  it.each(MODES)('returns known LIS values in %s mode', (mode) => {
    expect(finalAnswer(lisBinaryModule.generateSteps({ nums: [10, 9, 2, 5, 3, 7, 101, 18] }, mode))).toBe(4);
    expect(finalAnswer(lisBinaryModule.generateSteps({ nums: [0, 1, 0, 3, 2, 3] }, mode))).toBe(4);
    expect(finalAnswer(lisBinaryModule.generateSteps({ nums: [5] }, mode))).toBe(1);
    expect(finalAnswer(lisBinaryModule.generateSteps({ nums: [1, 2, 3, 4] }, mode))).toBe(4);
    expect(finalAnswer(lisBinaryModule.generateSteps({ nums: [4, 3, 2, 1] }, mode))).toBe(1);
    expect(finalAnswer(lisBinaryModule.generateSteps({ nums: [1, 1, 1] }, mode))).toBe(1);
    expect(finalAnswer(lisBinaryModule.generateSteps({ nums: [1, 2, 2, 3] }, mode))).toBe(3);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(lisBinaryModule.quiz).toHaveLength(4);
    for (const question of lisBinaryModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(lisBinaryModule.defaultInput).toEqual({ nums: [10, 9, 2, 5, 3, 7, 101, 18] });
    expect(lisBinaryModule.renderer).toBe('table1d');
    expect(lisBinaryModule.complexity.time).toBe('O(n log n)');
    expect(lisBinaryModule.modes).toEqual(['bruteforce', 'tabulation']);
    const values: Record<string, unknown> = { nums: lisBinaryModule.defaultInput.nums };
    expect(validateInput(lisBinaryModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      lisBinaryModule.code.python,
      lisBinaryModule.code.javascript,
      lisBinaryModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // Line 4 is the binary search in all three languages; line 8 returns.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[3]).toContain('tails');
      expect(lines[7]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        lisBinaryModule.generateSteps({ nums: [10, 9, 2, 5, 3, 7, 101, 18] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
