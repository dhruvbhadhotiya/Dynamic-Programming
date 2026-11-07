import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt, rngPick } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import palindromePartitionIIModule from './palindrome-partition-ii.problem';
import type { PalindromePartitionIIInput } from './palindrome-partition-ii.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function normalize(input: PalindromePartitionIIInput): string {
  const raw = typeof input.s === 'string' ? input.s : '';
  const s = raw.toLowerCase().replace(/[^a-z]/g, '').slice(0, 7);
  return s.length > 0 ? s : 'a';
}

function isPalindrome(s: string, i: number, j: number): boolean {
  let left = i;
  let right = j;
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left += 1;
    right -= 1;
  }
  return true;
}

/** Independent reference: check every subset of cut positions. */
function reference(input: PalindromePartitionIIInput): number {
  const s = normalize(input);
  const n = s.length;
  if (n <= 1) return 0;

  let best = n - 1;
  for (let mask = 0; mask < 1 << (n - 1); mask += 1) {
    let start = 0;
    let cuts = 0;
    let ok = true;
    for (let i = 0; i < n - 1; i += 1) {
      if ((mask & (1 << i)) === 0) continue;
      if (!isPalindrome(s, start, i)) {
        ok = false;
        break;
      }
      start = i + 1;
      cuts += 1;
    }
    if (ok && isPalindrome(s, start, n - 1)) best = Math.min(best, cuts);
  }
  return best;
}

describe('palindrome-partition-ii module', () => {
  it('produces valid steps matching the subset reference on 20 seeded inputs', () => {
    runModuleChecks(palindromePartitionIIModule, reference, {
      cases: 20,
      seed: 1,
      inputGenerator: (rng) => {
        const length = rngInt(rng, 1, 7);
        let s = '';
        for (let i = 0; i < length; i += 1) s += rngPick(rng, ['a', 'b', 'c', 'd']);
        return { s };
      },
    });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(palindromePartitionIIModule.generateSteps({ s: 'aab' }, mode))).toBe(1);
    expect(finalAnswer(palindromePartitionIIModule.generateSteps({ s: 'aba' }, mode))).toBe(0);
    expect(finalAnswer(palindromePartitionIIModule.generateSteps({ s: 'abcba' }, mode))).toBe(0);
    expect(finalAnswer(palindromePartitionIIModule.generateSteps({ s: 'ab' }, mode))).toBe(1);
    expect(finalAnswer(palindromePartitionIIModule.generateSteps({ s: 'a' }, mode))).toBe(0);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(palindromePartitionIIModule.quiz).toHaveLength(4);
    for (const question of palindromePartitionIIModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(palindromePartitionIIModule.defaultInput).toEqual({ s: 'aab' });
    expect(palindromePartitionIIModule.renderer).toBe('intervalTriangle');
    expect(palindromePartitionIIModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...palindromePartitionIIModule.defaultInput };
    expect(validateInput(palindromePartitionIIModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      palindromePartitionIIModule.code.python,
      palindromePartitionIIModule.code.javascript,
      palindromePartitionIIModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i][j]');
      expect(lines[6]).toContain('return dp[0][n - 1]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        palindromePartitionIIModule
          .generateSteps({ s: 'aab' }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
