import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface MaximalSquareInput {
  matrix: number[][];
}

const MAX_ROWS = 4;
const MAX_COLS = 5;

const pythonCode = [
  'def maximal_square(matrix):',
  '    m, n = len(matrix), len(matrix[0])',
  '    dp = [[0] * n for _ in range(m)]',
  '    best = 0',
  '    for i in range(m):',
  '        for j in range(n):',
  '            if matrix[i][j] == 1: dp[i][j] = 1 + (min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) if i and j else 0)',
  '            best = max(best, dp[i][j])',
  '    return best',
].join('\n');

const javascriptCode = [
  'function maximalSquare(matrix) {',
  '  const m = matrix.length, n = matrix[0].length;',
  '  const dp = Array.from({ length: m }, () => new Array(n).fill(0));',
  '  let best = 0;',
  '  for (let i = 0; i < m; i++)',
  '    for (let j = 0; j < n; j++) {',
  '      if (matrix[i][j] === 1) dp[i][j] = 1 + (i && j ? Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) : 0);',
  '      best = Math.max(best, dp[i][j]);',
  '  return best;',
  '}',
].join('\n');

const cppCode = [
  'int maximalSquare(vector<vector<int>>& matrix) {',
  '  int m = matrix.size(), n = matrix[0].size();',
  '  vector<vector<int>> dp(m, vector<int>(n, 0));',
  '  int best = 0;',
  '  for (int i = 0; i < m; i++)',
  '    for (int j = 0; j < n; j++) {',
  '      if (matrix[i][j] == 1) dp[i][j] = 1 + (i && j ? min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]}) : 0);',
  '      best = max(best, dp[i][j]);',
  '  return best;',
  '}',
].join('\n');

function makeRecorder(rows: number, cols: number): StepRecorder<Table2DState> {
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => null),
      ),
      rowLabels: Array.from({ length: rows }, (_, i) => `r=${i}`),
      colLabels: Array.from({ length: cols }, (_, j) => `c=${j}`),
      rowHeader: 'row',
      colHeader: 'col',
      caption: 'Maximal Square: dp[i][j] = side of largest all-1 square ending at (i, j)',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table2DState>,
  bestPos: readonly [number, number],
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(9).record(`The answer is ${answer}.`, {
    codeLine: 9,
    highlights: [{ pos: [bestPos[0], bestPos[1]], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(matrix: number[][], memo: boolean): Step[] {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 1;
  const rec = makeRecorder(rows, cols);
  const dp: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );
  let computed = 0;
  let best = 0;
  let bestPos: [number, number] = [0, 0];

  rec.at(3).record(
    memo
      ? 'Memoization: cache the side of the largest all-1 square ending at each cell once. Reuse cached dp values from above, left, and the diagonal.'
      : 'Tabulation: build dp bottom-up row by row. Each cell is final before it is read by its right, below, or diagonal neighbour.',
    {
      codeLine: 3,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, best: 0, rows, cols },
    },
  );

  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const cell = matrix[i]?.[j] ?? 0;
      const row = dp[i];
      if (row !== undefined) row[j] = 0;
      if (cell === 0) {
        computed += 1;
        rec.at(7).fill([i, j], 0, `matrix[${i}][${j}] is 0, so no all-1 square can end here: dp[${i}][${j}] = 0.`, {
          kind: 'pruned',
          codeLine: 7,
          vars: { computed, best, i, j, cell },
        });
      } else if (i === 0 || j === 0) {
        if (row !== undefined) row[j] = 1;
        computed += 1;
        if (1 > best) {
          best = 1;
          bestPos = [i, j];
        }
        rec.at(7).fill(
          [i, j],
          1,
          `Edge cell (${i}, ${j}) is 1: no cell above, to the left, or on the diagonal can extend a square here, so dp[${i}][${j}] = 1.`,
          {
            kind: 'base',
            codeLine: 7,
            vars: { computed, best, i, j, cell },
          },
        );
      } else {
        const top = dp[i - 1]?.[j] ?? 0;
        const left = dp[i]?.[j - 1] ?? 0;
        const diag = dp[i - 1]?.[j - 1] ?? 0;
        const value = 1 + Math.min(top, left, diag);
        if (row !== undefined) row[j] = value;
        computed += 1;
        if (value > best) {
          best = value;
          bestPos = [i, j];
        }
        rec.at(7).fill(
          [i, j],
          value,
          memo
            ? `Cache reuse: dp[${i - 1}][${j}] = ${top}, dp[${i}][${j - 1}] = ${left}, dp[${i - 1}][${j - 1}] = ${diag}; dp[${i}][${j}] = 1 + min(${top}, ${left}, ${diag}) = ${value}.`
            : `dp[${i}][${j}] = 1 + min(dp[${i - 1}][${j}] = ${top}, dp[${i}][${j - 1}] = ${left}, dp[${i - 1}][${j - 1}] = ${diag}) = ${value}. The smallest neighbour limits the square.`,
          {
            codeLine: 7,
            highlights: [
              { pos: [i - 1, j], kind: 'dependency', label: `dp[${i - 1}][${j}]` },
              { pos: [i, j - 1], kind: 'dependency', label: `dp[${i}][${j - 1}]` },
              { pos: [i - 1, j - 1], kind: 'dependency', label: `dp[${i - 1}][${j - 1}]` },
            ],
            vars: { computed, best, i, j, cell, top, left, diag },
          },
        );
      }
    }
  }

  return finish(rec, bestPos, best, { computed });
}

function normalizeInput(input: MaximalSquareInput): { matrix: number[][] } {
  const raw = Array.isArray(input.matrix) ? input.matrix : [];
  const sliced = raw.slice(0, MAX_ROWS);
  const rows = (sliced.length > 0 ? sliced : [[0]]).map((row) => {
    const cells = Array.isArray(row) ? row.slice(0, MAX_COLS) : [];
    const safe = cells.length > 0 ? cells : [0];
    return safe.map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, 1) : 0,
    );
  });
  const width = Math.max(...rows.map((row) => row.length));
  const matrix = rows.map((row) => {
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push(0);
    return padded;
  });
  return { matrix };
}

const maximalSquareModule: ProblemModule<MaximalSquareInput> = {
  id: 'maximal-square',
  title: 'Maximal Square',
  category: 'grid',
  difficulty: 'medium',
  summary:
    'Find the side length of the largest all-1 square in a binary matrix. Brute force checks every possible square; memoization caches each cell once and tabulation fills dp row by row.',
  stateDefinition:
    'dp[i][j] = side length of the largest all-1 square whose bottom-right corner is (i, j); 0 if matrix[i][j] is 0.',
  recurrence:
    'dp[i][j] = 0 if matrix[i][j] is 0; 1 if i == 0 or j == 0 and matrix[i][j] is 1; otherwise 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]).',
  complexity: { time: 'O(m × n)', space: 'O(m × n)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'matrix',
      label: 'matrix',
      help: 'Binary matrix of 0 and 1. Find the largest all-1 square.',
      type: 'matrix',
      minRows: 1,
      maxRows: MAX_ROWS,
      maxCols: MAX_COLS,
      min: 0,
      max: 1,
      numeric: true,
    },
  ],
  defaultInput: {
    matrix: [
      [1, 0, 1, 0, 0],
      [1, 0, 1, 1, 1],
      [1, 0, 1, 1, 1],
      [1, 0, 0, 1, 0],
    ],
  },
  modes: ['memo', 'tabulation'],
  generateSteps(input: MaximalSquareInput, mode: Mode): Step[] {
    const { matrix } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(matrix, true);
    return iterativeSteps(matrix, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the largest all-1 square side for [[1,0,1,0,0],[1,0,1,1,1],[1,0,1,1,1],[1,0,0,1,0]]?',
      options: ['2', '4', '3', '1'],
      answer: 0,
      why: 'The 2x2 block of 1s at rows 1-2, columns 2-3 is all 1s, and no 3x3 all-1 square fits in this matrix.',
    },
    {
      q: 'For an interior cell (i, j) with matrix[i][j] == 1, what is dp[i][j]?',
      options: [
        '1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])',
        '1 + max(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])',
        'dp[i-1][j] + dp[i][j-1] + dp[i-1][j-1]',
        '1',
      ],
      answer: 0,
      why: 'A square ending at (i, j) can extend the smallest square ending above, left, or diagonally by one row and one column; the minimum of those three limits it.',
    },
    {
      q: 'Why is dp[i][j] = 1 on the first row or first column when matrix[i][j] == 1?',
      options: [
        'There is no cell above, to the left, or diagonal to extend a larger square',
        'The loops skip edge cells',
        'Edge cells are pre-filled with 1',
        'They can only extend from the diagonal',
      ],
      answer: 0,
      why: 'On the first row there is nothing above or diagonal, and on the first column there is nothing to the left or diagonal, so the largest square ending there is just the cell itself.',
    },
    {
      q: 'How do memoization/tabulation compare to brute-force checking every square?',
      options: [
        'O(m × n) cells computed once vs checking every possible square and scanning its cells',
        'O(m + n) vs O(m × n)',
        'The same cost',
        'O(m × n) vs O(m + n)',
      ],
      answer: 0,
      why: 'Memoization/tabulation compute each of the m × n cells once from three neighbours; brute force enumerates every top-left corner and side length and rescans cells, doing far more work.',
    },
  ],
};

export default maximalSquareModule;
