import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import dungeonGameModule from './dungeon-game.problem';
import type { DungeonGameInput } from './dungeon-game.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeGrid(input: DungeonGameInput): number[][] {
  const raw = Array.isArray(input.dungeon) ? input.dungeon : [];
  const sliced = raw.slice(0, 4);
  const rows = (sliced.length > 0 ? sliced : [[0]]).map((row) => {
    const cells = Array.isArray(row) ? row.slice(0, 4) : [];
    const safe = cells.length > 0 ? cells : [0];
    return safe.map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clampInt(value, -30, 20) : 0,
    );
  });
  const width = Math.max(...rows.map((row) => row.length));
  return rows.map((row) => {
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push(0);
    return padded;
  });
}

function reference(input: DungeonGameInput): number {
  const dungeon = normalizeGrid(input);
  const rows = dungeon.length;
  const cols = dungeon[0]?.length ?? 1;

  let best = Number.POSITIVE_INFINITY;
  const path: number[] = [];
  const dfs = (i: number, j: number): void => {
    if (i >= rows || j >= cols) return;
    path.push(dungeon[i]?.[j] ?? 0);
    if (i === rows - 1 && j === cols - 1) {
      let need = 1;
      for (let k = path.length - 1; k >= 0; k -= 1) {
        need = Math.max(1, need - (path[k] ?? 0));
      }
      if (need < best) best = need;
      path.pop();
      return;
    }
    dfs(i + 1, j);
    dfs(i, j + 1);
    path.pop();
  };
  dfs(0, 0);
  return best;
}

describe('dungeon-game module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(dungeonGameModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(
      finalAnswer(
        dungeonGameModule.generateSteps(
          {
            dungeon: [
              [-2, -3, 3],
              [-5, -10, 1],
              [0, -30, -5],
            ],
          },
          mode,
        ),
      ),
    ).toBe(7);
    expect(finalAnswer(dungeonGameModule.generateSteps({ dungeon: [[-2]] }, mode))).toBe(3);
    expect(finalAnswer(dungeonGameModule.generateSteps({ dungeon: [[5]] }, mode))).toBe(1);
    expect(
      finalAnswer(
        dungeonGameModule.generateSteps(
          {
            dungeon: [
              [1, -2],
              [-3, 3],
            ],
          },
          mode,
        ),
      ),
    ).toBe(2);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(dungeonGameModule.quiz).toHaveLength(4);
    for (const question of dungeonGameModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(dungeonGameModule.defaultInput).toEqual({
      dungeon: [
        [-2, -3, 3],
        [-5, -10, 1],
        [0, -30, -5],
      ],
    });
    expect(dungeonGameModule.renderer).toBe('table2d');
    expect(dungeonGameModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...dungeonGameModule.defaultInput };
    expect(validateInput(dungeonGameModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      dungeonGameModule.code.python,
      dungeonGameModule.code.javascript,
      dungeonGameModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(9);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[3]).toContain('dp[m-1][n-1]');
      expect(lines[7]).toContain('dp[i][j]');
      expect(lines[8]).toContain('return dp[0][0]');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        dungeonGameModule
          .generateSteps(
            {
              dungeon: [
                [-2, -3, 3],
                [-5, -10, 1],
                [0, -30, -5],
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
