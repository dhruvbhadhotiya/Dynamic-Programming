import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import type { Rng } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import triangleModule from './triangle.problem';
import type { TriangleInput } from './triangle.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];
const KNOWN: number[][] = [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalize(triangle: unknown): number[][] {
  const raw = Array.isArray(triangle) ? triangle : [];
  const rows = raw.slice(0, 5);
  if (rows.length === 0) return [[1]];
  return rows.map((row, r) => {
    const cells = Array.isArray(row) ? row : [];
    return Array.from({ length: r + 1 }, (_, j) => {
      const value = cells[j];
      return typeof value === 'number' && Number.isFinite(value)
        ? clampInt(value, 0, 20)
        : 1;
    });
  });
}

function reference(input: TriangleInput): number {
  const triangle = normalize(input.triangle);
  const memo = new Map<string, number>();
  const solve = (i: number, j: number): number => {
    const key = `${i},${j}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let result: number;
    if (i === triangle.length - 1) {
      result = triangle[i]?.[j] ?? 0;
    } else {
      result =
        (triangle[i]?.[j] ?? 0) +
          Math.min(solve(i + 1, j), solve(i + 1, j + 1));
    }
    memo.set(key, result);
    return result;
  };
  return solve(0, 0);
}

function inputGenerator(rng: Rng): TriangleInput {
  const rows = rngInt(rng, 1, 5);
  return {
    triangle: Array.from({ length: rows }, (_, i) =>
      Array.from({ length: i + 1 }, () => rngInt(rng, 0, 9)),
    ),
  };
}

describe('triangle module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(triangleModule, reference, { cases: 20, seed: 1, inputGenerator });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(triangleModule.generateSteps({ triangle: KNOWN }, mode))).toBe(11);
    expect(finalAnswer(triangleModule.generateSteps({ triangle: [[5]] }, mode))).toBe(5);
    expect(finalAnswer(triangleModule.generateSteps({ triangle: [[1], [2, 3]] }, mode))).toBe(3);
    expect(
      finalAnswer(
        triangleModule.generateSteps({ triangle: [[1], [9, 9], [1, 1, 1]] }, mode),
      ),
    ).toBe(11);
    expect(
      finalAnswer(
        triangleModule.generateSteps(
          {
            triangle: [
              [2, 0, 0, 0],
              [3, 4, 0, 0],
              [6, 5, 7, 0],
              [4, 1, 8, 3],
            ],
          },
          mode,
        ),
      ),
    ).toBe(11);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(triangleModule.quiz).toHaveLength(4);
    for (const question of triangleModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(triangleModule.defaultInput).toEqual({
      triangle: [
        [2, 0, 0, 0],
        [3, 4, 0, 0],
        [6, 5, 7, 0],
        [4, 1, 8, 3],
      ],
    });
    expect(triangleModule.renderer).toBe('table2d');
    expect(triangleModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...triangleModule.defaultInput };
    expect(validateInput(triangleModule.inputSchema, values)).toEqual({});
    for (const mode of MODES) {
      expect(finalAnswer(triangleModule.generateSteps(triangleModule.defaultInput, mode))).toBe(11);
    }
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      triangleModule.code.python,
      triangleModule.code.javascript,
      triangleModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i][j]');
      expect(lines[6]).toContain('return dp[0][0]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        triangleModule.generateSteps({ triangle: KNOWN }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
