import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import knightProbabilityModule from './knight-probability.problem';
import type { KnightProbabilityInput } from './knight-probability.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalize(input: KnightProbabilityInput): KnightProbabilityInput {
  const n = clampInt(input?.n, 2, 6, 4);
  return {
    n,
    startRow: Math.min(Math.max(clampInt(input?.startRow, 0, 5, 1), 0), n - 1),
    startCol: Math.min(Math.max(clampInt(input?.startCol, 0, 5, 1), 0), n - 1),
    k: clampInt(input?.k, 0, 4, 3),
  };
}

function round10(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

function expectClose(actual: string | number | boolean, expected: number): void {
  expect(typeof actual).toBe('number');
  const value = actual as number;
  expect(value).toBeCloseTo(expected, 10);
  expect(round10(value)).toBe(round10(expected));
}

/**
 * Independent reference: enumerate every sequence of moves (8^k sequences,
 * k <= 4 so at most 4096) and count those that stay on the board.
 * The denominator 8^k is a power of two, so count / 8^k is a dyadic
 * rational exactly representable in binary floating point; runModuleChecks
 * can therefore compare with exact equality. Known-value checks below
 * additionally use toBeCloseTo / round-to-10-decimals on both sides.
 */
function reference(input: KnightProbabilityInput): number {
  const { n, startRow, startCol, k } = normalize(input);
  const moves: readonly (readonly [number, number])[] = [
    [2, 1],
    [1, 2],
    [-1, 2],
    [-2, 1],
    [-2, -1],
    [-1, -2],
    [1, -2],
    [2, -1],
  ];
  let count = 0;
  const enumerate = (row: number, col: number, steps: number): void => {
    if (steps === k) {
      count += 1;
      return;
    }
    for (const [dr, dc] of moves) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) enumerate(nr, nc, steps + 1);
    }
  };
  enumerate(startRow, startCol, 0);
  return count / 8 ** k;
}

describe('knight-probability module', () => {
  it('produces valid steps matching exhaustive enumeration on 20 seeded inputs', () => {
    runModuleChecks(knightProbabilityModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns verified known values in %s mode', (mode) => {
    // Verified by exhaustive enumeration (count / 8^k):
    // - Default 4x4 from (1,1) in 3 moves: 36/512 = 0.0703125.
    //   (Not 25/256 = 50/512; no 4x4 start yields 50 staying sequences in 3 moves.)
    expectClose(finalAnswer(knightProbabilityModule.generateSteps({ n: 4, startRow: 1, startCol: 1, k: 3 }, mode)), 0.0703125);
    expectClose(finalAnswer(knightProbabilityModule.generateSteps({ n: 4, startRow: 1, startCol: 1, k: 0 }, mode)), 1);
    expectClose(finalAnswer(knightProbabilityModule.generateSteps({ n: 4, startRow: 1, startCol: 1, k: 1 }, mode)), 0.5);
    expectClose(finalAnswer(knightProbabilityModule.generateSteps({ n: 4, startRow: 1, startCol: 1, k: 2 }, mode)), 0.15625);
    // 2x2 board: no knight move fits, so k=1 gives 0.
    expectClose(finalAnswer(knightProbabilityModule.generateSteps({ n: 2, startRow: 0, startCol: 0, k: 1 }, mode)), 0);
    // 3x3 centre with k=1: every move leaves the board, so 0 (not 0.0625).
    expectClose(finalAnswer(knightProbabilityModule.generateSteps({ n: 3, startRow: 1, startCol: 1, k: 1 }, mode)), 0);
    // Values that pin down where the suggested numbers actually arise:
    // 3x3 corner k=1 -> 2/8 = 0.25; 3x3 corner k=2 -> 4/64 = 0.0625.
    expectClose(finalAnswer(knightProbabilityModule.generateSteps({ n: 3, startRow: 0, startCol: 0, k: 1 }, mode)), 0.25);
    expectClose(finalAnswer(knightProbabilityModule.generateSteps({ n: 3, startRow: 0, startCol: 0, k: 2 }, mode)), 0.0625);
    expectClose(finalAnswer(knightProbabilityModule.generateSteps({ n: 5, startRow: 2, startCol: 2, k: 3 }, mode)), 0.25);
  });

  it('normalizes bad inputs safely and agrees with the reference', () => {
    const messy: KnightProbabilityInput[] = [
      { n: Number.NaN, startRow: Number.NaN, startCol: -3, k: 99 },
      { n: 4.6, startRow: 1.4, startCol: 1.6, k: 2.6 },
      { n: 999, startRow: 999, startCol: 999, k: 999 },
      { n: -3, startRow: -5, startCol: 100, k: -4 },
      { n: 2, startRow: 5, startCol: 5, k: 1 },
      { n: 1, startRow: 0, startCol: 0, k: 0 },
    ];

    for (const input of messy) {
      for (const mode of MODES) {
        const actual = finalAnswer(knightProbabilityModule.generateSteps(input, mode));
        expect(round10(actual as number), JSON.stringify(input)).toBe(round10(reference(input)));
      }
    }
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(knightProbabilityModule.quiz).toHaveLength(4);
    for (const question of knightProbabilityModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has the required default input and metadata', () => {
    expect(knightProbabilityModule.id).toBe('knight-probability');
    expect(knightProbabilityModule.category).toBe('counting');
    expect(knightProbabilityModule.difficulty).toBe('medium');
    expect(knightProbabilityModule.defaultInput).toEqual({ n: 4, startRow: 1, startCol: 1, k: 3 });
    expect(knightProbabilityModule.renderer).toBe('table2d');
    expect(knightProbabilityModule.modes).toEqual(['memo', 'tabulation']);

    const values: Record<string, unknown> = { ...knightProbabilityModule.defaultInput };
    expect(validateInput(knightProbabilityModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid and aligned in all three snippets', () => {
    const snippets = [
      knightProbabilityModule.code.python,
      knightProbabilityModule.code.javascript,
      knightProbabilityModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(11);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[2]).toContain('dp[0]');
      expect(lines[9]).toContain('dp[t + 1]');
      expect(lines[10]).toContain('return');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        knightProbabilityModule
          .generateSteps({ n: 4, startRow: 1, startCol: 1, k: 3 }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
