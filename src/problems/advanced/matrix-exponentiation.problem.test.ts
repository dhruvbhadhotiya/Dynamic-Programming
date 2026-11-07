import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import { isRendererState, type Mode } from '../../engine/types';
import matrixExponentiationModule from './matrix-exponentiation.problem';
import type { MatrixExpInput } from './matrix-exponentiation.problem';

const MODES: readonly Mode[] = ['tabulation'];

/** Independent reference: plain iterative Fibonacci loop. */
function reference(input: MatrixExpInput): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < input.n; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return a;
}

describe('matrix-exponentiation module', () => {
  it('produces valid steps matching the iterative reference on 20 seeded inputs', () => {
    runModuleChecks(matrixExponentiationModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns the known Fibonacci values in %s mode', (mode) => {
    expect(finalAnswer(matrixExponentiationModule.generateSteps({ n: 0 }, mode))).toBe(0);
    expect(finalAnswer(matrixExponentiationModule.generateSteps({ n: 1 }, mode))).toBe(1);
    expect(finalAnswer(matrixExponentiationModule.generateSteps({ n: 2 }, mode))).toBe(1);
    expect(finalAnswer(matrixExponentiationModule.generateSteps({ n: 10 }, mode))).toBe(55);
    expect(finalAnswer(matrixExponentiationModule.generateSteps({ n: 20 }, mode))).toBe(6765);
  });

  it.each(MODES)('normalizes out-of-range input in %s mode', (mode) => {
    expect(finalAnswer(matrixExponentiationModule.generateSteps({ n: -5 }, mode))).toBe(0);
    expect(finalAnswer(matrixExponentiationModule.generateSteps({ n: 99 }, mode))).toBe(6765);
    expect(finalAnswer(matrixExponentiationModule.generateSteps({ n: 3.7 }, mode))).toBe(3);
    expect(finalAnswer(matrixExponentiationModule.generateSteps({ n: Number.NaN }, mode))).toBe(0);
  });

  it('has exactly 4 quiz questions with valid answer indexes', () => {
    expect(matrixExponentiationModule.quiz).toHaveLength(4);
    for (const question of matrixExponentiationModule.quiz) {
      expect(question.options.length).toBeGreaterThan(1);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput and metadata', () => {
    expect(matrixExponentiationModule.id).toBe('matrix-exponentiation');
    expect(matrixExponentiationModule.category).toBe('advanced');
    expect(matrixExponentiationModule.difficulty).toBe('hard');
    expect(matrixExponentiationModule.renderer).toBe('table1d');
    expect(matrixExponentiationModule.modes).toEqual(['tabulation']);
    expect(matrixExponentiationModule.defaultInput).toEqual({ n: 10 });
    const values: Record<string, unknown> = { n: matrixExponentiationModule.defaultInput.n };
    expect(validateInput(matrixExponentiationModule.inputSchema, values)).toEqual({});
    expect(finalAnswer(matrixExponentiationModule.generateSteps({ n: 10 }, 'tabulation'))).toBe(55);
  });

  it('records F at binary powers in the table', () => {
    const steps = matrixExponentiationModule.generateSteps({ n: 10 }, 'tabulation');
    const lastState: unknown = steps.at(-1)?.state;
    expect(isRendererState(lastState)).toBe(true);
    if (isRendererState(lastState) && lastState.kind === 'table1d') {
      expect(lastState.labels).toEqual(['step 0', 'step 1', 'step 2', 'step 3']);
      expect(lastState.values).toEqual([1, 1, 3, 21]);
      expect(lastState.indexName).toBe('bit');
      expect(lastState.caption).toContain('F(2^e)');
      expect(lastState.caption).toContain('step e');
    }
    const zeroState: unknown = matrixExponentiationModule.generateSteps({ n: 0 }, 'tabulation').at(-1)?.state;
    if (isRendererState(zeroState) && zeroState.kind === 'table1d') {
      expect(zeroState.values).toEqual([0]);
    } else {
      throw new Error('expected a table1d state for n = 0');
    }
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      matrixExponentiationModule.code.python,
      matrixExponentiationModule.code.javascript,
      matrixExponentiationModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(13);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[7]).toContain('power');
      expect(lines[12]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        matrixExponentiationModule.generateSteps({ n: 10 }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
