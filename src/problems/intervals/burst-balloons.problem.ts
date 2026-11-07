import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Highlight, IntervalTriangleState, Mode, ProblemModule, Step } from '../../engine/types';

export interface BurstBalloonsInput {
  nums: number[];
}

const MAX_BALLOONS = 6;

const pythonCode = [
  'def max_coins(nums):',
  '    n = len(nums)',
  '    dp = [[0] * n for _ in range(n)]',
  '    for length in range(1, n + 1):',
  '        for i in range(n - length + 1):',
  '            j = i + length - 1; left = nums[i-1] if i else 1; right = nums[j+1] if j + 1 < n else 1; dp[i][j] = max((dp[i][k-1] if k > i else 0) + (dp[k+1][j] if k < j else 0) + left*nums[k]*right for k in range(i, j + 1))',
  '    return dp[0][n - 1]',
].join('\n');

const javascriptCode = [
  'function maxCoins(nums) {',
  '  const n = nums.length, dp = Array.from({ length: n }, () => Array(n).fill(0));',
  '  for (let len = 1; len <= n; len++) for (let i = 0; i + len <= n; i++) {',
  '    const j = i + len - 1, left = i > 0 ? nums[i-1] : 1, right = j + 1 < n ? nums[j+1] : 1;',
  '    for (let k = i; k <= j; k++) {',
  '      dp[i][j] = Math.max(dp[i][j], (k > i ? dp[i][k-1] : 0) + (k < j ? dp[k+1][j] : 0) + left*nums[k]*right); } }',
  '  return dp[0][n - 1];',
  '}',
].join('\n');

const cppCode = [
  'int maxCoins(vector<int>& nums) {',
  '  int n = nums.size(); vector<vector<int>> dp(n, vector<int>(n, 0));',
  '  for (int len = 1; len <= n; len++) for (int i = 0; i + len <= n; i++) {',
  '    int j = i + len - 1, left = i > 0 ? nums[i-1] : 1, right = j + 1 < n ? nums[j+1] : 1;',
  '    for (int k = i; k <= j; k++) {',
  '      dp[i][j] = max(dp[i][j], (k > i ? dp[i][k-1] : 0) + (k < j ? dp[k+1][j] : 0) + left*nums[k]*right); } }',
  '  return dp[0][n - 1];',
  '}',
].join('\n');

function normalizeNums(input: BurstBalloonsInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const nums = raw
    .slice(0, MAX_BALLOONS)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 9) : 1,
    );
  return nums.length > 0 ? nums : [1];
}

function makeRecorder(size: number): StepRecorder<IntervalTriangleState> {
  return new StepRecorder<IntervalTriangleState>(
    {
      kind: 'intervalTriangle',
      values: create2D(size, size, () => null),
      rowLabels: Array.from({ length: size }, (_, i) => `i=${i}`),
      colLabels: Array.from({ length: size }, (_, j) => `j=${j}`),
      caption: 'Burst Balloons: dp[i][j] = max coins from bursting balloons i..j while outside balloons stay',
    },
    { codeLine: 1 },
  );
}

function intervalSteps(nums: number[], memo: boolean): Step[] {
  const n = nums.length;
  const rec = makeRecorder(n);
  const dp = create2D(n, n, () => 0);

  rec.at(1).record(
    `Burst Balloons: ${n === 1 ? 'one balloon' : `${n} balloons`} [${nums.join(', ')}]. Think backwards: choose which balloon in an interval is burst LAST. Its neighbours are then fixed, so the left and right parts become independent subproblems.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0, n - 1], kind: 'active', label: 'full interval' }],
      vars: { balloons: n },
    },
  );

  for (let i = 0; i < n; i += 1) {
    const left = i > 0 ? (nums[i - 1] ?? 1) : 1;
    const right = i + 1 < n ? (nums[i + 1] ?? 1) : 1;
    const value = left * (nums[i] ?? 1) * right;
    const row = dp[i];
    if (row) row[i] = value;
    rec.at(6).fill(
      [i, i],
      value,
      memo
        ? `Memo single-balloon interval: burst ${nums[i]} last with neighbours ${left} and ${right}, so cache dp[${i}][${i}] = ${left} x ${nums[i]} x ${right} = ${value}.`
        : `Single-balloon interval: burst ${nums[i]} with neighbours ${left} and ${right}, so dp[${i}][${i}] = ${left} x ${nums[i]} x ${right} = ${value}.`,
      {
        kind: 'base',
        codeLine: 6,
        vars: { i, coins: value },
      },
    );
  }

  for (let length = 2; length <= n; length += 1) {
    rec.at(3).record(
      memo
        ? `Memoized recursion now closes intervals of length ${length}: try each balloon as the last one and reuse cached left/right results.`
        : `Tabulation fills intervals of length ${length}: each candidate k is the LAST balloon burst, so its neighbours are the interval boundaries.`,
      {
        codeLine: 3,
        highlights: [],
        vars: { length },
      },
    );

    for (let i = 0; i + length <= n; i += 1) {
      const j = i + length - 1;
      const left = i > 0 ? (nums[i - 1] ?? 1) : 1;
      const right = j + 1 < n ? (nums[j + 1] ?? 1) : 1;
      let best = 0;
      let bestK = i;

      for (let k = i; k <= j; k += 1) {
        const leftPart = k > i ? (dp[i]?.[k - 1] ?? 0) : 0;
        const rightPart = k < j ? (dp[k + 1]?.[j] ?? 0) : 0;
        const coins = left * (nums[k] ?? 1) * right;
        const total = leftPart + rightPart + coins;
        if (total > best) {
          best = total;
          bestK = k;
        }

        const highlights: Highlight[] = [{ pos: [i, j], kind: 'active', label: 'solving' }];
        if (k > i) highlights.push({ pos: [i, k - 1], kind: 'dependency', label: 'left part' });
        if (k < j) highlights.push({ pos: [k + 1, j], kind: 'dependency', label: 'right part' });

        rec.at(6).record(
          memo
            ? `Memo last balloon k=${k}: cached left = ${leftPart}, right = ${rightPart}, burst coins = ${left} x ${nums[k]} x ${right} = ${coins}; total = ${total}.`
            : `Last balloon k=${k}: left = ${leftPart}, right = ${rightPart}, burst coins = ${left} x ${nums[k]} x ${right} = ${coins}; total = ${total}.`,
          {
            codeLine: 6,
            highlights,
            vars: { i, j, k, total },
          },
        );
      }

      const row = dp[i];
      if (row) row[j] = best;
      const bestHighlights: Highlight[] = [
        { pos: [bestK, bestK], kind: 'result', label: 'last balloon' },
      ];
      if (bestK > i) bestHighlights.push({ pos: [i, bestK - 1], kind: 'dependency', label: 'left part' });
      if (bestK < j) bestHighlights.push({ pos: [bestK + 1, j], kind: 'dependency', label: 'right part' });

      rec.at(6).fill(
        [i, j],
        best,
        memo
          ? `Memo result: cache dp[${i}][${j}] = ${best} by bursting ${nums[bestK]} last.`
          : `Best for [${i}..${j}]: burst ${nums[bestK]} last, so dp[${i}][${j}] = ${best}.`,
        {
          codeLine: 6,
          highlights: bestHighlights,
          vars: { i, j, bestK, best },
        },
      );
    }
  }

  const answer = dp[0]?.[n - 1] ?? 0;
  rec.at(7).record(`The answer is ${answer} — the maximum coins from bursting every balloon.`, {
    codeLine: 7,
    highlights: [{ pos: [0, n - 1], kind: 'result', label: 'answer' }],
    vars: { answer },
  });

  return [...rec.steps];
}

const burstBalloonsModule: ProblemModule<BurstBalloonsInput> = {
  id: 'burst-balloons',
  title: 'Burst Balloons',
  category: 'intervals',
  difficulty: 'hard',
  summary:
    'Bursting a balloon earns its value times its current neighbours, then the neighbours become adjacent. Planning backwards — which balloon is burst last in each interval — makes the left and right subproblems independent and turns the problem into interval DP.',
  stateDefinition:
    'dp[i][j] = maximum coins obtainable by bursting all balloons i..j, assuming the balloons just outside the interval (i-1 and j+1) are still present.',
  recurrence:
    'For each split k in i..j, burst k LAST: dp[i][j] = max(dp[i][k-1] + dp[k+1][j] + left * nums[k] * right), where left = nums[i-1] or 1 and right = nums[j+1] or 1.',
  complexity: { time: 'O(n³)', space: 'O(n²)' },
  renderer: 'intervalTriangle',
  inputSchema: [
    {
      name: 'nums',
      label: 'balloon values',
      help: 'Value printed on each balloon. Up to six balloons keeps the animation readable.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_BALLOONS,
      min: 1,
      max: 9,
    },
  ],
  defaultInput: { nums: [3, 1, 5, 8] },
  modes: ['memo', 'tabulation'],
  generateSteps(input: BurstBalloonsInput, mode: Mode): Step[] {
    return intervalSteps(normalizeNums(input), mode === 'memo');
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the maximum coins for balloons [3, 1, 5, 8]?',
      options: ['167', '160', '120', '184'],
      answer: 0,
      why: 'Burst 1 (3*1*5 = 15), then 5 (3*5*8 = 120), then 3 (1*3*8 = 24), then 8 (1*8*1 = 8): 15 + 120 + 24 + 8 = 167.',
    },
    {
      q: 'What does dp[i][j] mean in this interval formulation?',
      options: [
        'Max coins from bursting balloons i..j while balloons outside stay present',
        'Max coins from bursting only balloon i or j',
        'The sum of the balloon values i..j',
        'The number of ways to burst balloons i..j',
      ],
      answer: 0,
      why: 'The interval state isolates i..j; the outside neighbours are still there and act as the fixed boundaries when the last balloon inside bursts.',
    },
    {
      q: 'Why is it useful to decide which balloon is burst LAST in an interval?',
      options: [
        'Its neighbours are then the fixed interval boundaries, splitting the interval into two independent parts',
        'It always earns the most coins',
        'It avoids needing a table',
        'It makes the algorithm greedy',
      ],
      answer: 0,
      why: 'When k is last, all other balloons in the interval are already gone, so k sees nums[i-1] and nums[j+1]. Left and right parts no longer interact.',
    },
    {
      q: 'What are the time and space complexities?',
      options: ['O(n³) time, O(n²) space', 'O(n²) time, O(n) space', 'O(n!) time, O(n) space', 'O(n log n) time, O(n²) space'],
      answer: 0,
      why: 'There are O(n²) intervals, each trying O(n) choices for the last balloon, and the table stores O(n²) values.',
    },
  ],
  relatedIds: ['matrix-chain', 'min-cost-cut-stick', 'palindrome-partition-ii'],
  lessonId: 'intervals',
};

export default burstBalloonsModule;
