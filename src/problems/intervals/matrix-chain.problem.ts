import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { IntervalTriangleState, Mode, ProblemModule, Step } from '../../engine/types';

export interface MatrixChainInput {
  dims: number[];
}

const MAX_DIMS = 6;

const pythonCode = [
  'def matrix_chain(p):',
  '    n = len(p) - 1',
  '    dp = [[0] * n for _ in range(n)]',
  '    for length in range(2, n + 1):',
  '        for i in range(n - length + 1):',
  '            j = i + length - 1; dp[i][j] = min(dp[i][k] + dp[k+1][j] + p[i]*p[k+1]*p[j+1] for k in range(i, j))',
  '    return dp[0][n - 1]',
].join('\n');

const javascriptCode = [
  'function matrixChain(p) {',
  '  const n = p.length - 1, dp = Array.from({ length: n }, () => Array(n).fill(0));',
  '  for (let len = 2; len <= n; len++) for (let i = 0; i + len <= n; i++) {',
  '    const j = i + len - 1;',
  '    for (let k = i; k < j; k++) { const cost = dp[i][k] + dp[k+1][j] + p[i] * p[k+1] * p[j+1];',
  '      dp[i][j] = Math.min(dp[i][j] || Infinity, cost); } }',
  '  return dp[0][n - 1];',
  '}',
].join('\n');

const cppCode = [
  'int matrixChain(vector<int>& p) {',
  '  int n = p.size() - 1; vector<vector<int>> dp(n, vector<int>(n, 0));',
  '  for (int len = 2; len <= n; len++) for (int i = 0; i + len <= n; i++) {',
  '    int j = i + len - 1;',
  '    for (int k = i; k < j; k++) { int cost = dp[i][k] + dp[k+1][j] + p[i] * p[k+1] * p[j+1];',
  '      if (dp[i][j] == 0 || cost < dp[i][j]) dp[i][j] = cost; } }',
  '  return dp[0][n - 1];',
  '}',
].join('\n');

function normalizeDims(input: MatrixChainInput): number[] {
  const raw = Array.isArray(input.dims) ? input.dims : [];
  const dims = raw
    .slice(0, MAX_DIMS)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 9) : 1,
    );
  if (dims.length === 0) return [1, 2];
  if (dims.length === 1) return [dims[0] ?? 1, dims[0] ?? 1];
  return dims;
}

function makeRecorder(matrixCount: number): StepRecorder<IntervalTriangleState> {
  return new StepRecorder<IntervalTriangleState>(
    {
      kind: 'intervalTriangle',
      values: create2D(matrixCount, matrixCount, () => null),
      rowLabels: Array.from({ length: matrixCount }, (_, i) => `M${i}`),
      colLabels: Array.from({ length: matrixCount }, (_, j) => `M${j}`),
      caption: 'Matrix chain: dp[i][j] = minimum scalar multiplications to multiply matrices i..j',
    },
    { codeLine: 1 },
  );
}

function intervalSteps(dims: number[], memo: boolean): Step[] {
  const n = dims.length - 1;
  const rec = makeRecorder(n);
  const dp = create2D(n, n, () => 0);

  rec.at(1).record(
    `Matrix chain: ${n} matrices with dimensions ${dims.join(' x ')}. dp[i][j] stores the cheapest way to multiply matrices i..j; a split k decides where to put the outermost parentheses.`,
    {
      codeLine: 1,
      highlights: n > 0 ? [{ pos: [0, n - 1], kind: 'active', label: 'full chain' }] : [],
      vars: { matrices: n },
    },
  );

  for (let i = 0; i < n; i += 1) {
    rec.at(3).fill([i, i], 0, memo
      ? `Memo base: cache dp[${i}][${i}] = 0 — one matrix (${dims[i]} x ${dims[i + 1]}) needs no work.`
      : `Base case: one matrix (${dims[i]} x ${dims[i + 1]}) needs no work, so dp[${i}][${i}] = 0.`, {
      kind: 'base',
      codeLine: 3,
      vars: { i, answer: 0 },
    });
  }

  for (let length = 2; length <= n; length += 1) {
    rec.at(4).record(
      memo
        ? `Memoized recursion solves intervals of size ${length} once their smaller subproblems are cached.`
        : `Tabulation fills interval length ${length} next; every split reads only shorter, already-final intervals.`,
      {
        codeLine: 4,
        highlights: [],
        vars: { length, answer: 0 },
      },
    );

    for (let i = 0; i + length <= n; i += 1) {
      const j = i + length - 1;
      let best = Number.POSITIVE_INFINITY;
      let bestK = i;

      for (let k = i; k < j; k += 1) {
        const left = dp[i]?.[k] ?? 0;
        const right = dp[k + 1]?.[j] ?? 0;
        const outer = (dims[i] ?? 1) * (dims[k + 1] ?? 1) * (dims[j + 1] ?? 1);
        const cost = left + right + outer;
        if (cost < best) {
          best = cost;
          bestK = k;
        }
        rec.at(6).record(
          memo
            ? `Memo split k=${k}: use cached dp[${i}][${k}] = ${left} and dp[${k + 1}][${j}] = ${right}; total = ${left} + ${right} + ${dims[i]}x${dims[k + 1]}x${dims[j + 1]} = ${cost}.`
            : `Split k=${k}: dp[${i}][${k}] = ${left}, dp[${k + 1}][${j}] = ${right}; cost = ${left} + ${right} + ${dims[i]}x${dims[k + 1]}x${dims[j + 1]} = ${cost}.`,
          {
            codeLine: 6,
            highlights: [
              { pos: [i, j], kind: 'active', label: 'solving' },
              { pos: [i, k], kind: 'dependency', label: 'left' },
              { pos: [k + 1, j], kind: 'dependency', label: 'right' },
            ],
            vars: { i, j, k, cost },
          },
        );
      }

      const row = dp[i];
      if (row) row[j] = best;
      rec.at(6).fill(
        [i, j],
        best,
        memo
          ? `Memo result: cache dp[${i}][${j}] = ${best} — split after M${bestK}.`
          : `Best for M${i}..M${j}: split after M${bestK}, so dp[${i}][${j}] = ${best}.`,
        {
          codeLine: 6,
          highlights: [
            { pos: [i, bestK], kind: 'dependency', label: 'left' },
            { pos: [bestK + 1, j], kind: 'dependency', label: 'right' },
          ],
          vars: { i, j, bestK, best },
        },
      );
    }
  }

  const answer = dp[0]?.[n - 1] ?? 0;
  rec.at(7).record(`The answer is ${answer} — the minimum number of scalar multiplications.`, {
    codeLine: 7,
    highlights: [{ pos: [0, n - 1], kind: 'result', label: 'answer' }],
    vars: { answer },
  });

  return [...rec.steps];
}

const matrixChainModule: ProblemModule<MatrixChainInput> = {
  id: 'matrix-chain',
  title: 'Matrix Chain Multiplication',
  category: 'intervals',
  difficulty: 'medium',
  summary:
    'Choose the parenthesization that multiplies a chain of matrices with the fewest scalar multiplications. The split point is the decision, and interval DP tries every split while reusing the cheapest cost of each inner chain.',
  stateDefinition:
    'dp[i][j] = minimum scalar multiplications needed to multiply matrices i..j, where matrix i has dimensions dims[i] x dims[i+1], for 0 <= i <= j < n.',
  recurrence:
    'dp[i][i] = 0; for i < j, dp[i][j] = min over i <= k < j of dp[i][k] + dp[k+1][j] + dims[i] * dims[k+1] * dims[j+1].',
  complexity: { time: 'O(n³)', space: 'O(n²)' },
  renderer: 'intervalTriangle',
  inputSchema: [
    {
      name: 'dims',
      label: 'dimensions',
      help: 'Chain dimensions p0, p1, ..., pn. Matrix i is p[i] x p[i+1], so n matrices need n + 1 numbers.',
      type: 'array',
      itemType: 'number',
      minItems: 2,
      maxItems: MAX_DIMS,
      min: 1,
      max: 9,
    },
  ],
  defaultInput: { dims: [1, 2, 3, 4] },
  modes: ['memo', 'tabulation'],
  generateSteps(input: MatrixChainInput, mode: Mode): Step[] {
    return intervalSteps(normalizeDims(input), mode === 'memo');
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the minimum cost for dimensions [1, 2, 3, 4] (three matrices)?',
      options: ['18', '32', '24', '36'],
      answer: 0,
      why: '(M0 x M1) x M2 costs 1*2*3 + 1*3*4 = 6 + 12 = 18; the other parenthesization costs 2*3*4 + 1*2*4 = 32.',
    },
    {
      q: 'What does dp[i][i] represent, and what is its value?',
      options: [
        'Multiplying one matrix, so 0',
        'Multiplying two matrices, so dims[i] * dims[i+1]',
        'The size of matrix i, so dims[i]',
        'It is undefined',
      ],
      answer: 0,
      why: 'A single matrix needs no multiplications, so the base diagonal dp[i][i] = 0.',
    },
    {
      q: 'For i < j, which recurrence computes dp[i][j]?',
      options: [
        'min over k of dp[i][k] + dp[k+1][j] + dims[i]*dims[k+1]*dims[j+1]',
        'max over k of dp[i][k] + dp[k+1][j]',
        'dp[i][j-1] + dims[i]*dims[j]*dims[j+1]',
        'dp[i+1][j] + dims[i]*dims[i+1]*dims[j+1]',
      ],
      answer: 0,
      why: 'Both inner chains are already solved, and combining them costs dims[i] * dims[k+1] * dims[j+1] scalar multiplications.',
    },
    {
      q: 'What are the time and space complexities of interval DP for a chain of n matrices?',
      options: ['O(n³) time, O(n²) space', 'O(n²) time, O(n²) space', 'O(n log n) time, O(n) space', 'O(2^n) time, O(n) space'],
      answer: 0,
      why: 'There are O(n²) intervals and each tries up to O(n) splits, so O(n³) time; the table has O(n²) entries.',
    },
  ],
  relatedIds: ['burst-balloons', 'min-cost-cut-stick', 'palindrome-partition-ii'],
  lessonId: 'intervals',
};

export default matrixChainModule;
