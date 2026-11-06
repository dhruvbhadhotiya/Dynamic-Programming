import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt, rngPick } from '../../engine/random';
import type { Rng } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import wildcardMatchingModule from './wildcard-matching.problem';
import type { WildcardMatchingInput } from './wildcard-matching.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
const PATTERN_CHARS = ['a', 'b', 'c', 'd', 'e', '?', '*'] as const;

function reference(input: WildcardMatchingInput): boolean {
  const { s, p } = input;
  const memo = new Map<string, boolean>();
  const solve = (i: number, j: number): boolean => {
    const key = `${i},${j}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let result: boolean;
    if (j === 0) {
      result = i === 0;
    } else if (i === 0) {
      result = (p[j - 1] === '*' && solve(0, j - 1)) || false;
    } else if (p[j - 1] === '*') {
      result = solve(i - 1, j) || solve(i, j - 1);
    } else if (p[j - 1] === '?' || p[j - 1] === s[i - 1]) {
      result = solve(i - 1, j - 1);
    } else {
      result = false;
    }
    memo.set(key, result);
    return result;
  };
  return solve(s.length, p.length);
}

function makeS(rng: Rng): string {
  const length = rngInt(rng, 1, 6);
  return Array.from({ length }, () => rngPick(rng, LETTERS)).join('');
}

function makeP(rng: Rng): string {
  const length = rngInt(rng, 1, 6);
  return Array.from({ length }, () => rngPick(rng, PATTERN_CHARS)).join('');
}

function inputGenerator(rng: Rng): WildcardMatchingInput {
  return { s: makeS(rng), p: makeP(rng) };
}

describe('wildcard-matching module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(wildcardMatchingModule, reference, { cases: 20, seed: 1, inputGenerator });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(wildcardMatchingModule.generateSteps({ s: 'aa', p: '*' }, mode))).toBe(true);
    expect(finalAnswer(wildcardMatchingModule.generateSteps({ s: 'cb', p: '?a' }, mode))).toBe(false);
    expect(finalAnswer(wildcardMatchingModule.generateSteps({ s: 'adceb', p: '*a*b' }, mode))).toBe(true);
    expect(finalAnswer(wildcardMatchingModule.generateSteps({ s: 'aa', p: '?' }, mode))).toBe(false);
    expect(finalAnswer(wildcardMatchingModule.generateSteps({ s: 'a', p: '?' }, mode))).toBe(true);
    expect(finalAnswer(wildcardMatchingModule.generateSteps({ s: 'abc', p: 'a*c' }, mode))).toBe(true);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(wildcardMatchingModule.quiz).toHaveLength(4);
    for (const question of wildcardMatchingModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(wildcardMatchingModule.defaultInput).toEqual({ s: 'aa', p: '*' });
    expect(wildcardMatchingModule.renderer).toBe('stringAlign');
    expect(wildcardMatchingModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = {
      s: wildcardMatchingModule.defaultInput.s,
      p: wildcardMatchingModule.defaultInput.p,
    };
    expect(validateInput(wildcardMatchingModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      wildcardMatchingModule.code.python,
      wildcardMatchingModule.code.javascript,
      wildcardMatchingModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][j]');
      expect(lines[7]).toContain('return dp[m][n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        wildcardMatchingModule.generateSteps({ s: 'aa', p: '*' }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
