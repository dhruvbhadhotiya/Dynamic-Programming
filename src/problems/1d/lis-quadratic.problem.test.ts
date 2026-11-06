import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import lisQuadraticModule from './lis-quadratic.problem';
import type { LisQuadraticInput } from './lis-quadratic.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

/** Independent reference: patience sorting with binary search (O(n log n)). */
function reference(input: LisQuadraticInput): number {
  const tails: number[] = [];
  for (const value of input.nums) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((tails[mid] ?? 0) < value) lo = mid + 1;
      else hi = mid;
    }
    if (lo === tails.length) tails.push(value);
    else tails[lo] = value;
  }
  return tails.length;
}

describe('lis-quadratic module', () => {
  it(
    'produces valid steps matching the reference on 20 seeded inputs',
    () => {
      runModuleChecks(lisQuadraticModule, reference, { cases: 20, seed: 1 });
    },
    30000,
  );

  it.each(MODES)('returns known LIS values in %s mode', (mode) => {
    expect(finalAnswer(lisQuadraticModule.generateSteps({ nums: [10, 9, 2, 5, 3, 7, 101, 18] }, mode))).toBe(4);
    expect(finalAnswer(lisQuadraticModule.generateSteps({ nums: [0, 1, 0, 3, 2, 3] }, mode))).toBe(4);
    expect(finalAnswer(lisQuadraticModule.generateSteps({ nums: [5] }, mode))).toBe(1);
    expect(finalAnswer(lisQuadraticModule.generateSteps({ nums: [1, 2, 3, 4] }, mode))).toBe(4);
    expect(finalAnswer(lisQuadraticModule.generateSteps({ nums: [4, 3, 2, 1] }, mode))).toBe(1);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(lisQuadraticModule.quiz).toHaveLength(4);
    for (const question of lisQuadraticModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(lisQuadraticModule.defaultInput).toEqual({ nums: [10, 9, 2, 5, 3, 7, 101, 18] });
    expect(lisQuadraticModule.renderer).toBe('table1d');
    expect(lisQuadraticModule.complexity.time).toBe('O(n^2)');
    expect(lisQuadraticModule.modes).toEqual(['bruteforce', 'memo', 'tabulation']);
    const values: Record<string, unknown> = { nums: lisQuadraticModule.defaultInput.nums };
    expect(validateInput(lisQuadraticModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      lisQuadraticModule.code.python,
      lisQuadraticModule.code.javascript,
      lisQuadraticModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The dp-update line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i]');
      expect(lines[7]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        lisQuadraticModule.generateSteps({ nums: [10, 9, 2, 5, 3, 7, 101, 18] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
