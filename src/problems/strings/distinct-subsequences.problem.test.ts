import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt, rngPick } from '../../engine/random';
import type { Rng } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import distinctSubsequencesModule from './distinct-subsequences.problem';
import type { DistinctSubsequencesInput } from './distinct-subsequences.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

function reference(input: DistinctSubsequencesInput): number {
  const { s, t } = input;
  const memo = new Map<string, number>();
  const solve = (i: number, j: number): number => {
    const key = `${i},${j}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let result: number;
    if (j === 0) {
      result = 1;
    } else if (i === 0) {
      result = 0;
    } else if (s[i - 1] === t[j - 1]) {
      result = solve(i - 1, j) + solve(i - 1, j - 1);
    } else {
      result = solve(i - 1, j);
    }
    memo.set(key, result);
    return result;
  };
  return solve(s.length, t.length);
}

function makeWord(rng: Rng): string {
  const length = rngInt(rng, 1, 7);
  return Array.from({ length }, () => rngPick(rng, LETTERS)).join('');
}

function inputGenerator(rng: Rng): DistinctSubsequencesInput {
  return { s: makeWord(rng), t: makeWord(rng) };
}

describe('distinct-subsequences module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(distinctSubsequencesModule, reference, { cases: 20, seed: 1, inputGenerator });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(distinctSubsequencesModule.generateSteps({ s: 'rabbbit', t: 'rabbit' }, mode))).toBe(3);
    expect(finalAnswer(distinctSubsequencesModule.generateSteps({ s: 'babgbag', t: 'bag' }, mode))).toBe(5);
    expect(finalAnswer(distinctSubsequencesModule.generateSteps({ s: 'abc', t: 'def' }, mode))).toBe(0);
    expect(finalAnswer(distinctSubsequencesModule.generateSteps({ s: 'abc', t: 'abc' }, mode))).toBe(1);
    expect(finalAnswer(distinctSubsequencesModule.generateSteps({ s: 'aaaa', t: 'aa' }, mode))).toBe(6);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(distinctSubsequencesModule.quiz).toHaveLength(4);
    for (const question of distinctSubsequencesModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(distinctSubsequencesModule.defaultInput).toEqual({ s: 'rabbbit', t: 'rabbit' });
    expect(distinctSubsequencesModule.renderer).toBe('stringAlign');
    expect(distinctSubsequencesModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { s: distinctSubsequencesModule.defaultInput.s, t: distinctSubsequencesModule.defaultInput.t };
    expect(validateInput(distinctSubsequencesModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [distinctSubsequencesModule.code.python, distinctSubsequencesModule.code.javascript, distinctSubsequencesModule.code.cpp];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The compute line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][j]');
      expect(lines[7]).toContain('return dp[m][n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        distinctSubsequencesModule.generateSteps({ s: 'rabbbit', t: 'rabbit' }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
