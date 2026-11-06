import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import partitionEqualSubsetModule from './partition-equal-subset.problem';
import type { PartitionEqualSubsetInput } from './partition-equal-subset.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

function reference(input: PartitionEqualSubsetInput): boolean {
  const total = input.nums.reduce((sum, value) => sum + value, 0);
  if (total % 2 === 1) return false;
  const target = total / 2;
  const reachable = new Set<number>([0]);
  for (const value of input.nums) {
    for (const sum of [...reachable]) {
      reachable.add(sum + value);
    }
  }
  return reachable.has(target);
}

describe('partition-equal-subset module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(partitionEqualSubsetModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(partitionEqualSubsetModule.generateSteps({ nums: [1, 5, 11, 5] }, mode))).toBe(true);
    expect(finalAnswer(partitionEqualSubsetModule.generateSteps({ nums: [1, 2, 3, 5] }, mode))).toBe(false);
    expect(finalAnswer(partitionEqualSubsetModule.generateSteps({ nums: [1, 2, 4, 6] }, mode))).toBe(false);
    expect(finalAnswer(partitionEqualSubsetModule.generateSteps({ nums: [2, 2, 2, 2] }, mode))).toBe(true);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(partitionEqualSubsetModule.quiz).toHaveLength(4);
    for (const question of partitionEqualSubsetModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(partitionEqualSubsetModule.defaultInput).toEqual({ nums: [1, 5, 11, 5] });
    expect(partitionEqualSubsetModule.renderer).toBe('table2d');
    expect(partitionEqualSubsetModule.modes).toEqual(['bruteforce', 'memo', 'tabulation']);
    const values: Record<string, unknown> = { nums: partitionEqualSubsetModule.defaultInput.nums };
    expect(validateInput(partitionEqualSubsetModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      partitionEqualSubsetModule.code.python,
      partitionEqualSubsetModule.code.javascript,
      partitionEqualSubsetModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(11);

    // The compute line (line 10) and return line (line 11) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[9]).toContain('dp[i][w]');
      expect(lines[10]).toContain('return dp[n][target]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        partitionEqualSubsetModule.generateSteps({ nums: [1, 5, 11, 5] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
