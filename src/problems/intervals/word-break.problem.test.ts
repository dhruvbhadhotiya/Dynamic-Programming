import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt, rngPick } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import wordBreakModule from './word-break.problem';
import type { WordBreakInput } from './word-break.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];
const WORDS = ['a', 'ab', 'abc', 'ba', 'bc', 'c', 'd', 'aa'] as const;

function normalize(input: WordBreakInput): { s: string; words: string[] } {
  const rawS = typeof input.s === 'string' ? input.s : '';
  const s = rawS.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'a';
  const rawWords = Array.isArray(input.wordDict) ? input.wordDict : [];
  const seen = new Set<string>();
  const words: string[] = [];
  for (const value of rawWords) {
    if (words.length >= 5) break;
    if (typeof value !== 'string') continue;
    const word = value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5);
    if (word.length === 0 || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }
  return { s, words: words.length > 0 ? words : ['a'] };
}

/** Independent reference: enumerate every subset of cut positions. */
function reference(input: WordBreakInput): boolean {
  const { s, words } = normalize(input);
  const dictionary = new Set(words);
  const n = s.length;

  for (let mask = 0; mask < 1 << (n - 1); mask += 1) {
    let start = 0;
    let ok = true;
    for (let i = 0; i < n - 1; i += 1) {
      if ((mask & (1 << i)) === 0) continue;
      if (!dictionary.has(s.slice(start, i + 1))) {
        ok = false;
        break;
      }
      start = i + 1;
    }
    if (ok && dictionary.has(s.slice(start))) return true;
  }
  return false;
}

describe('word-break module', () => {
  it('produces valid steps matching the cut-subset reference on 20 seeded inputs', () => {
    runModuleChecks(wordBreakModule, reference, {
      cases: 20,
      seed: 1,
      inputGenerator: (rng) => {
        const wordDict: string[] = [];
        const count = rngInt(rng, 1, 4);
        while (wordDict.length < count) {
          const word = rngPick(rng, WORDS);
          if (!wordDict.includes(word)) wordDict.push(word);
        }

        let s = '';
        const parts = rngInt(rng, 1, 3);
        for (let i = 0; i < parts; i += 1) s += rngPick(rng, wordDict);
        s = s.slice(0, 8);

        if (rngInt(rng, 0, 3) === 0) {
          const pos = rngInt(rng, 0, s.length - 1);
          s = `${s.slice(0, pos)}${rngPick(rng, ['d', 'e'])}${s.slice(pos + 1)}`;
        }
        return { s, wordDict };
      },
    });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(
      finalAnswer(wordBreakModule.generateSteps({ s: 'leetcode', wordDict: ['leet', 'code'] }, mode)),
    ).toBe(true);
    expect(
      finalAnswer(
        wordBreakModule.generateSteps({ s: 'applepenapple', wordDict: ['apple', 'pen'] }, mode),
      ),
    ).toBe(true);
    expect(
      finalAnswer(
        wordBreakModule.generateSteps(
          { s: 'catsandog', wordDict: ['cats', 'dog', 'sand', 'and', 'cat'] },
          mode,
        ),
      ),
    ).toBe(false);
    expect(finalAnswer(wordBreakModule.generateSteps({ s: 'abcd', wordDict: ['a', 'abc', 'bcd'] }, mode))).toBe(
      true,
    );
    expect(finalAnswer(wordBreakModule.generateSteps({ s: 'a', wordDict: ['a'] }, mode))).toBe(true);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(wordBreakModule.quiz).toHaveLength(4);
    for (const question of wordBreakModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(wordBreakModule.defaultInput).toEqual({ s: 'leetcode', wordDict: ['leet', 'code'] });
    expect(wordBreakModule.renderer).toBe('table1d');
    expect(wordBreakModule.modes).toEqual(['bruteforce', 'memo', 'tabulation']);
    const values: Record<string, unknown> = { ...wordBreakModule.defaultInput };
    expect(validateInput(wordBreakModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      wordBreakModule.code.python,
      wordBreakModule.code.javascript,
      wordBreakModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i]');
      expect(lines[6]).toContain('return dp[0]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        wordBreakModule
          .generateSteps({ s: 'leetcode', wordDict: ['leet', 'code'] }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
