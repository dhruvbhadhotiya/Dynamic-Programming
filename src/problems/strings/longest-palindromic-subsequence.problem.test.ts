import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import longestPalindromicSubsequenceModule from './longest-palindromic-subsequence.problem';
import type { LongestPalindromicSubsequenceInput } from './longest-palindromic-subsequence.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function reference(input: LongestPalindromicSubsequenceInput): number {
  const s = input.s.slice(0, 8);
  let best = 0;
  const total = 1 << s.length;
  for (let mask = 0; mask < total; mask += 1) {
    const indices: number[] = [];
    for (let i = 0; i < s.length; i += 1) {
      if ((mask & (1 << i)) !== 0) indices.push(i);
    }
    if (indices.length <= best) continue;
    const sub = indices.map((index) => s[index] ?? '').join('');
    if (sub === [...sub].reverse().join('')) best = sub.length;
  }
  return best;
}

describe('longest-palindromic-subsequence module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(longestPalindromicSubsequenceModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(longestPalindromicSubsequenceModule.generateSteps({ s: 'bbbab' }, mode))).toBe(4);
    expect(finalAnswer(longestPalindromicSubsequenceModule.generateSteps({ s: 'cbbd' }, mode))).toBe(2);
    expect(finalAnswer(longestPalindromicSubsequenceModule.generateSteps({ s: 'a' }, mode))).toBe(1);
    expect(finalAnswer(longestPalindromicSubsequenceModule.generateSteps({ s: 'abc' }, mode))).toBe(1);
    expect(finalAnswer(longestPalindromicSubsequenceModule.generateSteps({ s: 'aa' }, mode))).toBe(2);
    expect(finalAnswer(longestPalindromicSubsequenceModule.generateSteps({ s: 'abca' }, mode))).toBe(3);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(longestPalindromicSubsequenceModule.quiz).toHaveLength(4);
    for (const question of longestPalindromicSubsequenceModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(longestPalindromicSubsequenceModule.defaultInput).toEqual({ s: 'bbbab' });
    expect(longestPalindromicSubsequenceModule.renderer).toBe('stringAlign');
    expect(longestPalindromicSubsequenceModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = {
      s: longestPalindromicSubsequenceModule.defaultInput.s,
    };
    expect(validateInput(longestPalindromicSubsequenceModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      longestPalindromicSubsequenceModule.code.python,
      longestPalindromicSubsequenceModule.code.javascript,
      longestPalindromicSubsequenceModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The compute line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][j]');
      expect(lines[7]).toContain('return dp[n][n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        longestPalindromicSubsequenceModule.generateSteps({ s: 'bbbab' }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
