import { StepRecorder, create2D } from '../engine/dpHelpers';
import type { Lesson } from '../engine/lessonTypes';
import type { Step, Table2DState } from '../engine/types';

function buildDiagramSteps(): Step[] {
  const weights = [1, 3, 4];
  const values = [1, 4, 5];
  const n = weights.length;
  const capacity = 4;

  const rec = new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D(n + 1, capacity + 1, () => null),
      rowLabels: ['0 items', '1: w=1 v=1', '2: w=3 v=4', '3: w=4 v=5'],
      colLabels: ['0', '1', '2', '3', '4'],
      rowHeader: 'items considered',
      colHeader: 'capacity',
      caption: '0/1 knapsack table dp[i][w] = best value with first i items, capacity w',
    },
    { codeLine: 1 },
  );

  rec.at(1).record(
    'Tabulation: build the (item x capacity) table bottom-up for weights [1, 3, 4], values [1, 4, 5], capacity 4. Each cell answers: best value using the first i items within capacity w.',
    {
      codeLine: 1,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { i: 0, w: 0, capacity },
    },
  );

  rec.at(2).fill([0, 0], 0, 'Base case: with 0 items, every capacity gives value 0.', {
    kind: 'base',
    codeLine: 2,
    vars: { i: 0, w: 0, answer: 0 },
  });
  for (let w = 1; w <= capacity; w += 1) {
    rec.at(2).fill([0, w], 0, `Base case: dp[0][${w}] = 0 — no items, so no value at capacity ${w}.`, {
      kind: 'base',
      codeLine: 2,
      vars: { i: 0, w, answer: 0 },
    });
  }

  const dp = create2D(n + 1, capacity + 1, () => 0);
  for (let i = 1; i <= n; i += 1) {
    const weight = weights[i - 1] ?? 0;
    const value = values[i - 1] ?? 0;
    for (let w = 0; w <= capacity; w += 1) {
      const skip = dp[i - 1]?.[w] ?? 0;
      if (w < weight) {
        const row = dp[i];
        if (row) row[w] = skip;
        rec.at(4).fill(
          [i, w],
          skip,
          `Item ${i} (w=${weight}, v=${value}) does not fit in capacity ${w}, so skip it: dp[${i}][${w}] = dp[${i - 1}][${w}] = ${skip}.`,
          {
            codeLine: 4,
            highlights: [{ pos: [i - 1, w], kind: 'dependency', label: 'skip' }],
            vars: { i, w, weight, value, answer: skip },
          },
        );
      } else {
        const take = (dp[i - 1]?.[w - weight] ?? 0) + value;
        const best = Math.max(skip, take);
        const row = dp[i];
        if (row) row[w] = best;
        const message =
          take > skip
            ? `Take item ${i}: dp[${i - 1}][${w - weight}] + ${value} = ${take} beats skip (${skip}), so dp[${i}][${w}] = ${best}.`
            : `Skip item ${i}: skip (${skip}) ties or beats take (${take}), so dp[${i}][${w}] = ${best}.`;
        rec.at(4).fill([i, w], best, message, {
          codeLine: 4,
          highlights: [
            { pos: [i - 1, w], kind: 'dependency', label: 'skip' },
            { pos: [i - 1, w - weight], kind: 'dependency', label: 'take' },
          ],
          vars: { i, w, weight, value, answer: best },
        });
      }
    }
  }

  rec.at(6).record('The answer is dp[3][4] = 5 — e.g. item 1 + item 2 (weight 4, value 5), or item 3 alone.', {
    codeLine: 6,
    highlights: [{ pos: [3, 4], kind: 'result', label: 'answer' }],
    vars: { i: n, w: capacity, answer: 5 },
  });

  return [...rec.steps];
}

const lesson: Lesson = {
  id: 'knapsack',
  title: 'Knapsack DP',
  category: 'knapsack',
  summary:
    'Knapsack DP asks what you can gain from a limited capacity: name a state by items considered and capacity left, decide take or skip for the next item, and fill a two-dimensional table once. The same skeleton solves 0/1 knapsack, unbounded knapsack, and subset sum.',
  sections: [
    {
      heading: 'Items vs capacity: naming the state',
      body: 'A knapsack state needs two coordinates because the choice depends on both what remains to consider and how much room is left. Write dp[i][w] as the best value obtainable from the first i items with capacity w. From that state the next item is item i + 1, and you either skip it — moving to dp[i][w] — or take it, paying its weight and gaining its value: dp[i + 1][w] = max(dp[i][w], dp[i][w - weight] + value).\n\nThat sentence is the whole algorithm in miniature. The first coordinate counts decisions made; the second counts capacity consumed. Every other knapsack variant is a change to what the take branch may read, not a new idea.',
      bullets: [
        'dp[i][w]: best value using first i items, capacity w — never just "the answer so far".',
        'Skip: dp[i][w] — the item is decided, capacity is untouched.',
        'Take: dp[i][w - weight] + value — only allowed when w >= weight.',
        'Answer: dp[n][W] for n items and total capacity W.',
      ],
      callout: 'Write dp[i][w] in a full sentence first. If you cannot say which items and which capacity, the recurrence has no meaning.',
    },
    {
      heading: '0/1 vs unbounded',
      body: 'In 0/1 knapsack each item may be used at most once. The take branch therefore reads the previous row, dp[i - 1][w - weight], because item i was not available before this row. Once the row is done, the item is gone forever.\n\nIn unbounded knapsack each item may be reused any number of times. The take branch reads the current row, dp[i][w - weight], because after taking item i you may take it again. That one-row difference is the entire variant — but getting it wrong silently reuses (or forbids) items.',
      bullets: [
        '0/1: take reads dp[i - 1][w - weight] — previous row, item used once.',
        'Unbounded: take reads dp[i][w - weight] — current row, item reusable.',
        'Unbounded with item-outer loop: dp[i][w] = max(dp[i - 1][w], dp[i][w - weight] + value).',
        '0/1 with a 1D array: iterate capacity descending so the source cell is not yet updated.',
      ],
      callout: 'Item reuse is a dependency choice, not an extra loop: which row does the take branch read from?',
    },
    {
      heading: 'Building the (item x capacity) table',
      body: 'Fill the table row by row: items in the outer loop, capacity in the inner loop. Bases come first — dp[0][w] = 0 for every w (no items, no value) and dp[i][0] = 0 for every i (no capacity, nothing fits). Treat them as final and never overwrite them.\n\nFor each new cell compare the two options. If the item is heavier than w, the cell copies the cell above it. Otherwise the cell is the larger of skipping (the cell above) and taking (the cell above and weight-columns left, plus the value). In the diagram, item 2 at capacity 4 takes: dp[1][1] + 4 = 5 beats skipping at 1, and the final cell dp[3][4] = 5 is a tie between taking item 3 and keeping the earlier best.\n\nThe table has (n + 1) x (W + 1) cells and constant work per cell, so the running time is O(n x W) with O(n x W) space — reducible to O(W) with a single row once the fill order is safe.',
      bullets: [
        'Outer loop = items, inner loop = capacity: each row is one decision.',
        'Bases: first row and first column are all 0.',
        'Fits? Compare skip (above) vs take (above-left + value); else copy the cell above.',
        'Diagram answer: dp[3][4] = 5 for weights [1, 3, 4], values [1, 4, 5], capacity 4.',
      ],
      callout: 'If your recurrence reads dp[i - 1][w] and dp[i - 1][w - weight], fill items in the outer loop and capacity in the inner loop.',
    },
    {
      heading: 'Subset-sum reduction',
      body: 'Subset sum is knapsack with the values hidden. Given numbers and a target, can some subset sum to the target? Replace "best value" with a boolean: dp[i][w] means the first i numbers can make sum w. The recurrence is the same skeleton with max replaced by or: dp[i + 1][w] = dp[i][w] OR dp[i][w - nums[i]]. The answer is dp[n][target].\n\nThe reduction tells you the complexity immediately: O(n x target) time and space, the same as knapsack with W = target. It also explains why pseudo-polynomial matters — the table size depends on the target value, not just on n, so huge targets make the table huge even for few numbers. Counting subsets (how many subsets sum to target) uses the same table again, with addition instead of or or max.',
      bullets: [
        'Subset sum: dp[i][w] = reachable(i, w); take = dp[i - 1][w - x] OR skip = dp[i - 1][w].',
        'Answer is dp[n][target]; base dp[0][0] = true, dp[0][w > 0] = false.',
        'Counting subsets: replace or/max with + over the same two branches.',
        'Same O(n x target) shape — large targets make the table large.',
      ],
      callout: 'Subset sum is knapsack where value means "reachable": same table, same take/skip, boolean instead of max.',
    },
    {
      heading: 'Common pitfalls',
      body: 'The classic knapsack bug is compressing the table to one row and iterating capacity in the wrong direction. For 0/1 knapsack a descending capacity loop keeps the take source from the previous row; ascending reuses the same item within one row and quietly becomes unbounded. For unbounded knapsack the ascending order is the correct one, so memorize the pair rather than one direction.\n\nThree more traps recur: tables sized n x W instead of (n + 1) x (W + 1), so bases overwrite real cells; confusing weight with value in the take branch; and reaching for greedy by value density, which fails — in the diagram, the densest item alone never beats the optimal pair. Always check the first row and the smallest fitting cell by hand before trusting the loops.',
      bullets: [
        '0/1 1D compression: capacity descending; unbounded: capacity ascending.',
        'Size the table (n + 1) x (W + 1) — row 0 and column 0 are the bases.',
        'Take adds value but subtracts weight: dp[i - 1][w - weight] + value.',
        'Greedy by value/weight ratio is not optimal — verify dp[3][4] = 5 by hand here.',
      ],
      callout: 'Check the empty-knapsack row and one fitting cell by hand — if the take/skip branches are swapped, every later cell is wrong.',
    },
  ],
  diagram: {
    rendererId: 'table2d',
    steps: buildDiagramSteps(),
  },
};

export default lesson;
