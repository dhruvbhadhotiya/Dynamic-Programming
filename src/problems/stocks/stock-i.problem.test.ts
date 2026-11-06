import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import stockIModule from './stock-i.problem';
import type { StockInput } from './stock-i.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function reference(input: StockInput): number {
  let best = 0;
  for (let buy = 0; buy < input.prices.length; buy += 1) {
    for (let sell = buy + 1; sell < input.prices.length; sell += 1) {
      const profit = (input.prices[sell] ?? 0) - (input.prices[buy] ?? 0);
      if (profit > best) best = profit;
    }
  }
  return best;
}

describe('stock-i module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(stockIModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(stockIModule.generateSteps({ prices: [7, 1, 5, 3, 6, 4] }, mode))).toBe(5);
    expect(finalAnswer(stockIModule.generateSteps({ prices: [7, 6, 4, 3, 2, 1] }, mode))).toBe(0);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(stockIModule.quiz).toHaveLength(4);
    for (const question of stockIModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(stockIModule.defaultInput).toEqual({ prices: [7, 1, 5, 3, 6, 4] });
    expect(stockIModule.renderer).toBe('table1d');
    expect(stockIModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { prices: stockIModule.defaultInput.prices };
    expect(validateInput(stockIModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      stockIModule.code.python,
      stockIModule.code.javascript,
      stockIModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(9);

    // The compute line (line 6) and return line (line 9) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i]');
      expect(lines[8]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        stockIModule.generateSteps({ prices: [7, 1, 5, 3, 6, 4] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
