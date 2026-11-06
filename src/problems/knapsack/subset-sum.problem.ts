import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface SubsetSumInput {
  nums: number[];
  target: number;
}

const MAX_ITEMS = 6;
const MAX_TARGET = 20;

const pythonCode = [
  'def can_subset(nums, target):',
  '    n = len(nums)',
  '    dp = [[False] * (target + 1) for _ in range(n + 1)]',
  '    dp[0][0] = True',
  '    for i in range(1, n + 1):',
  '        for w in range(target + 1):',
  '            dp[i][w] = dp[i-1][w] or (w >= nums[i-1] and dp[i-1][w - nums[i-1]])',
  '    return dp[n][target]',
].join('\n');

const javascriptCode = [
  'function canSubset(nums, target) {',
  '  const n = nums.length;',
  '  const dp = Array.from({ length: n + 1 }, () => new Array(target + 1).fill(false));',
  '  dp[0][0] = true;',
  '  for (let i = 1; i <= n; i++)',
  '    for (let w = 0; w <= target; w++)',
  '      dp[i][w] = dp[i - 1][w] || (w >= nums[i - 1] && dp[i - 1][w - nums[i - 1]]);',
  '  return dp[n][target];',
  '}',
].join('\n');

const cppCode = [
  'bool canSubset(vector<int>& nums, int target) {',
  '  int n = nums.size();',
  '  vector<vector<bool>> dp(n + 1, vector<bool>(target + 1, false));',
  '  dp[0][0] = true;',
  '  for (int i = 1; i <= n; i++)',
  '    for (int w = 0; w <= target; w++)',
  '      dp[i][w] = dp[i-1][w] || (w >= nums[i-1] && dp[i-1][w - nums[i-1]]);',
  '  return dp[n][target];',
  '}',
].join('\n');

function makeRecorder(nums: number[], target: number): StepRecorder<Table2DState> {
  const n = nums.length;
  const rowLabels = ['0 items', ...nums.map((value, index) => `${index + 1}: ${value}`)];
  const colLabels = Array.from({ length: target + 1 }, (_v, w) => String(w));
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D(n + 1, target + 1, () => null),
      rowLabels,
      colLabels,
      rowHeader: 'items i',
      colHeader: 'sum w',
      caption: 'Subset Sum table dp[i][w] = can make w using first i numbers',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table2DState>,
  n: number,
  target: number,
  answer: boolean,
  extra: Record<string, string | number | boolean>,
): Step[] {
  rec.at(8).record(
    `The answer is ${answer ? 'true (Yes)' : 'false (No)'}: ${answer ? `some subset sums to ${target}` : `no subset sums to ${target}`}.`,
    {
      codeLine: 8,
      highlights: [{ pos: [n, target], kind: 'result', label: 'answer' }],
      vars: { answer, ...extra },
    },
  );
  return [...rec.steps];
}

function dependencyHighlights(i: number, w: number, value: number): Highlight[] {
  const highlights: Highlight[] = [{ pos: [i - 1, w], kind: 'dependency', label: 'skip' }];
  if (w >= value) {
    highlights.push({ pos: [i - 1, w - value], kind: 'dependency', label: 'take' });
  }
  return highlights;
}

function iterativeSteps(nums: number[], target: number, memo: boolean): Step[] {
  const n = nums.length;
  const rec = makeRecorder(nums, target);
  const dp = create2D(n + 1, target + 1, () => false);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each (i, w) decision once. Reuse cached dp[i-1][w] and dp[i-1][w-nums[i-1]] for each cell.'
      : 'Tabulation: build dp bottom-up from 0 items. Each (i, w) cell is final using only the row above.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n, target },
    },
  );

  const base = dp[0];
  if (base !== undefined) base[0] = true;
  rec.at(4).fill([0, 0], true, 'Base case: with 0 items, sum 0 is reachable: dp[0][0] = true.', {
    kind: 'base',
    codeLine: 4,
    vars: { computed: 1, reused: 0, n, target },
  });
  computed = 1;

  for (let w = 1; w <= target; w += 1) {
    const row = dp[0];
    if (row !== undefined) row[w] = false;
    rec.at(4).fill([0, w], false, `Base case: with 0 items, sum ${w} is unreachable: dp[0][${w}] = false.`, {
      kind: 'base',
      codeLine: 4,
      vars: { computed: computed + 1, reused: 0, w, n, target },
    });
    computed += 1;
  }

  for (let i = 1; i <= n; i += 1) {
    const value = nums[i - 1] ?? 0;
    for (let w = 0; w <= target; w += 1) {
      const skip = dp[i - 1]?.[w] ?? false;
      const take = w >= value ? (dp[i - 1]?.[w - value] ?? false) : false;
      const result = skip || take;
      const row = dp[i];
      if (row !== undefined) row[w] = result;
      computed += 1;
      reused += 2;
      const reason =
        skip && take
          ? 'both skip and take work'
          : skip
            ? `skip wins: dp[${i - 1}][${w}] is true`
            : take
              ? `take wins: dp[${i - 1}][${w - value}] is true`
              : 'neither skip nor take reaches w';
      rec.at(7).fill(
        [i, w],
        result,
        memo
          ? `Cache hit for dp[${i}][${w}]: reuse dp[${i - 1}][${w}] = ${skip} and ${w >= value ? `dp[${i - 1}][${w - value}] = ${take}` : `w < ${value} so take is impossible`}; dp[${i}][${w}] = ${result}.`
          : `dp[${i}][${w}] = dp[${i - 1}][${w}] or (w >= ${value} and dp[${i - 1}][${w - value}]) = ${result} because ${reason}.`,
        {
          codeLine: 7,
          highlights: dependencyHighlights(i, w, value),
          vars: { computed, reused, i, w, n, target },
        },
      );
    }
  }

  return finish(rec, n, target, dp[n]?.[target] ?? false, { computed, reused });
}

function normalizeInput(input: SubsetSumInput): { nums: number[]; target: number } {
  const rawNums = Array.isArray(input.nums) ? input.nums : [];
  const nums = rawNums
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 10) : 1));
  const safeNums = nums.length > 0 ? nums : [1];
  const rawTarget = typeof input.target === 'number' && Number.isFinite(input.target) ? input.target : 1;
  const target = clamp(Math.trunc(rawTarget), 1, MAX_TARGET);
  return { nums: safeNums, target };
}

const subsetSumModule: ProblemModule<SubsetSumInput> = {
  id: 'subset-sum',
  title: 'Subset Sum',
  category: 'knapsack',
  difficulty: 'easy',
  summary:
    'Decide whether some subset of nums sums exactly to target. Brute force tries include/exclude for every number; memoization caches each (i, w) decision and tabulation fills dp bottom-up, so each (i, w) cell is solved once.',
  stateDefinition: 'dp[i][w] = true iff sum w can be made using some subset of the first i numbers (nums[0..i-1]), for 0 <= i <= n and 0 <= w <= target.',
  recurrence:
    'dp[0][0] = true; dp[0][w] = false for w > 0; dp[i][w] = dp[i-1][w] or (w >= nums[i-1] and dp[i-1][w - nums[i-1]]).',
  complexity: { time: 'O(n * target)', space: 'O(n * target)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'Numbers to choose from. Each number can be used at most once.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 1,
      max: 10,
    },
    {
      name: 'target',
      label: 'target',
      help: 'Sum to reach with a subset of nums.',
      type: 'number',
      min: 1,
      max: MAX_TARGET,
    },
  ],
  defaultInput: { nums: [4, 6, 8, 2], target: 10 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: SubsetSumInput, mode: Mode): Step[] {
    const { nums, target } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(nums, target, true);
    return iterativeSteps(nums, target, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'Can some subset of [4, 6, 8, 2] sum to 10?',
      options: ['true', 'false', '12', '0'],
      answer: 0,
      why: '4 + 6 = 10 (also 8 + 2 = 10), so the answer is true.',
    },
    {
      q: 'What does dp[i][w] mean?',
      options: ['Can make w with the first i numbers', 'Max sum using i numbers', 'Count of ways to make w', 'Best sum at most w'],
      answer: 0,
      why: 'dp[i][w] is true exactly when some subset of the first i numbers sums to w.',
    },
    {
      q: 'What is the recurrence for dp[i][w]?',
      options: [
        'dp[i-1][w] or (w >= nums[i-1] and dp[i-1][w-nums[i-1]])',
        'dp[i-1][w] and dp[i-1][w-nums[i-1]]',
        'dp[i-1][w] + nums[i-1]',
        'dp[i][w-nums[i-1]]',
      ],
      answer: 0,
      why: 'Skip nums[i-1] giving dp[i-1][w], or take it when w is large enough and dp[i-1][w-nums[i-1]] is true.',
    },
    {
      q: 'How do memoization/tabulation compare to brute force?',
      options: ['O(n*target) vs O(2^n)', 'O(n) vs O(n*target)', 'The same', 'O(1) vs O(n)'],
      answer: 0,
      why: 'Each (i, w) cell is solved once in O(n*target); brute force tries all 2^n subsets with no reuse.',
    },
  ],
};

export default subsetSumModule;
