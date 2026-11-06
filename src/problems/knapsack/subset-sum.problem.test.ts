import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import subsetSumModule from './subset-sum.problem';
import type { SubsetSumInput } from './subset-sum.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function reference(input: SubsetSumInput): boolean {
  const reachable = new Set<number>([0]);
  for (const value of input.nums) {
    for (const sum of [...reachable]) {
      reachable.add(sum + value);
    }
  }
  return reachable.has(input.target);
}

describe('subset-sum module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(subsetSumModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(subsetSumModule.generateSteps({ nums: [4, 6, 8, 2], target: 10 }, mode))).toBe(true);
    expect(finalAnswer(subsetSumModule.generateSteps({ nums: [1, 2, 3], target: 7 }, mode))).toBe(false);
    expect(finalAnswer(subsetSumModule.generateSteps({ nums: [1, 2, 3], target: 6 }, mode))).toBe(true);
    expect(finalAnswer(subsetSumModule.generateSteps({ nums: [2, 4], target: 3 }, mode))).toBe(false);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(subsetSumModule.quiz).toHaveLength(4);
    for (const question of subsetSumModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(subsetSumModule.defaultInput).toEqual({ nums: [4, 6, 8, 2], target: 10 });
    expect(subsetSumModule.renderer).toBe('table2d');
    expect(subsetSumModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = {
      nums: subsetSumModule.defaultInput.nums,
      target: subsetSumModule.defaultInput.target,
    };
    expect(validateInput(subsetSumModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      subsetSumModule.code.python,
      subsetSumModule.code.javascript,
      subsetSumModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The compute line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][w]');
      expect(lines[7]).toContain('return dp[n][target]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        subsetSumModule.generateSteps({ nums: [4, 6, 8, 2], target: 10 }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
