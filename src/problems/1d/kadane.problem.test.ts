import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import kadaneModule from './kadane.problem';
import type { KadaneInput } from './kadane.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

function reference(input: KadaneInput): number {
  let best = Number.NEGATIVE_INFINITY;
  for (let start = 0; start < input.nums.length; start += 1) {
    let sum = 0;
    for (let end = start; end < input.nums.length; end += 1) {
      sum += input.nums[end] ?? 0;
      if (sum > best) best = sum;
    }
  }
  return best;
}

describe('kadane module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(kadaneModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(kadaneModule.generateSteps({ nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, mode))).toBe(6);
    expect(finalAnswer(kadaneModule.generateSteps({ nums: [-1] }, mode))).toBe(-1);
    expect(finalAnswer(kadaneModule.generateSteps({ nums: [5, 4, -1, 7, 8] }, mode))).toBe(23);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(kadaneModule.quiz).toHaveLength(4);
    for (const question of kadaneModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(kadaneModule.defaultInput).toEqual({ nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] });
    expect(kadaneModule.renderer).toBe('table1d');
    expect(kadaneModule.modes).toEqual(['bruteforce', 'memo', 'tabulation']);
    const values: Record<string, unknown> = { nums: kadaneModule.defaultInput.nums };
    expect(validateInput(kadaneModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      kadaneModule.code.python,
      kadaneModule.code.javascript,
      kadaneModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    // The compute line (line 6) and return line (line 7) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i]');
      expect(lines[6]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        kadaneModule.generateSteps({ nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
