import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt, rngPick } from '../../engine/random';
import type { Rng } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import shortestCommonSupersequenceModule from './shortest-common-supersequence.problem';
import type { ShortestCommonSupersequenceInput } from './shortest-common-supersequence.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

function reference(input: ShortestCommonSupersequenceInput): number {
  const { a, b } = input;
  const memo = new Map<string, number>();
  const lcs = (i: number, j: number): number => {
    const key = `${i},${j}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let result: number;
    if (i === 0 || j === 0) {
      result = 0;
    } else if (a[i - 1] === b[j - 1]) {
      result = lcs(i - 1, j - 1) + 1;
    } else {
      result = Math.max(lcs(i - 1, j), lcs(i, j - 1));
    }
    memo.set(key, result);
    return result;
  };
  return a.length + b.length - lcs(a.length, b.length);
}

function makeWord(rng: Rng): string {
  const length = rngInt(rng, 1, 7);
  return Array.from({ length }, () => rngPick(rng, LETTERS)).join('');
}

function inputGenerator(rng: Rng): ShortestCommonSupersequenceInput {
  return { a: makeWord(rng), b: makeWord(rng) };
}

describe('shortest-common-supersequence module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(shortestCommonSupersequenceModule, reference, { cases: 20, seed: 1, inputGenerator });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(shortestCommonSupersequenceModule.generateSteps({ a: 'abac', b: 'cab' }, mode))).toBe(5);
    expect(finalAnswer(shortestCommonSupersequenceModule.generateSteps({ a: 'abc', b: 'def' }, mode))).toBe(6);
    expect(finalAnswer(shortestCommonSupersequenceModule.generateSteps({ a: 'abc', b: 'abc' }, mode))).toBe(3);
    expect(finalAnswer(shortestCommonSupersequenceModule.generateSteps({ a: 'abcde', b: 'ace' }, mode))).toBe(5);
    expect(finalAnswer(shortestCommonSupersequenceModule.generateSteps({ a: 'ab', b: 'ba' }, mode))).toBe(3);
  });

  it('exposes a valid supersequence string in the final step vars', () => {
    const steps = shortestCommonSupersequenceModule.generateSteps({ a: 'abac', b: 'cab' }, 'tabulation');
    const vars = steps.at(-1)?.vars;
    expect(vars?.['answer']).toBe(5);
    expect(typeof vars?.['supersequence']).toBe('string');
    const seq = String(vars?.['supersequence'] ?? '');
    expect(seq.length).toBe(5);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(shortestCommonSupersequenceModule.quiz).toHaveLength(4);
    for (const question of shortestCommonSupersequenceModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(shortestCommonSupersequenceModule.defaultInput).toEqual({ a: 'abac', b: 'cab' });
    expect(shortestCommonSupersequenceModule.renderer).toBe('stringAlign');
    expect(shortestCommonSupersequenceModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = {
      a: shortestCommonSupersequenceModule.defaultInput.a,
      b: shortestCommonSupersequenceModule.defaultInput.b,
    };
    expect(validateInput(shortestCommonSupersequenceModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      shortestCommonSupersequenceModule.code.python,
      shortestCommonSupersequenceModule.code.javascript,
      shortestCommonSupersequenceModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i][j]');
      expect(lines[6]).toContain('return dp[m][n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        shortestCommonSupersequenceModule.generateSteps({ a: 'abac', b: 'cab' }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
