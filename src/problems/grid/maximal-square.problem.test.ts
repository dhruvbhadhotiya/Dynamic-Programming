import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { runModuleChecks } from '../../engine/testUtils';
import type { Mode } from '../../engine/types';
import maximalSquareModule from './maximal-square.problem';
import type { MaximalSquareInput } from './maximal-square.problem';

const MODES: readonly Mode[] = ['memo', 'tabulation'];

const CLASSIC: number[][] = [
  [1, 0, 1, 0, 0],
  [1, 0, 1, 1, 1],
  [1, 0, 1, 1, 1],
  [1, 0, 0, 1, 0],
];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeGrid(input: MaximalSquareInput): number[][] {
  const raw = Array.isArray(input.matrix) ? input.matrix : [];
  const sliced = raw.slice(0, 4);
  const rows = (sliced.length > 0 ? sliced : [[0]]).map((row) => {
    const cells = Array.isArray(row) ? row.slice(0, 5) : [];
    const safe = cells.length > 0 ? cells : [0];
    return safe.map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clampInt(value, 0, 1) : 0,
    );
  });
  const width = Math.max(...rows.map((row) => row.length));
  return rows.map((row) => {
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push(0);
    return padded;
  });
}

/** Independent reference: enumerate every square and test all its cells. */
function reference(input: MaximalSquareInput): number {
  const matrix = normalizeGrid(input);
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 1;
  let best = 0;
  for (let top = 0; top < rows; top += 1) {
    for (let left = 0; left < cols; left += 1) {
      const maxSide = Math.min(rows - top, cols - left);
      for (let side = 1; side <= maxSide; side += 1) {
        let allOnes = true;
        for (let r = top; r < top + side && allOnes; r += 1) {
          for (let c = left; c < left + side; c += 1) {
            if (matrix[r]?.[c] !== 1) {
              allOnes = false;
              break;
            }
          }
        }
        if (allOnes && side > best) best = side;
      }
    }
  }
  return best;
}

describe('maximal-square module', () => {
  it('produces valid steps matching the reference on 20 seeded inputs', () => {
    runModuleChecks(maximalSquareModule, reference, { cases: 20, seed: 1 });
  });

  it.each(MODES)('returns known values in %s mode', (mode) => {
    expect(finalAnswer(maximalSquareModule.generateSteps({ matrix: CLASSIC }, mode))).toBe(2);
    expect(
      finalAnswer(
        maximalSquareModule.generateSteps(
          {
            matrix: [
              [1, 1, 1],
              [1, 1, 1],
              [1, 1, 1],
            ],
          },
          mode,
        ),
      ),
    ).toBe(3);
    expect(
      finalAnswer(
        maximalSquareModule.generateSteps(
          {
            matrix: [
              [1, 1],
              [1, 1],
            ],
          },
          mode,
        ),
      ),
    ).toBe(2);
    expect(finalAnswer(maximalSquareModule.generateSteps({ matrix: [[1]] }, mode))).toBe(1);
    expect(finalAnswer(maximalSquareModule.generateSteps({ matrix: [[0]] }, mode))).toBe(0);
    expect(
      finalAnswer(
        maximalSquareModule.generateSteps(
          {
            matrix: [
              [1, 1],
              [1, 0],
            ],
          },
          mode,
        ),
      ),
    ).toBe(1);
    expect(
      finalAnswer(
        maximalSquareModule.generateSteps(
          {
            matrix: [
              [0, 0],
              [0, 0],
            ],
          },
          mode,
        ),
      ),
    ).toBe(0);
    expect(
      finalAnswer(maximalSquareModule.generateSteps({ matrix: [[1, 1, 1, 1]] }, mode)),
    ).toBe(1);
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(maximalSquareModule.quiz).toHaveLength(4);
    for (const question of maximalSquareModule.quiz) {
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
    }
  });

  it('has a valid defaultInput', () => {
    expect(maximalSquareModule.defaultInput).toEqual({ matrix: CLASSIC });
    expect(maximalSquareModule.renderer).toBe('table2d');
    expect(maximalSquareModule.modes).toEqual(['memo', 'tabulation']);
    const values: Record<string, unknown> = { ...maximalSquareModule.defaultInput };
    expect(validateInput(maximalSquareModule.inputSchema, values)).toEqual({});
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      maximalSquareModule.code.python,
      maximalSquareModule.code.javascript,
      maximalSquareModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(9);

    for (const snippet of snippets) {
      const lines = snippet.split('\n');
      expect(lines[6]).toContain('dp[i][j]');
      expect(lines[8]).toContain('return best');
    }

    const maxCodeLine = Math.max(
      ...MODES.flatMap((mode) =>
        maximalSquareModule.generateSteps({ matrix: CLASSIC }, mode).map((step) => step.codeLine),
      ),
    );
    expect(maxCodeLine).toBeLessThanOrEqual(minLines);
  });
});
