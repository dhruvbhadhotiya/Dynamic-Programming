import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt, rngPick } from '../../engine/random';
import type { Rng } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import lcsModule from './lcs.problem';
import type { LcsInput } from './lcs.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

function reference(input: LcsInput): number {
  const { a, b } = input;
  const memo = new Map<string, number>();
  const solve = (i: number, j: number): number => {
    const key = `${i},${j}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let result: number;
    if (i === 0 || j === 0) {
      result = 0;
    } else if (a[i - 1] === b[j - 1]) {
      result = solve(i - 1, j - 1) + 1;
    } else {
      result = Math.max(solve(i - 1, j), solve(i, j - 1));
    }
    memo.set(key, result);
    return result;
  };
  return solve(a.length, b.length);
}

function makeWord(rng: Rng): string {
  const length = rngInt(rng, 1, 8);
  return Array.from({ length }, () => rngPick(rng, LETTERS)).join('');
}

function inputGenerator(rng: Rng): LcsInput {
  return { a: makeWord(rng), b: makeWord(rng) };
}

describe('lcs module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(lcsModule, reference, { cases: 20, seed: 1, inputGenerator });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(lcsModule.generateSteps({ a: 'abcde', b: 'ace' }, mode))).toBe(3);
    expect(finalAnswer(lcsModule.generateSteps({ a: 'abc', b: 'def' }, mode))).toBe(0);
    expect(finalAnswer(lcsModule.generateSteps({ a: 'abc', b: 'abc' }, mode))).toBe(3);
    expect(finalAnswer(lcsModule.generateSteps({ a: 'aggtab', b: 'gxtxayb' }, mode))).toBe(4);
    expect(finalAnswer(lcsModule.generateSteps({ a: 'abcde', b: 'abcde' }, mode))).toBe(5);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(lcsModule.quiz).toHaveLength(4);
    for (const question of lcsModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(lcsModule.defaultInput).toEqual({ a: 'abcde', b: 'ace' });
    expect(lcsModule.renderer).toBe('stringAlign');
    expect(lcsModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { a: lcsModule.defaultInput.a, b: lcsModule.defaultInput.b };
    expect(validateInput(lcsModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [lcsModule.code.python, lcsModule.code.javascript, lcsModule.code.cpp];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    // The compute line (line 6) and return line (line 7) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i][j]');
      expect(lines[6]).toContain('return dp[m][n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        lcsModule.generateSteps({ a: 'abcde', b: 'ace' }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
