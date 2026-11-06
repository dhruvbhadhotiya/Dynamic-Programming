import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import minPathSumModule from './min-path-sum.problem';
import type { MinPathSumInput } from './min-path-sum.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeGrid(input: MinPathSumInput): number[][] {
  const raw = Array.isArray(input.grid) ? input.grid : [];
  const sliced = raw.slice(0, 4);
  const rows = (sliced.length > 0 ? sliced : [[1]]).map((row) => {
    const cells = Array.isArray(row) ? row.slice(0, 4) : [];
    const safe = cells.length > 0 ? cells : [1];
    return safe.map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 1, 9) : 1,
    );
  });
  const width = Math.max(...rows.map((row) => row.length));
  return rows.map((row) => {
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push(1);
    return padded;
  });
}

function reference(input: MinPathSumInput): number {
  const grid = normalizeGrid(input);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 1;

  let best = Number.POSITIVE_INFINITY;
  const dfs = (i: number, j: number, sum: number): void => {
    if (i >= rows || j >= cols) return;
    const next = sum + (grid[i]?.[j] ?? 0);
    if (i === rows - 1 && j === cols - 1) {
      if (next < best) best = next;
      return;
    }
    dfs(i + 1, j, next);
    dfs(i, j + 1, next);
  };
  dfs(0, 0, 0);
  return best;
}

describe('min-path-sum module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(minPathSumModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(
      finalAnswer(
        minPathSumModule.generateSteps(
          {
            grid: [
              [1, 3, 1],
              [1, 5, 1],
              [4, 2, 1],
            ],
          },
          mode,
        ),
      ),
    ).toBe(7);
    expect(
      finalAnswer(
        minPathSumModule.generateSteps(
          {
            grid: [
              [1, 2],
              [3, 4],
            ],
          },
          mode,
        ),
      ),
    ).toBe(7);
    expect(
      finalAnswer(
        minPathSumModule.generateSteps(
          {
            grid: [
              [5, 9, 4],
              [1, 5, 8],
              [6, 2, 3],
            ],
          },
          mode,
        ),
      ),
    ).toBe(16);
    expect(
      finalAnswer(minPathSumModule.generateSteps({ grid: [[9]] }, mode)),
    ).toBe(9);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(minPathSumModule.quiz).toHaveLength(4);
    for (const question of minPathSumModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(minPathSumModule.defaultInput).toEqual({
      grid: [
        [1, 3, 1],
        [1, 5, 1],
        [4, 2, 1],
      ],
    });
    expect(minPathSumModule.renderer).toBe('table2d');
    expect(minPathSumModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...minPathSumModule.defaultInput };
    expect(validateInput(minPathSumModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      minPathSumModule.code.python,
      minPathSumModule.code.javascript,
      minPathSumModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(7);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[5]).toContain('dp[i][j]');
      expect(lines[6]).toContain('return dp[m-1][n-1]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        minPathSumModule
          .generateSteps(
            {
              grid: [
                [1, 3, 1],
                [1, 5, 1],
                [4, 2, 1],
              ],
            },
            mode,
          )
          .map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
