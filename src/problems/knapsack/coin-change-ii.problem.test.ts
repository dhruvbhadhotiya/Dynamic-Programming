import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import coinChangeIIModule from './coin-change-ii.problem';
import type { CoinChangeIIInput } from './coin-change-ii.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function reference(input: CoinChangeIIInput): number {
  const rawCoins = Array.isArray(input.coins) ? input.coins : [];
  const coins = rawCoins
    .slice(0, 5)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 9) : 1));
  const safeCoins = coins.length > 0 ? coins : [1];
  const amount =
    typeof input.amount === 'number' && Number.isFinite(input.amount) ? clampInt(input.amount, 0, 12) : 0;

  function ways(index: number, remaining: number): number {
    if (remaining === 0) return 1;
    if (index >= safeCoins.length || remaining < 0) return 0;
    const value = safeCoins[index] ?? 0;
    if (value <= 0) return ways(index + 1, remaining);
    let total = 0;
    for (let copies = 0; copies * value <= remaining; copies += 1) {
      total += ways(index + 1, remaining - copies * value);
    }
    return total;
  }

  return ways(0, amount);
}

describe('coin-change-ii module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(coinChangeIIModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(coinChangeIIModule.generateSteps({ coins: [1, 2, 5], amount: 5 }, mode))).toBe(4);
    expect(finalAnswer(coinChangeIIModule.generateSteps({ coins: [2], amount: 3 }, mode))).toBe(0);
    expect(finalAnswer(coinChangeIIModule.generateSteps({ coins: [1, 2], amount: 5 }, mode))).toBe(3);
    expect(finalAnswer(coinChangeIIModule.generateSteps({ coins: [1, 2, 5], amount: 0 }, mode))).toBe(1);
    expect(finalAnswer(coinChangeIIModule.generateSteps({ coins: [2, 5], amount: 5 }, mode))).toBe(1);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(coinChangeIIModule.quiz).toHaveLength(4);
    for (const question of coinChangeIIModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(coinChangeIIModule.defaultInput).toEqual({ coins: [1, 2, 5], amount: 5 });
    expect(coinChangeIIModule.renderer).toBe('table2d');
    expect(coinChangeIIModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = {
      coins: coinChangeIIModule.defaultInput.coins,
      amount: coinChangeIIModule.defaultInput.amount,
    };
    expect(validateInput(coinChangeIIModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      coinChangeIIModule.code.python,
      coinChangeIIModule.code.javascript,
      coinChangeIIModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The compute line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][a]');
      expect(lines[7]).toContain('return dp[n][amount]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        coinChangeIIModule.generateSteps({ coins: [1, 2, 5], amount: 5 }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
