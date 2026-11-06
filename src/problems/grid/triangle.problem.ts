import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface TriangleInput {
  triangle: number[][];
}

const MAX_ROWS = 5;
const MAX_CELL = 20;

const pythonCode = [
  'def min_path(triangle):',
  '    n = len(triangle)',
  '    dp = [row[:] for row in triangle]',
  '    for i in range(n - 2, -1, -1):',
  '        for j in range(len(triangle[i])):',
  '            dp[i][j] = triangle[i][j] + min(dp[i + 1][j], dp[i + 1][j + 1])',
  '    return dp[0][0]',
].join('\n');

const javascriptCode = [
  'function minPath(triangle) {',
  '  const n = triangle.length;',
  '  const dp = triangle.map((row) => row.slice());',
  '  for (let i = n - 2; i >= 0; i--)',
  '    for (let j = 0; j < triangle[i].length; j++)',
  '      dp[i][j] = triangle[i][j] + Math.min(dp[i + 1][j], dp[i + 1][j + 1]);',
  '  return dp[0][0];',
  '}',
].join('\n');

const cppCode = [
  'int minPath(vector<vector<int>>& triangle) {',
  '  int n = triangle.size();',
  '  vector<vector<int>> dp = triangle;',
  '  for (int i = n - 2; i >= 0; i--)',
  '    for (int j = 0; j < (int)triangle[i].size(); j++)',
  '      dp[i][j] = triangle[i][j] + min(dp[i + 1][j], dp[i + 1][j + 1]);',
  '  return dp[0][0];',
  '}',
].join('\n');

function normalizeInput(input: TriangleInput): number[][] {
  const raw = Array.isArray(input.triangle) ? input.triangle : [];
  const rows = raw.slice(0, MAX_ROWS);
  if (rows.length === 0) return [[1]];
  return rows.map((row, r) => {
    const cells = Array.isArray(row) ? row : [];
    return Array.from({ length: r + 1 }, (_, j) => {
      const value = cells[j];
      return typeof value === 'number' && Number.isFinite(value)
        ? clamp(Math.trunc(value), 0, MAX_CELL)
        : 1;
    });
  });
}

function makeRecorder(triangle: number[][]): StepRecorder<Table2DState> {
  const n = triangle.length;
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: triangle.map((row) => row.map(() => null)),
      rowLabels: triangle.map((_, i) => `i=${i}`),
      colLabels: Array.from({ length: n }, (_, j) => `${j}`),
      rowHeader: 'row',
      colHeader: 'col',
      caption: 'Triangle: dp[i][j] = min path sum from cell (i, j) to the bottom',
    },
    { codeLine: 1 },
  );
}

function iterativeSteps(triangle: number[][], memo: boolean): Step[] {
  const n = triangle.length;
  const rec = makeRecorder(triangle);
  const dp = triangle.map((row) => [...row]);

  rec.at(2).record(
    memo
      ? `Memoization: from the top, dp[0][0] needs the rows below it. Cache each cell's best value once and reuse it wherever the same cell is reached again.`
      : `Tabulation: copy the cost triangle into dp, then build dp bottom-up. The bottom row is already final, so every cell above it can be decided as soon as it is reached.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n },
    },
  );

  let computed = 0;
  let reused = 0;
  const last = n - 1;
  const bottom = triangle[last] ?? [1];
  for (let j = 0; j < bottom.length; j += 1) {
    computed += 1;
    rec.at(3).fill([last, j], bottom[j] ?? 1, `Base case: bottom cell (${last}, ${j}) has no row below, so dp[${last}][${j}] = ${bottom[j] ?? 1}.`, {
      kind: 'base',
      codeLine: 3,
      vars: { computed, reused: 0, i: last, j },
    });
  }

  for (let i = n - 2; i >= 0; i -= 1) {
    const row = triangle[i] ?? [1];
    for (let j = 0; j < row.length; j += 1) {
      const belowLeft = dp[i + 1]?.[j] ?? 0;
      const belowRight = dp[i + 1]?.[j + 1] ?? 0;
      const cost = row[j] ?? 1;
      const best = Math.min(belowLeft, belowRight);
      const rowDp = dp[i];
      if (rowDp !== undefined) rowDp[j] = cost + best;
      computed += 1;
      reused += 2;
      rec.at(6).fill(
        [i, j],
        cost + best,
        memo
          ? `Cache hit: reuse dp[${i + 1}][${j}] = ${belowLeft} and dp[${i + 1}][${j + 1}] = ${belowRight}; dp[${i}][${j}] = ${cost} + min(${belowLeft}, ${belowRight}) = ${cost + best}.`
          : `dp[${i}][${j}] = ${cost} + min(dp[${i + 1}][${j}] = ${belowLeft}, dp[${i + 1}][${j + 1}] = ${belowRight}) = ${cost + best}. ${belowLeft <= belowRight ? 'Step down-left wins.' : 'Step down-right wins.'}`,
        {
          codeLine: 6,
          highlights: [
            { pos: [i + 1, j], kind: 'dependency', label: `dp[${i + 1}][${j}]` },
            { pos: [i + 1, j + 1], kind: 'dependency', label: `dp[${i + 1}][${j + 1}]` },
          ],
          vars: { computed, reused, i, j, cost },
        },
      );
    }
  }

  const answer = dp[0]?.[0] ?? 0;
  rec.at(7).record(`The answer is ${answer}.`, {
    codeLine: 7,
    highlights: [{ pos: [0, 0], kind: 'result', label: 'answer' }],
    vars: { answer, computed, reused, n },
  });
  return [...rec.steps];
}

const triangleModule: ProblemModule<TriangleInput> = {
  id: 'triangle',
  title: 'Triangle',
  category: 'grid',
  difficulty: 'easy',
  summary:
    'Find the minimum path sum from the top of a triangle to its bottom, moving only to the cell directly below-left or below-right. Memoization caches each cell once; tabulation fills dp bottom-up so every parent reads finished children.',
  stateDefinition:
    'dp[i][j] = minimum path sum starting at cell (i, j) (row i, column j) and moving down to the bottom row, for 0 <= j <= i < n.',
  recurrence:
    'dp[last][j] = triangle[last][j]; dp[i][j] = triangle[i][j] + min(dp[i + 1][j], dp[i + 1][j + 1]).',
  complexity: { time: 'O(n^2)', space: 'O(n^2)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'triangle',
      label: 'triangle',
      help: 'One row per line. Row i uses only its first i+1 numbers (row 0: 1 number, row 1: 2, ...). Extra numbers in a row are ignored, so pad short rows with 0.',
      type: 'matrix',
      minRows: 1,
      maxRows: MAX_ROWS,
      maxCols: MAX_ROWS,
      min: 0,
      max: MAX_CELL,
      numeric: true,
    },
  ],
  defaultInput: {
    triangle: [
      [2, 0, 0, 0],
      [3, 4, 0, 0],
      [6, 5, 7, 0],
      [4, 1, 8, 3],
    ],
  },
  modes: ['memo', 'tabulation'],
  generateSteps(input: TriangleInput, mode: Mode): Step[] {
    const triangle = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(triangle, true);
    return iterativeSteps(triangle, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the minimum path sum for the triangle [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]?',
      options: ['11', '12', '10', '13'],
      answer: 0,
      why: 'The best path is 2 -> 3 -> 5 -> 1, which sums to 11.',
    },
    {
      q: 'What is the recurrence for dp[i][j] when (i, j) is not on the bottom row?',
      options: [
        'triangle[i][j] + min(dp[i+1][j], dp[i+1][j+1])',
        'min(dp[i+1][j], dp[i+1][j+1])',
        'triangle[i][j] + dp[i+1][j]',
        'dp[i-1][j] + triangle[i][j]',
      ],
      answer: 0,
      why: 'From (i, j) you must step to (i+1, j) or (i+1, j+1); add this cell’s cost to the cheaper of those two finished values.',
    },
    {
      q: 'Why is the bottom row used as the base case?',
      options: [
        'Cells there have no row below, so their dp is just their own value',
        'The path must start at the bottom',
        'It makes the answer larger',
        'It avoids copying the input',
      ],
      answer: 0,
      why: 'The recurrence reads the row below, so the lowest row must be known before any cell above it can be computed.',
    },
    {
      q: 'Why fill bottom-up (or cache) instead of recomputing naively?',
      options: [
        'Cells are shared by two parents, so naive recursion repeats work exponentially',
        'Moving down is only allowed in one direction',
        'The triangle values change while filling',
        'Python requires bottom-up loops',
      ],
      answer: 0,
      why: 'For example dp[i+1][j] is needed by both (i, j) and (i, j-1). Memoization/tabulation compute each of the O(n^2) cells once and reuse them.',
    },
  ],
};

export default triangleModule;
