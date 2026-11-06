import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface HouseRobberInput {
  nums: number[];
}

const MAX_ITEMS = 10;

const pythonCode = [
  'def rob(nums):',
  '    n = len(nums)',
  '    dp = [0] * (n + 1)',
  '    dp[1] = nums[0]',
  '    for i in range(2, n + 1):',
  '        dp[i] = max(dp[i - 1], dp[i - 2] + nums[i - 1])',
  '    return dp[n]',
].join('\n');

const javascriptCode = [
  'function rob(nums) {',
  '  const n = nums.length;',
  '  const dp = new Array(n + 1).fill(0);',
  '  dp[1] = nums[0];',
  '  for (let i = 2; i <= n; i++)',
  '    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i - 1]);',
  '  return dp[n];',
  '}',
].join('\n');

const cppCode = [
  'int rob(vector<int>& nums) {',
  '  int n = nums.size();',
  '  vector<int> dp(n + 1, 0);',
  '  dp[1] = nums[0];',
  '  for (int i = 2; i <= n; i++)',
  '    dp[i] = max(dp[i-1], dp[i-2] + nums[i-1]);',
  '  return dp[n];',
  '}',
].join('\n');

function makeRecorder(n: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n + 1 }, () => null),
      labels: Array.from({ length: n + 1 }, (_value, index) => `dp[${index}]`),
      indexName: 'i',
      caption: 'House Robber table dp[i] = best loot from first i houses',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  n: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(7).record(`The answer is ${answer}.`, {
    codeLine: 7,
    highlights: [{ pos: [n], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function dependencyHighlights(i: number): Highlight[] {
  return [
    { pos: [i - 1], kind: 'dependency', label: `dp[${i - 1}]` },
    { pos: [i - 2], kind: 'dependency', label: `dp[${i - 2}]` },
  ];
}

function bruteForceSteps(nums: number[]): Step[] {
  const n = nums.length;
  const rec = makeRecorder(n);
  let calls = 0;
  rec.at(1).record(
    `Brute force: at each house, try robbing it or skipping it. Overlapping prefixes are recomputed with no cache.`,
    {
      codeLine: 1,
      highlights: [{ pos: [n], kind: 'active', label: `dp[${n}]` }],
      vars: { calls: 0, n },
    },
  );

  const solve = (k: number): number => {
    calls += 1;
    if (k === 0) {
      rec.at(3).fill([0], 0, 'Base case: no houses, dp[0] = 0.', {
        kind: 'base',
        codeLine: 3,
        vars: { calls, k, n },
      });
      return 0;
    }
    if (k === 1) {
      rec.at(4).fill([1], nums[0] ?? 0, `Base case: one house, dp[1] = nums[0] = ${nums[0] ?? 0}.`, {
        kind: 'base',
        codeLine: 4,
        vars: { calls, k, n },
      });
      return nums[0] ?? 0;
    }
    const skip = solve(k - 1);
    const robValue = solve(k - 2) + (nums[k - 1] ?? 0);
    const value = Math.max(skip, robValue);
    rec.at(6).fill(
      [k],
      value,
      `Recomputed dp[${k}] = max(dp[${k - 1}] = ${skip}, dp[${k - 2}] + nums[${k - 1}] = ${robValue}) = ${value}. Nothing was remembered.`,
      {
        codeLine: 6,
        highlights: dependencyHighlights(k),
        vars: { calls, k, n },
      },
    );
    return value;
  };

  const answer = solve(n);
  return finish(rec, n, answer, { calls });
}

function iterativeSteps(nums: number[], memo: boolean): Step[] {
  const n = nums.length;
  const rec = makeRecorder(n);
  const dp: number[] = Array.from({ length: n + 1 }, () => 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each prefix best once. Reuse cached dp[i-1] and dp[i-2] to decide each house.'
      : 'Tabulation: build dp bottom-up from the first house. Each prefix best is final before larger prefixes.',
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n },
    },
  );

  dp[0] = 0;
  rec.at(3).fill([0], 0, 'Base case: no houses, dp[0] = 0.', {
    kind: 'base',
    codeLine: 3,
    vars: { computed: 1, reused: 0, n },
  });
  computed = 1;

  dp[1] = nums[0] ?? 0;
  rec.at(4).fill([1], dp[1] ?? 0, `Base case: one house, dp[1] = nums[0] = ${dp[1] ?? 0}.`, {
    kind: 'base',
    codeLine: 4,
    vars: { computed: 2, reused: 0, n },
  });
  computed = 2;

  for (let i = 2; i <= n; i += 1) {
    const skip = dp[i - 1] ?? 0;
    const robValue = (dp[i - 2] ?? 0) + (nums[i - 1] ?? 0);
    dp[i] = Math.max(skip, robValue);
    computed += 1;
    reused += 2;
    rec.at(6).fill(
      [i],
      dp[i] ?? 0,
      memo
        ? `Cache hit: reuse dp[${i - 1}] = ${skip} and dp[${i - 2}] = ${dp[i - 2] ?? 0}; dp[${i}] = max(${skip}, ${robValue}) = ${dp[i] ?? 0}.`
        : `dp[${i}] = max(dp[${i - 1}] = ${skip}, dp[${i - 2}] + nums[${i - 1}] = ${robValue}) = ${dp[i] ?? 0}. ${robValue > skip ? 'Robbing wins.' : 'Skipping wins.'}`,
      {
        codeLine: 6,
        highlights: dependencyHighlights(i),
        vars: { computed, reused, i, n },
      },
    );
  }

  return finish(rec, n, dp[n] ?? 0, { computed, reused });
}

function normalizeInput(input: HouseRobberInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const cleaned = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, 20) : 0));
  return cleaned.length > 0 ? cleaned : [0];
}

const houseRobberModule: ProblemModule<HouseRobberInput> = {
  id: 'house-robber',
  title: 'House Robber',
  category: '1d',
  difficulty: 'easy',
  summary:
    'Rob houses so no two adjacent houses are robbed. Brute force tries rob/skip at each house and recomputes overlapping prefixes; memoization caches them and tabulation fills dp bottom-up, so each prefix is solved once.',
  stateDefinition: 'dp[i] = maximum money from the first i houses (nums[0..i-1]), for 0 <= i <= n.',
  recurrence: 'dp[0] = 0; dp[1] = nums[0]; dp[i] = max(dp[i-1], dp[i-2] + nums[i-1]) for i >= 2.',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'Money in each house. No two adjacent houses can both be robbed.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 0,
      max: 20,
    },
  ],
  defaultInput: { nums: [2, 7, 9, 3, 1] },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: HouseRobberInput, mode: Mode): Step[] {
    const nums = normalizeInput(input);
    if (mode === 'bruteforce') return bruteForceSteps(nums);
    if (mode === 'memo') return iterativeSteps(nums, true);
    return iterativeSteps(nums, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the best loot from [2, 7, 9, 3, 1]?',
      options: ['12', '11', '10', '20'],
      answer: 0,
      why: 'Rob houses 2, 9 and 1 (no two adjacent): 2 + 9 + 1 = 12.',
    },
    {
      q: 'Why can you not rob two adjacent houses?',
      options: ['The alarm trips', 'You can rob them freely', 'Money is zero there', 'Only the first house has money'],
      answer: 0,
      why: 'Robbing adjacent houses triggers the alarm, so the plan must skip at least one house between any two robbed houses.',
    },
    {
      q: 'What is the recurrence for dp[i] (best from the first i houses)?',
      options: [
        'max(dp[i-1], dp[i-2] + nums[i-1])',
        'dp[i-1] + nums[i-1]',
        'max(dp[i-1], nums[i-1])',
        'dp[i-1] + dp[i-2]',
      ],
      answer: 0,
      why: 'Either skip house i-1, giving dp[i-1], or rob it and add nums[i-1] to dp[i-2], which stops at the adjacent house.',
    },
    {
      q: 'How do memoization/tabulation compare to brute force?',
      options: ['O(n) vs O(2^n)', 'O(n^2) vs O(n)', 'The same', 'O(1) vs O(n)'],
      answer: 0,
      why: 'Each prefix best is computed once in O(n) time; brute force recomputes overlapping prefixes every time, giving exponential time.',
    },
  ],
};

export default houseRobberModule;
