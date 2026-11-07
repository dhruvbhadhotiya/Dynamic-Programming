import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import uniqueBstsModule from './unique-bsts.problem';
import type { UniqueBstsInput } from './unique-bsts.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

/** Independent reference: Catalan number C(2n, n) / (n + 1) via an integer-safe binomial. */
function binomial(n: number, k: number): number {
  const small = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= small; i += 1) {
    result = (result * (n - small + i)) / i;
  }
  return result;
}

function reference(input: UniqueBstsInput): number {
  return binomial(2 * input.n, input.n) / (input.n + 1);
}

describe('unique-bsts module', () => {
  it(
    'produces valid steps matching the Catalan reference on 20 seeded inputs',
    () => {
      runModuleChecks(uniqueBstsModule, reference, { cases: 20, seed: 1 });
    },
    30000,
  );

  it.each(MODES)('returns the known Catalan values in %s mode', (mode) => {
    expect(finalAnswer(uniqueBstsModule.generateSteps({ n: 1 }, mode))).toBe(1);
    expect(finalAnswer(uniqueBstsModule.generateSteps({ n: 3 }, mode))).toBe(5);
    expect(finalAnswer(uniqueBstsModule.generateSteps({ n: 5 }, mode))).toBe(42);
    expect(finalAnswer(uniqueBstsModule.generateSteps({ n: 10 }, mode))).toBe(16796);
  });

  it.each(MODES)('normalizes out-of-range input in %s mode', (mode) => {
    expect(finalAnswer(uniqueBstsModule.generateSteps({ n: 0 }, mode))).toBe(1);
    expect(finalAnswer(uniqueBstsModule.generateSteps({ n: -5 }, mode))).toBe(1);
    expect(finalAnswer(uniqueBstsModule.generateSteps({ n: 99 }, mode))).toBe(16796);
    expect(finalAnswer(uniqueBstsModule.generateSteps({ n: 3.7 }, mode))).toBe(14);
    expect(finalAnswer(uniqueBstsModule.generateSteps({ n: Number.NaN }, mode))).toBe(1);
  });

  it('has exactly 4 quiz questions with valid answer indexes', () => {
    expect(uniqueBstsModule.quiz).toHaveLength(4);
    for (const question of uniqueBstsModule.quiz) {
      expect(question.options.length).toBeGreaterThan(1);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput and metadata', () => {
    expect(uniqueBstsModule.id).toBe('unique-bsts');
    expect(uniqueBstsModule.category).toBe('counting');
    expect(uniqueBstsModule.difficulty).toBe('medium');
    expect(uniqueBstsModule.renderer).toBe('table1d');
    expect(uniqueBstsModule.modes).toEqual(['memo', 'tabulation']);
    expect(uniqueBstsModule.defaultInput).toEqual({ n: 5 });
    const values: Record<string, unknown> = { n: uniqueBstsModule.defaultInput.n };
    expect(validateInput(uniqueBstsModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      uniqueBstsModule.code.python,
      uniqueBstsModule.code.javascript,
      uniqueBstsModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i]');
      expect(lines[6]).toContain('return dp[n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        uniqueBstsModule.generateSteps({ n: 5 }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
