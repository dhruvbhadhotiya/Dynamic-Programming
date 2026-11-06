import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface TargetSumInput {
  nums: number[];
  target: number;
}

const MAX_ITEMS = 6;
const MIN_TARGET = -20;
const MAX_TARGET = 20;

const pythonCode = [
  'def count_ways(nums, target):',
  '    n = len(nums)',
  '    total = sum(nums)',
  '    needed = (total + target) // 2',
  '    if (total + target) % 2 != 0 or needed < 0 or needed > total: return 0',
  '    dp = [[0] * (needed + 1) for _ in range(n + 1)]',
  '    dp[0][0] = 1',
  '    for i in range(1, n + 1):',
  '        for w in range(needed + 1):',
  '            dp[i][w] = dp[i-1][w] + (dp[i-1][w - nums[i-1]] if w >= nums[i-1] else 0)',
  '    return dp[n][needed]',
].join('\n');

const javascriptCode = [
  'function countWays(nums, target) {',
  '  const n = nums.length;',
  '  const total = nums.reduce((a, b) => a + b, 0);',
  '  const needed = Math.floor((total + target) / 2);',
  '  if ((total + target) % 2 !== 0 || needed < 0 || needed > total) return 0;',
  '  const dp = Array.from({ length: n + 1 }, () => new Array(needed + 1).fill(0));',
  '  dp[0][0] = 1;',
  '  for (let i = 1; i <= n; i++)',
  '    for (let w = 0; w <= needed; w++)',
  '      dp[i][w] = dp[i - 1][w] + (w >= nums[i - 1] ? dp[i - 1][w - nums[i - 1]] : 0);',
  '  return dp[n][needed];',
  '}',
].join('\n');

const cppCode = [
  'int countWays(vector<int>& nums, int target) {',
  '  int n = nums.size();',
  '  int total = 0; for (int value : nums) total += value;',
  '  int needed = (total + target) / 2;',
  '  if ((total + target) % 2 != 0 || needed < 0 || needed > total) return 0;',
  '  vector<vector<int>> dp(n + 1, vector<int>(needed + 1, 0));',
  '  dp[0][0] = 1;',
  '  for (int i = 1; i <= n; i++)',
  '    for (int w = 0; w <= needed; w++)',
  '      dp[i][w] = dp[i-1][w] + (w >= nums[i-1] ? dp[i-1][w - nums[i-1]] : 0);',
  '  return dp[n][needed];',
  '}',
].join('\n');

function makeRecorder(nums: number[], needed: number): StepRecorder<Table2DState> {
  const n = nums.length;
  const rowLabels = ['0 items', ...nums.map((value, index) => `${index + 1}: ${value}`)];
  const colLabels = Array.from({ length: needed + 1 }, (_v, w) => String(w));
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D(n + 1, needed + 1, () => null),
      rowLabels,
      colLabels,
      rowHeader: 'items i',
      colHeader: 'sum w',
      caption: 'Target Sum table dp[i][w] = ways to make sum w with first i numbers',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table2DState>,
  n: number,
  needed: number,
  answer: number,
  extra: Record<string, string | number | boolean>,
): Step[] {
  rec.at(11).record(
    `The answer is ${answer}: ${answer} sign assignment(s) reach target with positive part ${needed}.`,
    {
      codeLine: 11,
      highlights: [{ pos: [n, needed], kind: 'result', label: 'answer' }],
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

function invalidSteps(nums: number[], target: number, total: number, needed: number): Step[] {
  const n = nums.length;
  const displayNeeded = clamp(needed, 0, total);
  const rec = makeRecorder(nums, displayNeeded);
  const reason =
    (total + target) % 2 !== 0
      ? `total + target = ${total + target} is odd, so (total + target) / 2 is not an integer and no subset sum can work`
      : needed < 0
        ? `needed = ${needed} is below 0, so target ${target} is below -total (${-total})`
        : `needed = ${needed} is above total ${total}, so target ${target} is above total`;
  rec.at(2).record(`Total is ${total}. Assign + or - so the signed sum is target ${target}; the positive part must satisfy P - N = target with P + N = ${total}.`, {
    codeLine: 2,
    highlights: [{ pos: [0, 0], kind: 'active' }],
    vars: { total, n, target, needed },
  });
  rec.at(4).record(`needed = (total + target) / 2 = (${total} + ${target}) / 2 = ${needed}. For a valid subset, needed must be an integer in 0..${total}.`, {
    codeLine: 4,
    highlights: [{ pos: [0, 0], kind: 'active' }],
    vars: { total, n, target, needed },
  });
  rec.at(5).record(`The guard fails: ${reason}. Return 0 immediately without building the table.`, {
    codeLine: 5,
    highlights: [],
    vars: { total, n, target, needed },
  });
  rec.at(11).record(`The answer is 0: ${reason}, so no sign assignment works.`, {
    codeLine: 11,
    vars: { answer: 0, total, n, target, needed },
  });
  return [...rec.steps];
}

function iterativeSteps(nums: number[], target: number, memo: boolean): Step[] {
  const n = nums.length;
  const total = nums.reduce((sum, value) => sum + value, 0);
  const needed = Math.floor((total + target) / 2);
  const valid = (total + target) % 2 === 0 && needed >= 0 && needed <= total;
  if (!valid) return invalidSteps(nums, target, total, needed);

  const rec = makeRecorder(nums, needed);
  const dp = create2D(n + 1, needed + 1, () => 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each (i, w) count once. Reuse cached dp[i-1][w] and dp[i-1][w-nums[i-1]] for each cell aiming at needed.'
        : 'Tabulation: build dp bottom-up from 0 items. Each (i, w) cell is final using only the row above.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n, target, needed, total },
    },
  );
  rec.at(3).record(`Total = sum(nums) = ${total}.`, {
    codeLine: 3,
    highlights: [{ pos: [0, 0], kind: 'active' }],
    vars: { computed: 0, reused: 0, n, target, needed, total },
  });
  rec.at(4).record(
    `needed = (total + target) / 2 = (${total} + ${target}) / 2 = ${needed}. We count subsets summing to ${needed}; each such subset is the positive (+) part.`,
    {
      codeLine: 4,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n, target, needed, total },
    },
  );
  rec.at(5).record(
    `Guard passes: (total + target) is even and needed ${needed} is in 0..${total}, so continue.`,
    {
      codeLine: 5,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n, target, needed, total },
    },
  );

  const base = dp[0];
  if (base !== undefined) base[0] = 1;
  rec.at(7).fill([0, 0], 1, 'Base case: with 0 items, sum 0 has 1 way (empty subset): dp[0][0] = 1.', {
    kind: 'base',
    codeLine: 7,
    vars: { computed: 1, reused: 0, n, target, needed, total },
  });
  computed = 1;

  for (let w = 1; w <= needed; w += 1) {
    const row = dp[0];
    if (row !== undefined) row[w] = 0;
    rec.at(7).fill([0, w], 0, `Base case: with 0 items, sum ${w} has 0 ways: dp[0][${w}] = 0.`, {
      kind: 'base',
      codeLine: 7,
      vars: { computed: computed + 1, reused: 0, w, n, target, needed, total },
    });
    computed += 1;
  }

  for (let i = 1; i <= n; i += 1) {
    const value = nums[i - 1] ?? 0;
    for (let w = 0; w <= needed; w += 1) {
      const skip = dp[i - 1]?.[w] ?? 0;
      const take = w >= value ? (dp[i - 1]?.[w - value] ?? 0) : 0;
      const result = skip + take;
      const row = dp[i];
      if (row !== undefined) row[w] = result;
      computed += 1;
      reused += 2;
      rec.at(10).fill(
        [i, w],
        result,
        memo
          ? `Cache hit for dp[${i}][${w}]: reuse dp[${i - 1}][${w}] = ${skip} and ${w >= value ? `dp[${i - 1}][${w - value}] = ${take}` : `w < ${value} so take is impossible`}; dp[${i}][${w}] = ${result}.`
          : `dp[${i}][${w}] = dp[${i - 1}][${w}] + (w >= ${value} ? dp[${i - 1}][${w - value}] : 0) = ${skip} + ${take} = ${result}.`,
        {
          codeLine: 10,
          highlights: dependencyHighlights(i, w, value),
          vars: { computed, reused, i, w, n, target, needed, total },
        },
      );
    }
  }

  return finish(rec, n, needed, dp[n]?.[needed] ?? 0, { computed, reused, target, needed, total });
}

function normalizeInput(input: TargetSumInput): { nums: number[]; target: number } {
  const rawNums = Array.isArray(input.nums) ? input.nums : [];
  const nums = rawNums
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 9) : 1));
  const safeNums = nums.length > 0 ? nums : [1];
  const rawTarget = typeof input.target === 'number' && Number.isFinite(input.target) ? input.target : 0;
  const target = clamp(Math.trunc(rawTarget), MIN_TARGET, MAX_TARGET);
  return { nums: safeNums, target };
}

const targetSumModule: ProblemModule<TargetSumInput> = {
  id: 'target-sum',
  title: 'Target Sum',
  category: 'knapsack',
  difficulty: 'medium',
  summary:
    'Count ways to assign + or - to each number so the signed sum is target. Let P be the sum of positives, N the abs sum of negatives: P - N = target and P + N = total, so P = (total + target) / 2. Counting subsets summing to P gives the answer; memoization caches each (i, w) count and tabulation fills dp bottom-up.',
  stateDefinition:
    'dp[i][w] = number of subsets of the first i numbers (nums[0..i-1]) summing to w, for 0 <= i <= n and 0 <= w <= needed where needed = (total + target) / 2.',
  recurrence:
    'dp[0][0] = 1; dp[0][w] = 0 for w > 0; dp[i][w] = dp[i-1][w] + (w >= nums[i-1] ? dp[i-1][w - nums[i-1]] : 0). Answer is dp[n][needed] if (total + target) is even and 0 <= needed <= total, else 0.',
  complexity: { time: 'O(n * needed)', space: 'O(n * needed)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'nums',
      label: 'nums',
      help: 'Numbers to assign + or - to. Each number is used once.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 1,
      max: 9,
    },
    {
      name: 'target',
      label: 'target',
      help: 'Signed sum to reach with + and - assignments.',
      type: 'number',
      min: MIN_TARGET,
      max: MAX_TARGET,
    },
  ],
  defaultInput: { nums: [1, 1, 1, 1, 1], target: 3 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: TargetSumInput, mode: Mode): Step[] {
    const { nums, target } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(nums, target, true);
    return iterativeSteps(nums, target, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'How many +/- assignments of [1, 1, 1, 1, 1] sum to 3?',
      options: ['5', '3', '0', '10'],
      answer: 0,
      why: 'Total 5, needed (5 + 3) / 2 = 4. Subsets of size 4 from 5 ones: C(5,4) = 5. Each subset is the positive part.',
    },
    {
      q: 'Why can no +/- assignment of [1] reach target 0?',
      options: [
        'total + target = 1 is odd, so needed is not an integer',
        'The table is empty',
        'Only even totals work',
        'nums must have at least 2 items',
      ],
      answer: 0,
      why: 'Needed (1 + 0) / 2 = 0.5 is not an integer, so no subset sum can satisfy P - N = 0 with P + N = 1; the answer is 0.',
    },
    {
      q: 'What does dp[i][w] count?',
      options: [
        'Number of subsets of the first i numbers summing to w',
        'Maximum sum using the first i numbers',
        'Whether w is reachable as a signed sum',
        'Number of sign assignments for first i numbers',
      ],
      answer: 0,
      why: 'Each cell counts subsets of the first i numbers with sum w; dp[n][needed] is the number of valid + sets, hence sign assignments.',
    },
    {
      q: 'How is needed derived from total and target?',
      options: ['needed = (total + target) / 2', 'needed = total - target', 'needed = target / 2', 'needed = total * target'],
      answer: 0,
      why: 'Let P be the positive sum and N total - P; P - N = target gives 2P = total + target, so P = (total + target) / 2.',
    },
  ],
};

export default targetSumModule;
