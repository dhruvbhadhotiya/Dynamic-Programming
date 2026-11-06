import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface UniquePathsInput {
  m: number;
  n: number;
}

const pythonCode = [
  'def unique_paths(m, n):',
  '    dp = [[0] * n for _ in range(m)]',
  '    dp[0][0] = 1',
  '    for i in range(m):',
  '        for j in range(n):',
  '            if i == 0 or j == 0: dp[i][j] = 1',
  '            else: dp[i][j] = dp[i-1][j] + dp[i][j-1]',
  '    return dp[m-1][n-1]',
].join('\n');

const javascriptCode = [
  'function uniquePaths(m, n) {',
  '  const dp = Array.from({ length: m }, () => new Array(n).fill(0));',
  '  dp[0][0] = 1;',
  '  for (let i = 0; i < m; i++) {',
  '    for (let j = 0; j < n; j++) {',
  '      if (i === 0 || j === 0) dp[i][j] = 1;',
  '      else dp[i][j] = dp[i-1][j] + dp[i][j-1];',
  '  return dp[m-1][n-1];',
  '}',
].join('\n');

const cppCode = [
  'int uniquePaths(int m, int n) {',
  '  vector<vector<int>> dp(m, vector<int>(n, 0));',
  '  dp[0][0] = 1;',
  '  for (int i = 0; i < m; i++) {',
  '    for (int j = 0; j < n; j++) {',
  '      if (i == 0 || j == 0) dp[i][j] = 1;',
  '      else dp[i][j] = dp[i-1][j] + dp[i][j-1];',
  '  return dp[m-1][n-1];',
  '}',
].join('\n');

function makeRecorder(m: number, n: number): StepRecorder<Table2DState> {
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: Array.from({ length: m }, () =>
        Array.from({ length: n }, () => null),
      ),
      rowLabels: Array.from({ length: m }, (_, i) => `r=${i}`),
      colLabels: Array.from({ length: n }, (_, j) => `c=${j}`),
      rowHeader: 'row',
      colHeader: 'col',
      caption: 'Unique Paths: dp[i][j] = ways to reach (i, j) from (0, 0) moving right or down',
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
  rec.at(8).record(`The answer is ${answer}.`, {
    codeLine: 8,
    highlights: [{ pos: [m - 1, n - 1], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(m: number, n: number, memo: boolean): Step[] {
  const rec = makeRecorder(m, n);
  const dp: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each cell once. Reuse cached dp values to decide every cell.'
      : 'Tabulation: build dp bottom-up row by row. Each cell is final before later cells use it.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, m, n },
    },
  );

  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === 0 && j === 0) {
        if (dp[0] !== undefined) dp[0][0] = 1;
        computed += 1;
        rec.at(3).fill([0, 0], 1, 'Start: dp[0][0] = 1. Only one way to be at the start.', {
          kind: 'base',
          codeLine: 3,
          vars: { computed, reused, i, j },
        });
      } else if (i === 0 || j === 0) {
        const row = dp[i];
        if (row !== undefined) row[j] = 1;
        computed += 1;
        rec.at(6).fill(
          [i, j],
          1,
          `Edge cell (i=${i}, j=${j}): only ${i === 0 ? 'right' : 'down'} moves can reach it, so dp[${i}][${j}] = 1.`,
          {
            kind: 'base',
            codeLine: 6,
            vars: { computed, reused, i, j },
          },
        );
      } else {
        const fromTop = dp[i - 1]?.[j] ?? 0;
        const fromLeft = dp[i]?.[j - 1] ?? 0;
        const value = fromTop + fromLeft;
        const row = dp[i];
        if (row !== undefined) row[j] = value;
        computed += 1;
        reused += 2;
        rec.at(7).fill(
          [i, j],
          value,
          memo
            ? `Cache hit: reuse dp[${i - 1}][${j}] = ${fromTop} and dp[${i}][${j - 1}] = ${fromLeft}; dp[${i}][${j}] = ${value}.`
            : `dp[${i}][${j}] = dp[${i - 1}][${j}] + dp[${i}][${j - 1}] = ${fromTop} + ${fromLeft} = ${value}. Every path comes down or from the left.`,
          {
            codeLine: 7,
            highlights: [
              { pos: [i - 1, j], kind: 'dependency', label: `dp[${i - 1}][${j}]` },
              { pos: [i, j - 1], kind: 'dependency', label: `dp[${i}][${j - 1}]` },
            ],
            vars: { computed, reused, i, j },
          },
        );
      }
    }
  }

  return finish(rec, m, n, dp[m - 1]?.[n - 1] ?? 0, { computed, reused });
}

function normalizeInput(input: UniquePathsInput): { m: number; n: number } {
  const m =
    typeof input.m === 'number' && Number.isFinite(input.m) ? clamp(Math.trunc(input.m), 1, 5) : 1;
  const n =
    typeof input.n === 'number' && Number.isFinite(input.n) ? clamp(Math.trunc(input.n), 1, 7) : 1;
  return { m, n };
}

const uniquePathsModule: ProblemModule<UniquePathsInput> = {
  id: 'unique-paths',
  title: 'Unique Paths',
  category: 'grid',
  difficulty: 'easy',
  summary:
    'Count distinct right/down paths from the top-left to the bottom-right of an m x n grid. Brute force recomputes overlapping reaches; memoization caches them and tabulation fills dp cell by cell.',
  stateDefinition:
    'dp[i][j] = number of distinct paths from (0, 0) to (i, j) moving only right or down, for 0 <= i < m and 0 <= j < n.',
  recurrence:
    'dp[0][0] = 1; dp[0][j] = 1 and dp[i][0] = 1; dp[i][j] = dp[i-1][j] + dp[i][j-1] for i > 0 and j > 0.',
  complexity: { time: 'O(m × n)', space: 'O(m × n)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'm',
      label: 'm',
      help: 'Number of rows in the grid.',
      type: 'number',
      min: 1,
      max: 5,
    },
    {
      name: 'n',
      label: 'n',
      help: 'Number of columns in the grid.',
      type: 'number',
      min: 1,
      max: 7,
    },
  ],
  defaultInput: { m: 3, n: 7 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: UniquePathsInput, mode: Mode): Step[] {
    const { m, n } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(m, n, true);
    return iterativeSteps(m, n, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the number of unique paths in a 3 x 7 grid?',
      options: ['28', '21', '35', '14'],
      answer: 0,
      why: 'You need 2 down moves and 6 right moves (8 moves total). Choose where the 2 downs go: C(8, 2) = 28.',
    },
    {
      q: 'For i > 0 and j > 0, what is dp[i][j]?',
      options: [
        'dp[i-1][j] + dp[i][j-1]',
        'dp[i-1][j] only',
        'dp[i][j-1] only',
        'dp[i-1][j-1] * 2',
      ],
      answer: 0,
      why: 'Every path reaches (i, j) either from above (i-1, j) moving down, or from the left (i, j-1) moving right, so the counts add.',
    },
    {
      q: 'Why is dp[0][j] = 1 and dp[i][0] = 1?',
      options: [
        'Cells on the first row/column can only be reached by moving in one direction',
        'It is a convention with no reason',
        'The grid corner is blocked',
        'They use the diagonal cell',
      ],
      answer: 0,
      why: 'The first row can only be reached by moving right and the first column only by moving down, so there is exactly one path to each of those cells.',
    },
    {
      q: 'How do memoization/tabulation compare to brute force counting?',
      options: [
        'O(m × n) cells computed once vs exponential recomputation',
        'O(m + n) vs O(m × n)',
        'The same cost',
        'O(m × n) vs O(m × n) tie',
      ],
      answer: 0,
      why: 'Memoization/tabulation solve each of the m × n subproblems once; brute force recomputes the same reaches exponentially many times.',
    },
  ],
};

export default uniquePathsModule;
