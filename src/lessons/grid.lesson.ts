import { StepRecorder, create2D } from '../engine/dpHelpers';
import type { Lesson } from '../engine/lessonTypes';
import type { Step, Table2DState } from '../engine/types';

function buildDiagramSteps(): Step[] {
  const grid = [
    [1, 3, 1],
    [1, 5, 1],
    [4, 2, 1],
  ];
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const rec = new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D(rows, cols, () => null),
      rowLabels: ['r=0', 'r=1', 'r=2'],
      colLabels: ['c=0', 'c=1', 'c=2'],
      rowHeader: 'row',
      colHeader: 'column',
      caption: 'Min-path-sum table dp[r][c] = minimum sum from (0, 0) to cell (r, c)',
    },
    { codeLine: 1 },
  );

  rec.at(1).record(
    'Tabulation: grid = [[1,3,1],[1,5,1],[4,2,1]]. Each cell dp[r][c] is the cheapest sum reaching that cell. Fill top-to-bottom, left-to-right so the top and left neighbors are final before we touch (r, c).',
    {
      codeLine: 1,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { r: 0, c: 0, answer: 0 },
    },
  );

  const dp = create2D(rows, cols, () => 0);
  const gridAt = (r: number, c: number): number => grid[r]?.[c] ?? 0;
  const dpAt = (r: number, c: number): number => dp[r]?.[c] ?? 0;
  const setDp = (r: number, c: number, value: number): void => {
    const row = dp[r];
    if (row) row[c] = value;
  };

  setDp(0, 0, gridAt(0, 0));
  rec.at(2).fill([0, 0], gridAt(0, 0), 'Base corner: dp[0][0] = 1 — starting at the top-left costs just its own value.', {
    kind: 'base',
    codeLine: 2,
    vars: { r: 0, c: 0, answer: 1 },
  });

  setDp(0, 1, dpAt(0, 0) + gridAt(0, 1));
  rec.at(3).fill(
    [0, 1],
    dpAt(0, 1),
    `First row, only left neighbor: dp[0][1] = dp[0][0] + 3 = 1 + 3 = ${dpAt(0, 1)}.`,
    {
      kind: 'base',
      codeLine: 3,
      highlights: [{ pos: [0, 0], kind: 'dependency', label: 'left' }],
      vars: { r: 0, c: 1, answer: dpAt(0, 1) },
    },
  );

  setDp(0, 2, dpAt(0, 1) + gridAt(0, 2));
  rec.at(3).fill(
    [0, 2],
    dpAt(0, 2),
    `First row keeps accumulating: dp[0][2] = dp[0][1] + 1 = ${dpAt(0, 1)} + 1 = ${dpAt(0, 2)}.`,
    {
      kind: 'base',
      codeLine: 3,
      highlights: [{ pos: [0, 1], kind: 'dependency', label: 'left' }],
      vars: { r: 0, c: 2, answer: dpAt(0, 2) },
    },
  );

  setDp(1, 0, dpAt(0, 0) + gridAt(1, 0));
  rec.at(3).fill(
    [1, 0],
    dpAt(1, 0),
    `First column, only top neighbor: dp[1][0] = dp[0][0] + 1 = 1 + 1 = ${dpAt(1, 0)}.`,
    {
      kind: 'base',
      codeLine: 3,
      highlights: [{ pos: [0, 0], kind: 'dependency', label: 'up' }],
      vars: { r: 1, c: 0, answer: dpAt(1, 0) },
    },
  );

  setDp(1, 1, Math.min(dpAt(0, 1), dpAt(1, 0)) + gridAt(1, 1));
  rec.at(4).fill(
    [1, 1],
    dpAt(1, 1),
    `Interior cell: dp[1][1] = min(up = ${dpAt(0, 1)}, left = ${dpAt(1, 0)}) + 5 = ${dpAt(1, 1)}.`,
    {
      codeLine: 4,
      highlights: [
        { pos: [0, 1], kind: 'dependency', label: 'up' },
        { pos: [1, 0], kind: 'dependency', label: 'left' },
      ],
      vars: { r: 1, c: 1, answer: dpAt(1, 1) },
    },
  );

  setDp(1, 2, Math.min(dpAt(0, 2), dpAt(1, 1)) + gridAt(1, 2));
  rec.at(4).fill(
    [1, 2],
    dpAt(1, 2),
    `dp[1][2] = min(up = ${dpAt(0, 2)}, left = ${dpAt(1, 1)}) + 1 = ${dpAt(1, 2)}.`,
    {
      codeLine: 4,
      highlights: [
        { pos: [0, 2], kind: 'dependency', label: 'up' },
        { pos: [1, 1], kind: 'dependency', label: 'left' },
      ],
      vars: { r: 1, c: 2, answer: dpAt(1, 2) },
    },
  );

  setDp(2, 0, dpAt(1, 0) + gridAt(2, 0));
  rec.at(3).fill(
    [2, 0],
    dpAt(2, 0),
    `First column keeps accumulating: dp[2][0] = dp[1][0] + 4 = ${dpAt(1, 0)} + 4 = ${dpAt(2, 0)}.`,
    {
      kind: 'base',
      codeLine: 3,
      highlights: [{ pos: [1, 0], kind: 'dependency', label: 'up' }],
      vars: { r: 2, c: 0, answer: dpAt(2, 0) },
    },
  );

  setDp(2, 1, Math.min(dpAt(1, 1), dpAt(2, 0)) + gridAt(2, 1));
  rec.at(4).fill(
    [2, 1],
    dpAt(2, 1),
    `dp[2][1] = min(up = ${dpAt(1, 1)}, left = ${dpAt(2, 0)}) + 2 = ${dpAt(2, 1)}.`,
    {
      codeLine: 4,
      highlights: [
        { pos: [1, 1], kind: 'dependency', label: 'up' },
        { pos: [2, 0], kind: 'dependency', label: 'left' },
      ],
      vars: { r: 2, c: 1, answer: dpAt(2, 1) },
    },
  );

  setDp(2, 2, Math.min(dpAt(1, 2), dpAt(2, 1)) + gridAt(2, 2));
  rec.at(4).fill(
    [2, 2],
    dpAt(2, 2),
    `Answer cell: dp[2][2] = min(up = ${dpAt(1, 2)}, left = ${dpAt(2, 1)}) + 1 = ${dpAt(2, 2)}.`,
    {
      codeLine: 4,
      highlights: [
        { pos: [1, 2], kind: 'dependency', label: 'up' },
        { pos: [2, 1], kind: 'dependency', label: 'left' },
      ],
      vars: { r: 2, c: 2, answer: dpAt(2, 2) },
    },
  );

  rec.at(5).record('The answer is dp[2][2] = 7 — the cheapest route costs 1 + 1 + 1 + 1 + 1 + 1 + 1 along the right edge.', {
    codeLine: 5,
    highlights: [{ pos: [2, 2], kind: 'result', label: 'answer' }],
    vars: { r: rows - 1, c: cols - 1, answer: 7 },
  });

  return [...rec.steps];
}

const lesson: Lesson = {
  id: 'grid',
  title: 'Grid DP',
  category: 'grid',
  summary:
    'Grid DP fills a 2D table cell by cell: dp[r][c] summarizes everything that can reach (r, c) from the start, and the recurrence only reads the top and left neighbors (or, in reverse, the bottom and right). Counting paths adds the neighbours, min-path takes their minimum plus the cell cost, obstacles prune whole branches, and dungeon problems flip the walk to run backwards from the destination.',
  sections: [
    {
      heading: 'Name the cell: dp[r][c]',
      body: 'A grid state is two indices, not one. Write dp[r][c] as a full sentence — for min-path-sum, "the minimum sum of cell values on a path from (0, 0) to (r, c), inclusive". The sentence is the contract: it fixes where paths start, which moves are legal (here only right and down), and whether the current cell is already counted.\n\nMovement constraints decide the neighbours. Right-and-down walks only arrive from up (r - 1, c) or left (r, c - 1), so the fill order is forced: rows top-to-bottom, columns left-to-right. By the time you write a cell, both of its sources are final and must never be overwritten. In the diagram that order writes dp[2][2] = 7 last, after the right-edge neighbours dp[1][2] = 6 and dp[2][1] = 8 compete.',
      bullets: [
        'dp[r][c]: one sentence naming the subproblem — start, moves, inclusion of the current cell.',
        'Right/down moves read (r-1, c) and (r, c-1) only — never (r+1, c) or (r, c+1).',
        'Fill rows 0..R-1, columns 0..C-1; every source cell is already done.',
        'Answer usually at dp[R-1][C-1], the bottom-right corner.',
      ],
      callout: 'Say dp[r][c] out loud before coding — "cheapest sum from the start to (r, c) inclusive" pins down the whole recurrence.',
    },
    {
      heading: 'Base row and column',
      body: 'The first row and first column have only one way in, so they never take a min of two neighbours. dp[0][0] is the start cell itself. Every later cell in row 0 can only come from the left: dp[0][c] = dp[0][c-1] + grid[0][c]. Every later cell in column 0 can only come from above: dp[r][0] = dp[r-1][0] + grid[r][0]. In the diagram row 0 accumulates 1, 4, 5 and column 0 accumulates 1, 2, 6 before any interior min happens.\n\nTreat bases as a separate first pass, not as a special case inside the min loop. Writing the accumulating loops out explicitly also removes the usual boundary bug of reading dp[-1][c] or dp[r][-1].',
      bullets: [
        'dp[0][0] = grid[0][0].',
        'First row: dp[0][c] = dp[0][c-1] + grid[0][c] for c >= 1.',
        'First column: dp[r][0] = dp[r-1][0] + grid[r][0] for r >= 1.',
        'Interior: dp[r][c] = min(up, left) + grid[r][c] for r, c >= 1.',
      ],
      callout: 'Bases first, then the min loop. If you hand-roll the first row/column, you never read out of bounds.',
    },
    {
      heading: 'Counting paths vs cheapest path',
      body: 'Unique paths and min-path-sum share the same table and fill order but combine neighbours differently. To count paths you add: ways[r][c] = ways[r-1][c] + ways[r][c-1], because every route through the top and every route through the left are distinct and all valid. To find the cheapest path you take the minimum and add the cell cost: dp[r][c] = min(up, left) + grid[r][c], because only the cheapest arrival can lead to a cheapest completion.\n\nThat one-word change — plus vs min — is the whole lesson. Summation problems propagate totals through the whole table; optimisation problems propagate the incumbent best and keep the original grid values as weights. Both read only up and left, both fill in the same order, and both answer at the bottom-right.',
      bullets: [
        'Counting: ways[r][c] = up + left (ways[0][0] = 1).',
        'Min path: dp[r][c] = min(up, left) + grid[r][c].',
        'Max path: dp[r][c] = max(up, left) + grid[r][c].',
        'Same skeleton; only the combine function changes.',
      ],
      callout: 'Ask: "do all arrivals count, or only the best one?" All counts add; only-best takes min or max.',
    },
    {
      heading: 'Obstacles: blocked cells',
      body: 'An obstacle means no path may pass through that cell. For counting, a blocked cell contributes 0 paths, so ways[r][c] = 0 and nothing beyond it can route through it — but cells beside or below it may still be reachable from the other neighbour. For min-path, a blocked cell is unreachable: skip it entirely or use infinity so the min never selects it, and if both neighbours are blocked or infinite, leave the cell unreachable too.\n\nTwo early exits matter. If the start cell is blocked, the answer is immediately 0 paths (or "no path" for optimisation). If the destination is blocked, the answer is 0 / unreachable without filling anything. A common bug is treating a blocked cell as a zero-cost cell for min-path or as a one-way count for counting — the values must be removed from propagation, not merely zeroed in print.',
      bullets: [
        'Counting: blocked cell gets 0 and propagates 0 through itself.',
        'Min-path: blocked cell gets infinity / skipped — never min-selected.',
        'Start or destination blocked → answer is 0 / unreachable immediately.',
        'Only the blocked cell is pruned; its neighbours can use the other parent.',
      ],
      callout: 'Blocked means "not a state", not "a state with value zero" — prune the cell, do not relax through it.',
    },
    {
      heading: 'Reverse DP: minimum health in a dungeon',
      body: 'Dungeon problems invert the question. Instead of "what does the hero have on arrival", ask "what health does the hero need before entering this cell to reach the princess alive?" Define need[r][c] as the minimum health required at the doorstep of (r, c). The princess cell needs 1. Every other cell takes the smaller of its right and down needs and compensates for the cell value: need[r][c] = max(1, bestNext - grid[r][c]), because a healing cell (+10) lowers the requirement but never below 1, and a damage cell (-5) raises it.\n\nThe fill direction reverses too: start at the bottom-right and walk backwards, reading (r, c+1) and (r+1, c). Forward DP fails here because health depends on the future of the walk, which a top-left fill has not computed yet. Obstacles apply symmetrically — a blocked next cell is ignored unless both are blocked.',
      bullets: [
        'need[R-1][C-1] = 1 (arrive alive at the princess).',
        'need[r][c] = max(1, min(need[r][c+1], need[r+1][c]) - grid[r][c]).',
        'Fill bottom-to-top, right-to-left — readers look right and down.',
        'Clamp at 1: healing cells never let the requirement drop to 0 or negative.',
      ],
      callout: 'If the answer depends on where you end up, define the state backwards and fill from the target.',
    },
    {
      heading: 'Common pitfalls',
      body: 'The grid classics are indexing, boundaries, and direction. Indexing: a 0-based grid uses grid[r][c] with r in 0..R-1 and c in 0..C-1, while a padded (R+1) x (C+1) table shifts everything by one — mixing the two silently reads the wrong cell. Boundaries: first-row/column cells have a single neighbour, so any code that unconditionally computes min(dp[r-1][c], dp[r][c-1]) runs at index -1.\n\nDirection and values trip up the rest: copying a forward fill into a reverse dungeon problem, forgetting the max(1, ...) clamp on health, or using 0 as "unreachable" for min-path where 0 is a legal cost. Initialise unreachable cells to infinity (or null) and check blocked vs unreachable separately.',
      bullets: [
        '0-based (r, c) vs padded table — pick one convention and hold it.',
        'First row/column: one neighbour only — branch before the min, do not index -1.',
        'Reverse DP must fill backwards; forward order reads not-yet-computed cells.',
        'Unreachable is infinity / null, never 0 for min problems; clamp dungeon need at 1.',
      ],
      callout: 'Hand-check the corners first — the start, one edge cell, one interior cell, and the answer. Most grid bugs live there.',
    },
  ],
  diagram: {
    rendererId: 'table2d',
    steps: buildDiagramSteps(),
  },
};

export default lesson;
