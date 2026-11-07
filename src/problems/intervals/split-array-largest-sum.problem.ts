import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface SplitArrayLargestSumInput {
  nums: number[];
  k: number;
}

const MAX_NUMS = 6;

const pythonCode = [
  'def split_array(nums, k):',
  '    n = len(nums); prefix = [0]',
  '    for x in nums: prefix.append(prefix[-1] + x)',
  '    dp = [[0] * (n + 1) for _ in range(k + 1)]',
  '    for p in range(1, k + 1):',
  '        for i in range(p, n + 1): dp[p][i] = prefix[i] if p == 1 else min(max(dp[p-1][j], prefix[i] - prefix[j]) for j in range(p-1, i))',
  '    return dp[k][n]',
].join('\n');

const javascriptCode = [
  'function splitArray(nums, k) {',
  '  const n = nums.length, prefix = [0];',
  '  for (const x of nums) prefix.push((prefix.at(-1) ?? 0) + x);',
  '  const dp = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(0));',
  '  for (let p = 1; p <= k; p++)',
  '    for (let i = p; i <= n; i++) dp[p][i] = p === 1 ? prefix[i] : Math.min(...Array.from({ length: i - p + 1 }, (_, x) => Math.max(dp[p - 1][p - 1 + x], prefix[i] - prefix[p - 1 + x])));',
  '  return dp[k][n];',
  '}',
].join('\n');

const cppCode = [
  'int splitArray(vector<int>& nums, int k) {',
  '  int n = nums.size(); vector<int> prefix(n + 1, 0);',
  '  for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];',
  '  vector<vector<int>> dp(k + 1, vector<int>(n + 1, 0));',
  '  for (int p = 1; p <= k; p++)',
  '    for (int i = p; i <= n; i++) { dp[p][i] = p == 1 ? prefix[i] : INT_MAX; for (int j = p - 1; j < i; j++) if (p > 1) dp[p][i] = min(dp[p][i], max(dp[p-1][j], prefix[i] - prefix[j])); }',
  '  return dp[k][n];',
  '}',
].join('\n');

function normalizeInput(input: SplitArrayLargestSumInput): { nums: number[]; k: number; prefix: number[] } {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const nums = raw
    .slice(0, MAX_NUMS)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, 10) : 0,
    );
  const safeNums = nums.length > 0 ? nums : [1];
  const rawK =
    typeof input.k === 'number' && Number.isFinite(input.k) ? Math.trunc(input.k) : 1;
  const k = clamp(rawK, 1, safeNums.length);
  const prefix = [0];
  for (const value of safeNums) prefix.push((prefix.at(-1) ?? 0) + value);
  return { nums: safeNums, k, prefix };
}

function makeRecorder(nums: number[], k: number): StepRecorder<Table2DState> {
  const n = nums.length;
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D<number | null>(k + 1, n + 1, () => null),
      rowLabels: Array.from({ length: k + 1 }, (_value, p) => `p=${p}`),
      colLabels: Array.from({ length: n + 1 }, (_value, i) => `i=${i}`),
      rowHeader: 'parts',
      colHeader: 'first i numbers',
      caption: `Split ${nums.join(', ')} into ${k} non-empty parts, minimising the largest part sum`,
    },
    { codeLine: 1 },
  );
}

function baseHighlights(p: number, i: number): Highlight[] {
  return [
    { pos: [p, i], kind: 'active', label: 'computing' },
    { pos: [1, i], kind: 'dependency', label: 'one part = total' },
  ];
}

function memoSteps(nums: number[], k: number, prefix: number[]): Step[] {
  const n = nums.length;
  const rec = makeRecorder(nums, k);
  const dp = create2D<number | null>(k + 1, n + 1, () => null);
  let hits = 0;

  rec.at(1).record(
    `Memoization: solve(parts, i) is the smallest possible largest part when the first i numbers are split into exactly parts non-empty groups. Cache every state so overlapping splits are computed once.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0, 0], kind: 'active', label: 'start' }],
      vars: { nums: nums.join(', '), k, hits: 0 },
    },
  );

  rec.at(3).record(
    `Prefix sums are ready: the sum of a group covering indices j..i-1 is prefix[${n}] style subtraction, prefix[i] - prefix[j], in O(1).`,
    {
      codeLine: 3,
      highlights: [{ pos: [1, n], kind: 'active', label: 'whole array' }],
      vars: { total: prefix[n] ?? 0, hits: 0 },
    },
  );

  for (let i = 1; i <= n; i += 1) {
    const value = prefix[i] ?? 0;
    const row = dp[1];
    if (row) row[i] = value;
    rec.at(6).fill(
      [1, i],
      value,
      `Base case: with one part, the first ${i} numbers form one group, so dp[1][${i}] = ${value}.`,
      {
        kind: 'base',
        codeLine: 6,
        vars: { p: 1, i, value, hits },
      },
    );
  }

  const solve = (p: number, i: number): number => {
    const cached = dp[p]?.[i];
    if (cached !== null && cached !== undefined) {
      hits += 1;
      rec.at(6).record(`Cache hit: dp[${p}][${i}] is already ${cached}, so reuse it.`, {
        codeLine: 6,
        highlights: [{ pos: [p, i], kind: 'result', label: 'memo hit' }],
        vars: { p, i, value: cached, hits },
      });
      return cached;
    }

    let best = Number.POSITIVE_INFINITY;
    let bestJ = p - 1;

    for (let j = p - 1; j < i; j += 1) {
      const left = solve(p - 1, j);
      const right = (prefix[i] ?? 0) - (prefix[j] ?? 0);
      const candidate = Math.max(left, right);
      if (candidate < best) {
        best = candidate;
        bestJ = j;
      }
      rec.at(6).record(
        `Try the last cut before index ${j}: ${p - 1} part${p - 1 === 1 ? '' : 's'} for the first ${j} numbers has largest ${left}; the last group sums to ${prefix[i]} - ${prefix[j]} = ${right}; the larger is ${candidate}.`,
        {
          codeLine: 6,
          highlights: baseHighlights(p, i),
          vars: { p, i, j, left, right, candidate, hits },
        },
      );
    }

    const row = dp[p];
    if (row) row[i] = best;
    rec.at(6).fill(
      [p, i],
      best,
      `dp[${p}][${i}] = ${best}: the best last cut is before index ${bestJ}, balancing the previous ${p - 1} parts against the final group.`,
      {
        codeLine: 6,
        highlights: [{ pos: [p - 1, bestJ], kind: 'dependency', label: 'best previous split' }],
        vars: { p, i, best, bestJ, hits },
      },
    );
    return best;
  };

  const answer = k === 1 ? (prefix[n] ?? 0) : solve(k, n);
  rec.at(7).record(
    `The answer is ${answer} — the smallest possible largest part when splitting into ${k} groups.`,
    {
      codeLine: 7,
      highlights: [{ pos: [k, n], kind: 'result', label: 'answer' }],
      vars: { answer, k, hits },
    },
  );

  return [...rec.steps];
}

function tabulationSteps(nums: number[], k: number, prefix: number[]): Step[] {
  const n = nums.length;
  const rec = makeRecorder(nums, k);
  const dp = create2D<number | null>(k + 1, n + 1, () => null);

  rec.at(4).record(
    `Tabulation: fill the table row by row. Row p only reads row p-1, so previous rows are already final.`,
    {
      codeLine: 4,
      highlights: [{ pos: [0, 0], kind: 'active', label: 'empty table' }],
      vars: { nums: nums.join(', '), k },
    },
  );

  for (let i = 1; i <= n; i += 1) {
    const value = prefix[i] ?? 0;
    const row = dp[1];
    if (row) row[i] = value;
    rec.at(6).fill([1, i], value, `Base case: dp[1][${i}] = prefix[${i}] = ${value}.`, {
      kind: 'base',
      codeLine: 6,
      vars: { p: 1, i, value },
    });
  }

  for (let p = 2; p <= k; p += 1) {
    rec.at(5).record(
      `Row p = ${p}: each cell needs at least ${p} numbers, one per non-empty group, so start at i = ${p}.`,
      {
        codeLine: 5,
        highlights: [{ pos: [p, p], kind: 'active', label: 'first cell in row' }],
        vars: { p },
      },
    );

    for (let i = p; i <= n; i += 1) {
      let best = Number.POSITIVE_INFINITY;
      let bestJ = p - 1;

      for (let j = p - 1; j < i; j += 1) {
        const left = dp[p - 1]?.[j] ?? 0;
        const right = (prefix[i] ?? 0) - (prefix[j] ?? 0);
        const candidate = Math.max(left, right);
        if (candidate < best) {
          best = candidate;
          bestJ = j;
        }
        rec.at(6).record(
          `Try the last cut before index ${j}: dp[${p - 1}][${j}] = ${left}; last group = prefix[${i}] - prefix[${j}] = ${right}; worst part = ${candidate}.`,
          {
            codeLine: 6,
            highlights: baseHighlights(p, i),
            vars: { p, i, j, left, right, candidate },
          },
        );
      }

      const row = dp[p];
      if (row) row[i] = best;
      rec.at(6).fill(
        [p, i],
        best,
        `dp[${p}][${i}] = ${best}; the best last cut is before index ${bestJ}.`,
        {
          codeLine: 6,
          highlights: [{ pos: [p - 1, bestJ], kind: 'dependency', label: 'best previous split' }],
          vars: { p, i, best, bestJ },
        },
      );
    }
  }

  const answer = dp[k]?.[n] ?? 0;
  rec.at(7).record(
    `The answer is ${answer} — the smallest possible largest part when splitting into ${k} groups.`,
    {
      codeLine: 7,
      highlights: [{ pos: [k, n], kind: 'result', label: 'answer' }],
      vars: { answer, k },
    },
  );

  return [...rec.steps];
}

const splitArrayLargestSumModule: ProblemModule<SplitArrayLargestSumInput> = {
  id: 'split-array-largest-sum',
  title: 'Split Array Largest Sum',
  category: 'intervals',
  difficulty: 'hard',
  summary:
    'Split an array into exactly k non-empty parts while minimising the largest part sum. For each prefix and part count, try every place for the last cut; the cost of a split is the worse of the previous parts and the final group.',
  stateDefinition:
    'dp[p][i] = smallest possible largest part sum when the first i numbers are split into exactly p non-empty groups, for 1 <= p <= k and p <= i <= n.',
  recurrence:
    'dp[1][i] = prefix[i]; for p >= 2, dp[p][i] = min over j from p-1 to i-1 of max(dp[p-1][j], prefix[i] - prefix[j]).',
  complexity: { time: 'O(k * n²)', space: 'O(k * n)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'nums',
      label: 'numbers',
      help: 'Non-negative integers. Up to six numbers keeps every split visible.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_NUMS,
      min: 0,
      max: 10,
    },
    {
      name: 'k',
      label: 'parts k',
      help: 'Exact number of non-empty parts. Values above the array length are capped.',
      type: 'number',
      min: 1,
      max: MAX_NUMS,
    },
  ],
  defaultInput: { nums: [7, 2, 5, 10, 8], k: 2 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: SplitArrayLargestSumInput, mode: Mode): Step[] {
    const { nums, k, prefix } = normalizeInput(input);
    return mode === 'memo' ? memoSteps(nums, k, prefix) : tabulationSteps(nums, k, prefix);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the smallest largest part when [7, 2, 5, 10, 8] is split into 2 parts?',
      options: ['18', '14', '24', '17'],
      answer: 0,
      why: 'Split as [7, 2, 5] and [10, 8]: the parts sum to 14 and 18, so the largest is 18. Any other cut is worse.',
    },
    {
      q: 'What does dp[p][i] represent?',
      options: [
        'Minimum largest part when the first i numbers are split into exactly p groups',
        'Maximum part sum when the first p numbers are split into i groups',
        'Whether the first i numbers can be split into p groups',
        'The sum of the first i numbers using p groups',
      ],
      answer: 0,
      why: 'The row is the number of groups and the column is the prefix length; the stored value is the minimised largest group sum.',
    },
    {
      q: 'Why is dp[1][i] equal to prefix[i]?',
      options: [
        'With one group, all first i numbers must stay together',
        'Because one group always has value 1',
        'Because prefix[i] is the smallest element',
        'Because the first part must be empty',
      ],
      answer: 0,
      why: 'A single non-empty group contains the whole prefix, so its sum is exactly prefix[i].',
    },
    {
      q: 'What are the time and space complexities for n numbers and k parts?',
      options: ['O(k * n²) time, O(k * n) space', 'O(n²) time, O(n) space', 'O(k * n) time, O(k * n) space', 'O(2^n) time, O(n) space'],
      answer: 0,
      why: 'There are k rows with O(n) cells, and each cell tries O(n) last-cut positions; the table stores O(k * n) values.',
    },
  ],
  relatedIds: ['word-break', 'matrix-chain', 'min-cost-cut-stick'],
  lessonId: 'intervals',
};

export default splitArrayLargestSumModule;
