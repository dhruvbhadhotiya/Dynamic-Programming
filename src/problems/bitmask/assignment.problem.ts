import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { BitmaskGridState, Mode, ProblemModule, Step } from '../../engine/types';

export interface AssignmentInput {
  cost: number[][];
}

const MIN_SIZE = 2;
const MAX_SIZE = 4;

const pythonCode = [
  'def assignment(cost):',
  '    n = len(cost); dp = [float("inf")] * (1 << n); dp[0] = 0',
  '    for mask in range(1, 1 << n):',
  '        worker = bin(mask).count("1") - 1',
  '        for job in range(n):',
  '            if mask & (1 << job): dp[mask] = min(dp[mask], dp[mask ^ (1 << job)] + cost[worker][job])',
  '    return dp[(1 << n) - 1]',
].join('\n');

const javascriptCode = [
  'function assignment(cost) {',
  '  const n = cost.length, dp = new Array(1 << n).fill(Infinity); dp[0] = 0;',
  '  for (let mask = 1; mask < 1 << n; mask++) {',
  '    const worker = mask.toString(2).split("1").length - 2;',
  '    for (let job = 0; job < n; job++)',
  '      if (mask & (1 << job)) dp[mask] = Math.min(dp[mask], dp[mask ^ (1 << job)] + cost[worker][job]);',
  '  }',
  '  return dp[(1 << n) - 1];',
  '}',
].join('\n');

const cppCode = [
  'int assignment(vector<vector<int>>& cost) {',
  '  int n = cost.size(), full = (1 << n) - 1; vector<int> dp(1 << n, 1e9); dp[0] = 0;',
  '  for (int mask = 1; mask <= full; mask++) {',
  '    int worker = __builtin_popcount(mask) - 1;',
  '    for (int job = 0; job < n; job++)',
  '      if (mask & (1 << job)) dp[mask] = min(dp[mask], dp[mask ^ (1 << job)] + cost[worker][job]);',
  '  }',
  '  return dp[full];',
  '}',
].join('\n');

const FALLBACK: number[][] = [
  [4, 1, 3],
  [2, 0, 5],
  [3, 2, 2],
];

function popcount(mask: number): number {
  let count = 0;
  let value = mask;
  while (value > 0) {
    count += value & 1;
    value >>>= 1;
  }
  return count;
}

function normalizeInput(input: AssignmentInput): number[][] {
  const rawRows = Array.isArray(input.cost) ? input.cost : [];
  const width = rawRows[0]?.length ?? 0;
  const square =
    rawRows.length >= MIN_SIZE &&
    width >= MIN_SIZE &&
    rawRows.every((row) => Array.isArray(row) && row.length === width);

  if (!square) return FALLBACK.map((row) => [...row]);

  const n = clamp(Math.min(rawRows.length, width), MIN_SIZE, MAX_SIZE);
  return create2D(n, n, (row, col) => {
    const value = rawRows[row]?.[col];
    return typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, 99) : 0;
  });
}

function makeRecorder(n: number): StepRecorder<BitmaskGridState> {
  return new StepRecorder<BitmaskGridState>(
    {
      kind: 'bitmaskGrid',
      bits: n,
      values: Array.from({ length: 1 << n }, () => null),
      labels: Array.from({ length: 1 << n }, (_value, mask) =>
        mask === 0 ? 'no jobs assigned' : `assign worker ${popcount(mask) - 1}`,
      ),
      caption: `Assignment: dp[mask] = minimum cost to assign the first ${n} workers using exactly the jobs in mask`,
    },
    { codeLine: 1 },
  );
}

function assignmentSteps(cost: number[][], memo: boolean): Step[] {
  const n = cost.length;
  const full = (1 << n) - 1;
  const rec = makeRecorder(n);
  const dp: Array<number | null> = Array.from({ length: 1 << n }, () => null);
  let transitions = 0;

  rec.at(1).record(
    memo
      ? `Memoization: dp[mask] is the cheapest way to fill exactly the jobs in mask with the first popcount(mask) workers. Cache every mask and reuse smaller masks instead of recomputing assignments.`
      : `Tabulation: dp[mask] is the cheapest way to fill exactly the jobs in mask with the first popcount(mask) workers. Process masks by population count so every submask is already final.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'start' }],
      vars: { workers: n, masks: 1 << n, transitions: 0 },
    },
  );

  dp[0] = 0;
  rec.at(2).fill([0], 0, `Base case: with no jobs assigned, the cost is 0, so dp[0] = 0.`, {
    kind: 'base',
    codeLine: 2,
    vars: { mask: 0, cost: 0, transitions: 0 },
  });

  for (let mask = 1; mask <= full; mask += 1) {
    const worker = popcount(mask) - 1;
    let best = Number.POSITIVE_INFINITY;
    let bestJob = -1;

    for (let job = 0; job < n; job += 1) {
      if ((mask & (1 << job)) === 0) continue;
      const previousMask = mask ^ (1 << job);
      const before = dp[previousMask];
      if (before === null || before === undefined) continue;
      const price = cost[worker]?.[job] ?? 0;
      const candidate = before + price;
      transitions += 1;
      if (candidate < best) {
        best = candidate;
        bestJob = job;
      }
      rec.at(6).record(
        `Give job ${job} to worker ${worker}: remove it from the mask, so dp[${previousMask}] = ${before}; add cost ${price}, giving ${candidate}.`,
        {
          codeLine: 6,
          highlights: [
            { pos: [mask], kind: 'active', label: 'current mask' },
            { pos: [previousMask], kind: 'dependency', label: 'without this job' },
          ],
          vars: { mask, worker, job, before, price, candidate, transitions },
        },
      );
    }

    dp[mask] = best;
    rec.at(6).fill(
      [mask],
      best,
      `${memo ? 'Cache' : 'Store'} dp[${mask}] = ${best}: worker ${worker} takes job ${bestJob}, and the previous mask already covers the earlier workers.`,
      {
        kind: 'result',
        codeLine: 6,
        highlights: [{ pos: [mask ^ (1 << Math.max(bestJob, 0))], kind: 'dependency', label: 'previous mask' }],
        vars: { mask, worker, bestJob, best, transitions },
      },
    );
  }

  const answer = dp[full] ?? 0;
  rec.at(7).record(
    `The answer is ${answer} — every job is assigned exactly once and every worker has exactly one job.`,
    {
      codeLine: 7,
      highlights: [{ pos: [full], kind: 'result', label: 'answer' }],
      vars: { answer, full, transitions },
    },
  );

  return [...rec.steps];
}

const assignmentModule: ProblemModule<AssignmentInput> = {
  id: 'assignment',
  title: 'Assignment Problem',
  category: 'bitmask',
  difficulty: 'hard',
  summary:
    'Assign every worker to exactly one job, minimising total cost. The mask records which jobs are already taken; its population count tells you which worker is next, so the two-dimensional assignment table collapses to one bitmask row.',
  stateDefinition:
    'dp[mask] = minimum cost to assign the jobs in mask to the first popcount(mask) workers. Worker index = popcount(mask) - 1 when adding a job.',
  recurrence:
    'dp[0] = 0; dp[mask] = min over job j in mask of dp[mask without j] + cost[popcount(mask)-1][j]. Answer = dp[(1<<n)-1].',
  complexity: { time: 'O(2^n * n)', space: 'O(2^n)' },
  renderer: 'bitmaskGrid',
  inputSchema: [
    {
      name: 'cost',
      label: 'cost matrix',
      help: 'Square matrix: row = worker, column = job. Two to four workers keeps all masks visible.',
      type: 'matrix',
      minRows: MIN_SIZE,
      maxRows: MAX_SIZE,
      maxCols: MAX_SIZE,
      min: 0,
      max: 99,
      numeric: true,
    },
  ],
  defaultInput: { cost: FALLBACK },
  modes: ['memo', 'tabulation'],
  generateSteps(input: AssignmentInput, mode: Mode): Step[] {
    return assignmentSteps(normalizeInput(input), mode === 'memo');
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'Using the default cost matrix, what is the minimum total assignment cost?',
      options: ['5', '6', '7', '4'],
      answer: 0,
      why: 'Worker 0 takes job 1 (1), worker 1 takes job 0 (2), worker 2 takes job 2 (2): 1 + 2 + 2 = 5.',
    },
    {
      q: 'What does dp[mask] represent?',
      options: [
        'Minimum cost to assign the jobs in mask to the first popcount(mask) workers',
        'Minimum cost to assign mask workers to all jobs',
        'The number of valid assignments for mask',
        'The cost of the last job in mask',
      ],
      answer: 0,
      why: 'The mask lists occupied jobs; because workers are processed in order, its size determines which worker is being assigned next.',
    },
    {
      q: 'Why is the next worker index popcount(mask) - 1 when adding job j?',
      options: [
        'The previous mask already assigned popcount(mask)-1 workers',
        'Because job j is always worker j',
        'Because masks count from 1',
        'Because the diagonal is ignored',
      ],
      answer: 0,
      why: 'If mask has p jobs before adding j, the first p workers are already assigned; the new job goes to worker p (zero-based).',
    },
    {
      q: 'What are the time and space complexities for n workers?',
      options: ['O(2^n * n) time, O(2^n) space', 'O(n²) time, O(n²) space', 'O(2^n) time, O(2^n * n) space', 'O(n!) time, O(2^n) space'],
      answer: 0,
      why: 'There are 2^n masks, each tries up to n jobs; only one value is stored per mask.',
    },
  ],
  relatedIds: ['tsp', 'shortest-path-all-nodes', 'subset-sum'],
  lessonId: 'bitmask',
};

export default assignmentModule;
