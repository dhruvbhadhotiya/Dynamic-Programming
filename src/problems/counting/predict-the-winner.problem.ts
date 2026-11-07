import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { IntervalTriangleState, Mode, ProblemModule, Step } from '../../engine/types';

export interface PredictTheWinnerInput {
  nums: number[];
}

const MAX_N = 8;

const pythonCode = [
  'def predict_winner(nums):',
  '    n = len(nums)',
  '    total = sum(nums); pref = [0] * (n + 1)',
  '    for k in range(n): pref[k + 1] = pref[k] + nums[k]',
  '    dp = [[0] * n for _ in range(n)]',
  '    for i in range(n): dp[i][i] = nums[i]',
  '    for length in range(2, n + 1):',
  '        for i in range(n - length + 1): j = i + length - 1; dp[i][j] = max(nums[i] + (pref[j+1] - pref[i+1] - dp[i+1][j]), nums[j] + (pref[j] - pref[i] - dp[i][j-1]))',
  '    return dp[0][n - 1] * 2 >= total',
].join('\n');

const javascriptCode = [
  'function predictWinner(nums) {',
  '  const n = nums.length;',
  '  const total = nums.reduce((a, b) => a + b, 0), pref = new Array(n + 1).fill(0);',
  '  for (let k = 0; k < n; k++) pref[k + 1] = pref[k] + nums[k];',
  '  const dp = Array.from({ length: n }, () => Array(n).fill(0));',
  '  for (let i = 0; i < n; i++) dp[i][i] = nums[i];',
  '  for (let len = 2; len <= n; len++)',
  '    for (let i = 0; i + len <= n; i++) { const j = i + len - 1; dp[i][j] = Math.max(nums[i] + (pref[j+1] - pref[i+1] - dp[i+1][j]), nums[j] + (pref[j] - pref[i] - dp[i][j-1])); }',
  '  return dp[0][n - 1] * 2 >= total;',
  '}',
].join('\n');

const cppCode = [
  'bool predictWinner(vector<int>& nums) {',
  '  int n = nums.size(), total = accumulate(nums.begin(), nums.end(), 0);',
  '  vector<int> pref(n + 1, 0);',
  '  for (int k = 0; k < n; k++) pref[k+1] = pref[k] + nums[k];',
  '  vector<vector<int>> dp(n, vector<int>(n, 0));',
  '  for (int i = 0; i < n; i++) dp[i][i] = nums[i];',
  '  for (int len = 2; len <= n; len++)',
  '    for (int i = 0; i + len <= n; i++) { int j = i + len - 1; dp[i][j] = max(nums[i] + (pref[j+1]-pref[i+1]-dp[i+1][j]), nums[j] + (pref[j]-pref[i]-dp[i][j-1])); }',
  '  return dp[0][n-1] * 2 >= total;',
  '}',
].join('\n');

function normalizeNums(input: PredictTheWinnerInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const nums = raw
    .slice(0, MAX_N)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 9) : 1,
    );
  return nums.length > 0 ? nums : [1, 2];
}

function makeRecorder(size: number): StepRecorder<IntervalTriangleState> {
  return new StepRecorder<IntervalTriangleState>(
    {
      kind: 'intervalTriangle',
      values: create2D(size, size, () => null),
      rowLabels: Array.from({ length: size }, (_, i) => `i=${i}`),
      colLabels: Array.from({ length: size }, (_, j) => `j=${j}`),
      caption: 'Predict the Winner: dp[l][r] = most score the current player can get from nums[l..r]',
    },
    { codeLine: 1 },
  );
}

function intervalSteps(nums: number[], memo: boolean): Step[] {
  const n = nums.length;
  const rec = makeRecorder(n);
  const dp = create2D(n, n, () => null as number | null);

  const pref: number[] = [0];
  for (let k = 0; k < n; k += 1) {
    pref.push((pref[k] ?? 0) + (nums[k] ?? 1));
  }
  const total = pref[n] ?? 0;
  const rangeSum = (l: number, r: number): number => (pref[r + 1] ?? 0) - (pref[l] ?? 0);

  let computed = 0;
  let hits = 0;

  rec.at(1).record(
    `Predict the Winner: ${n} scores [${nums.join(', ')}], total ${total}. Two players alternate taking the left or right end; both play optimally. dp[l][r] is what the player to move can still collect from nums[l..r], so dp[${n - 1}][${n - 1}] is not the whole game — dp[0][${n - 1}] is.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0, n - 1], kind: 'active', label: 'full interval' }],
      vars: { n, total, computed: 0, hits: 0 },
    },
  );

  rec.at(4).record(
    `Prefix sums give any interval total in O(1): sum(l..r) = pref[r+1] - pref[l]. If you take the left end, the opponent gets dp[l+1][r] of the rest, so you keep nums[l] + (sum(l+1..r) - dp[l+1][r]).`,
    {
      codeLine: 4,
      highlights: [{ pos: [0, 0], kind: 'active', label: 'pref' }],
      vars: { n, total, computed, hits },
    },
  );

  if (memo) {
    const solve = (l: number, r: number): number => {
      const cached = dp[l]?.[r] ?? null;
      if (cached !== null) {
        hits += 1;
        rec.at(8).record(
          `Cache hit: dp[${l}][${r}] = ${cached} is already stored, so reuse it instead of recomputing the interval.`,
          {
            codeLine: 8,
            highlights: [{ pos: [l, r], kind: 'result', label: 'memo hit' }],
            vars: { l, r, cached, computed, hits },
          },
        );
        return cached;
      }
      if (l === r) {
        const value = nums[l] ?? 1;
        const row = dp[l];
        if (row) row[r] = value;
        computed += 1;
        rec.at(6).fill([l, r], value, `Base case: cache dp[${l}][${r}] = nums[${l}] = ${value} — one coin, the player to move takes it.`, {
          kind: 'base',
          codeLine: 6,
          vars: { l, r, value, computed, hits },
        });
        return value;
      }
      const oppAfterLeft = solve(l + 1, r);
      const oppAfterRight = solve(l, r - 1);
      const sumRight = rangeSum(l + 1, r);
      const sumLeft = rangeSum(l, r - 1);
      const takeL = (nums[l] ?? 1) + (sumRight - oppAfterLeft);
      const takeR = (nums[r] ?? 1) + (sumLeft - oppAfterRight);
      const best = Math.max(takeL, takeR);
      rec.at(8).record(
        `Memo interval [${l}..${r}]: take left gives ${nums[l] ?? 1} + (${sumRight} - ${oppAfterLeft}) = ${takeL}; take right gives ${nums[r] ?? 1} + (${sumLeft} - ${oppAfterRight}) = ${takeR}.`,
        {
          codeLine: 8,
          highlights: [
            { pos: [l, r], kind: 'active', label: 'solving' },
            { pos: [l + 1, r], kind: 'dependency', label: 'if take left' },
            { pos: [l, r - 1], kind: 'dependency', label: 'if take right' },
          ],
          vars: { l, r, takeL, takeR, best, computed, hits },
        },
      );
      const row = dp[l];
      if (row) row[r] = best;
      computed += 1;
      rec.at(8).fill(
        [l, r],
        best,
        `Store dp[${l}][${r}] = ${best}: ${takeL >= takeR ? 'take left' : 'take right'} is better (${takeL} vs ${takeR}).`,
        {
          codeLine: 8,
          highlights: [
            { pos: [l + 1, r], kind: 'dependency', label: 'if take left' },
            { pos: [l, r - 1], kind: 'dependency', label: 'if take right' },
          ],
          vars: { l, r, best, computed, hits },
        },
      );
      return best;
    };
    solve(0, n - 1);
  } else {
    for (let i = 0; i < n; i += 1) {
      const value = nums[i] ?? 1;
      const row = dp[i];
      if (row) row[i] = value;
      computed += 1;
      rec.at(6).fill([i, i], value, `Base case: dp[${i}][${i}] = nums[${i}] = ${value} — one coin, the player to move takes it.`, {
        kind: 'base',
        codeLine: 6,
        vars: { i, value, computed, hits },
      });
    }
    for (let length = 2; length <= n; length += 1) {
      rec.at(7).record(
        `Tabulation fills intervals of length ${length}: every dependency dp[l+1][r] / dp[l][r-1] is shorter, so it is already final.`,
        {
          codeLine: 7,
          highlights: [],
          vars: { length, computed, hits },
        },
      );
      for (let i = 0; i + length <= n; i += 1) {
        const j = i + length - 1;
        const oppAfterLeft = dp[i + 1]?.[j] ?? 0;
        const oppAfterRight = dp[i]?.[j - 1] ?? 0;
        const sumRight = rangeSum(i + 1, j);
        const sumLeft = rangeSum(i, j - 1);
        const takeL = (nums[i] ?? 1) + (sumRight - oppAfterLeft);
        const takeR = (nums[j] ?? 1) + (sumLeft - oppAfterRight);
        const best = Math.max(takeL, takeR);
        rec.at(8).record(
          `Interval [${i}..${j}]: take left gives ${nums[i] ?? 1} + (${sumRight} - ${oppAfterLeft}) = ${takeL}; take right gives ${nums[j] ?? 1} + (${sumLeft} - ${oppAfterRight}) = ${takeR}.`,
          {
            codeLine: 8,
            highlights: [
              { pos: [i, j], kind: 'active', label: 'solving' },
              { pos: [i + 1, j], kind: 'dependency', label: 'if take left' },
              { pos: [i, j - 1], kind: 'dependency', label: 'if take right' },
            ],
            vars: { i, j, takeL, takeR, best, computed, hits },
          },
        );
        const row = dp[i];
        if (row) row[j] = best;
        computed += 1;
        rec.at(8).fill(
          [i, j],
          best,
          `Best for [${i}..${j}]: dp[${i}][${j}] = ${best} (${takeL >= takeR ? 'take left' : 'take right'} wins ${takeL} vs ${takeR}).`,
          {
            codeLine: 8,
            highlights: [
              { pos: [i + 1, j], kind: 'dependency', label: 'if take left' },
              { pos: [i, j - 1], kind: 'dependency', label: 'if take right' },
            ],
            vars: { i, j, best, computed, hits },
          },
        );
      }
    }
  }

  const p1 = dp[0]?.[n - 1] ?? 0;
  const p2 = total - p1;
  const wins = p1 * 2 >= total;
  const margin = p1 - p2;
  rec.at(9).record(
    `The answer is ${wins} — Player 1 scores ${p1}, Player 2 scores ${p2} (margin ${margin}) on [${nums.join(', ')}]; the answer is ${wins ? 'true (Player 1 wins)' : 'false (Player 2 wins)'}.`,
    {
      codeLine: 9,
      highlights: [{ pos: [0, n - 1], kind: 'result', label: 'answer' }],
      vars: { answer: wins, p1, p2, margin, total, computed, hits },
    },
  );
  return [...rec.steps];
}

const predictTheWinnerModule: ProblemModule<PredictTheWinnerInput> = {
  id: 'predict-the-winner',
  title: 'Predict the Winner',
  category: 'counting',
  difficulty: 'medium',
  summary:
    'Two players alternately take the left or right end of a row of scores with optimal play. Interval DP stores the best score the player to move can still collect from each interval; prefix sums make taking either end an O(1) decision, and the full row decides the winner.',
  stateDefinition:
    'dp[l][r] = maximum score the current player can obtain from nums[l..r] (inclusive) when both play optimally, for 0 <= l <= r < n. Answer is the boolean dp[0][n-1] * 2 >= total (final vars.answer is that boolean; vars.p1/p2/margin expose the underlying scores).',
  recurrence:
    'dp[i][i] = nums[i]. For l < r: dp[l][r] = max(nums[l] + (total(l+1..r) - dp[l+1][r]), nums[r] + (total(l..r-1) - dp[l][r-1])), where total(l..r) uses prefix sums.',
  complexity: { time: 'O(n²)', space: 'O(n²)' },
  renderer: 'intervalTriangle',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'Scores at both ends; each turn takes the left or right end. 2 to 8 values keeps the triangle readable.',
      type: 'array',
      itemType: 'number',
      minItems: 2,
      maxItems: MAX_N,
      min: 1,
      max: 9,
    },
  ],
  defaultInput: { nums: [1, 5, 2] },
  modes: ['memo', 'tabulation'],
  generateSteps(input: PredictTheWinnerInput, mode: Mode): Step[] {
    return intervalSteps(normalizeNums(input), mode === 'memo');
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What does dp[l][r] mean in the interval definition?',
      options: [
        'Max score the player to move can collect from nums[l..r] with optimal play',
        'The sum of nums[l..r]',
        'Whether the interval [l..r] is winnable alone',
        'The number of ways to play interval [l..r]',
      ],
      answer: 0,
      why: 'The state always asks what the player whose turn it is can still take from exactly that interval; the opponent then faces the shorter interval.',
    },
    {
      q: 'Optimal play on [1, 2]: what is the answer and why?',
      options: [
        'true — Player 1 takes 2 and wins 2 to 1',
        'false — Player 1 is forced to take 1',
        'true — Player 1 takes 1 and then 2',
        'The scores tie 1.5 to 1.5',
      ],
      answer: 0,
      why: 'With two positive values the player to move takes the larger end, so [1, 2] gives 2 vs 1. Ties also count as wins (dp*2 >= total).',
    },
    {
      q: 'Optimal play on [1, 5, 2]: what are the scores and the boolean answer?',
      options: [
        'Player 1 = 3, Player 2 = 5 — false (optimal opponent takes the 5)',
        'Player 1 = 6, Player 2 = 2 — true',
        'Player 1 = 5, Player 2 = 3 — true',
        'Player 1 = 4, Player 2 = 4 — true (tie)',
      ],
      answer: 0,
      why: 'Take 1: opponent takes 5, you get 2 (3 vs 5). Take 2: opponent takes 5, you get 1 (3 vs 5). Best is 3 < 4 = total/2, so the answer is false. The 6 vs 2 line needs the opponent to pass on the 5, which optimal play never does.',
    },
    {
      q: 'Why use prefix sums for total(l..r)?',
      options: [
        'To get any interval sum in O(1) when evaluating take-left / take-right',
        'To sort the scores before playing',
        'To store dp results across modes',
        'To count the number of intervals',
      ],
      answer: 0,
      why: 'Each interval decision needs sum(l+1..r) and sum(l..r-1); rescanning would make every state O(n) and the table O(n³). Prefix sums keep it O(n²).',
    },
  ],
};

export default predictTheWinnerModule;
