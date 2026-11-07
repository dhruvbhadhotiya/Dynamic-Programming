import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import matrixChainModule from './matrix-chain.problem';
import type { MatrixChainInput } from './matrix-chain.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: MatrixChainInput): number[] {
  const raw = Array.isArray(input.dims) ? input.dims : [];
  const dims = raw
    .slice(0, 6)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 9) : 1,
    );
  if (dims.length === 0) return [1, 2];
  if (dims.length === 1) return [dims[0] ?? 1, dims[0] ?? 1];
  return dims;
}

/** Independent exhaustive reference: try every parenthesization split. */
function reference(input: MatrixChainInput): number {
  const p = normalize(input);
  const solve = (i: number, j: number): number => {
    if (i === j) return 0;
    let best = Number.POSITIVE_INFINITY;
    for (let k = i; k < j; k += 1) {
      const cost =
        solve(i, k) +
        solve(k + 1, j) +
        (p[i] ?? 1) * (p[k + 1] ?? 1) * (p[j + 1] ?? 1);
      best = Math.min(best, cost);
    }
    return best;
  };
  return solve(0, p.length - 2);
}

describe('matrix-chain module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(matrixChainModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(matrixChainModule.generateSteps({ dims: [1, 2, 3, 4] }, mode))).toBe(18);
    expect(finalAnswer(matrixChainModule.generateSteps({ dims: [4, 2, 3, 5] }, mode))).toBe(70);
    expect(finalAnswer(matrixChainModule.generateSteps({ dims: [2, 2, 2] }, mode))).toBe(8);
    expect(finalAnswer(matrixChainModule.generateSteps({ dims: [1, 2] }, mode))).toBe(0);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(matrixChainModule.quiz).toHaveLength(4);
    for (const question of matrixChainModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(matrixChainModule.defaultInput).toEqual({ dims: [1, 2, 3, 4] });
    expect(matrixChainModule.renderer).toBe('intervalTriangle');
    expect(matrixChainModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...matrixChainModule.defaultInput };
    expect(validateInput(matrixChainModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      matrixChainModule.code.python,
      matrixChainModule.code.javascript,
      matrixChainModule.code.cpp,
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
        matrixChainModule
          .generateSteps({ dims: [1, 2, 3, 4] }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
