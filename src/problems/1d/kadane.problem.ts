import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface KadaneInput {
  nums: number[];
}

const MAX_ITEMS = 9;

const pythonCode = [
  'def max_subarray(nums):',
  '    n = len(nums)',
  '    dp = [0] * n',
  '    dp[0] = nums[0]',
  '    for i in range(1, n):',
  '        dp[i] = max(nums[i], dp[i - 1] + nums[i])',
  '    return max(dp)',
].join('\n');

const javascriptCode = [
  'function maxSubarray(nums) {',
  '  const n = nums.length;',
  '  const dp = new Array(n).fill(0);',
  '  dp[0] = nums[0];',
  '  for (let i = 1; i < n; i++)',
  '    dp[i] = Math.max(nums[i], dp[i - 1] + nums[i]);',
  '  return Math.max(...dp);',
  '}',
].join('\n');

const cppCode = [
  'int maxSubarray(vector<int>& nums) {',
  '  int n = nums.size();',
  '  vector<int> dp(n, 0);',
  '  dp[0] = nums[0];',
  '  for (int i = 1; i < n; i++)',
  '    dp[i] = max(nums[i], dp[i-1] + nums[i]);',
  '  return *max_element(dp.begin(), dp.end());',
  '}',
].join('\n');

function makeRecorder(n: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n }, () => null),
      labels: Array.from({ length: n }, (_value, index) => `end[${index}]`),
      indexName: 'i',
      caption: 'Kadane table dp[i] = best subarray ending at index i',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  bestIndex: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(7).record(`The answer is max(dp) = ${answer}, the best subarray ending at index ${bestIndex}.`, {
    codeLine: 7,
    highlights: [{ pos: [bestIndex], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function bruteForceSteps(nums: number[]): Step[] {
  const n = nums.length;
  const rec = makeRecorder(n);
  let examined = 0;
  let best = nums[0] ?? 0;
  let bestIndex = 0;

  rec.at(1).record(
    `Brute force: enumerate all ${n * ((n + 1) / 2)} subarrays in O(n^2) time. For each ending index i, try every starting index.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'dp[0]' }],
      vars: { n, examined: 0 },
    },
  );

  for (let i = 0; i < n; i += 1) {
    let bestEnding = Number.NEGATIVE_INFINITY;
    let bestStart = i;
    let sum = 0;
    for (let start = i; start >= 0; start -= 1) {
      sum += nums[start] ?? 0;
      examined += 1;
      if (sum > bestEnding) {
        bestEnding = sum;
        bestStart = start;
      }
    }
    if (i === 0) {
      best = bestEnding;
      bestIndex = 0;
    } else if (bestEnding > best) {
      best = bestEnding;
      bestIndex = i;
    }
    const message =
      i === 0
        ? `Only one subarray ends at index 0: nums[0] = ${bestEnding}.`
        : `Subarrays ending at index ${i}: tried all ${i + 1} starting indices. Best is nums[${bestStart}..${i}] = ${bestEnding} (${examined} subarrays examined so far).`;
    if (i === 0) {
      rec.at(4).fill([0], bestEnding, message, {
        kind: 'base',
        codeLine: 4,
        vars: { examined, i, n },
      });
    } else {
      rec.at(6).fill([i], bestEnding, message, {
        codeLine: 6,
        vars: { examined, i, n },
      });
    }
  }

  return finish(rec, bestIndex, best, { examined, n });
}

function iterativeSteps(nums: number[], memo: boolean): Step[] {
  const n = nums.length;
  const rec = makeRecorder(n);
  const dp: number[] = Array.from({ length: n }, () => 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: remember the best subarray ending at each index once, then reuse it for the next index.'
      : 'Tabulation: build dp bottom-up from index 0. Each best-ending value is final before the next index uses it.',
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n },
    },
  );

  dp[0] = nums[0] ?? 0;
  rec.at(4).fill(
    [0],
    dp[0] ?? 0,
    `Base case: the only subarray ending at index 0 is nums[0] itself, so dp[0] = nums[0] = ${dp[0] ?? 0}.`,
    {
      kind: 'base',
      codeLine: 4,
      vars: { computed: 1, reused: 0, n },
    },
  );
  computed = 1;
  let best = dp[0] ?? 0;
  let bestIndex = 0;

  if (n > 1) {
    rec.at(5).record(`Loop i = 1..${n - 1}: extend the previous best ending, or restart at nums[i].`, {
      codeLine: 5,
      highlights: [{ pos: [1], kind: 'active', label: 'dp[1]' }],
      vars: { computed, reused, n },
    });
  }

  for (let i = 1; i < n; i += 1) {
    const restart = nums[i] ?? 0;
    const extend = (dp[i - 1] ?? 0) + restart;
    dp[i] = Math.max(restart, extend);
    computed += 1;
    reused += 1;
    if ((dp[i] ?? 0) > best) {
      best = dp[i] ?? 0;
      bestIndex = i;
    }
    const dependency: Highlight = { pos: [i - 1], kind: 'dependency', label: `end[${i - 1}]` };
    rec.at(6).fill(
      [i],
      dp[i] ?? 0,
      memo
        ? `Cache hit: reuse end[${i - 1}] = ${dp[i - 1] ?? 0}; dp[${i}] = max(nums[${i}] = ${restart}, ${dp[i - 1] ?? 0} + ${restart} = ${extend}) = ${dp[i] ?? 0}. ${restart >= extend ? 'Restarting wins.' : 'Extending wins.'}`
        : `dp[${i}] = max(nums[${i}] = ${restart}, dp[${i - 1}] + nums[${i}] = ${extend}) = ${dp[i] ?? 0}. ${restart >= extend ? 'Restarting wins.' : 'Extending wins.'} Best so far is ${best}.`,
      {
        codeLine: 6,
        highlights: [dependency],
        vars: { best, computed, i, n, reused },
      },
    );
  }

  return finish(rec, bestIndex, best, { computed, reused, n });
}

function normalizeInput(input: KadaneInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const cleaned = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), -10, 20) : 0));
  return cleaned.length > 0 ? cleaned : [0];
}

const kadaneModule: ProblemModule<KadaneInput> = {
  id: 'kadane',
  title: 'Maximum Subarray (Kadane)',
  category: '1d',
  difficulty: 'easy',
  summary:
    'Find the contiguous subarray with the largest sum. Brute force enumerates all subarrays; memoization caches best-ending values and tabulation fills dp bottom-up, so Kadane runs in linear time.',
  stateDefinition: 'dp[i] = maximum subarray sum of any subarray ending at index i, for 0 <= i < n.',
  recurrence: 'dp[0] = nums[0]; dp[i] = max(nums[i], dp[i - 1] + nums[i]) for i >= 1. The answer is max(dp).',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'The array; find the contiguous subarray with the largest sum.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: -10,
      max: 20,
    },
  ],
  defaultInput: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: KadaneInput, mode: Mode): Step[] {
    const nums = normalizeInput(input);
    if (mode === 'bruteforce') return bruteForceSteps(nums);
    if (mode === 'memo') return iterativeSteps(nums, true);
    return iterativeSteps(nums, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the maximum subarray sum of [-2, 1, -3, 4, -1, 2, 1, -5, 4]?',
      options: ['6', '7', '4', '10'],
      answer: 0,
      why: 'The subarray 4, -1, 2, 1 sums to 6, and no subarray sums to more.',
    },
    {
      q: 'What is the recurrence for dp[i], the best subarray ending at index i?',
      options: [
        'max(nums[i], dp[i - 1] + nums[i])',
        'dp[i - 1] + nums[i]',
        'max(nums[i], dp[i - 1])',
        'dp[i - 1] + dp[i - 2] + nums[i]',
      ],
      answer: 0,
      why: 'Either extend the best subarray ending at i-1, or start a new subarray at nums[i] alone.',
    },
    {
      q: 'What is the maximum subarray sum of [-1]?',
      options: ['-1', '0', '1', 'It is undefined'],
      answer: 0,
      why: 'The subarray must contain at least one element, so the only choice is -1 itself.',
    },
    {
      q: 'How do memoization/tabulation compare to enumerating all subarrays?',
      options: ['O(n) vs O(n^2)', 'O(n^2) vs O(n)', 'The same', 'O(n) vs O(2^n)'],
      answer: 0,
      why: 'Kadane touches each index once in O(n); enumerating every start and end pair takes O(n^2) time.',
    },
  ],
};

export default kadaneModule;
