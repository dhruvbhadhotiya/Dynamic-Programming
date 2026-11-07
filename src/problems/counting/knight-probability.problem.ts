import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface KnightProbabilityInput {
  n: number;
  startRow: number;
  startCol: number;
  k: number;
}

const MIN_N = 2;
const MAX_N = 6;
const MAX_START = 5;
const MAX_K = 4;

const MOVES: readonly (readonly [number, number])[] = [
  [2, 1],
  [1, 2],
  [-1, 2],
  [-2, 1],
  [-2, -1],
  [-1, -2],
  [1, -2],
  [2, -1],
];

const pythonCode = [
  'def knight_probability(n, start_row, start_col, k):',
  '    dp = [[0] * (n * n) for _ in range(k + 1)]',
  '    dp[0][start_row * n + start_col] = 1',
  '    moves = ((2, 1), (1, 2), (-1, 2), (-2, 1), (-2, -1), (-1, -2), (1, -2), (2, -1))',
  '    for t in range(k):',
  '        for src in range(n * n):',
  '            r, c = divmod(src, n)',
  '            for dr, dc in moves:',
  '                nr, nc = r + dr, c + dc',
  '                if 0 <= nr < n and 0 <= nc < n: dp[t + 1][nr * n + nc] += dp[t][src]',
  '    return sum(dp[k]) / (8 ** k)',
].join('\n');

const javascriptCode = [
  'function knightProbability(n, startRow, startCol, k) {',
  '  const dp = Array.from({ length: k + 1 }, () => new Array(n * n).fill(0));',
  '  dp[0][startRow * n + startCol] = 1;',
  '  const moves = [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];',
  '  for (let t = 0; t < k; t++)',
  '    for (let src = 0; src < n * n; src++) {',
  '      const r = Math.floor(src / n), c = src % n;',
  '      for (const [dr, dc] of moves) {',
  '        const nr = r + dr, nc = c + dc;',
  '        if (nr >= 0 && nr < n && nc >= 0 && nc < n) dp[t + 1][nr * n + nc] += dp[t][src]; } }',
  '  return dp[k].reduce((a, b) => a + b, 0) / (8 ** k);',
  '}',
].join('\n');

const cppCode = [
  'double knight_probability(int n, int startRow, int startCol, int k) {',
  '  vector<vector<int>> dp(k + 1, vector<int>(n * n, 0));',
  '  dp[0][startRow * n + startCol] = 1;',
  '  int moves[8][2] = {{2,1},{1,2},{-1,2},{-2,1},{-2,-1},{-1,-2},{1,-2},{2,-1}};',
  '  for (int t = 0; t < k; t++)',
  '    for (int src = 0; src < n * n; src++) {',
  '      int r = src / n, c = src % n;',
  '      for (auto& mv : moves) {',
  '        int nr = r + mv[0], nc = c + mv[1];',
  '        if (nr >= 0 && nr < n && nc >= 0 && nc < n) dp[t + 1][nr * n + nc] += dp[t][src]; } }',
  '  return accumulate(dp[k].begin(), dp[k].end(), 0) / pow(8, k);',
  '}',
].join('\n');

function colLabel(index: number, n: number, start: number): string {
  const r = Math.floor(index / n);
  const c = index % n;
  return `${index}(${r},${c})${index === start ? '*' : ''}`;
}

function makeRecorder(n: number, k: number, start: number): StepRecorder<Table2DState> {
  const cols = n * n;
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D(k + 1, cols, () => null),
      rowLabels: Array.from({ length: k + 1 }, (_value, t) => `t=${t}`),
      colLabels: Array.from({ length: cols }, (_value, idx) => colLabel(idx, n, start)),
      rowHeader: 'moves t',
      colHeader: 'cell (r,c)',
      caption: 'Knight Probability: dp[t][cell] = walks of exactly t knight moves ending at cell',
    },
    { codeLine: 1 },
  );
}

/** Sources (flattened) that can reach dest in one knight move. */
function predecessors(n: number, dest: number): number[] {
  const dr = Math.floor(dest / n);
  const dc = dest % n;
  const sources: number[] = [];
  for (const [mr, mc] of MOVES) {
    const sr = dr - mr;
    const sc = dc - mc;
    if (sr >= 0 && sr < n && sc >= 0 && sc < n) sources.push(sr * n + sc);
  }
  return sources;
}

function recordBaseRow(
  rec: StepRecorder<Table2DState>,
  dp: number[][],
  n: number,
  k: number,
  start: number,
): number {
  const cols = n * n;
  let computed = 0;
  for (let cell = 0; cell < cols; cell += 1) {
    const value = cell === start ? 1 : 0;
    const row = dp[0];
    if (row !== undefined) row[cell] = value;
    computed += 1;
    rec.at(3).fill(
      [0, cell],
      value,
      value === 1
        ? `Base case: dp[0][${cell}] = 1 — with zero moves the knight is at the start cell (${Math.floor(
            start / n,
          )},${start % n}).`
        : `Base case: dp[0][${cell}] = 0 — with zero moves the knight cannot be at cell ${cell}.`,
      { kind: 'base', codeLine: 3, vars: { n, k, start, computed, cell } },
    );
  }
  return computed;
}

function finish(
  rec: StepRecorder<Table2DState>,
  n: number,
  startRow: number,
  startCol: number,
  k: number,
  total: number,
  computed: number,
  reused: number,
): Step[] {
  const denominator = 8 ** k;
  const answer = total / denominator;
  const cols = n * n;
  rec.at(11).record(
    `The answer is ${answer}: ${total} of ${denominator} equally likely move sequences stay on the ${n}x${n} board, so the probability is ${total}/${denominator} = ${answer}.`,
    {
      codeLine: 11,
      highlights: Array.from({ length: cols }, (_value, cell) => ({
        pos: [k, cell],
        kind: 'result' as const,
        label: 'answer',
      })),
      vars: { answer, n, startRow, startCol, k, total, computed, reused },
    },
  );
  return [...rec.steps];
}

function memoSteps(n: number, startRow: number, startCol: number, k: number): Step[] {
  const cols = n * n;
  const start = startRow * n + startCol;
  const rec = makeRecorder(n, k, start);
  const dp = create2D(k + 1, cols, () => 0);
  const memo = new Map<string, number>();
  let reused = 0;

  rec.at(2).record(
    `Memoization: solve(t, cell) counts walks of exactly t knight moves ending at cell. Recurse over predecessor cells and cache each (t, cell) the first time it is computed.`,
    {
      codeLine: 2,
      highlights: [{ pos: [k, start], kind: 'active', label: `solve(${k}, ${start})` }],
      vars: { n, startRow, startCol, k, computed: 0, reused: 0 },
    },
  );

  let computed = recordBaseRow(rec, dp, n, k, start);

  function solve(t: number, dest: number): number {
    if (t === 0) return dest === start ? 1 : 0;
    const key = `${t}:${dest}`;
    const cached = memo.get(key);
    if (cached !== undefined) {
      reused += 1;
      rec.at(10).record(
        `Memo hit: solve(${t}, ${dest}) = ${cached} is already cached, so reuse it instead of exploring its predecessors again.`,
        {
          codeLine: 10,
          highlights: [{ pos: [t, dest], kind: 'dependency', label: 'cached' }],
          vars: { n, startRow, startCol, k, computed, reused, t, dest, cached },
        },
      );
      return cached;
    }

    const preds = predecessors(n, dest);
    let total = 0;
    const parts: string[] = [];
    const deps: Highlight[] = [];
    for (const src of preds) {
      const part = solve(t - 1, src);
      total += part;
      parts.push(`solve(${t - 1}, ${src}) = ${part}`);
      deps.push({ pos: [t - 1, src], kind: 'dependency', label: `pred ${src}` });
    }

    memo.set(key, total);
    const row = dp[t];
    if (row !== undefined) row[dest] = total;
    computed += 1;
    const message =
      parts.length === 0
        ? `solve(${t}, ${dest}) = 0: no knight predecessor fits on the board, so no walk of exactly ${t} moves ends here. Cache it.`
        : `solve(${t}, ${dest}) = ${parts.join(' + ')} = ${total}: add the walks ending at each predecessor one move earlier. Cache it.`;
    rec.at(10).fill([t, dest], total, message, {
      codeLine: 10,
      highlights: deps,
      vars: { n, startRow, startCol, k, computed, reused, t, dest, total },
    });
    return total;
  }

  for (let cell = 0; cell < cols; cell += 1) {
    solve(k, cell);
  }

  const finalRow = dp[k] ?? [];
  const total = finalRow.reduce((a, b) => a + b, 0);
  return finish(rec, n, startRow, startCol, k, total, computed, reused);
}

function tabulationSteps(n: number, startRow: number, startCol: number, k: number): Step[] {
  const cols = n * n;
  const start = startRow * n + startCol;
  const rec = makeRecorder(n, k, start);
  const dp = create2D(k + 1, cols, () => 0);
  let reused = 0;

  rec.at(2).record(
    `Tabulation: start from dp[0][start] = 1 and fill move layers t = 1..${k} in order. Each cell adds the counts of its predecessor cells from the previous layer.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0, start], kind: 'active', label: 'start' }],
      vars: { n, startRow, startCol, k, computed: 0, reused: 0 },
    },
  );

  let computed = recordBaseRow(rec, dp, n, k, start);

  for (let t = 0; t < k; t += 1) {
    rec.at(5).record(
      `Fill layer t = ${t + 1}: each cell collects walks that were at a knight predecessor after exactly ${t} moves.`,
      {
        codeLine: 5,
        highlights: [{ pos: [t + 1, start], kind: 'active', label: `layer ${t + 1}` }],
        vars: { n, startRow, startCol, k, computed, reused, t },
      },
    );

    for (let dest = 0; dest < cols; dest += 1) {
      const preds = predecessors(n, dest);
      let total = 0;
      const parts: string[] = [];
      const deps: Highlight[] = [];
      for (const src of preds) {
        const value = dp[t]?.[src] ?? 0;
        total += value;
        parts.push(`dp[${t}][${src}] = ${value}`);
        deps.push({ pos: [t, src], kind: 'dependency', label: `pred ${src}` });
      }

      const row = dp[t + 1];
      if (row !== undefined) row[dest] = total;
      computed += 1;
      reused += deps.length;
      const message =
        parts.length === 0
          ? `dp[${t + 1}][${dest}] = 0: no knight predecessor fits on the board.`
          : `dp[${t + 1}][${dest}] = ${parts.join(' + ')} = ${total}: each term fixes the predecessor one move earlier.`;
      rec.at(10).fill([t + 1, dest], total, message, {
        codeLine: 10,
        highlights: deps,
        vars: { n, startRow, startCol, k, computed, reused, t, dest, total },
      });
    }
  }

  const total = (dp[k] ?? []).reduce((a, b) => a + b, 0);
  return finish(rec, n, startRow, startCol, k, total, computed, reused);
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), min, max);
}

function normalizeInput(input: KnightProbabilityInput): KnightProbabilityInput {
  const n = clampInt(input?.n, MIN_N, MAX_N, 4);
  return {
    n,
    startRow: clamp(clampInt(input?.startRow, 0, MAX_START, 1), 0, n - 1),
    startCol: clamp(clampInt(input?.startCol, 0, MAX_START, 1), 0, n - 1),
    k: clampInt(input?.k, 0, MAX_K, 3),
  };
}

const knightProbabilityModule: ProblemModule<KnightProbabilityInput> = {
  id: 'knight-probability',
  title: 'Knight Probability in Chessboard',
  category: 'counting',
  difficulty: 'medium',
  summary:
    'A knight starts on an n x n board and chooses one of eight knight moves uniformly at random for k moves. Count the move sequences that stay on the board and divide by 8^k. Memoization caches each (moves, cell) state and tabulation fills move layers in order.',
  stateDefinition:
    'dp[t][cell] = number of walks of exactly t knight moves, starting at (startRow, startCol), that end at the flattened cell (r, c) on the n x n board, for 0 <= t <= k and 0 <= cell < n*n.',
  recurrence:
    'dp[0][start] = 1 and dp[0][cell] = 0 elsewhere; dp[t+1][dest] = sum of dp[t][src] over every src that is a knight move away from dest; the answer is sum(dp[k]) / 8^k.',
  complexity: { time: 'O(k × n² × 8)', space: 'O(k × n²)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'n',
      label: 'n',
      help: 'Board size: the board is n x n (2 to 6).',
      type: 'number',
      min: MIN_N,
      max: MAX_N,
      step: 1,
    },
    {
      name: 'startRow',
      label: 'startRow',
      help: 'Starting row, 0-based (0 to 5, clamped to the board).',
      type: 'number',
      min: 0,
      max: MAX_START,
      step: 1,
    },
    {
      name: 'startCol',
      label: 'startCol',
      help: 'Starting column, 0-based (0 to 5, clamped to the board).',
      type: 'number',
      min: 0,
      max: MAX_START,
      step: 1,
    },
    {
      name: 'k',
      label: 'k',
      help: 'Number of knight moves (0 to 4).',
      type: 'number',
      min: 0,
      max: MAX_K,
      step: 1,
    },
  ],
  defaultInput: { n: 4, startRow: 1, startCol: 1, k: 3 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: KnightProbabilityInput, mode: Mode): Step[] {
    const { n, startRow, startCol, k } = normalizeInput(input);
    if (mode === 'memo') return memoSteps(n, startRow, startCol, k);
    return tabulationSteps(n, startRow, startCol, k);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the default board (4x4, start (1,1), k = 3), what is the knight probability?',
      options: ['0.0703125 (36/512)', '0.09765625 (50/512)', '0.15625 (10/64)', '0.5'],
      answer: 0,
      why: 'Exhaustive enumeration gives 36 staying sequences out of 8^3 = 512, so 36/512 = 0.0703125. The other counts are for different k or start cells.',
    },
    {
      q: 'What is the probability when k = 0 for any valid start?',
      options: ['0', '1', '0.5', '0.125'],
      answer: 1,
      why: 'With zero moves the knight has not left the board, so dp[0][start] = 1 and the answer is 1/8^0 = 1.',
    },
    {
      q: 'On a 3x3 board from the centre (1,1) with k = 1, what is the probability?',
      options: ['0.0625', '0.25', '0', '0.5'],
      answer: 2,
      why: 'Every knight move from the centre of a 3x3 board leaves the board (2 rows/columns away always overflows), so 0 of 8 sequences stay. The value 0.0625 is 4/64 for a 3x3 corner with k = 2.',
    },
    {
      q: 'Why does the answer divide the walk count by 8^k?',
      options: [
        'Each move has 8 equally likely choices, so there are 8^k equally likely move sequences',
        'The board has n*n cells, so the denominator is (n*n)^k',
        'The denominator counts only the moves that stay on the board',
        'It converts the count into a percentage of board cells',
      ],
      answer: 0,
      why: 'At each step the knight picks one of 8 moves uniformly, independently of the board, giving 8^k total sequences; only the staying ones are counted in sum(dp[k]).',
    },
  ],
};

export default knightProbabilityModule;
