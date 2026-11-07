import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface UniquePathsIiInput {
  obstacleGrid: number[][];
}

const MAX_ROWS = 4;
const MAX_COLS = 4;

const pythonCode = [
  'def unique_paths(grid):',
  '    m, n = len(grid), len(grid[0])',
  '    dp = [[0] * n for _ in range(m)]',
  '    dp[0][0] = 0 if grid[0][0] == 1 else 1',
  '    for i in range(m):',
  '        for j in range(n):',
  '            if grid[i][j] == 1: dp[i][j] = 0',
  '            elif (i, j) != (0, 0): dp[i][j] = (dp[i-1][j] if i > 0 else 0) + (dp[i][j-1] if j > 0 else 0)',
  '    return dp[m-1][n-1]',
].join('\n');

const javascriptCode = [
  'function uniquePaths(grid) {',
  '  const m = grid.length, n = grid[0].length;',
  '  const dp = Array.from({ length: m }, () => new Array(n).fill(0));',
  '  dp[0][0] = grid[0][0] === 1 ? 0 : 1;',
  '  for (let i = 0; i < m; i++)',
  '    for (let j = 0; j < n; j++)',
  '      if (grid[i][j] === 1) dp[i][j] = 0;',
  '      else if (i !== 0 || j !== 0) dp[i][j] = (i > 0 ? dp[i-1][j] : 0) + (j > 0 ? dp[i][j-1] : 0);',
  '  return dp[m-1][n-1];',
  '}',
].join('\n');

const cppCode = [
  'int uniquePaths(vector<vector<int>>& grid) {',
  '  int m = grid.size(), n = grid[0].size();',
  '  vector<vector<int>> dp(m, vector<int>(n, 0));',
  '  dp[0][0] = grid[0][0] == 1 ? 0 : 1;',
  '  for (int i = 0; i < m; i++)',
  '    for (int j = 0; j < n; j++)',
  '      if (grid[i][j] == 1) dp[i][j] = 0;',
  '      else if (i != 0 || j != 0) dp[i][j] = (i > 0 ? dp[i-1][j] : 0) + (j > 0 ? dp[i][j-1] : 0);',
  '  return dp[m-1][n-1];',
  '}',
].join('\n');

function makeRecorder(m: number, n: number): StepRecorder<Table2DState> {
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: Array.from({ length: m }, () => Array.from({ length: n }, () => null)),
      rowLabels: Array.from({ length: m }, (_, i) => `r=${i}`),
      colLabels: Array.from({ length: n }, (_, j) => `c=${j}`),
      rowHeader: 'row',
      colHeader: 'col',
      caption: 'Unique Paths II: dp[i][j] = distinct paths from (0,0) to (i,j)',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table2DState>,
  m: number,
  n: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(9).record(`The answer is ${answer}.`, {
    codeLine: 9,
    highlights: [{ pos: [m - 1, n - 1], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(grid: number[][], memo: boolean): Step[] {
  const m = grid.length;
  const n = grid[0]?.length ?? 0;
  const rec = makeRecorder(m, n);
  const dp: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each path count once. Reuse the cached counts from the cell above and the cell to the left.'
      : 'Tabulation: fill dp row by row, left to right. Every cell above and to the left is final before it is needed.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, m, n },
    },
  );

  const startBlocked = grid[0]?.[0] === 1;
  const startRow = dp[0];
  if (startRow !== undefined) startRow[0] = startBlocked ? 0 : 1;
  computed += 1;
  rec.at(4).fill([0, 0], startBlocked ? 0 : 1, startBlocked ? 'Start cell (0,0) is an obstacle, so dp[0][0] = 0 and no path can begin.' : 'Start cell: dp[0][0] = 1, the single empty path that begins here.', {
    kind: 'base',
    codeLine: 4,
    vars: { computed, reused, i: 0, j: 0 },
  });

  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === 0 && j === 0) continue;
      if (grid[i]?.[j] === 1) {
        const row = dp[i];
        if (row !== undefined) row[j] = 0;
        computed += 1;
        rec.at(7).fill([i, j], 0, `Obstacle at (${i},${j}): dp[${i}][${j}] = 0. No path may pass through a blocked cell.`, {
          kind: 'pruned',
          codeLine: 7,
          vars: { computed, reused, i, j },
        });
        continue;
      }
      const fromTop = i > 0 ? (dp[i - 1]?.[j] ?? 0) : 0;
      const fromLeft = j > 0 ? (dp[i]?.[j - 1] ?? 0) : 0;
      const row = dp[i];
      if (row !== undefined) row[j] = fromTop + fromLeft;
      computed += 1;
      reused += (i > 0 ? 1 : 0) + (j > 0 ? 1 : 0);
      const highlights: Highlight[] = [];
      if (i > 0) highlights.push({ pos: [i - 1, j], kind: 'dependency', label: `dp[${i - 1}][${j}]` });
      if (j > 0) highlights.push({ pos: [i, j - 1], kind: 'dependency', label: `dp[${i}][${j - 1}]` });
      const terms: string[] = [];
      if (i > 0) terms.push(`dp[${i - 1}][${j}] = ${fromTop}`);
      if (j > 0) terms.push(`dp[${i}][${j - 1}] = ${fromLeft}`);
      const sum = terms.join(' + ');
      rec.at(8).fill(
        [i, j],
        fromTop + fromLeft,
        memo
          ? `Cache hit: reuse ${terms.join(' and ')}; dp[${i}][${j}] = ${fromTop} + ${fromLeft} = ${fromTop + fromLeft}.`
          : `dp[${i}][${j}] = ${sum} = ${fromTop + fromLeft}. Paths can only arrive from above or from the left.`,
        {
          codeLine: 8,
          highlights,
          vars: { computed, reused, i, j, fromTop, fromLeft },
        },
      );
    }
  }

  return finish(rec, m, n, dp[m - 1]?.[n - 1] ?? 0, { computed, reused });
}

function normalizeInput(input: UniquePathsIiInput): { obstacleGrid: number[][] } {
  const raw = Array.isArray(input.obstacleGrid) ? input.obstacleGrid : [];
  const rows = raw.slice(0, MAX_ROWS).filter((row) => Array.isArray(row));
  const width = rows[0]?.length ?? 0;
  if (rows.length === 0 || width === 0) return { obstacleGrid: [[0]] };
  const cols = clamp(width, 1, MAX_COLS);
  const obstacleGrid = rows.map((row) =>
    row.slice(0, cols).map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, 1) : 0,
    ),
  );
  return { obstacleGrid };
}

const uniquePathsIiModule: ProblemModule<UniquePathsIiInput> = {
  id: 'unique-paths-ii',
  title: 'Unique Paths II',
  category: 'grid',
  difficulty: 'easy',
  summary:
    'Count distinct paths from the top-left to the bottom-right of a grid moving only right or down, where cells marked 1 are obstacles. Memoization caches each count and tabulation fills dp row by row.',
  stateDefinition:
    'dp[i][j] = number of distinct paths from (0,0) to (i,j), moving only right or down, that avoid obstacles.',
  recurrence:
    'dp[0][0] = 1 if the start cell is free, else 0; dp[i][j] = 0 if obstacleGrid[i][j] is 1, else (dp[i-1][j] if i > 0 else 0) + (dp[i][j-1] if j > 0 else 0).',
  complexity: { time: 'O(m × n)', space: 'O(m × n)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'obstacleGrid',
      label: 'obstacleGrid',
      help: 'Grid of 0 (free) and 1 (obstacle). Move only right or down from the top-left to the bottom-right.',
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
    obstacleGrid: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
  modes: ['memo', 'tabulation'],
  generateSteps(input: UniquePathsIiInput, mode: Mode): Step[] {
    const { obstacleGrid } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(obstacleGrid, true);
    return iterativeSteps(obstacleGrid, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'How many paths are there in the 3x3 grid whose only obstacle is the center cell?',
      options: ['2', '4', '6', '1'],
      answer: 0,
      why: 'Only the path along the top row then down the right side, and the path down the left side then along the bottom row, avoid the center obstacle.',
    },
    {
      q: 'What is dp[i][j] when obstacleGrid[i][j] is 1?',
      options: [
        'dp[i-1][j] + dp[i][j-1]',
        '1',
        '0',
        'dp[i-1][j]',
      ],
      answer: 2,
      why: 'No path may pass through a blocked cell, so the count of paths reaching it is zero and it contributes nothing onward.',
    },
    {
      q: 'For a free cell (i,j) other than (0,0), what is dp[i][j]?',
      options: [
        '(dp[i-1][j] if i > 0 else 0) + (dp[i][j-1] if j > 0 else 0)',
        'dp[i-1][j] only',
        'dp[i][j-1] only',
        'dp[i-1][j] + dp[i][j-1] + 1',
      ],
      answer: 0,
      why: 'Every path arrives from the cell directly above or directly to the left, so the counts add; a missing direction on the first row or column contributes 0.',
    },
    {
      q: 'Why does filling the grid row by row, left to right, work?',
      options: [
        'Right and down moves only read cells above and to the left, which are already final',
        'It makes no difference',
        'It is the only order the grid allows',
        'Diagonal moves would break it',
      ],
      answer: 0,
      why: 'Moves are only right and down, so dp[i][j] depends solely on dp[i-1][j] and dp[i][j-1]; scanning top to bottom and left to right computes both first.',
    },
  ],
};

export default uniquePathsIiModule;
