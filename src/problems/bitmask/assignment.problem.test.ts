import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import assignmentModule from './assignment.problem';
import type { AssignmentInput } from './assignment.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

const FALLBACK: number[][] = [
  [4, 1, 3],
  [2, 0, 5],
  [3, 2, 2],
];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(input: AssignmentInput): number[][] {
  const rawRows = Array.isArray(input.cost) ? input.cost : [];
  const width = rawRows[0]?.length ?? 0;
  const square =
    rawRows.length >= 2 &&
    width >= 2 &&
    rawRows.every((row) => Array.isArray(row) && row.length === width);

  if (!square) return FALLBACK.map((row) => [...row]);

  const n = clampInt(Math.min(rawRows.length, width), 2, 4);
  return Array.from({ length: n }, (_rowValue, row) =>
    Array.from({ length: n }, (_colValue, col) => {
      const value = rawRows[row]?.[col];
      return typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 0, 99) : 0;
    }),
  );
}

/** Independent reference: try every permutation of jobs for workers in order. */
function reference(input: AssignmentInput): number {
  const cost = normalize(input);
  const n = cost.length;
  let best = Number.POSITIVE_INFINITY;

  const assign = (worker: number, remaining: number[], total: number): void => {
    if (worker === n) {
      best = Math.min(best, total);
      return;
    }
    for (let i = 0; i < remaining.length; i += 1) {
      const job = remaining[i];
      if (job === undefined) continue;
      assign(
        worker + 1,
        [...remaining.slice(0, i), ...remaining.slice(i + 1)],
        total + (cost[worker]?.[job] ?? 0),
      );
    }
  };

  assign(0, Array.from({ length: n }, (_value, i) => i), 0);
  return best;
}

describe('assignment module', () => {
  it('produces valid steps matching the permutation reference on 20 seeded inputs', () => {
    runModuleChecks(assignmentModule, reference, {
      cases: 20,
      seed: 1,
      inputGenerator: (rng) => {
        const n = rngInt(rng, 2, 4);
        return {
          cost: Array.from({ length: n }, () =>
            Array.from({ length: n }, () => rngInt(rng, 0, 9)),
          ),
        };
      },
    });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(assignmentModule.generateSteps({ cost: FALLBACK }, mode))).toBe(5);
    expect(
      finalAnswer(
        assignmentModule.generateSteps(
          {
            cost: [
              [1, 2],
              [3, 4],
            ],
          },
          mode,
        ),
      ),
    ).toBe(5);
    expect(
      finalAnswer(
        assignmentModule.generateSteps(
          {
            cost: [
              [0, 9],
              [9, 0],
            ],
          },
          mode,
        ),
      ),
    ).toBe(0);
    expect(
      finalAnswer(
        assignmentModule.generateSteps(
          {
            cost: [
              [2, 1, 2],
              [1, 2, 1],
              [2, 1, 2],
            ],
          },
          mode,
        ),
      ),
    ).toBe(4);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(assignmentModule.quiz).toHaveLength(4);
    for (const question of assignmentModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(assignmentModule.defaultInput).toEqual({ cost: FALLBACK });
    expect(assignmentModule.renderer).toBe('bitmaskGrid');
    expect(assignmentModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...assignmentModule.defaultInput };
    expect(validateInput(assignmentModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      assignmentModule.code.python,
      assignmentModule.code.javascript,
      assignmentModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[mask]');
      expect(snippet).toContain('return dp');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        assignmentModule
          .generateSteps({ cost: FALLBACK }, mode)
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
