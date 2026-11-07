import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import stockIvModule from './stock-iv.problem';
import type { StockIvInput } from './stock-iv.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function reference(input: StockIvInput): number {
  const prices = input.prices;
  const n = prices.length;
  let best = 0;
  const dfs = (i: number, remaining: number, holding: boolean, profit: number): void => {
    if (i === n) {
      if (profit > best) best = profit;
      return;
    }
    const price = prices[i] ?? 0;
    dfs(i + 1, remaining, holding, profit);
    if (holding) {
      dfs(i + 1, remaining, false, profit + price);
    }
    if (!holding && remaining > 0) {
      dfs(i + 1, remaining - 1, true, profit - price);
    }
  };
  dfs(0, input.k, false, 0);
  return best;
}

describe('stock-iv module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(stockIvModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(stockIvModule.generateSteps({ k: 2, prices: [3, 2, 6, 5, 0, 3] }, mode))).toBe(7);
    expect(finalAnswer(stockIvModule.generateSteps({ k: 0, prices: [3, 2, 6, 5, 0, 3] }, mode))).toBe(0);
    expect(finalAnswer(stockIvModule.generateSteps({ k: 1, prices: [2, 4, 1] }, mode))).toBe(2);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(stockIvModule.quiz).toHaveLength(4);
    for (const question of stockIvModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(stockIvModule.defaultInput).toEqual({ k: 2, prices: [3, 2, 6, 5, 0, 3] });
    expect(stockIvModule.renderer).toBe('table1d');
    expect(stockIvModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = {
      k: stockIvModule.defaultInput.k,
      prices: stockIvModule.defaultInput.prices,
    };
    expect(validateInput(stockIvModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      stockIvModule.code.python,
      stockIvModule.code.javascript,
      stockIvModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(11);

    // The cash-update line (line 9) and return line (line 11) line up in every language.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[8]).toContain('cash[t]');
      expect(lines[10]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        stockIvModule.generateSteps({ k: 2, prices: [3, 2, 6, 5, 0, 3] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
