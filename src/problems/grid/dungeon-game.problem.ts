import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface DungeonGameInput {
  dungeon: number[][];
}

const MAX_ROWS = 4;
const MAX_COLS = 4;

const pythonCode = [
  'def min_initial_health(dungeon):',
  '    m, n = len(dungeon), len(dungeon[0])',
  '    dp = [[0] * n for _ in range(m)]',
  '    dp[m-1][n-1] = max(1, 1 - dungeon[m-1][n-1])',
  '    for i in reversed(range(m)):',
  '        for j in reversed(range(n)):',
  '            if i == m-1 and j == n-1: continue',
  '            dp[i][j] = max(1, min(dp[i+1][j] if i < m-1 else 10**9, dp[i][j+1] if j < n-1 else 10**9) - dungeon[i][j])',
  '    return dp[0][0]',
].join('\n');

const javascriptCode = [
  'function minInitialHealth(dungeon) {',
  '  const m = dungeon.length, n = dungeon[0].length;',
  '  const dp = Array.from({ length: m }, () => new Array(n).fill(0));',
  '  dp[m-1][n-1] = Math.max(1, 1 - dungeon[m-1][n-1]);',
  '  for (let i = m - 1; i >= 0; i--)',
  '    for (let j = n - 1; j >= 0; j--)',
  '      if (i === m - 1 && j === n - 1) continue;',
  '      else dp[i][j] = Math.max(1, Math.min(i < m - 1 ? dp[i+1][j] : Infinity, j < n - 1 ? dp[i][j+1] : Infinity) - dungeon[i][j]);',
  '  return dp[0][0];',
  '}',
].join('\n');

const cppCode = [
  'int min_initial_health(vector<vector<int>>& dungeon) {',
  '  int m = dungeon.size(), n = dungeon[0].size();',
  '  vector<vector<int>> dp(m, vector<int>(n, 0));',
  '  dp[m-1][n-1] = max(1, 1 - dungeon[m-1][n-1]);',
  '  for (int i = m - 1; i >= 0; i--)',
  '    for (int j = n - 1; j >= 0; j--)',
  '      if (i == m - 1 && j == n - 1) continue;',
  '      else dp[i][j] = max(1, min(i < m - 1 ? dp[i+1][j] : INT_MAX, j < n - 1 ? dp[i][j+1] : INT_MAX) - dungeon[i][j]);',
  '  return dp[0][0];',
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
      caption: 'Dungeon Game: dp[i][j] = max(1, min(dp[i+1][j], dp[i][j+1]) - dungeon[i][j])',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table2DState>,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(9).record(`The answer is ${answer}.`, {
    codeLine: 9,
    highlights: [{ pos: [0, 0], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(dungeon: number[][], memo: boolean): Step[] {
  const rows = dungeon.length;
  const cols = dungeon[0]?.length ?? 1;
  const rec = makeRecorder(rows, cols);
  const dp: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );
  let computed = 0;
  const lastRow = rows - 1;
  const lastCol = cols - 1;

  rec.at(3).record(
    memo
      ? 'Memoization: cache the minimum health needed on entering each cell. Reuse cached dp values from the cell below and the cell to the right.'
      : 'Tabulation: build dp bottom-up from the destination backwards. Each cell is final before it is read by its upper or left neighbour.',
    {
      codeLine: 3,
      highlights: [{ pos: [lastRow, lastCol], kind: 'active' }],
      vars: { computed: 0, rows, cols },
    },
  );

  for (let i = lastRow; i >= 0; i -= 1) {
    for (let j = lastCol; j >= 0; j -= 1) {
      const cell = dungeon[i]?.[j] ?? 0;
      if (i === lastRow && j === lastCol) {
        const value = Math.max(1, 1 - cell);
        const row = dp[i];
        if (row !== undefined) row[j] = value;
        computed += 1;
        rec.at(4).fill(
          [i, j],
          value,
          `Destination: dp[${i}][${j}] = max(1, 1 - dungeon[${i}][${j}]) = max(1, 1 - (${cell})) = ${value}. The knight must enter the exit with enough health to survive it.`,
          {
            kind: 'base',
            codeLine: 4,
            vars: { computed, i, j, cell },
          },
        );
      } else {
        const below = i < lastRow ? (dp[i + 1]?.[j] ?? 0) : Number.POSITIVE_INFINITY;
        const right = j < lastCol ? (dp[i]?.[j + 1] ?? 0) : Number.POSITIVE_INFINITY;
        const best = Math.min(below, right);
        const value = Math.max(1, best - cell);
        const row = dp[i];
        if (row !== undefined) row[j] = value;
        computed += 1;
        const highlights: Array<{ pos: number[]; kind: 'dependency'; label: string }> = [];
        if (i < lastRow) highlights.push({ pos: [i + 1, j], kind: 'dependency', label: `dp[${i + 1}][${j}]` });
        if (j < lastCol) highlights.push({ pos: [i, j + 1], kind: 'dependency', label: `dp[${i}][${j + 1}]` });
        const deps = highlights
          .map((h) => `${h.label} = ${dp[h.pos[0] as number]?.[h.pos[1] as number] ?? '?'}`)
          .join(' and ');
        rec.at(8).fill(
          [i, j],
          value,
          memo
            ? `Cache reuse: ${deps}; best = ${best}. dp[${i}][${j}] = max(1, ${best} - (${cell})) = ${value}.`
            : `dp[${i}][${j}] = max(1, min(${deps}) - dungeon[${i}][${j}]) = max(1, ${best} - (${cell})) = ${value}.`,
          {
            codeLine: 8,
            highlights,
            vars: { computed, i, j, cell },
          },
        );
      }
    }
  }

  const answer = dp[0]?.[0] ?? 1;
  return finish(rec, answer, { computed });
}

function normalizeInput(input: DungeonGameInput): { dungeon: number[][] } {
  const raw = Array.isArray(input.dungeon) ? input.dungeon : [];
  const sliced = raw.slice(0, MAX_ROWS);
  const rows = (sliced.length > 0 ? sliced : [[0]]).map((row) => {
    const cells = Array.isArray(row) ? row.slice(0, MAX_COLS) : [];
    const safe = cells.length > 0 ? cells : [0];
    return safe.map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), -30, 20) : 0,
    );
  });
  const width = Math.max(...rows.map((row) => row.length));
  const dungeon = rows.map((row) => {
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push(0);
    return padded;
  });
  return { dungeon };
}

const dungeonGameModule: ProblemModule<DungeonGameInput> = {
  id: 'dungeon-game',
  title: 'Dungeon Game',
  category: 'grid',
  difficulty: 'medium',
  summary:
    'A knight enters a dungeon at the top-left and must reach the bottom-right moving only right or down, staying alive. Brute force enumerates every path; memoization caches the minimum health needed per cell and tabulation fills dp backwards from the destination.',
  stateDefinition:
    'dp[i][j] = minimum initial health the knight needs on entering (i, j) to reach the princess alive, given the cell value dungeon[i][j] (positive heals, negative harms).',
  recurrence:
    'dp[m-1][n-1] = max(1, 1 - dungeon[m-1][n-1]); otherwise dp[i][j] = max(1, min(dp[i+1][j], dp[i][j+1]) - dungeon[i][j]).',
  complexity: { time: 'O(m × n)', space: 'O(m × n)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'dungeon',
      label: 'dungeon',
      help: 'Cell values: positive heals, negative harms. Start at the top-left and finish at the bottom-right moving only right or down.',
      type: 'matrix',
      minRows: 1,
      maxRows: MAX_ROWS,
      maxCols: MAX_COLS,
      min: -30,
      max: 20,
      numeric: true,
    },
  ],
  defaultInput: {
    dungeon: [
      [-2, -3, 3],
      [-5, -10, 1],
      [0, -30, -5],
    ],
  },
  modes: ['memo', 'tabulation'],
  generateSteps(input: DungeonGameInput, mode: Mode): Step[] {
    const { dungeon } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(dungeon, true);
    return iterativeSteps(dungeon, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the minimum initial health for [[-2,-3,3],[-5,-10,1],[0,-30,-5]]?',
      options: ['7', '6', '8', '9'],
      answer: 0,
      why: 'Working backwards from the destination gives dp[0][0] = 7, so the knight must start with 7 health.',
    },
    {
      q: 'For a non-destination cell (i, j), what is dp[i][j]?',
      options: [
        'max(1, min(dp[i+1][j], dp[i][j+1]) - dungeon[i][j])',
        'min(dp[i+1][j], dp[i][j+1]) + dungeon[i][j]',
        'max(1, 1 - dungeon[i][j])',
        'min(dp[i-1][j], dp[i][j-1]) - dungeon[i][j]',
      ],
      answer: 0,
      why: 'Go to whichever neighbour below or right needs less health, then subtract this cell value (healing lowers the need, damage raises it), clamped to at least 1.',
    },
    {
      q: 'Why do we fill dp backwards from the bottom-right?',
      options: [
        'Each cell depends on the cell below and the cell to its right, which must be known first',
        'The loops run nested',
        'The destination is the largest value',
        'The knight starts at the destination',
      ],
      answer: 0,
      why: 'dp[i][j] reads dp[i+1][j] and dp[i][j+1]; scanning rows and columns in reverse guarantees those neighbours are already final.',
    },
    {
      q: 'How do memoization/tabulation compare to brute-force enumeration?',
      options: ['O(m × n) vs exponential in m + n', 'O(m + n) vs O(m × n)', 'The same', 'O(m × n) vs O(m + n)'],
      answer: 0,
      why: 'Memoization/tabulation solve each of the m × n cells once; brute force enumerates every right/down path, whose count grows exponentially.',
    },
  ],
};

export default dungeonGameModule;
