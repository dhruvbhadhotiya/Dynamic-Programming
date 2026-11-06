import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import rodCuttingModule from './rod-cutting.problem';
import type { RodCuttingInput } from './rod-cutting.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function reference(input: RodCuttingInput): number {
  const rawPrices = Array.isArray(input.prices) ? input.prices : [];
  const prices = rawPrices
    .slice(0, 6)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 17) : 1));
  const n =
    typeof input.n === 'number' && Number.isFinite(input.n) ? clampInt(input.n, 1, 12) : 1;

  // Independent brute force: DFS over every ordered cutting that exactly
  // fills length n. Compositions of n are at most 2^(n-1) = 2048 for n <= 12.
  let best = 0;
  const dfs = (remaining: number, total: number): void => {
    if (remaining === 0) {
      best = Math.max(best, total);
      return;
    }
    for (let piece = 1; piece <= prices.length && piece <= remaining; piece += 1) {
      dfs(remaining - piece, total + (prices[piece - 1] ?? 0));
    }
  };
  dfs(n, 0);
  return best;
}

describe('rod-cutting module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(rodCuttingModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(
      finalAnswer(
        rodCuttingModule.generateSteps({ prices: [1, 5, 8, 9, 10, 17], n: 5 }, mode),
      ),
    ).toBe(13);
    expect(
      finalAnswer(
        rodCuttingModule.generateSteps({ prices: [1, 5, 8, 9, 10, 17], n: 4 }, mode),
      ),
    ).toBe(10);
    expect(finalAnswer(rodCuttingModule.generateSteps({ prices: [2], n: 6 }, mode))).toBe(12);
    expect(finalAnswer(rodCuttingModule.generateSteps({ prices: [5], n: 1 }, mode))).toBe(5);
    expect(
      finalAnswer(
        rodCuttingModule.generateSteps({ prices: [1, 5, 8, 9, 10, 17], n: 8 }, mode),
      ),
    ).toBe(22);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(rodCuttingModule.quiz).toHaveLength(4);
    for (const question of rodCuttingModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(rodCuttingModule.defaultInput).toEqual({ prices: [1, 5, 8, 9, 10, 17], n: 5 });
    expect(rodCuttingModule.renderer).toBe('table2d');
    expect(rodCuttingModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...rodCuttingModule.defaultInput };
    expect(validateInput(rodCuttingModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      rodCuttingModule.code.python,
      rodCuttingModule.code.javascript,
      rodCuttingModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The compute line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][l]');
      expect(lines[7]).toContain('return dp[m][n]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        rodCuttingModule
          .generateSteps({ prices: [1, 5, 8, 9, 10, 17], n: 5 }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
