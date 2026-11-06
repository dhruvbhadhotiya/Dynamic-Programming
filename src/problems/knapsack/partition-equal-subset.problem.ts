import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface PartitionEqualSubsetInput {
  nums: number[];
}

const MAX_ITEMS = 6;

const pythonCode = [
  'def can_partition(nums):',
  '    total = sum(nums)',
  '    if total % 2 == 1: return False',
  '    target = total // 2',
  '    n = len(nums)',
  '    dp = [[False] * (target + 1) for _ in range(n + 1)]',
  '    dp[0][0] = True',
  '    for i in range(1, n + 1):',
  '        for w in range(target + 1):',
  '            dp[i][w] = dp[i-1][w] or (w >= nums[i-1] and dp[i-1][w - nums[i-1]])',
  '    return dp[n][target]',
].join('\n');

const javascriptCode = [
  'function canPartition(nums) {',
  '  const total = nums.reduce((a, b) => a + b, 0);',
  '  if (total % 2 === 1) return false;',
  '  const target = total / 2;',
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
  'bool canPartition(vector<int>& nums) {',
  '  int total = accumulate(nums.begin(), nums.end(), 0);',
  '  if (total % 2 == 1) return false;',
  '  int target = total / 2;',
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
      caption: 'Partition table dp[i][w] = can make w using first i numbers',
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
  rec.at(11).record(
    `The answer is ${answer ? 'true (Yes)' : 'false (No)'}: ${answer ? `some subset sums to ${target}` : `no subset sums to ${target}`}.`,
    {
      codeLine: 11,
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

function oddSteps(nums: number[], total: number, displayTarget: number): Step[] {
  const n = nums.length;
  const rec = makeRecorder(nums, displayTarget);
  rec.at(2).record(`Total is ${total}. Partition needs two equal halves, so the target would be total / 2 = ${total} / 2, which is not an integer.`, {
    codeLine: 2,
    highlights: [{ pos: [0, 0], kind: 'active' }],
    vars: { total, n, target: displayTarget },
  });
  rec.at(3).record(`The total ${total} is odd, so no split can be equal. Return false immediately without building the table.`, {
    codeLine: 3,
    highlights: [],
    vars: { total, n, target: displayTarget },
  });
  rec.at(11).record(`The answer is false (No): the total ${total} is odd, so no subset can equal half of it.`, {
    codeLine: 11,
    vars: { answer: false, total, n, target: displayTarget },
  });
  return [...rec.steps];
}

function bruteForceSteps(nums: number[], target: number): Step[] {
  const n = nums.length;
  const rec = makeRecorder(nums, target);
  let calls = 0;
  rec.at(2).record(
    `Brute force: at each number, try taking it or skipping it to reach sum ${target}. The same subproblems are recomputed again and again with no cache.`,
    {
      codeLine: 2,
      highlights: [{ pos: [n, target], kind: 'active', label: `dp[${n}][${target}]` }],
      vars: { calls: 0, n, target },
    },
  );

  const solve = (i: number, w: number): boolean => {
    calls += 1;
    if (i === 0) {
      const value = w === 0;
      rec.at(7).fill([0, w], value, `Base case: no numbers, dp[0][${w}] = ${value}.`, {
        kind: 'base',
        codeLine: 7,
        vars: { calls, i, w },
      });
      return value;
    }
    const value = nums[i - 1] ?? 1;
    const skip = solve(i - 1, w);
    const take = w >= value ? solve(i - 1, w - value) : false;
    const result = skip || take;
    rec.at(10).fill(
      [i, w],
      result,
      `Recomputed dp[${i}][${w}] = dp[${i - 1}][${w}] (${skip}) or ${w >= value ? `dp[${i - 1}][${w - value}] (${take})` : `impossible since w < ${value}`} = ${result}. Nothing was remembered.`,
      {
        codeLine: 10,
        highlights: dependencyHighlights(i, w, value),
        vars: { calls, i, w },
      },
    );
    return result;
  };

  const answer = solve(n, target);
  return finish(rec, n, target, answer, { calls });
}

function iterativeSteps(nums: number[], target: number, memo: boolean): Step[] {
  const n = nums.length;
  const rec = makeRecorder(nums, target);
  const dp = create2D(n + 1, target + 1, () => false);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? `Memoization: cache each (i, w) decision once. Reuse cached dp[i-1][w] and dp[i-1][w-nums[i-1]] for each cell aiming at target ${target}.`
      : `Tabulation: build dp bottom-up from 0 items. Each (i, w) cell is final using only the row above.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n, target },
    },
  );

  const base = dp[0];
  if (base !== undefined) base[0] = true;
  rec.at(7).fill([0, 0], true, 'Base case: with 0 items, sum 0 is reachable: dp[0][0] = true.', {
    kind: 'base',
    codeLine: 7,
    vars: { computed: 1, reused: 0, n, target },
  });
  computed = 1;

  for (let w = 1; w <= target; w += 1) {
    const row = dp[0];
    if (row !== undefined) row[w] = false;
    rec.at(7).fill([0, w], false, `Base case: with 0 items, sum ${w} is unreachable: dp[0][${w}] = false.`, {
      kind: 'base',
      codeLine: 7,
      vars: { computed: computed + 1, reused: 0, w, n, target },
    });
    computed += 1;
  }

  for (let i = 1; i <= n; i += 1) {
    const value = nums[i - 1] ?? 1;
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
      rec.at(10).fill(
        [i, w],
        result,
        memo
          ? `Cache hit for dp[${i}][${w}]: reuse dp[${i - 1}][${w}] = ${skip} and ${w >= value ? `dp[${i - 1}][${w - value}] = ${take}` : `w < ${value} so take is impossible`}; dp[${i}][${w}] = ${result}.`
          : `dp[${i}][${w}] = dp[${i - 1}][${w}] or (w >= ${value} and dp[${i - 1}][${w - value}]) = ${result} because ${reason}.`,
        {
          codeLine: 10,
          highlights: dependencyHighlights(i, w, value),
          vars: { computed, reused, i, w, n, target },
        },
      );
    }
  }

  return finish(rec, n, target, dp[n]?.[target] ?? false, { computed, reused });
}

function normalizeInput(input: PartitionEqualSubsetInput): number[] {
  const raw = Array.isArray(input.nums) ? input.nums : [];
  const nums = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 11) : 1));
  return nums.length > 0 ? nums : [1];
}

const partitionEqualSubsetModule: ProblemModule<PartitionEqualSubsetInput> = {
  id: 'partition-equal-subset',
  title: 'Partition Equal Subset Sum',
  category: 'knapsack',
  difficulty: 'medium',
  summary:
    'Decide whether nums can be split into two subsets with equal sum. Brute force tries include/exclude and recomputes overlapping subproblems; memoization caches each (i, w) decision and tabulation fills dp bottom-up, so each cell is solved once.',
  stateDefinition: 'dp[i][w] = true iff sum w can be made using some subset of the first i numbers (nums[0..i-1]), for 0 <= i <= n and 0 <= w <= target.',
  recurrence:
    'dp[0][0] = true; dp[0][w] = false for w > 0; dp[i][w] = dp[i-1][w] or (w >= nums[i-1] and dp[i-1][w - nums[i-1]]).',
  complexity: { time: 'O(n * target)', space: 'O(n * target)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'Numbers to split into two equal-sum subsets. Each number is used once.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 1,
      max: 11,
    },
  ],
  defaultInput: { nums: [1, 5, 11, 5] },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: PartitionEqualSubsetInput, mode: Mode): Step[] {
    const nums = normalizeInput(input);
    const total = nums.reduce((sum, value) => sum + value, 0);
    if (total % 2 === 1) return oddSteps(nums, total, Math.floor(total / 2));
    const target = total / 2;
    if (mode === 'bruteforce') return bruteForceSteps(nums, target);
    if (mode === 'memo') return iterativeSteps(nums, target, true);
    return iterativeSteps(nums, target, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'Can [1, 5, 11, 5] be partitioned into two equal-sum subsets?',
      options: ['true', 'false', '12', '0'],
      answer: 0,
      why: 'Total 22, so the target is 11. The subset 1 + 5 + 5 = 11 works, so the answer is true.',
    },
    {
      q: 'What happens when the total sum is odd?',
      options: ['Immediately false', 'The table still finds a split', 'Only true if one number is odd', 'Target rounds up to the nearest integer'],
      answer: 0,
      why: 'Both halves must sum to total / 2, which is not an integer when total is odd, so no such subset exists.',
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

export default partitionEqualSubsetModule;
