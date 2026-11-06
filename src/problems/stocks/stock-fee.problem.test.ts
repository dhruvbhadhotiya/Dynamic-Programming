import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import stockFeeModule from './stock-fee.problem';
import type { StockFeeInput } from './stock-fee.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function reference(input: StockFeeInput): number {
  const prices = input.prices;
  const fee = input.fee;
  const memo = new Map<string, number>();
  const solve = (day: number, holding: boolean): number => {
    if (day >= prices.length) return 0;
    const key = `${day}:${holding ? 1 : 0}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const price = prices[day] ?? 0;
    const best = holding
      ? Math.max(price - fee + solve(day + 1, false), solve(day + 1, true))
      : Math.max(-price + solve(day + 1, true), solve(day + 1, false));
    memo.set(key, best);
    return best;
  };
  return Math.max(0, solve(0, false));
}

describe('stock-fee module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(stockFeeModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    // Default [1, 3, 2, 8, 4, 10] fee 2: (8 - 1 - 2) + (10 - 4 - 2) = 5 + 4 = 9.
    // Note: task spec lists this default as 8, but the canonical LeetCode
    // example earning 8 uses the last price 9 ([1, 3, 2, 8, 4, 9] fee 2),
    // verified below. With last price 10 the optimum is 9.
    expect(finalAnswer(stockFeeModule.generateSteps({ prices: [1, 3, 2, 8, 4, 10], fee: 2 }, mode))).toBe(9);
    expect(finalAnswer(stockFeeModule.generateSteps({ prices: [1, 3, 2, 8, 4, 10], fee: 0 }, mode))).toBe(14);
    expect(finalAnswer(stockFeeModule.generateSteps({ prices: [1, 3, 2, 8, 4, 9], fee: 2 }, mode))).toBe(8);
    expect(finalAnswer(stockFeeModule.generateSteps({ prices: [6, 5, 4, 3, 2, 1], fee: 2 }, mode))).toBe(0);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(stockFeeModule.quiz).toHaveLength(4);
    for (const question of stockFeeModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(stockFeeModule.defaultInput).toEqual({ prices: [1, 3, 2, 8, 4, 10], fee: 2 });
    expect(stockFeeModule.renderer).toBe('table1d');
    expect(stockFeeModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = {
      prices: stockFeeModule.defaultInput.prices,
      fee: stockFeeModule.defaultInput.fee,
    };
    expect(validateInput(stockFeeModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      stockFeeModule.code.python,
      stockFeeModule.code.javascript,
      stockFeeModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    // The transition line (line 6) and return line (line 7) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('cash[i]');
      expect(lines[5]).toContain('hold');
      expect(lines[6]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        stockFeeModule.generateSteps({ prices: [1, 3, 2, 8, 4, 10], fee: 2 }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
