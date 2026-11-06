import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import stockIIModule from './stock-ii.problem';
import type { StockIIInput } from './stock-ii.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function reference(input: StockIIInput): number {
  const prices = input.prices;
  const memo = new Map<string, number>();
  const solve = (day: number, holding: boolean): number => {
    if (day >= prices.length) return 0;
    const key = `${day}:${holding ? 1 : 0}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const price = prices[day] ?? 0;
    const best = holding
      ? Math.max(price + solve(day + 1, false), solve(day + 1, true))
      : Math.max(-price + solve(day + 1, true), solve(day + 1, false));
    memo.set(key, best);
    return best;
  };
  return Math.max(0, solve(0, false));
}

describe('stock-ii module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(stockIIModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(stockIIModule.generateSteps({ prices: [7, 1, 5, 3, 6, 4] }, mode))).toBe(7);
    expect(finalAnswer(stockIIModule.generateSteps({ prices: [6, 5, 4, 3, 2, 1] }, mode))).toBe(0);
    expect(finalAnswer(stockIIModule.generateSteps({ prices: [3, 2, 6, 5, 0, 3] }, mode))).toBe(7);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(stockIIModule.quiz).toHaveLength(4);
    for (const question of stockIIModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(stockIIModule.defaultInput).toEqual({ prices: [7, 1, 5, 3, 6, 4] });
    expect(stockIIModule.renderer).toBe('table1d');
    expect(stockIIModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { prices: stockIIModule.defaultInput.prices };
    expect(validateInput(stockIIModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      stockIIModule.code.python,
      stockIIModule.code.javascript,
      stockIIModule.code.cpp,
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
        stockIIModule.generateSteps({ prices: [7, 1, 5, 3, 6, 4] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
