import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import targetSumModule from './target-sum.problem';
import type { TargetSumInput } from './target-sum.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function reference(input: TargetSumInput): number {
  const n = input.nums.length;
  let count = 0;
  for (let mask = 0; mask < 1 << n; mask += 1) {
    let signed = 0;
    for (let i = 0; i < n; i += 1) {
      const value = input.nums[i] ?? 0;
      signed += (mask & (1 << i)) !== 0 ? value : -value;
    }
    if (signed === input.target) count += 1;
  }
  return count;
}

describe('target-sum module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(targetSumModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(targetSumModule.generateSteps({ nums: [1, 1, 1, 1, 1], target: 3 }, mode))).toBe(5);
    expect(finalAnswer(targetSumModule.generateSteps({ nums: [1, 2, 3, 4, 5], target: 1 }, mode))).toBe(3);
    expect(finalAnswer(targetSumModule.generateSteps({ nums: [1], target: 0 }, mode))).toBe(0);
    expect(finalAnswer(targetSumModule.generateSteps({ nums: [1], target: 1 }, mode))).toBe(1);
    expect(finalAnswer(targetSumModule.generateSteps({ nums: [1], target: -1 }, mode))).toBe(1);
    expect(finalAnswer(targetSumModule.generateSteps({ nums: [1, 2], target: 5 }, mode))).toBe(0);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(targetSumModule.quiz).toHaveLength(4);
    for (const question of targetSumModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(targetSumModule.defaultInput).toEqual({ nums: [1, 1, 1, 1, 1], target: 3 });
    expect(targetSumModule.renderer).toBe('table2d');
    expect(targetSumModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = {
      nums: targetSumModule.defaultInput.nums,
      target: targetSumModule.defaultInput.target,
    };
    expect(validateInput(targetSumModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      targetSumModule.code.python,
      targetSumModule.code.javascript,
      targetSumModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(11);

    // The compute line (line 10) and return line (line 11) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[9]).toContain('dp[i][w]');
      expect(lines[10]).toContain('return dp[n][needed]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        targetSumModule.generateSteps({ nums: [1, 1, 1, 1, 1], target: 3 }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
