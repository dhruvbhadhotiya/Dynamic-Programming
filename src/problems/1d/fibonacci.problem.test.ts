import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import fibonacciModule from './fibonacci.problem';
import type { FibonacciInput } from './fibonacci.problem';

const MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];

function reference(input: FibonacciInput): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < input.n; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return a;
}

describe('fibonacci module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(fibonacciModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns fib(0)=0, fib(1)=1, fib(10)=55 in %s mode', (mode) => {
    expect(finalAnswer(fibonacciModule.generateSteps({ n: 0 }, mode))).toBe(0);
    expect(finalAnswer(fibonacciModule.generateSteps({ n: 1 }, mode))).toBe(1);
    expect(finalAnswer(fibonacciModule.generateSteps({ n: 10 }, mode))).toBe(55);
  });

  it('has at least 3 quiz questions with valid answer indexes', () => {
    expect(fibonacciModule.quiz.length).toBeGreaterThanOrEqual(3);
    expect(fibonacciModule.quiz.length).toBeLessThanOrEqual(5);
    for (const question of fibonacciModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(fibonacciModule.defaultInput).toEqual({ n: 8 });
    expect(fibonacciModule.renderer).toBe('table1d');
    const values: Record<string, unknown> = { n: fibonacciModule.defaultInput.n };
    expect(validateInput(fibonacciModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      fibonacciModule.code.python,
      fibonacciModule.code.javascript,
      fibonacciModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    // The compute line (line 6) and return line (line 7) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i]');
      expect(lines[6]).toContain('return dp[n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        fibonacciModule.generateSteps({ n: 8 }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
