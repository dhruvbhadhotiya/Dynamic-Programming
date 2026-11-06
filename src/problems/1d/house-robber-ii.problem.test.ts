import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import houseRobberIIModule from './house-robber-ii.problem';
import type { HouseRobberIIInput } from './house-robber-ii.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

function reference(input: HouseRobberIIInput): number {
  const nums = input.nums;
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0] ?? 0;
  const robLine = (a: number[]): number => {
    let prev = 0;
    let cur = 0;
    for (const x of a) {
      const take = prev + x;
      prev = cur;
      cur = Math.max(cur, take);
    }
    return cur;
  };
  return Math.max(robLine(nums.slice(0, -1)), robLine(nums.slice(1)));
}

describe('house-robber-ii module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(houseRobberIIModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns the circle answers in %s mode', (mode) => {
    expect(finalAnswer(houseRobberIIModule.generateSteps({ nums: [2, 3, 2] }, mode))).toBe(3);
    expect(finalAnswer(houseRobberIIModule.generateSteps({ nums: [1, 2, 3, 1] }, mode))).toBe(4);
    expect(finalAnswer(houseRobberIIModule.generateSteps({ nums: [2, 1, 1, 2] }, mode))).toBe(3);
  });

  it('handles single-house and two-house circles in every mode', () => {
    for (const mode of MODES) {
      expect(finalAnswer(houseRobberIIModule.generateSteps({ nums: [5] }, mode))).toBe(5);
      expect(finalAnswer(houseRobberIIModule.generateSteps({ nums: [2, 7] }, mode))).toBe(7);
    }
  });

  it('has exactly 4 quiz questions with valid answer indexes', () => {
    expect(houseRobberIIModule.quiz.length).toBe(4);
    for (const question of houseRobberIIModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(houseRobberIIModule.defaultInput).toEqual({ nums: [2, 3, 2] });
    expect(houseRobberIIModule.renderer).toBe('table1d');
    const values: Record<string, unknown> = { nums: houseRobberIIModule.defaultInput.nums };
    expect(validateInput(houseRobberIIModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      houseRobberIIModule.code.python,
      houseRobberIIModule.code.javascript,
      houseRobberIIModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(11);

    // The recurrence line (line 9) is shared across languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[8]).toContain('max(cur');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        houseRobberIIModule.generateSteps({ nums: [2, 3, 2] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
