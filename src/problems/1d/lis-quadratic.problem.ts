import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface LisQuadraticInput {
  nums: number[];
}

const MAX_ITEMS = 8;
const MAX_VALUE = 101;

const pythonCode = [
  'def length_of_lis(nums):',
  '    n = len(nums)',
  '    dp = [1] * n',
  '    for i in range(n):',
  '        for j in range(i):',
  '            if nums[j] < nums[i]:',
  '                dp[i] = max(dp[i], dp[j] + 1)',
  '    return max(dp) if dp else 0',
].join('\n');

const javascriptCode = [
  'function lengthOfLIS(nums) {',
  '  const n = nums.length;',
  '  const dp = new Array(n).fill(1);',
  '  for (let i = 0; i < n; i++)',
  '    for (let j = 0; j < i; j++)',
  '      if (nums[j] < nums[i])',
  '        dp[i] = Math.max(dp[i], dp[j] + 1);',
  '  return dp.length === 0 ? 0 : Math.max(...dp);',
  '}',
].join('\n');

const cppCode = [
  'int lengthOfLIS(vector<int>& nums) {',
  '  int n = nums.size();',
  '  vector<int> dp(n, 1);',
  '  for (int i = 0; i < n; i++)',
  '    for (int j = 0; j < i; j++)',
  '      if (nums[j] < nums[i])',
  '        dp[i] = max(dp[i], dp[j] + 1);',
  '  return dp.empty() ? 0 : *max_element(dp.begin(), dp.end());',
  '}',
].join('\n');

function makeRecorder(n: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n }, () => null),
      labels: Array.from({ length: n }, (_value, index) => `dp[${index}]`),
      indexName: 'i',
      caption: 'LIS table dp[i] = length of strictly increasing subsequence ending at index i',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  answer: number,
  bestIndex: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(8).record(`The answer is ${answer}.`, {
    codeLine: 8,
    highlights: [{ pos: [bestIndex], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function bruteForceSteps(nums: number[]): Step[] {
  const n = nums.length;
  const rec = makeRecorder(n);
  const bestEnding: number[] = Array.from({ length: n }, () => 0);
  let calls = 0;
  let answer = 0;

  rec.at(1).record(
    `Brute force: try every subset of the ${n} elements, keep only strictly increasing ones, and remember the longest. No dp state is reused.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { calls: 0, n },
    },
  );

  const total = 1 << n;
  for (let mask = 1; mask < total; mask += 1) {
    const indices: number[] = [];
    for (let i = 0; i < n; i += 1) {
      if ((mask & (1 << i)) !== 0) indices.push(i);
    }
    calls += 1;
    let increasing = true;
    for (let k = 1; k < indices.length; k += 1) {
      const prevIndex = indices[k - 1] ?? 0;
      const currIndex = indices[k] ?? 0;
      if ((nums[prevIndex] ?? 0) >= (nums[currIndex] ?? 0)) {
        increasing = false;
        break;
      }
    }
    const values = indices.map((index) => nums[index] ?? 0);
    const label = `[${values.join(', ')}]`;
    if (!increasing) {
      const highlights: Highlight[] = indices.map((index) => ({ pos: [index], kind: 'pruned' }));
      rec.at(1).record(`Subset ${label} is not strictly increasing, skip it.`, {
        codeLine: 1,
        highlights,
        vars: { calls, n },
      });
      continue;
    }
    const lastIndex = indices[indices.length - 1] ?? 0;
    const length = indices.length;
    if (length > (bestEnding[lastIndex] ?? 0)) {
      bestEnding[lastIndex] = length;
      answer = Math.max(answer, length);
      rec.at(7).fill(
        [lastIndex],
        length,
        `Subset ${label} is increasing with length ${length}, the best ending at index ${lastIndex} so far.`,
        { codeLine: 7, vars: { calls, length, n } },
      );
    } else {
      const highlights: Highlight[] = indices.map((index) => ({ pos: [index], kind: 'path' }));
      rec.at(1).record(
        `Subset ${label} is increasing with length ${length}, but the best ending at index ${lastIndex} is already ${bestEnding[lastIndex] ?? 0}.`,
        { codeLine: 1, highlights, vars: { calls, length, n } },
      );
    }
  }

  const bestIndex = Math.max(0, bestEnding.indexOf(answer));
  return finish(rec, answer, bestIndex, { calls });
}

function iterativeSteps(nums: number[], memo: boolean): Step[] {
  const n = nums.length;
  const rec = makeRecorder(n);
  const dp: number[] = Array.from({ length: n }, () => 1);
  let computed = 0;
  let comparisons = 0;

  rec.at(3).record(
    memo
      ? 'Memoization: cache each dp[i] once, then look up earlier dp[j] for every j < i to extend it.'
      : 'Tabulation: build dp bottom-up. Each dp[i] starts at 1 and is extended by smaller dp[j] values already final.',
    {
      codeLine: 3,
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
        rec.at(6).record(
          `nums[${j}] = ${previous} is not < nums[${i}] = ${current}, so dp[${j}] cannot be extended to ${i}.`,
          {
            codeLine: 6,
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
        rec.at(7).fill(
          [i],
          candidate,
          memo
            ? `Cache hit: reuse dp[${j}] = ${dp[j] ?? 1} with nums[${j}] = ${previous} < ${current}; dp[${i}] = ${candidate}.`
            : `dp[${i}] = max(dp[${i}], dp[${j}] + 1) = ${candidate} because nums[${j}] = ${previous} < ${current}.`,
          {
            codeLine: 7,
            highlights: [{ pos: [j], kind: 'dependency', label: `dp[${j}]` }],
            vars: { comparisons, computed, i, j, n },
          },
        );
      } else {
        rec.at(6).record(
          `nums[${j}] = ${previous} < ${current}, but dp[${j}] + 1 = ${candidate} does not beat dp[${i}] = ${dp[i] ?? 0}.`,
          {
            codeLine: 6,
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
  const bestIndex = dp.indexOf(answer);
  return finish(rec, answer, Math.max(0, bestIndex), { comparisons, computed });
}

function normalizeInput(input: LisQuadraticInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const cleaned = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, MAX_VALUE) : 0));
  return cleaned.length > 0 ? cleaned : [0];
}

const lisQuadraticModule: ProblemModule<LisQuadraticInput> = {
  id: 'lis-quadratic',
  title: 'Longest Increasing Subsequence',
  category: '1d',
  difficulty: 'medium',
  summary:
    'Find the length of the longest strictly increasing subsequence. Brute force tries every subset; memoization caches each dp[i] and tabulation fills it bottom-up, so each pair (j, i) is compared once for O(n^2).',
  stateDefinition:
    'dp[i] = length of the longest strictly increasing subsequence ending at index i (including nums[i] as last), for 0 <= i < n.',
  recurrence:
    'dp[i] = 1 if no j < i has nums[j] < nums[i]; otherwise dp[i] = 1 + max(dp[j]) over j < i with nums[j] < nums[i]. Answer = max(dp).',
  complexity: { time: 'O(n^2)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'Numbers to search for a strictly increasing subsequence. Keep n small to see every pair compared.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 0,
      max: MAX_VALUE,
    },
  ],
  defaultInput: { nums: [10, 9, 2, 5, 3, 7, 101, 18] },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: LisQuadraticInput, mode: Mode): Step[] {
    const nums = normalizeInput(input);
    if (mode === 'bruteforce') return bruteForceSteps(nums);
    if (mode === 'memo') return iterativeSteps(nums, true);
    return iterativeSteps(nums, false);
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
      q: 'What is the recurrence for dp[i] in this O(n^2) LIS?',
      options: [
        '1 + max(dp[j]) for j < i with nums[j] < nums[i], or 1 if none',
        'dp[i-1] + 1 always',
        'max(dp[j]) for all j < i, regardless of values',
        'dp[i] + nums[i]',
      ],
      answer: 0,
      why: 'A LIS ending at i is either just nums[i] (length 1) or extends a shorter LIS ending at j where nums[j] < nums[i].',
    },
    {
      q: 'How does O(n^2) DP compare to subset brute force on LIS?',
      options: ['O(n^2) vs O(2^n * n)', 'O(n) vs O(n^2)', 'The same', 'O(n log n) vs O(n^2)'],
      answer: 0,
      why: 'The DP compares each pair (j, i) once in O(n^2); subset brute force enumerates all 2^n subsets and checks each in O(n).',
    },
  ],
};

export default lisQuadraticModule;
