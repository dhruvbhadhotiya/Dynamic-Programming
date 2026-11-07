import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface TspInput {
  dist: number[][];
}

const MIN_CITIES = 2;
const MAX_CITIES = 4;

const pythonCode = [
  'def tsp(dist):',
  '    n = len(dist); full = (1 << n) - 1; dp = [[float("inf")] * n for _ in range(1 << n)]; dp[1][0] = 0',
  '    for mask in range(1, 1 << n):',
  '        for last in range(n):',
  '            for nxt in range(n):',
  '                if mask & (1 << last) and not mask & (1 << nxt): dp[mask | (1 << nxt)][nxt] = min(dp[mask | (1 << nxt)][nxt], dp[mask][last] + dist[last][nxt])',
  '    return min(dp[full][last] + dist[last][0] for last in range(1, n))',
].join('\n');

const javascriptCode = [
  'function tsp(dist) {',
  '  const n = dist.length, full = (1 << n) - 1, dp = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));',
  '  dp[1][0] = 0;',
  '  for (let mask = 1; mask < 1 << n; mask++) for (let last = 0; last < n; last++)',
  '    for (let nxt = 0; nxt < n; nxt++)',
  '      if ((mask & (1 << last)) && !(mask & (1 << nxt))) dp[mask | (1 << nxt)][nxt] = Math.min(dp[mask | (1 << nxt)][nxt], dp[mask][last] + dist[last][nxt]);',
  '  return Math.min(...Array.from({ length: n - 1 }, (_, i) => dp[full][i + 1] + dist[i + 1][0]));',
  '}',
].join('\n');

const cppCode = [
  'int tsp(vector<vector<int>>& dist) {',
  '  int n = dist.size(), full = (1 << n) - 1; vector<vector<int>> dp(1 << n, vector<int>(n, 1e9)); dp[1][0] = 0;',
  '  for (int mask = 1; mask <= full; mask++) for (int last = 0; last < n; last++)',
  '    for (int nxt = 0; nxt < n; nxt++)',
  '      if (mask & (1 << last) && !(mask & (1 << nxt)))',
  '        dp[mask | (1 << nxt)][nxt] = min(dp[mask | (1 << nxt)][nxt], dp[mask][last] + dist[last][nxt]);',
  '  int best = 1e9; for (int last = 1; last < n; last++) best = min(best, dp[full][last] + dist[last][0]);',
  '  return best;',
  '}',
].join('\n');

const FALLBACK: number[][] = [
  [0, 1, 15, 6],
  [1, 0, 7, 12],
  [15, 7, 0, 3],
  [6, 12, 3, 0],
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

function normalizeInput(input: TspInput): number[][] {
  const rawRows = Array.isArray(input.dist) ? input.dist : [];
  const width = rawRows[0]?.length ?? 0;
  const square =
    rawRows.length >= MIN_CITIES &&
    width >= MIN_CITIES &&
    rawRows.every((row) => Array.isArray(row) && row.length === width);

  if (!square) return FALLBACK.map((row) => [...row]);

  const n = clamp(Math.min(rawRows.length, width), MIN_CITIES, MAX_CITIES);
  const dist = create2D(n, n, (row, col) => {
    if (row === col) return 0;
    const value = rawRows[row]?.[col];
    return typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 99) : 1;
  });
  return dist;
}

function makeRecorder(n: number): StepRecorder<Table2DState> {
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D<number | null>(1 << n, n, () => null),
      rowLabels: Array.from({ length: 1 << n }, (_value, mask) =>
        `mask ${mask.toString(2).padStart(n, '0')}`,
      ),
      colLabels: Array.from({ length: n }, (_value, city) => `city ${city}`),
      rowHeader: 'visited set',
      colHeader: 'last city',
      caption: `Held-Karp: dp[mask][last] = cheapest path starting at city 0, visiting exactly mask, and ending at last`,
    },
    { codeLine: 1 },
  );
}

function heldKarpSteps(dist: number[][], memo: boolean): Step[] {
  const n = dist.length;
  const full = (1 << n) - 1;
  const rec = makeRecorder(n);
  const dp = create2D<number | null>(1 << n, n, () => null);
  let transitions = 0;

  rec.at(1).record(
    memo
      ? `Memoization: solve(mask, last) is the cheapest path from city 0 that visits exactly the cities in mask and ends at last. Cache each state, then build masks from small to large so every subproblem is reused.`
      : `Tabulation: dp[mask][last] is the cheapest path from city 0 that visits exactly the cities in mask and ends at last. Filling masks in increasing order guarantees every smaller mask is final.`,
    {
      codeLine: 1,
      highlights: [{ pos: [1, 0], kind: 'active', label: 'start' }],
      vars: { cities: n, masks: 1 << n, transitions: 0 },
    },
  );

  const startRow = dp[1];
  if (startRow) startRow[0] = 0;
  rec.at(2).fill(
    [1, 0],
    0,
    `Base case: mask ${(1).toString(2).padStart(n, '0')} contains only city 0, so dp[1][0] = 0.`,
    { kind: 'base', codeLine: 2, vars: { mask: 1, last: 0, cost: 0, transitions: 0 } },
  );

  for (let last = 1; last < n; last += 1) {
    const mask = 1 | (1 << last);
    const cost = dist[0]?.[last] ?? 0;
    const row = dp[mask];
    if (row) row[last] = cost;
    rec.at(3).fill(
      [mask, last],
      cost,
      `Two-city path: 0 -> ${last} costs ${cost}, so dp[${mask}][${last}] = ${cost}. It is a direct edge, not yet a full tour.`,
      {
        kind: 'base',
        codeLine: 3,
        highlights: [{ pos: [1, 0], kind: 'dependency', label: 'start city' }],
        vars: { mask, last, cost, transitions: 0 },
      },
    );
  }

  for (let mask = 1; mask <= full; mask += 1) {
    if ((mask & 1) === 0 || popcount(mask) < 3) continue;

    for (let last = 1; last < n; last += 1) {
      if ((mask & (1 << last)) === 0) continue;
      const previousMask = mask ^ (1 << last);
      let best = Number.POSITIVE_INFINITY;
      let bestPrev = -1;

      for (let prev = 0; prev < n; prev += 1) {
        if (prev === last || (previousMask & (1 << prev)) === 0) continue;
        const before = dp[previousMask]?.[prev];
        if (before === null || before === undefined) continue;
        const edge = dist[prev]?.[last] ?? 0;
        const candidate = before + edge;
        transitions += 1;
        if (candidate < best) {
          best = candidate;
          bestPrev = prev;
        }
        rec.at(6).record(
          `dp[${previousMask}][${prev}] = ${before}; add edge ${prev} -> ${last} of ${edge}, giving ${candidate} for dp[${mask}][${last}].`,
          {
            codeLine: 6,
            highlights: [
              { pos: [mask, last], kind: 'active', label: 'current state' },
              { pos: [previousMask, prev], kind: 'dependency', label: 'previous city' },
            ],
            vars: { mask, last, prev, before, edge, candidate, transitions },
          },
        );
      }

      const row = dp[mask];
      if (row) row[last] = best;
      rec.at(6).fill(
        [mask, last],
        best,
        `${memo ? 'Cache' : 'Store'} dp[${mask}][${last}] = ${best}: the best previous city is ${bestPrev}.`,
        {
          kind: 'result',
          codeLine: 6,
          highlights: [{ pos: [previousMask, bestPrev], kind: 'dependency', label: 'best predecessor' }],
          vars: { mask, last, best, bestPrev, transitions },
        },
      );
    }
  }

  let answer = Number.POSITIVE_INFINITY;
  let bestLast = 1;

  for (let last = 1; last < n; last += 1) {
    const before = dp[full]?.[last];
    if (before === null || before === undefined) continue;
    const back = dist[last]?.[0] ?? 0;
    const tour = before + back;
    if (tour < answer) {
      answer = tour;
      bestLast = last;
    }
    rec.at(7).record(
      `Close the tour at city ${last}: dp[${full}][${last}] = ${before}, plus the return edge ${last} -> 0 of ${back}, gives ${tour}.`,
      {
        codeLine: 7,
        highlights: [
          { pos: [full, last], kind: 'active', label: 'last city' },
          { pos: [1, 0], kind: 'dependency', label: 'return to start' },
        ],
        vars: { full, last, before, back, tour },
      },
    );
  }

  rec.at(7).record(
    `The answer is ${answer} — close the best full-mask path at city ${bestLast} and return to city 0.`,
    {
      codeLine: 7,
      highlights: [{ pos: [full, bestLast], kind: 'result', label: 'answer' }],
      vars: { answer, bestLast, transitions },
    },
  );

  return [...rec.steps];
}

const tspModule: ProblemModule<TspInput> = {
  id: 'tsp',
  title: 'Travelling Salesman (Held-Karp)',
  category: 'bitmask',
  difficulty: 'hard',
  summary:
    'Find the cheapest tour that visits every city once and returns to the start. The state packs the visited cities into a bitmask and remembers the last city; each new city flips one unset bit. Fixing city 0 as the start removes rotational duplicates.',
  stateDefinition:
    'dp[mask][last] = minimum cost of a path that starts at city 0, visits exactly the cities set in mask, and ends at last. City 0 is always in mask.',
  recurrence:
    'dp[1][0] = 0; dp[(1<<last)|1][last] = dist[0][last]; for larger masks, dp[mask][last] = min over prev in mask-{last} of dp[mask without last][prev] + dist[prev][last]. Answer = min over last != 0 of dp[full][last] + dist[last][0].',
  complexity: { time: 'O(2^n * n²)', space: 'O(2^n * n)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'dist',
      label: 'distance matrix',
      help: 'Square matrix of directed city-to-city costs. Diagonal entries are forced to 0. Two to four cities keeps the mask table readable.',
      type: 'matrix',
      minRows: MIN_CITIES,
      maxRows: MAX_CITIES,
      maxCols: MAX_CITIES,
      min: 0,
      max: 99,
      numeric: true,
    },
  ],
  defaultInput: { dist: FALLBACK },
  modes: ['memo', 'tabulation'],
  generateSteps(input: TspInput, mode: Mode): Step[] {
    return heldKarpSteps(normalizeInput(input), mode === 'memo');
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'Using the default symmetric matrix, what is the cheapest tour starting and ending at city 0?',
      options: ['17', '15', '21', '18'],
      answer: 0,
      why: '0 -> 1 -> 2 -> 3 -> 0 costs 1 + 7 + 3 + 6 = 17, and 0 -> 3 -> 2 -> 1 -> 0 also costs 17.',
    },
    {
      q: 'What does dp[mask][last] represent?',
      options: [
        'Cheapest path from city 0 visiting exactly mask and ending at last',
        'Cheapest path visiting only the last city in mask',
        'The number of tours through mask',
        'The shortest edge from city 0 to last',
      ],
      answer: 0,
      why: 'The mask records which cities have been visited; last records where the path currently ends so the next edge can be added.',
    },
    {
      q: 'Why is city 0 fixed as the starting city?',
      options: [
        'Every tour can be rotated to start at 0, so this removes duplicate rotations',
        'City 0 always has the cheapest outgoing edge',
        'Because masks cannot store city 0',
        'It makes the graph undirected',
      ],
      answer: 0,
      why: 'A closed tour has no distinguished start. Fixing 0 avoids counting the same cycle n times and reduces the state space.',
    },
    {
      q: 'What are the time and space complexities for n cities?',
      options: ['O(2^n * n²) time, O(2^n * n) space', 'O(n²) time, O(n²) space', 'O(2^n) time, O(2^n) space', 'O(n!) time, O(n) space'],
      answer: 0,
      why: 'There are 2^n masks with n possible last cities, and each state tries up to n predecessors; the table stores 2^n * n values.',
    },
  ],
  relatedIds: ['assignment', 'shortest-path-all-nodes', 'matrix-chain'],
  lessonId: 'bitmask',
};

export default tspModule;
