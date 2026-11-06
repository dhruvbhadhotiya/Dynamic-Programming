import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import houseRobberModule from './house-robber.problem';
import type { HouseRobberInput } from './house-robber.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

function reference(input: HouseRobberInput): number {
  let prev2 = 0;
  let prev1 = 0;
  for (const value of input.nums) {
    const current = Math.max(prev1, prev2 + value);
    prev2 = prev1;
    prev1 = current;
  }
  return prev1;
}

describe('house-robber module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(houseRobberModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(houseRobberModule.generateSteps({ nums: [2, 7, 9, 3, 1] }, mode))).toBe(12);
    expect(finalAnswer(houseRobberModule.generateSteps({ nums: [2, 1, 1, 2] }, mode))).toBe(4);
    expect(finalAnswer(houseRobberModule.generateSteps({ nums: [5] }, mode))).toBe(5);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(houseRobberModule.quiz).toHaveLength(4);
    for (const question of houseRobberModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(houseRobberModule.defaultInput).toEqual({ nums: [2, 7, 9, 3, 1] });
    expect(houseRobberModule.renderer).toBe('table1d');
    expect(houseRobberModule.modes).toEqual(['bruteforce', 'memo', 'tabulation']);
    const values: Record<string, unknown> = { nums: houseRobberModule.defaultInput.nums };
    expect(validateInput(houseRobberModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      houseRobberModule.code.python,
      houseRobberModule.code.javascript,
      houseRobberModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    // The compute line (line 6) and return line (line 7) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i]');
      expect(lines[6]).toContain('return dp[n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        houseRobberModule.generateSteps({ nums: [2, 7, 9, 3, 1] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
