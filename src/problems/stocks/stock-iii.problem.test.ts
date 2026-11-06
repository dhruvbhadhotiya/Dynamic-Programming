import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import stockIIIModule from './stock-iii.problem';
import type { StockIIIInput } from './stock-iii.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function reference(input: StockIIIInput): number {
  const prices = input.prices;
  const n = prices.length;
  const memo = new Map<string, number>();

  function solve(index: number, transactionsUsed: number, holding: boolean): number {
    if (index >= n) return 0;
    const key = `${index}|${transactionsUsed}|${holding ? 1 : 0}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let best: number;
    if (holding) {
      const sell = (prices[index] ?? 0) + solve(index + 1, transactionsUsed + 1, false);
      const keep = solve(index + 1, transactionsUsed, true);
      best = Math.max(sell, keep);
    } else {
      const skip = solve(index + 1, transactionsUsed, false);
      const buy =
        transactionsUsed < 2 ? -(prices[index] ?? 0) + solve(index + 1, transactionsUsed, true) : Number.NEGATIVE_INFINITY;
      best = Math.max(skip, buy);
    }
    memo.set(key, best);
    return best;
  }

  return solve(0, 0, false);
}

describe('stock-iii module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(stockIIIModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(stockIIIModule.generateSteps({ prices: [3, 2, 6, 5, 0, 3] }, mode))).toBe(7);
    expect(finalAnswer(stockIIIModule.generateSteps({ prices: [2, 4, 1] }, mode))).toBe(2);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(stockIIIModule.quiz).toHaveLength(4);
    for (const question of stockIIIModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(stockIIIModule.defaultInput).toEqual({ prices: [3, 2, 6, 5, 0, 3] });
    expect(stockIIIModule.renderer).toBe('table1d');
    expect(stockIIIModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { prices: stockIIIModule.defaultInput.prices };
    expect(validateInput(stockIIIModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      stockIIIModule.code.python,
      stockIIIModule.code.javascript,
      stockIIIModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(14);

    // The compute line (line 12) and return line (line 14) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[11]).toContain('dp[i]');
      expect(lines[13]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        stockIIIModule.generateSteps({ prices: [3, 2, 6, 5, 0, 3] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
