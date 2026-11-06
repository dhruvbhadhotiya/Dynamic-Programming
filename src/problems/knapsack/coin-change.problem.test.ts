import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import coinChangeModule from './coin-change.problem';
import type { CoinChangeInput } from './coin-change.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function reference(input: CoinChangeInput): number {
  const rawCoins = Array.isArray(input.coins) ? input.coins : [];
  const coins = rawCoins
    .slice(0, 5)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 9) : 1))
    .sort((a, b) => a - b);
  const amount =
    typeof input.amount === 'number' && Number.isFinite(input.amount)
      ? clampInt(input.amount, 0, 15)
      : 0;

  if (amount === 0) return 0;
  const dist = new Array<number>(amount + 1).fill(-1);
  dist[0] = 0;
  const queue = [0];
  while (queue.length > 0) {
    const cur = queue.shift() ?? 0;
    const nextDist = dist[cur] ?? -1;
    for (const coin of coins) {
      const next = cur + coin;
      if (next > amount || dist[next] !== -1) continue;
      dist[next] = nextDist + 1;
      if (next === amount) return nextDist + 1;
      queue.push(next);
    }
  }
  return -1;
}

describe('coin-change module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(coinChangeModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(
      finalAnswer(coinChangeModule.generateSteps({ coins: [1, 2, 5], amount: 11 }, mode)),
    ).toBe(3);
    expect(finalAnswer(coinChangeModule.generateSteps({ coins: [2], amount: 3 }, mode))).toBe(-1);
    expect(finalAnswer(coinChangeModule.generateSteps({ coins: [1], amount: 0 }, mode))).toBe(0);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(coinChangeModule.quiz).toHaveLength(4);
    for (const question of coinChangeModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(coinChangeModule.defaultInput).toEqual({ coins: [1, 2, 5], amount: 11 });
    expect(coinChangeModule.renderer).toBe('table2d');
    expect(coinChangeModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...coinChangeModule.defaultInput };
    expect(validateInput(coinChangeModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      coinChangeModule.code.python,
      coinChangeModule.code.javascript,
      coinChangeModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(8);

    // The compute line (line 7) and return line (line 8) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][a]');
      expect(lines[7]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        coinChangeModule
          .generateSteps({ coins: [1, 2, 5], amount: 11 }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
