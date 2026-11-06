import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface UnboundedKnapsackInput {
  weights: number[];
  values: number[];
  capacity: number;
}

const MAX_ITEMS = 5;

const pythonCode = [
  'def knapsack(weights, values, capacity):',
  '    n = len(weights)',
  '    dp = [[0] * (capacity + 1) for _ in range(n + 1)]',
  '    for i in range(1, n + 1):',
  '        w = weights[i - 1]; v = values[i - 1]',
  '        for c in range(capacity + 1):',
  '            dp[i][c] = max(dp[i-1][c], dp[i][c-w] + v) if c >= w else dp[i-1][c]',
  '    return dp[n][capacity]',
].join('\n');

const javascriptCode = [
  'function knapsack(weights, values, capacity) {',
  '  const n = weights.length;',
  '  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));',
  '  for (let i = 1; i <= n; i++) {',
  '    const w = weights[i-1], v = values[i-1];',
  '    for (let c = 0; c <= capacity; c++)',
  '      dp[i][c] = c >= w ? Math.max(dp[i-1][c], dp[i][c-w] + v) : dp[i-1][c];',
  '  return dp[n][capacity];',
  '}',
].join('\n');

const cppCode = [
  'int knapsack(vector<int>& weights, vector<int>& values, int capacity) {',
  '  int n = weights.size();',
  '  vector<vector<int>> dp(n + 1, vector<int>(capacity + 1, 0));',
  '  for (int i = 1; i <= n; i++) {',
  '    int w = weights[i-1], v = values[i-1];',
  '    for (int c = 0; c <= capacity; c++)',
  '      dp[i][c] = c >= w ? max(dp[i-1][c], dp[i][c-w] + v) : dp[i-1][c];',
  '  return dp[n][capacity];',
  '}',
].join('\n');

function makeRecorder(n: number, capacity: number): StepRecorder<Table2DState> {
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: Array.from({ length: n + 1 }, () =>
        Array.from({ length: capacity + 1 }, () => null),
      ),
      rowLabels: Array.from({ length: n + 1 }, (_, i) => `i=${i}`),
      colLabels: Array.from({ length: capacity + 1 }, (_, c) => `${c}`),
      rowHeader: 'items',
      colHeader: 'capacity',
      caption: 'Unbounded Knapsack: dp[i][c] = best value with first i items (unlimited copies) and capacity c',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table2DState>,
  n: number,
  capacity: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(8).record(`The answer is ${answer}.`, {
    codeLine: 8,
    highlights: [{ pos: [n, capacity], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function bruteForceSteps(weights: number[], values: number[], capacity: number): Step[] {
  const n = weights.length;
  const rec = makeRecorder(n, capacity);
  let calls = 0;
  rec.at(1).record(
    `Brute force: at each item, try skipping it or taking it (and possibly taking it again). The same subproblems are recomputed again and again with no cache.`,
    {
      codeLine: 1,
      highlights: [{ pos: [n, capacity], kind: 'active', label: `dp[${n}][${capacity}]` }],
      vars: { calls: 0, n, capacity },
    },
  );

  const solve = (i: number, c: number): number => {
    calls += 1;
    if (i === 0) {
      rec.at(3).fill([0, c], 0, `Base case: no items, dp[0][${c}] = 0.`, {
        kind: 'base',
        codeLine: 3,
        vars: { calls, i, c },
      });
      return 0;
    }
    const w = weights[i - 1] ?? 1;
    const v = values[i - 1] ?? 1;
    if (c < w) {
      const skip = solve(i - 1, c);
      rec.at(7).fill(
        [i, c],
        skip,
        `Item ${i - 1} is too heavy (weight ${w} > capacity ${c}), so dp[${i}][${c}] = dp[${i - 1}][${c}] = ${skip}. Nothing was remembered.`,
        {
          codeLine: 7,
          highlights: [{ pos: [i - 1, c], kind: 'dependency', label: `dp[${i - 1}][${c}]` }],
          vars: { calls, i, c, w, v },
        },
      );
      return skip;
    }
    const skip = solve(i - 1, c);
    const take = solve(i, c - w) + v;
    const value = Math.max(skip, take);
    rec.at(7).fill(
      [i, c],
      value,
      `Recomputed dp[${i}][${c}] = max(dp[${i - 1}][${c}] = ${skip}, dp[${i}][${c - w}] + ${v} = ${take}) = ${value}. Taking again stays in row ${i}, so the same item can be reused. Nothing was remembered.`,
      {
        codeLine: 7,
        highlights: [
          { pos: [i - 1, c], kind: 'dependency', label: `dp[${i - 1}][${c}]` },
          { pos: [i, c - w], kind: 'dependency', label: `dp[${i}][${c - w}]` },
        ],
        vars: { calls, i, c, w, v },
      },
    );
    return value;
  };

  const answer = solve(n, capacity);
  return finish(rec, n, capacity, answer, { calls });
}

function iterativeSteps(
  weights: number[],
  values: number[],
  capacity: number,
  memo: boolean,
): Step[] {
  const n = weights.length;
  const rec = makeRecorder(n, capacity);
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(capacity + 1).fill(0),
  );
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each best value once. Reuse cached rows; within a row, dp[i][c-w] is already final, so the current item may be taken again.'
      : 'Tabulation: build dp bottom-up row by row. Within a row, capacities fill left to right so dp[i][c-w] is final and unlimited copies are allowed.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n, capacity },
    },
  );

  for (let c = 0; c <= capacity; c += 1) {
    const row0 = dp[0];
    if (row0 !== undefined) row0[c] = 0;
    rec.at(3).fill([0, c], 0, `Base case: no items, dp[0][${c}] = 0.`, {
      kind: 'base',
      codeLine: 3,
      vars: { computed: computed + 1, reused: 0, i: 0, c },
    });
    computed += 1;
  }

  for (let i = 1; i <= n; i += 1) {
    const w = weights[i - 1] ?? 1;
    const v = values[i - 1] ?? 1;
    rec.at(4).record(
      memo
        ? `Item ${i - 1}: weight ${w}, value ${v}. Cached row dp[${i - 1}][*] plus this row's earlier cells decide each capacity.`
        : `Item ${i - 1}: weight ${w}, value ${v}. Fill row dp[${i}] left to right from finished cells.`,
      {
        codeLine: 4,
        highlights: [{ pos: [i - 1, 0], kind: 'active' }],
        vars: { computed, reused, i, w, v },
      },
    );

    for (let c = 0; c <= capacity; c += 1) {
      if (c < w) {
        const row = dp[i];
        if (row !== undefined) row[c] = dp[i - 1]?.[c] ?? 0;
        computed += 1;
        reused += 1;
        rec.at(7).fill(
          [i, c],
          dp[i]?.[c] ?? 0,
          `Item ${i - 1} is too heavy (weight ${w} > capacity ${c}), so dp[${i}][${c}] = dp[${i - 1}][${c}] = ${dp[i]?.[c] ?? 0}.`,
          {
            codeLine: 7,
            highlights: [{ pos: [i - 1, c], kind: 'dependency', label: `dp[${i - 1}][${c}]` }],
            vars: { computed, reused, i, c, w, v },
          },
        );
      } else {
        const skip = dp[i - 1]?.[c] ?? 0;
        const take = (dp[i]?.[c - w] ?? 0) + v;
        const row = dp[i];
        if (row !== undefined) row[c] = Math.max(skip, take);
        computed += 1;
        reused += 2;
        rec.at(7).fill(
          [i, c],
          dp[i]?.[c] ?? 0,
          memo
            ? `Cache hit: reuse dp[${i - 1}][${c}] = ${skip} and dp[${i}][${c - w}] = ${dp[i]?.[c - w] ?? 0}; dp[${i}][${c}] = max(${skip}, ${take}) = ${dp[i]?.[c] ?? 0}. Same-row dp[${i}][${c - w}] allows reuse.`
            : `dp[${i}][${c}] = max(dp[${i - 1}][${c}] = ${skip}, dp[${i}][${c - w}] + ${v} = ${take}) = ${dp[i]?.[c] ?? 0}. ${take > skip ? 'Taking (again) wins.' : 'Skipping wins.'}`,
          {
            codeLine: 7,
            highlights: [
              { pos: [i - 1, c], kind: 'dependency', label: `dp[${i - 1}][${c}]` },
              { pos: [i, c - w], kind: 'dependency', label: `dp[${i}][${c - w}]` },
            ],
            vars: { computed, reused, i, c, w, v },
          },
        );
      }
    }
  }

  return finish(rec, n, capacity, dp[n]?.[capacity] ?? 0, { computed, reused });
}

function normalizeInput(input: UnboundedKnapsackInput): {
  weights: number[];
  values: number[];
  capacity: number;
} {
  const rawWeights = Array.isArray(input.weights) ? input.weights : [];
  const rawValues = Array.isArray(input.values) ? input.values : [];
  const weights = rawWeights
    .slice(0, MAX_ITEMS)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 8) : 1,
    );
  const values = rawValues
    .slice(0, MAX_ITEMS)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 15) : 1,
    );
  const count = Math.min(weights.length, values.length);
  const capacity =
    typeof input.capacity === 'number' && Number.isFinite(input.capacity)
      ? clamp(Math.trunc(input.capacity), 1, 12)
      : 1;
  return { weights: weights.slice(0, count), values: values.slice(0, count), capacity };
}

const unboundedKnapsackModule: ProblemModule<UnboundedKnapsackInput> = {
  id: 'unbounded-knapsack',
  title: 'Unbounded Knapsack',
  category: 'knapsack',
  difficulty: 'medium',
  summary:
    'Each item type can be taken any number of times so total weight fits the capacity and total value is maximum. Brute force tries skip-or-take-with-reuse and recomputes overlapping subproblems; memoization caches them and tabulation fills dp bottom-up.',
  stateDefinition:
    'dp[i][c] = maximum value using the first i item types (items 0..i-1, each unlimited) with capacity c, for 0 <= i <= n and 0 <= c <= capacity.',
  recurrence:
    'dp[0][c] = 0; dp[i][c] = dp[i-1][c] if weights[i-1] > c, else max(dp[i-1][c], dp[i][c - weights[i-1]] + values[i-1]).',
  complexity: { time: 'O(n × capacity)', space: 'O(n × capacity)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'weights',
      label: 'weights',
      help: 'Weight of each item type. Each type can be taken any number of times.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 1,
      max: 8,
    },
    {
      name: 'values',
      label: 'values',
      help: 'Value of each item type. values[i] pairs with weights[i].',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 1,
      max: 15,
    },
    {
      name: 'capacity',
      label: 'capacity',
      help: 'Maximum total weight the knapsack can hold.',
      type: 'number',
      min: 1,
      max: 12,
    },
  ],
  defaultInput: { weights: [2, 3, 4], values: [3, 4, 5], capacity: 8 },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: UnboundedKnapsackInput, mode: Mode): Step[] {
    const { weights, values, capacity } = normalizeInput(input);
    if (mode === 'bruteforce') return bruteForceSteps(weights, values, capacity);
    if (mode === 'memo') return iterativeSteps(weights, values, capacity, true);
    return iterativeSteps(weights, values, capacity, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the best value for weights [2, 3, 4] and values [3, 4, 5] with capacity 8?',
      options: ['12', '10', '13', '11'],
      answer: 0,
      why: 'Take the weight-2 item four times: total weight 8 fits exactly, total value 4 × 3 = 12, better than any other combination.',
    },
    {
      q: 'When item i-1 fits (weight w <= c), what is dp[i][c]?',
      options: [
        'dp[i-1][c-w] + v only',
        'max(dp[i-1][c], dp[i][c-w] + v)',
        'dp[i-1][c] + v',
        'max(dp[i][c-w] + v, v)',
      ],
      answer: 1,
      why: 'Either skip this item type and keep dp[i-1][c], or take one copy and add its value v to dp[i][c-w], the best using the first i types (including more copies of this one) with the remaining capacity.',
    },
    {
      q: 'Why does taking item i-1 use dp[i][c-w] instead of dp[i-1][c-w]?',
      options: [
        'Rows fill top to bottom, so row i-1 is already final',
        'Using the same row allows taking the same item again',
        'It makes no difference',
        'It is faster',
      ],
      answer: 1,
      why: 'Reading from row i permits unlimited copies of item i-1; reading only from row i-1 would limit it to a single copy, which is the 0/1 rule.',
    },
    {
      q: 'How do memoization/tabulation compare to brute force?',
      options: ['O(n × capacity) vs O(2^n)', 'O(n) vs O(2^n)', 'The same', 'O(n × capacity) vs O(n)'],
      answer: 0,
      why: 'Memoization/tabulation solve each of the n × capacity subproblems once; brute force explores exponentially many skip-or-take-with-reuse trees.',
    },
  ],
};

export default unboundedKnapsackModule;
