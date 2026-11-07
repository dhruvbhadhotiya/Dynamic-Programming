import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import tspModule from './tsp.problem';
import type { TspInput } from './tsp.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

const FALLBACK: number[][] = [
  [0, 1, 15, 6],
  [1, 0, 7, 12],
  [15, 7, 0, 3],
  [6, 12, 3, 0],
];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: TspInput): number[][] {
  const rawRows = Array.isArray(input.dist) ? input.dist : [];
  const width = rawRows[0]?.length ?? 0;
  const square =
    rawRows.length >= 2 &&
    width >= 2 &&
    rawRows.every((row) => Array.isArray(row) && row.length === width);

  if (!square) return FALLBACK.map((row) => [...row]);

  const n = clampInt(Math.min(rawRows.length, width), 2, 4);
  return Array.from({ length: n }, (_rowValue, row) =>
    Array.from({ length: n }, (_colValue, col) => {
      if (row === col) return 0;
      const value = rawRows[row]?.[col];
      return typeof value === 'number' && Number.isFinite(value)
        ? clampInt(value, 1, 99)
        : 1;
    }),
  );
}

/** Independent reference: try every permutation of the non-start cities. */
function reference(input: TspInput): number {
  const dist = normalize(input);
  const n = dist.length;
  let best = Number.POSITIVE_INFINITY;

  const visit = (order: number[], remaining: number[]): void => {
    if (remaining.length === 0) {
      let cost = dist[0]?.[order[0] ?? 0] ?? 0;
      for (let i = 0; i + 1 < order.length; i += 1) {
        cost += dist[order[i] ?? 0]?.[order[i + 1] ?? 0] ?? 0;
      }
      cost += dist[order.at(-1) ?? 0]?.[0] ?? 0;
      best = Math.min(best, cost);
      return;
    }

    for (let i = 0; i < remaining.length; i += 1) {
      const city = remaining[i];
      if (city === undefined) continue;
      visit([...order, city], [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
    }
  };

  visit([], Array.from({ length: n - 1 }, (_value, i) => i + 1));
  return best;
}

describe('tsp module', () => {
  it('produces valid steps matching the permutation reference on 20 seeded inputs', () => {
    runModuleChecks(tspModule, reference, {
      cases: 20,
      seed: 1,
      inputGenerator: (rng) => {
        const n = rngInt(rng, 2, 4);
        const dist = Array.from({ length: n }, (_rowValue, row) =>
          Array.from({ length: n }, (_colValue, col) =>
            row === col ? 0 : rngInt(rng, 1, 9),
          ),
        );
        return { dist };
      },
    });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(tspModule.generateSteps({ dist: FALLBACK }, mode))).toBe(17);
    expect(
      finalAnswer(
        tspModule.generateSteps(
          {
            dist: [
              [0, 3],
              [4, 0],
            ],
          },
          mode,
        ),
      ),
    ).toBe(7);
    expect(
      finalAnswer(
        tspModule.generateSteps(
          {
            dist: [
              [0, 1, 2],
              [1, 0, 3],
              [2, 3, 0],
            ],
          },
          mode,
        ),
      ),
    ).toBe(6);
    expect(
      finalAnswer(
        tspModule.generateSteps(
          {
            dist: [
              [0, 10, 15],
              [20, 0, 5],
              [30, 3, 0],
            ],
          },
          mode,
        ),
      ),
    ).toBe(38);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(tspModule.quiz).toHaveLength(4);
    for (const question of tspModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(tspModule.defaultInput).toEqual({ dist: FALLBACK });
    expect(tspModule.renderer).toBe('table2d');
    expect(tspModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...tspModule.defaultInput };
    expect(validateInput(tspModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [tspModule.code.python, tspModule.code.javascript, tspModule.code.cpp];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      expect(snippet).toContain('dp[');
      expect(snippet).toContain('return');
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        tspModule.generateSteps({ dist: FALLBACK }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
