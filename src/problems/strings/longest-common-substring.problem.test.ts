import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import longestCommonSubstringModule from './longest-common-substring.problem';
import type { LongestCommonSubstringInput } from './longest-common-substring.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function reference(input: LongestCommonSubstringInput): number {
  const { a, b } = input;
  if (a.length === 0 || b.length === 0) return 0;
  const minLength = Math.min(a.length, b.length);
  for (let length = minLength; length > 0; length -= 1) {
    for (let start = 0; start + length <= a.length; start += 1) {
      const candidate = a.slice(start, start + length);
      if (b.includes(candidate)) return length;
    }
  }
  return 0;
}

describe('longest-common-substring module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(longestCommonSubstringModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(longestCommonSubstringModule.generateSteps({ a: 'abcde', b: 'bcd' }, mode))).toBe(3);
    expect(finalAnswer(longestCommonSubstringModule.generateSteps({ a: 'abc', b: 'def' }, mode))).toBe(0);
    expect(finalAnswer(longestCommonSubstringModule.generateSteps({ a: 'abcdef', b: 'cdefgh' }, mode))).toBe(4);
    expect(finalAnswer(longestCommonSubstringModule.generateSteps({ a: 'aaaa', b: 'aa' }, mode))).toBe(2);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(longestCommonSubstringModule.quiz).toHaveLength(4);
    for (const question of longestCommonSubstringModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(longestCommonSubstringModule.defaultInput).toEqual({ a: 'abcde', b: 'bcd' });
    expect(longestCommonSubstringModule.renderer).toBe('stringAlign');
    expect(longestCommonSubstringModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = {
      a: longestCommonSubstringModule.defaultInput.a,
      b: longestCommonSubstringModule.defaultInput.b,
    };
    expect(validateInput(longestCommonSubstringModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      longestCommonSubstringModule.code.python,
      longestCommonSubstringModule.code.javascript,
      longestCommonSubstringModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The compute line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][j]');
      expect(lines[7]).toContain('return best');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        longestCommonSubstringModule
          .generateSteps({ a: 'abcde', b: 'bcd' }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
