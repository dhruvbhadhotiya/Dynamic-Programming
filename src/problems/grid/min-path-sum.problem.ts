import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface MinPathSumInput {
  grid: number[][];
}

const MAX_ROWS = 4;
const MAX_COLS = 4;

const pythonCode = [
  'def min_path_sum(grid):',
  '    m, n = len(grid), len(grid[0])',
  '    dp = [[0] * n for _ in range(m)]',
  '    for i in range(m):',
  '        for j in range(n):',
  '            dp[i][j] = grid[i][j] + (0 if i == 0 and j == 0 else min(dp[i-1][j] if i else 10**9, dp[i][j-1] if j else 10**9))',
  '    return dp[m-1][n-1]',
].join('\n');

const javascriptCode = [
  'function minPathSum(grid) {',
  '  const m = grid.length, n = grid[0].length;',
  '  const dp = Array.from({ length: m }, () => new Array(n).fill(0));',
  '  for (let i = 0; i < m; i++)',
  '    for (let j = 0; j < n; j++)',
  '      dp[i][j] = grid[i][j] + ((i === 0 && j === 0) ? 0 : Math.min(i ? dp[i-1][j] : Infinity, j ? dp[i][j-1] : Infinity));',
  '  return dp[m-1][n-1];',
  '}',
].join('\n');

const cppCode = [
  'int min_path_sum(vector<vector<int>>& grid) {',
  '  int m = grid.size(), n = grid[0].size();',
  '  vector<vector<int>> dp(m, vector<int>(n, 0));',
  '  for (int i = 0; i < m; i++)',
  '    for (int j = 0; j < n; j++)',
  '      dp[i][j] = grid[i][j] + ((i == 0 && j == 0) ? 0 : min(i ? dp[i-1][j] : INT_MAX, j ? dp[i][j-1] : INT_MAX));',
  '  return dp[m-1][n-1];',
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
      caption: 'Min Path Sum: dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table2DState>,
  rows: number,
  cols: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(7).record(`The answer is ${answer}.`, {
    codeLine: 7,
    highlights: [{ pos: [rows - 1, cols - 1], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(grid: number[][], memo: boolean): Step[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 1;
  const rec = makeRecorder(rows, cols);
  const dp: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );
  let computed = 0;

  rec.at(3).record(
    memo
      ? 'Memoization: cache the minimum cost to reach each cell once. Reuse cached dp values from the cell above and the cell to the left.'
      : 'Tabulation: build dp bottom-up row by row. Each cell is final before it is read by its right or below neighbour.',
    {
      codeLine: 3,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, rows, cols },
    },
  );

  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const cell = grid[i]?.[j] ?? 1;
      if (i === 0 && j === 0) {
        const firstRow = dp[0];
        if (firstRow !== undefined) firstRow[0] = cell;
        computed += 1;
        rec.at(6).fill([0, 0], cell, `Base case: dp[0][0] = grid[0][0] = ${cell}.`, {
          kind: 'base',
          codeLine: 6,
          vars: { computed, i, j, cell },
        });
      } else if (i === 0) {
        const left = dp[i]?.[j - 1] ?? 0;
        const value = left + cell;
        const row = dp[i];
        if (row !== undefined) row[j] = value;
        computed += 1;
        rec.at(6).fill(
          [i, j],
          value,
          `Only the left neighbour exists, so dp[0][${j}] = dp[0][${j - 1}] + grid[0][${j}] = ${left} + ${cell} = ${value}.`,
          {
            codeLine: 6,
            highlights: [{ pos: [i, j - 1], kind: 'dependency', label: `dp[${i}][${j - 1}]` }],
            vars: { computed, i, j, cell },
          },
        );
      } else if (j === 0) {
        const top = dp[i - 1]?.[j] ?? 0;
        const value = top + cell;
        const row = dp[i];
        if (row !== undefined) row[j] = value;
        computed += 1;
        rec.at(6).fill(
          [i, j],
          value,
          `Only the top neighbour exists, so dp[${i}][0] = dp[${i - 1}][0] + grid[${i}][0] = ${top} + ${cell} = ${value}.`,
          {
            codeLine: 6,
            highlights: [{ pos: [i - 1, j], kind: 'dependency', label: `dp[${i - 1}][${j}]` }],
            vars: { computed, i, j, cell },
          },
        );
      } else {
        const top = dp[i - 1]?.[j] ?? 0;
        const left = dp[i]?.[j - 1] ?? 0;
        const value = cell + Math.min(top, left);
        const row = dp[i];
        if (row !== undefined) row[j] = value;
        computed += 1;
        const fromTop = top <= left;
        rec.at(6).fill(
          [i, j],
          value,
          memo
            ? `Cache reuse: dp[${i - 1}][${j}] = ${top} and dp[${i}][${j - 1}] = ${left}; dp[${i}][${j}] = grid[${i}][${j}] + min(${top}, ${left}) = ${cell} + ${Math.min(top, left)} = ${value}. ${fromTop ? 'From top wins.' : 'From left wins.'}`
            : `dp[${i}][${j}] = grid[${i}][${j}] + min(dp[${i - 1}][${j}] = ${top}, dp[${i}][${j - 1}] = ${left}) = ${cell} + ${Math.min(top, left)} = ${value}. ${fromTop ? 'From top wins.' : 'From left wins.'}`,
          {
            codeLine: 6,
            highlights: [
              { pos: [i - 1, j], kind: 'dependency', label: `dp[${i - 1}][${j}]` },
              { pos: [i, j - 1], kind: 'dependency', label: `dp[${i}][${j - 1}]` },
            ],
            vars: { computed, i, j, cell, top, left },
          },
        );
      }
    }
  }

  const answer = dp[rows - 1]?.[cols - 1] ?? 0;
  return finish(rec, rows, cols, answer, { computed });
}

function normalizeInput(input: MinPathSumInput): { grid: number[][] } {
  const raw = Array.isArray(input.grid) ? input.grid : [];
  const sliced = raw.slice(0, MAX_ROWS);
  const rows = (sliced.length > 0 ? sliced : [[1]]).map((row) => {
    const cells = Array.isArray(row) ? row.slice(0, MAX_COLS) : [];
    const safe = cells.length > 0 ? cells : [1];
    return safe.map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 9) : 1,
    );
  });
  const width = Math.max(...rows.map((row) => row.length));
  const grid = rows.map((row) => {
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push(1);
    return padded;
  });
  return { grid };
}

const minPathSumModule: ProblemModule<MinPathSumInput> = {
  id: 'min-path-sum',
  title: 'Min Path Sum',
  category: 'grid',
  difficulty: 'medium',
  summary:
    'Starting at the top-left, move only right or down to the bottom-right so the total of visited cells is minimal. Brute force enumerates every path; memoization caches each cell once and tabulation fills the DP bottom-up.',
  stateDefinition:
    'dp[i][j] = minimum path sum from (0, 0) to (i, j) moving only right or down, including grid[i][j] itself.',
  recurrence:
    'dp[0][0] = grid[0][0]; first row accumulates from the left; first column accumulates from the top; otherwise dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1]).',
  complexity: { time: 'O(m × n)', space: 'O(m × n)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'grid',
      label: 'grid',
      help: 'Cell costs. Start at the top-left and finish at the bottom-right moving only right or down.',
      type: 'matrix',
      minRows: 1,
      maxRows: MAX_ROWS,
      maxCols: MAX_COLS,
      min: 1,
      max: 9,
      numeric: true,
    },
  ],
  defaultInput: {
    grid: [
      [1, 3, 1],
      [1, 5, 1],
      [4, 2, 1],
    ],
  },
  modes: ['memo', 'tabulation'],
  generateSteps(input: MinPathSumInput, mode: Mode): Step[] {
    const { grid } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(grid, true);
    return iterativeSteps(grid, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the minimum path sum for the grid [[1,3,1],[1,5,1],[4,2,1]]?',
      options: ['9', '7', '8', '6'],
      answer: 1,
      why: 'The path 1 -> 3 -> 1 -> 1 -> 1 along the top row then down the last column sums to 7, which is minimal.',
    },
    {
      q: 'For an interior cell (i, j), what is dp[i][j]?',
      options: [
        'grid[i][j] + min(dp[i-1][j], dp[i][j-1])',
        'grid[i][j] + max(dp[i-1][j], dp[i][j-1])',
        'min(dp[i-1][j], dp[i][j-1])',
        'grid[i][j] + min(dp[i-1][j], dp[i][j-1], dp[i+1][j], dp[i][j+1])',
      ],
      answer: 0,
      why: 'You arrive from above or from the left only; add the current cell cost to the cheaper of those two predecessors.',
    },
    {
      q: 'Why do cells in the first row and first column have only one predecessor?',
      options: [
        'There is no cell above the first row or to the left of the first column',
        'The loops skip them',
        'They are pre-filled with 0',
        'They can only be reached from the diagonal',
      ],
      answer: 0,
      why: 'Moves are only right or down, so the first row can only be entered from the left and the first column only from above.',
    },
    {
      q: 'How do memoization/tabulation compare to brute-force enumeration?',
      options: ['O(m × n) vs exponential in m + n', 'O(m + n) vs O(m × n)', 'The same', 'O(m × n) vs O(m + n)'],
      answer: 0,
      why: 'Memoization/tabulation solve each of the m × n cells once; brute force explores all right/down paths, whose count grows exponentially.',
    },
  ],
};

export default minPathSumModule;
