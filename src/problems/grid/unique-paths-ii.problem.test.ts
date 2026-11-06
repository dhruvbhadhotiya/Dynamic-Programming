import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import uniquePathsIiModule from './unique-paths-ii.problem';
import type { UniquePathsIiInput } from './unique-paths-ii.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeGrid(input: UniquePathsIiInput): number[][] {
  const raw = Array.isArray(input.obstacleGrid) ? input.obstacleGrid : [];
  const rows = raw.slice(0, 4).filter((row) => Array.isArray(row));
  const width = rows[0]?.length ?? 0;
  if (rows.length === 0 || width === 0) return [[0]];
  const cols = clampInt(width, 1, 4);
  return rows.map((row) =>
    row
      .slice(0, cols)
      .map((value) =>
        typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 0, 1) : 0,
      ),
  );
}

/** Independent reference: enumerate every right/down path by depth-first search. */
function reference(input: UniquePathsIiInput): number {
  const grid = normalizeGrid(input);
  const m = grid.length;
  const n = grid[0]?.length ?? 0;
  const count = (i: number, j: number): number => {
    if (i >= m || j >= n || grid[i]?.[j] === 1) return 0;
    if (i === m - 1 && j === n - 1) return 1;
    return count(i + 1, j) + count(i, j + 1);
  };
  return count(0, 0);
}

describe('unique-paths-ii module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(uniquePathsIiModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(
      finalAnswer(
        uniquePathsIiModule.generateSteps(
          {
            obstacleGrid: [
              [0, 0, 0],
              [0, 1, 0],
              [0, 0, 0],
            ],
          },
          mode,
        ),
      ),
    ).toBe(2);
    expect(
      finalAnswer(
        uniquePathsIiModule.generateSteps(
          {
            obstacleGrid: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
          },
          mode,
        ),
      ),
    ).toBe(6);
    expect(
      finalAnswer(uniquePathsIiModule.generateSteps({ obstacleGrid: [[0]] }, mode)),
    ).toBe(1);
    expect(
      finalAnswer(uniquePathsIiModule.generateSteps({ obstacleGrid: [[1]] }, mode)),
    ).toBe(0);
    expect(
      finalAnswer(
        uniquePathsIiModule.generateSteps(
          {
            obstacleGrid: [
              [1, 0],
              [0, 0],
            ],
          },
          mode,
        ),
      ),
    ).toBe(0);
    expect(
      finalAnswer(
        uniquePathsIiModule.generateSteps(
          {
            obstacleGrid: [
              [0, 0],
              [0, 1],
            ],
          },
          mode,
        ),
      ),
    ).toBe(0);
    expect(
      finalAnswer(
        uniquePathsIiModule.generateSteps(
          {
            obstacleGrid: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
          mode,
        ),
      ),
    ).toBe(4);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(uniquePathsIiModule.quiz).toHaveLength(4);
    for (const question of uniquePathsIiModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(uniquePathsIiModule.defaultInput).toEqual({
      obstacleGrid: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ],
    });
    expect(uniquePathsIiModule.renderer).toBe('table2d');
    expect(uniquePathsIiModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...uniquePathsIiModule.defaultInput };
    expect(validateInput(uniquePathsIiModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      uniquePathsIiModule.code.python,
      uniquePathsIiModule.code.javascript,
      uniquePathsIiModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(9);

    // The compute line (line 8) and return line (line 9) use the same
    // line numbers in all three languages.
    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[7]).toContain('dp[i][j]');
      expect(lines[8]).toContain('return dp[m-1][n-1]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        uniquePathsIiModule
          .generateSteps(
            {
              obstacleGrid: [
                [0, 0, 0],
                [0, 1, 0],
                [0, 0, 0],
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
