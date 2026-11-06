import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface MinCostClimbingStairsInput {
  cost: number[];
}

const MAX_ITEMS = 8;
const MIN_ITEMS = 2;
const MIN_COST = 1;
const MAX_COST = 20;

const pythonCode = [
  'def min_cost(cost):',
  '    n = len(cost)',
  '    dp = [0] * (n + 1)',
  '    dp[0] = cost[0]',
  '    if n >= 2: dp[1] = cost[1]',
  '    for i in range(2, n + 1):',
  '        dp[i] = min(dp[i - 1], dp[i - 2]) + (cost[i] if i < n else 0)',
  '    return dp[n]',
].join('\n');

const javascriptCode = [
  'function minCost(cost) {',
  '  const n = cost.length;',
  '  const dp = new Array(n + 1).fill(0);',
  '  dp[0] = cost[0];',
  '  if (n >= 2) dp[1] = cost[1];',
  '  for (let i = 2; i <= n; i++)',
  '    dp[i] = Math.min(dp[i - 1], dp[i - 2]) + (i < n ? cost[i] : 0);',
  '  return dp[n];',
  '}',
].join('\n');

const cppCode = [
  'int minCost(vector<int> cost) {',
  '  int n = cost.size();',
  '  vector<int> dp(n + 1, 0);',
  '  dp[0] = cost[0];',
  '  if (n >= 2) dp[1] = cost[1];',
  '  for (int i = 2; i <= n; i++)',
  '    dp[i] = min(dp[i-1], dp[i-2]) + (i < n ? cost[i] : 0);',
  '  return dp[n];',
  '}',
].join('\n');

function costAt(cost: number[], i: number): number {
  return i < cost.length ? cost[i] ?? 0 : 0;
}

function makeRecorder(cost: number[]): StepRecorder<Table1DState> {
  const n = cost.length;
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n + 1 }, () => null),
      labels: Array.from({ length: n + 1 }, (_value, index) => (index === n ? 'top' : `stair ${index}`)),
      indexName: 'i',
      caption: 'Min-cost table dp[i] = cheapest cost to reach stair i',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  cost: number[],
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  const n = cost.length;
  rec.at(8).record(`The answer is the min cost to reach the top = ${answer}.`, {
    codeLine: 8,
    highlights: [{ pos: [n], kind: 'result', label: 'answer' }],
    vars: { answer, n, ...extra },
  });
  return [...rec.steps];
}

function dependencyHighlights(i: number): Highlight[] {
  return [
    { pos: [i - 1], kind: 'dependency', label: `dp[${i - 1}]` },
    { pos: [i - 2], kind: 'dependency', label: `dp[${i - 2}]` },
  ];
}

function bruteForceSteps(cost: number[]): Step[] {
  const n = cost.length;
  const rec = makeRecorder(cost);
  let calls = 0;
  rec.at(1).record(
    `Brute force: try every 1-step and 2-step choice from the top backwards, with no cache. Overlapping subproblems will be recomputed.`,
    {
      codeLine: 1,
      highlights: [{ pos: [n], kind: 'active', label: 'top' }],
      vars: { n, calls: 0 },
    },
  );

  const solve = (i: number): number => {
    calls += 1;
    if (i === 0 || i === 1) {
      rec.at(i === 0 ? 4 : 5).fill([i], costAt(cost, i), `Base case: reaching stair ${i} costs cost[${i}] = ${costAt(cost, i)}.`, {
        kind: 'base',
        codeLine: i === 0 ? 4 : 5,
        vars: { n, calls, i },
      });
      return costAt(cost, i);
    }
    const fromLeft = solve(i - 1);
    const fromRight = solve(i - 2);
    const value = Math.min(fromLeft, fromRight) + costAt(cost, i);
    rec.at(7).fill(
      [i],
      value,
      `Recomputed dp[${i}] = min(dp[${i - 1}], dp[${i - 2}]) + ${i < n ? `cost[${i}]` : '0'} = min(${fromLeft}, ${fromRight}) + ${costAt(cost, i)} = ${value}. Nothing was remembered.`,
      {
        codeLine: 7,
        highlights: dependencyHighlights(i),
        vars: { n, calls, i },
      },
    );
    return value;
  };

  const answer = solve(n);
  return finish(rec, cost, answer, { calls });
}

function iterativeSteps(cost: number[], memo: boolean): Step[] {
  const n = cost.length;
  const rec = makeRecorder(cost);
  const dp: number[] = Array.from({ length: n + 1 }, () => 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? `Memoization: cache each dp[i] once. Look up cached dp[i-1] and dp[i-2] to build the cheapest cost to each stair.`
      : `Tabulation: build the table bottom-up from the first two stairs. Cheaper routes are final before larger stairs.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { n, computed: 0, reused: 0 },
    },
  );

  dp[0] = costAt(cost, 0);
  rec.at(4).fill([0], dp[0] ?? 0, `Start on stair 0: dp[0] = cost[0] = ${dp[0] ?? 0}.`, {
    kind: 'base',
    codeLine: 4,
    vars: { n, computed: 1, reused: 0 },
  });
  computed = 1;

  dp[1] = costAt(cost, 1);
  rec.at(5).fill([1], dp[1] ?? 0, `Start on stair 1: dp[1] = cost[1] = ${dp[1] ?? 0}.`, {
    kind: 'base',
    codeLine: 5,
    vars: { n, computed: 2, reused: 0 },
  });
  computed = 2;

  for (let i = 2; i <= n; i += 1) {
    const left = dp[i - 1] ?? 0;
    const right = dp[i - 2] ?? 0;
    dp[i] = Math.min(left, right) + costAt(cost, i);
    computed += 1;
    reused += 2;
    rec.at(7).fill(
      [i],
      dp[i] ?? 0,
      memo
        ? `Cache hit: reuse dp[${i - 1}] = ${left} and dp[${i - 2}] = ${right}; ${i < n ? `dp[${i}] = min(${left}, ${right}) + cost[${i}] = ${dp[i] ?? 0}` : `dp[${i}] = min(${left}, ${right}) = ${dp[i] ?? 0} (the top is free)`}.`
        : `dp[${i}] = min(dp[${i - 1}], dp[${i - 2}]) + ${i < n ? `cost[${i}]` : '0'} = min(${left}, ${right}) + ${costAt(cost, i)} = ${dp[i] ?? 0}. Both predecessors are already final.`,
      {
        codeLine: 7,
        highlights: dependencyHighlights(i),
        vars: { n, computed, reused, i },
      },
    );
  }

  return finish(rec, cost, dp[n] ?? 0, { computed, reused });
}

function normalizeInput(input: MinCostClimbingStairsInput): number[] {
  const raw = Array.isArray(input?.cost) ? input.cost : [];
  const cleaned = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), MIN_COST, MAX_COST) : MIN_COST));
  while (cleaned.length < MIN_ITEMS) cleaned.push(MIN_COST);
  return cleaned;
}

const minCostClimbingStairsModule: ProblemModule<MinCostClimbingStairsInput> = {
  id: 'min-cost-climbing-stairs',
  title: 'Min Cost Climbing Stairs',
  category: '1d',
  difficulty: 'easy',
  summary:
    'Reach the top paying the cost of each stair you land on, climbing 1 or 2 stairs at a time. Brute force retries both options at every stair; memoization caches each cheapest cost and tabulation fills the table bottom-up, so each stair is settled once.',
  stateDefinition: 'dp[i] = minimum total cost to reach stair i, for 0 <= i <= n; i = n is the top, whose cost is 0.',
  recurrence: 'dp[0] = cost[0]; dp[1] = cost[1]; dp[i] = min(dp[i-1], dp[i-2]) + cost[i] for 2 <= i <= n, with cost[n] = 0.',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'cost',
      label: 'cost',
      help: 'Cost to land on each stair. The top beyond the last stair is free.',
      type: 'array',
      itemType: 'number',
      minItems: MIN_ITEMS,
      maxItems: MAX_ITEMS,
      min: MIN_COST,
      max: MAX_COST,
    },
  ],
  defaultInput: { cost: [10, 15, 20] },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: MinCostClimbingStairsInput, mode: Mode): Step[] {
    const cost = normalizeInput(input);
    if (mode === 'bruteforce') return bruteForceSteps(cost);
    if (mode === 'memo') return iterativeSteps(cost, true);
    return iterativeSteps(cost, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the min cost for cost = [10, 15, 20]?',
      options: ['15', '10', '25', '30'],
      answer: 0,
      why: 'Land on stair 1 (15), then climb 2 to the top: total 15, cheaper than any path through stair 2.',
    },
    {
      q: 'What is the min cost for cost = [10, 15]?',
      options: ['25', '10', '15', '0'],
      answer: 1,
      why: 'Land on stair 0 (10) and climb 2 to the top, total 10. Landing on stair 1 would cost 15.',
    },
    {
      q: 'What is the recurrence for dp[i] (2 <= i <= n)?',
      options: [
        'dp[i] = min(dp[i-1], dp[i-2]) + cost[i]',
        'dp[i] = dp[i-1] + cost[i]',
        'dp[i] = max(dp[i-1], dp[i-2]) + cost[i]',
        'dp[i] = dp[i-1] + dp[i-2]',
      ],
      answer: 0,
      why: 'You arrive at stair i from i-1 or i-2, keep the cheaper total, then pay cost[i] to land on i (top costs 0).',
    },
    {
      q: 'How do memoization/tabulation compare to brute force here?',
      options: ['O(n) vs exponential', 'O(n^2) vs O(n)', 'The same', 'O(1) vs O(n)'],
      answer: 0,
      why: 'Each dp[i] is settled once in O(n); brute force re-solves overlapping stairs, giving exponential time.',
    },
  ],
};

export default minCostClimbingStairsModule;
