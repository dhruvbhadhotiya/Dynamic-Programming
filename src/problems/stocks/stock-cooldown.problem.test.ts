import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import stockCooldownModule from './stock-cooldown.problem';
import type { StockCooldownInput } from './stock-cooldown.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function reference(input: StockCooldownInput): number {
  const prices = input.prices;
  const memo = new Map<string, number>();
  // Independent recursion with an explicit rest flag (not the i-2 recurrence).
  const solve = (day: number, holding: boolean, resting: boolean): number => {
    if (day >= prices.length) return 0;
    const key = `${day}:${holding ? 1 : 0}:${resting ? 1 : 0}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const price = prices[day] ?? 0;
    let best: number;
    if (holding) {
      best = Math.max(price + solve(day + 1, false, true), solve(day + 1, true, false));
    } else if (resting) {
      best = solve(day + 1, false, false);
    } else {
      best = Math.max(-price + solve(day + 1, true, false), solve(day + 1, false, false));
    }
    memo.set(key, best);
    return best;
  };
  return Math.max(0, solve(0, false, false));
}

describe('stock-cooldown module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(stockCooldownModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(stockCooldownModule.generateSteps({ prices: [1, 2, 3, 0, 2] }, mode))).toBe(3);
    expect(finalAnswer(stockCooldownModule.generateSteps({ prices: [1] }, mode))).toBe(0);
    expect(finalAnswer(stockCooldownModule.generateSteps({ prices: [1, 2] }, mode))).toBe(1);
    expect(finalAnswer(stockCooldownModule.generateSteps({ prices: [1, 2, 3, 4] }, mode))).toBe(3);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(stockCooldownModule.quiz).toHaveLength(4);
    for (const question of stockCooldownModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(stockCooldownModule.defaultInput).toEqual({ prices: [1, 2, 3, 0, 2] });
    expect(stockCooldownModule.renderer).toBe('table1d');
    expect(stockCooldownModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { prices: stockCooldownModule.defaultInput.prices };
    expect(validateInput(stockCooldownModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      stockCooldownModule.code.python,
      stockCooldownModule.code.javascript,
      stockCooldownModule.code.cpp,
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
        stockCooldownModule.generateSteps({ prices: [1, 2, 3, 0, 2] }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
