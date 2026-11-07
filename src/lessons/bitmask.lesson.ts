import { StepRecorder } from '../engine/dpHelpers';
import type { Lesson } from '../engine/lessonTypes';
import type { BitmaskGridState, Step } from '../engine/types';

function popcount(mask: number): number {
  let count = 0;
  let value = mask;
  while (value > 0) {
    count += value & 1;
    value >>>= 1;
  }
  return count;
}

function buildDiagramSteps(): Step[] {
  const cost = [
    [4, 1, 3],
    [2, 0, 5],
    [3, 2, 2],
  ];
  const n = cost.length;
  const rec = new StepRecorder<BitmaskGridState>(
    {
      kind: 'bitmaskGrid',
      bits: n,
      values: Array.from({ length: 1 << n }, () => null),
      labels: Array.from({ length: 1 << n }, (_value, mask) =>
        mask === 0 ? 'empty set' : `worker ${popcount(mask) - 1} placed`,
      ),
      caption:
        'Assignment walkthrough: dp[mask] = cheapest cost to fill the jobs in mask with the first popcount(mask) workers',
    },
    { codeLine: 1 },
  );

  const dp: Array<number | null> = Array.from({ length: 1 << n }, () => null);

  rec.at(1).record(
    'Bitmask walkthrough with three workers and three jobs. The mask lists occupied jobs: bit j means job j is taken. dp[000] starts at 0. Every non-empty mask adds one job for the next worker, so popcount(mask) - 1 identifies that worker. The table visits masks in increasing order, exactly as the lesson describes.',
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'start' }],
      vars: { masks: 1 << n, answer: 0 },
    },
  );

  dp[0] = 0;
  rec.at(2).fill([0], 0, 'Base case: mask 000 has no jobs assigned, so dp[0] = 0.', {
    kind: 'base',
    codeLine: 2,
    vars: { mask: 0, answer: 0 },
  });

  for (let mask = 1; mask < 1 << n; mask += 1) {
    const worker = popcount(mask) - 1;
    let best = Number.POSITIVE_INFINITY;
    let bestJob = -1;
    for (let job = 0; job < n; job += 1) {
      if ((mask & (1 << job)) === 0) continue;
      const before = dp[mask ^ (1 << job)] ?? Number.POSITIVE_INFINITY;
      const candidate = before + (cost[worker]?.[job] ?? 0);
      if (candidate < best) {
        best = candidate;
        bestJob = job;
      }
    }
    dp[mask] = best;
    rec.at(3).fill(
      [mask],
      best,
      `mask ${mask.toString(2).padStart(n, '0')} has ${popcount(mask)} job${popcount(mask) === 1 ? '' : 's'}. Worker ${worker} takes job ${bestJob}; the previous mask ${(mask ^ (1 << bestJob)).toString(2).padStart(n, '0')} costs ${dp[mask ^ (1 << bestJob)] ?? 0}, plus cost ${cost[worker]?.[bestJob] ?? 0} gives ${best}.`,
      {
        kind: 'result',
        codeLine: 3,
        highlights: [
          { pos: [mask ^ (1 << Math.max(bestJob, 0))], kind: 'dependency', label: 'previous mask' },
        ],
        vars: { mask, worker, bestJob, best },
      },
    );
  }

  rec.at(4).record('The answer is dp[111] = 5 — every job assigned exactly once at minimum total cost.', {
    codeLine: 4,
    highlights: [{ pos: [7], kind: 'result', label: 'answer' }],
    vars: { answer: 5 },
  });

  return [...rec.steps];
}

const lesson: Lesson = {
  id: 'bitmask',
  title: 'Bitmask DP: One Integer, One Subset',
  category: 'bitmask',
  summary:
    'Bitmask DP stores a set of up to ~20 items as the 1-bits of an integer. A table indexed by mask answers "what is the best result for exactly this subset?", and adding one item flips one zero bit to one. It replaces exponential backtracking with 2^n states.',
  sections: [
    {
      heading: 'A subset is an integer',
      body: 'With n small items (usually n <= 20), number them 0..n-1. A mask is an integer whose bit j is 1 exactly when item j is in the set. Bit j has value 2^j, so mask 0 is the empty set, mask (1 << j) is the singleton {j}, and (1 << n) - 1 is the full set. There are 2^n masks, one per subset.\n\nThe core operations are cheap: test membership with mask & (1 << j), add item j with mask | (1 << j), remove it with mask ^ (1 << j) or mask & ~(1 << j), and count items with a popcount loop. Fixed-width integers make these O(1) operations, which is why bitmask DP can replace a set object in the state.',
      bullets: [
        'mask | (1 << j) adds item j.',
        'mask & (1 << j) tests whether item j is present.',
        'mask ^ (1 << j) removes item j when it is present.',
        'mask 0 = empty set; (1 << n) - 1 = full set.',
      ],
      callout: 'Use n <= 20: 2^20 is about one million states, which is already a large table.',
    },
    {
      heading: 'dp[mask]: one row per subset',
      body: 'When the order of items does not matter, dp[mask] is enough. The Assignment Problem is the clean example: mask lists the jobs already filled, and popcount(mask) tells you how many workers have been placed. To add job j, the previous mask is mask ^ (1 << j), so dp[mask] = min over j in mask of dp[mask ^ (1 << j)] + cost[popcount(mask)-1][j].\n\nMasks are processed in increasing numeric order. Does that guarantee submasks are ready? Yes: removing a set bit always produces a smaller integer, so mask ^ (1 << j) < mask. The diagram fills masks 001 through 111 in order; by the time mask 111 is computed, all its two-job submasks are final. The answer sits in dp[full].',
      bullets: [
        'dp[mask] describes exactly the subset in mask.',
        'Removing one bit makes the number smaller, so increasing-mask order is a valid topological order.',
        'popcount(mask) often tells you which item is added next.',
        'Answer usually lives in dp[(1 << n) - 1].',
      ],
      callout: 'If the transition removes a bit, increasing mask order works; if it adds a bit, iterate masks in decreasing order or use memoized recursion.',
    },
    {
      heading: 'When order matters: mask + last',
      body: 'Sometimes the subset alone is not enough. In the Travelling Salesman Problem, the cost of adding the next city depends on where you currently are, so the state becomes dp[mask][last]: visited cities plus current endpoint. The transition tries every previous city prev in mask: dp[mask][last] = min(dp[mask without last][prev] + dist[prev][last]).\n\nShortest Path Visiting All Nodes has the same shape, but edges may be revisited, so it is a BFS over (mask, node) rather than a min-plus DP. The mask still tracks which nodes have been seen; node tracks the current position. Whenever a problem says "visit every item" and movement costs depend on location, expect a mask-plus-last state and O(2^n * n²) work.',
      bullets: [
        'mask alone loses the current endpoint.',
        'TSP: dp[mask][last], transition from prev in mask without last.',
        'Visiting-all-nodes BFS: queue of (mask, node) states.',
        'Both use O(2^n * n) memory and often O(2^n * n²) time.',
      ],
      callout: 'Ask "does the future depend on where I am, not just what I have seen?" If yes, add the last-item dimension.',
    },
    {
      heading: 'Submask enumeration and SOS DP',
      body: 'Some problems need every subset of a mask, not just masks that remove one bit. The standard loop enumerates submasks in decreasing order: for (sub = mask; sub > 0; sub = (sub - 1) & mask) { ... }. This visits only subsets of mask and skips everything else; the total work over all masks is O(3^n), which is fine for n around 15 but not for n = 25.\n\nIf the transition is "sum over all subsets", that O(3^n) enumeration can often be replaced by Sum over Subsets DP: start with the value at each mask, then for each bit j and each mask with bit j set, add the value of mask without j. Each mask then holds the aggregate over all its submasks in O(n * 2^n). The bit-by-bit sweep is the bitmask analogue of a prefix sum.',
      bullets: [
        'Enumerate submasks with sub = (sub - 1) & mask.',
        'Naive subset enumeration over all masks is O(3^n).',
        'SOS DP aggregates over submasks in O(n * 2^n).',
        'Use SOS when the same subset sums are reused many times.',
      ],
      callout: 'Do not enumerate all 2^n masks inside every mask unless n is tiny — that is the O(3^n) trap.',
    },
    {
      heading: 'Pitfalls',
      body: 'The first trap is thinking 2^n is small. At n = 25, 33 million masks times 25 endpoints is already too large for an animation or a quick run; keep demonstrations at n <= 4 and real solutions at n <= 20. The second trap is mixing 1-based and 0-based bits: bit j is 2^j, so a mask for items 1..n needs an offset either in the item number or in every shift.\n\nWatch the empty set and the full set. dp[0] is usually a real base case, not a missing value, and the answer is usually dp[full], not dp[n]. When you remove a bit, guard that the bit is present; when you add a bit, guard that it is absent. Finally, initialise unreachable states to a sentinel (Infinity or -1) and skip them explicitly — treating null as 0 silently invents free transitions.',
      bullets: [
        'n <= 20 for 2^n states; n <= 4 for readable animations.',
        'Bit j = 2^j; keep the indexing convention consistent.',
        'dp[0] is a base case meaning the empty set.',
        'Skip unreachable states instead of treating null as 0.',
        'Answer is dp[full]; full = (1 << n) - 1.',
      ],
      callout: 'Hand-check n = 1, n = 2, and the full mask before trusting any bitmask table.',
    },
  ],
  diagram: {
    rendererId: 'bitmaskGrid',
    steps: buildDiagramSteps(),
  },
};

export default lesson;
