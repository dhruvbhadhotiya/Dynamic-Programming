import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface LisBinaryInput {
  nums: number[];
}

const MAX_ITEMS = 8;
const MAX_VALUE = 101;

const pythonCode = [
  'def length_of_lis(nums):',
  '    tails = []',
  '    for x in nums:',
  '        i = bisect_left(tails, x)',
  '        if i == len(tails):',
  '            tails.append(x)',
  '        else: tails[i] = x',
  '    return len(tails)',
].join('\n');

const javascriptCode = [
  'function lengthOfLIS(nums) {',
  '  const tails = [];',
  '  for (const x of nums) {',
  '    const i = lowerBound(tails, x);',
  '    if (i === tails.length) {',
  '      tails.push(x);',
  '    } else tails[i] = x;',
  '  } return tails.length;',
  '}',
].join('\n');

const cppCode = [
  'int lengthOfLIS(vector<int>& nums) {',
  '  vector<int> tails;',
  '  for (int x : nums) {',
  '    int i = lower_bound(tails.begin(), tails.end(), x) - tails.begin();',
  '    if (i == (int)tails.size()) {',
  '      tails.push_back(x);',
  '    } else tails[i] = x;',
  '  } return (int)tails.size();',
  '}',
].join('\n');

function makeDpRecorder(n: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n }, () => null),
      labels: Array.from({ length: n }, (_value, index) => `dp[${index}]`),
      indexName: 'i',
      caption: 'Brute-force table dp[i] = length of strictly increasing subsequence ending at index i',
    },
    { codeLine: 1 },
  );
}

function makeTailsRecorder(n: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n }, () => null),
      labels: Array.from({ length: n }, (_value, index) => `tails[${index}]`),
      indexName: 'k',
      caption: 'Tails table tails[k] = smallest tail of increasing subsequence of length k+1',
    },
    { codeLine: 2 },
  );
}

function bruteForceSteps(nums: number[]): Step[] {
  const n = nums.length;
  const rec = makeDpRecorder(n);
  const dp: number[] = Array.from({ length: n }, () => 1);
  let computed = 0;
  let comparisons = 0;

  rec.at(2).record(
    `Brute force (quadratic DP): compare every pair (j, i) with j < i to grow dp[i], the LIS length ending at i.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { comparisons: 0, computed: 0, n },
    },
  );

  for (let i = 0; i < n; i += 1) {
    dp[i] = 1;
    computed += 1;
    rec.at(3).fill([i], 1, `Base: dp[${i}] = 1, the subsequence [${nums[i] ?? 0}] ending at index ${i}.`, {
      kind: 'base',
      codeLine: 3,
      vars: { comparisons, computed, i, n },
    });

    for (let j = 0; j < i; j += 1) {
      comparisons += 1;
      const current = nums[i] ?? 0;
      const previous = nums[j] ?? 0;
      if (previous >= current) {
        rec.at(5).record(
          `nums[${j}] = ${previous} is not < nums[${i}] = ${current}, so dp[${j}] cannot be extended to ${i}.`,
          {
            codeLine: 5,
            highlights: [
              { pos: [i], kind: 'active' },
              { pos: [j], kind: 'pruned', label: `dp[${j}]` },
            ],
            vars: { comparisons, computed, i, j, n },
          },
        );
        continue;
      }
      const candidate = (dp[j] ?? 1) + 1;
      if (candidate > (dp[i] ?? 0)) {
        dp[i] = candidate;
        rec.at(6).fill(
          [i],
          candidate,
          `dp[${i}] = max(dp[${i}], dp[${j}] + 1) = ${candidate} because nums[${j}] = ${previous} < ${current}.`,
          {
            codeLine: 6,
            highlights: [{ pos: [j], kind: 'dependency', label: `dp[${j}]` }],
            vars: { comparisons, computed, i, j, n },
          },
        );
      } else {
        rec.at(5).record(
          `nums[${j}] = ${previous} < ${current}, but dp[${j}] + 1 = ${candidate} does not beat dp[${i}] = ${dp[i] ?? 0}.`,
          {
            codeLine: 5,
            highlights: [
              { pos: [i], kind: 'active' },
              { pos: [j], kind: 'dependency', label: `dp[${j}]` },
            ],
            vars: { comparisons, computed, i, j, n },
          },
        );
      }
    }
  }

  const answer = Math.max(...dp);
  const bestIndex = Math.max(0, dp.indexOf(answer));
  rec.at(8).record(`The answer is ${answer}.`, {
    codeLine: 8,
    highlights: [{ pos: [bestIndex], kind: 'result', label: 'answer' }],
    vars: { answer, comparisons, computed, n },
  });
  return [...rec.steps];
}

function tailsSteps(nums: number[]): Step[] {
  const n = nums.length;
  const rec = makeTailsRecorder(n);
  const tails: number[] = [];
  let comparisons = 0;

  rec.at(2).record(
    `Tabulation (patience / tails): tails[k] is the smallest tail of an increasing subsequence of length k+1. For each x, binary search finds the first tails[k] >= x.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { comparisons: 0, n },
    },
  );

  for (let i = 0; i < n; i += 1) {
    const x = nums[i] ?? 0;
    let lo = 0;
    let hi = tails.length;

    if (tails.length === 0) {
      rec.at(4).record(`nums[${i}] = ${x}, tails is empty, so lower_bound = 0.`, {
        codeLine: 4,
        highlights: [{ pos: [0], kind: 'active' }],
        vars: { comparisons, i, n, x },
      });
    } else {
      rec.at(4).record(
        `nums[${i}] = ${x}, binary search tails = [${tails.join(', ')}] in [${lo}, ${hi}).`,
        {
          codeLine: 4,
          highlights: [{ pos: [0], kind: 'active' }],
          vars: { comparisons, i, n, x },
        },
      );
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const midValue = tails[mid] ?? 0;
        comparisons += 1;
        if (midValue < x) {
          rec.at(4).record(
            `tails[${mid}] = ${midValue} < ${x}, so search right: lo = ${mid + 1}.`,
            {
              codeLine: 4,
              highlights: [{ pos: [mid], kind: 'dependency', label: `tails[${mid}]` }],
              vars: { comparisons, i, n, x },
            },
          );
          lo = mid + 1;
        } else {
          rec.at(4).record(
            `tails[${mid}] = ${midValue} >= ${x}, so search left: hi = ${mid}.`,
            {
              codeLine: 4,
              highlights: [{ pos: [mid], kind: 'dependency', label: `tails[${mid}]` }],
              vars: { comparisons, i, n, x },
            },
          );
          hi = mid;
        }
      }
    }

    const pos = lo;
    if (pos === tails.length) {
      tails.push(x);
      rec.at(6).fill(
        [pos],
        x,
        `lower_bound = ${pos} = tails.length (${tails.length - 1} before append), append ${x}: tails = [${tails.join(', ')}], LIS length ${tails.length}.`,
        { codeLine: 6, vars: { comparisons, i, n, pos, x } },
      );
    } else {
      const old = tails[pos] ?? 0;
      tails[pos] = x;
      rec.at(7).fill(
        [pos],
        x,
        `lower_bound = ${pos}, tails[${pos}] was ${old} >= ${x}, replace it: tails = [${tails.join(', ')}]. LIS length stays ${tails.length}.`,
        { codeLine: 7, vars: { comparisons, i, n, pos, x } },
      );
    }
  }

  const answer = tails.length;
  const bestPos = Math.max(0, tails.length - 1);
  rec.at(8).record(`The answer is ${answer}. Final tails = [${tails.join(', ')}].`, {
    codeLine: 8,
    highlights: [{ pos: [bestPos], kind: 'result', label: 'answer' }],
    vars: { answer, comparisons, n },
  });
  return [...rec.steps];
}

function normalizeInput(input: LisBinaryInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const cleaned = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, MAX_VALUE) : 0));
  return cleaned.length > 0 ? cleaned : [0];
}

const lisBinaryModule: ProblemModule<LisBinaryInput> = {
  id: 'lis-binary',
  title: 'Longest Increasing Subsequence (Binary Search)',
  category: '1d',
  difficulty: 'medium',
  summary:
    'Find the length of the longest strictly increasing subsequence. Brute force compares every pair in O(n^2); the tails (patience sorting) method binary-searches the lower bound of each x, so each step is O(log n) for O(n log n).',
  stateDefinition:
    'tails[k] = smallest possible tail value (last element) of a strictly increasing subsequence of length k+1 using elements seen so far. Answer = tails.length.',
  recurrence:
    'For each x, i = lower_bound(tails, x), the first index with tails[i] >= x; append x if i == tails.length else replace tails[i] = x.',
  complexity: { time: 'O(n log n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'Numbers to search for a strictly increasing subsequence. Keep n small to see each binary search.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 0,
      max: MAX_VALUE,
    },
  ],
  defaultInput: { nums: [10, 9, 2, 5, 3, 7, 101, 18] },
  modes: ['bruteforce', 'tabulation'],
  generateSteps(input: LisBinaryInput, mode: Mode): Step[] {
    const nums = normalizeInput(input);
    if (mode === 'bruteforce') return bruteForceSteps(nums);
    return tailsSteps(nums);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the LIS length of [10, 9, 2, 5, 3, 7, 101, 18]?',
      options: ['4', '3', '5', '7'],
      answer: 0,
      why: 'One longest subsequence is [2, 5, 7, 101] (or [2, 5, 7, 18]), so the length is 4.',
    },
    {
      q: 'What is the LIS length of [0, 1, 0, 3, 2, 3]?',
      options: ['4', '3', '5', '2'],
      answer: 0,
      why: 'The subsequence [0, 1, 2, 3] uses indices 0, 1, 4, 5 and has length 4; no longer strictly increasing subsequence exists.',
    },
    {
      q: 'What does tails[k] mean in the O(n log n) method?',
      options: [
        'Smallest possible tail of an increasing subsequence of length k+1',
        'Length of the LIS ending at index k',
        'Number of binary searches done so far',
        'Element at index k of the original array',
      ],
      answer: 0,
      why: 'tails keeps the minimal last value for each length, so a shorter tail leaves more room to extend later.',
    },
    {
      q: 'How does O(n log n) tails compare to O(n^2) DP on LIS?',
      options: ['O(n log n) vs O(n^2)', 'O(n^2) vs O(n)', 'The same', 'O(n log n) vs O(2^n * n)'],
      answer: 0,
      why: 'Tails does one binary search (O(log n)) per element for O(n log n); the quadratic DP compares every pair (j, i) in O(n^2).',
    },
  ],
};

export default lisBinaryModule;
