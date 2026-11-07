import { StepRecorder } from '../engine/dpHelpers';
import type { Lesson } from '../engine/lessonTypes';
import type { Highlight, Step, Table1DState } from '../engine/types';

const CATALAN: readonly number[] = [1, 1, 2, 5, 14, 42];

function dep(index: number, value: number): Highlight {
  return { pos: [index], kind: 'dependency', label: `dp[${index}] = ${value}` };
}

function buildDiagramSteps(): Step[] {
  const rec = new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: 6 }, () => null),
      labels: ['dp[0]', 'dp[1]', 'dp[2]', 'dp[3]', 'dp[4]', 'dp[5]'],
      indexName: 'n',
      caption: 'Catalan counts: dp[n] = distinct BST shapes for n ordered keys',
    },
    { codeLine: 1 },
  );

  rec.at(1).record(
    'Counting walkthrough for unique-bsts: dp[n] counts distinct binary search tree shapes for n ordered keys. The animation fills dp[0..5] = 1, 1, 2, 5, 14, 42 in order, so every split term for dp[5] can reuse an already-final smaller count. The empty tree dp[0] = 1 is the base case that makes every edge split work.',
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'base dp[0] = 1' }],
      vars: { n: 5, table: 'dp[0..5]' },
    },
  );

  rec.at(2).fill([0], 1, 'Base case: the empty tree is one shape, so dp[0] = 1.', {
    kind: 'base',
    label: 'base dp[0] = 1',
    codeLine: 2,
    vars: { n: 0, dp: 1 },
  });

  rec.at(2).fill(
    [1],
    1,
    'dp[1] = dp[0] * dp[0] = 1 * 1 = 1. One key gives exactly one BST shape, so the count is ready to be reused as a subtree on either side.',
    {
      kind: 'result',
      label: 'dp[1] = 1',
      codeLine: 2,
      highlights: [dep(0, 1)],
      vars: { n: 1, dp: 1 },
    },
  );

  rec.at(3).fill(
    [2],
    2,
    'dp[2] = dp[0] * dp[1] + dp[1] * dp[0] = 1 * 1 + 1 * 1 = 2. The two root splits are the two shapes: root 1 with one right child, or root 2 with one left child.',
    {
      kind: 'result',
      label: 'dp[2] = 2',
      codeLine: 3,
      highlights: [dep(0, 1), dep(1, 1)],
      vars: { n: 2, dp: 2 },
    },
  );

  rec.at(3).fill(
    [3],
    5,
    'dp[3] = dp[0] * dp[2] + dp[1] * dp[1] + dp[2] * dp[0] = 2 + 1 + 2 = 5. Three root splits produce the five shapes; no root is counted twice because the root position is the tie-breaker.',
    {
      kind: 'result',
      label: 'dp[3] = 5',
      codeLine: 3,
      highlights: [dep(0, 1), dep(2, 2), dep(1, 1)],
      vars: { n: 3, dp: 5 },
    },
  );

  rec.at(3).fill(
    [4],
    14,
    'dp[4] = dp[0] * dp[3] + dp[1] * dp[2] + dp[2] * dp[1] + dp[3] * dp[0] = 5 + 2 + 2 + 5 = 14. The smaller counts repeat in mirror pairs, which is expected: left-heavy and right-heavy roots give symmetric families.',
    {
      kind: 'result',
      label: 'dp[4] = 14',
      codeLine: 3,
      highlights: [dep(3, 5), dep(1, 1), dep(2, 2)],
      vars: { n: 4, dp: 14 },
    },
  );

  const splits: Array<{ root: number; left: number; right: number; term: number; running: number }> = [
    { root: 1, left: 0, right: 4, term: 14, running: 14 },
    { root: 2, left: 1, right: 3, term: 5, running: 19 },
    { root: 3, left: 2, right: 2, term: 4, running: 23 },
    { root: 4, left: 3, right: 1, term: 5, running: 28 },
    { root: 5, left: 4, right: 0, term: 14, running: 42 },
  ];

  rec.at(4).record(
    'Now compute dp[5] = sum over root splits (root d = 1..5) of dp[d - 1] * dp[5 - d]. Each term picks a root and multiplies the independent left and right shape counts: dp[0] * dp[4] + dp[1] * dp[3] + dp[2] * dp[2] + dp[3] * dp[1] + dp[4] * dp[0]. The five terms below add those products into a running total.',
    {
      codeLine: 4,
      highlights: [
        { pos: [5], kind: 'active', label: 'dp[5] = ?' },
        dep(0, 1),
        dep(4, 14),
      ],
      vars: { n: 5, running: 0 },
    },
  );

  for (const split of splits) {
    const last = split.root === 5;
    const message = last
      ? `Root ${split.root}: dp[${split.left}] * dp[${split.right}] = ${CATALAN[split.left] ?? 0} * ${CATALAN[split.right] ?? 0} = ${split.term}; running total ${split.running}. Store dp[5] = 42.`
      : `Root ${split.root}: dp[${split.left}] * dp[${split.right}] = ${CATALAN[split.left] ?? 0} * ${CATALAN[split.right] ?? 0} = ${split.term}; running total ${split.running}. dp[5] is still a partial sum, so it stays unfilled until every root is added.`;
    const highlights: Highlight[] = [
      { pos: [5], kind: 'active', label: `dp[5] running ${split.running}` },
      dep(split.left, CATALAN[split.left] ?? 0),
    ];
    if (split.right !== split.left) highlights.push(dep(split.right, CATALAN[split.right] ?? 0));
    if (last) {
      rec.at(5).fill([5], 42, message, {
        kind: 'result',
        label: 'dp[5] = 42',
        codeLine: 5,
        highlights,
        vars: { n: 5, term: split.term, running: split.running },
      });
    } else {
      rec.at(4).record(message, {
        codeLine: 4,
        highlights,
        vars: { n: 5, root: split.root, term: split.term, running: split.running },
      });
    }
  }

  rec.at(6).record(
    'The answer is 42: dp[5] = 14 + 5 + 4 + 5 + 14 = 42 distinct BST shapes for 5 ordered keys. The table now holds the full Catalan row dp[0..5] = 1, 1, 2, 5, 14, 42, and the final cell was written only after all five root splits had been added.',
    {
      codeLine: 6,
      highlights: [{ pos: [5], kind: 'result', label: 'answer 42' }],
      vars: { answer: 42, n: 5 },
    },
  );

  return [...rec.steps];
}

const lesson: Lesson = {
  id: 'counting',
  title: 'Counting and Game DP: States That Carry Every Constraint',
  category: 'counting',
  summary:
    'Counting DP enumerates structures by splitting them into independent parts and summing or multiplying their counts, while game DP turns the same intervals into minimax decisions. The work is choosing a complete state — including dice count, stop count, and tight-to-the-bound flag — then ordering the fill so every dependency is final. The counting problems unique-bsts, dice-sums, knight-probability, predict-the-winner, stone-game, and digit-dp each add one such dimension or opponent.',
  sections: [
    {
      heading: 'States must carry every constraint',
      body: "A counting state is a complete sentence: it must mention every quantity the future still depends on. In dice-sums, dp[d][s] counts ordered outcomes of exactly d dice summing to s. The dice count d cannot be folded into the sum s, because s + 1 can be reached by d dice or by d + 1 dice and only the first is a legal predecessor for the next die. Likewise, dp[0][0] = 1 and dp[0][s] = 0 for s > 0 are distinct base facts; collapsing them into one 'empty is one' base makes positive sums reachable from zero dice.\n\nThe same discipline covers the other counting problems. Knight-probability needs a move layer t: dp[t][cell] counts walks of exactly t knight moves ending at each cell, because a cell reached in 2 moves and the same cell reached in 3 moves offer different continuations. Digit-dp needs a tight flag: pos tells how many digits are fixed, but tight tells whether the prefix still equals the bound, so the next digit is capped at the bound digit or free at 9. Predict-the-winner and stone-game need both interval ends, because the same two stones with different surrounding piles are different games. Whenever a future move depends on a fact not in the state, add that fact as a dimension instead of hoping the recurrence can recover it.",
      bullets: [
        'dice-sums: state (dice count, sum); count and sum are different facts.',
        'knight-probability: state (moves used, cell); the move layer is the stop count.',
        'digit-dp: state (position, tight, noFour); tight carries the bound constraint.',
        'predict-the-winner / stone-game: state (left, right) names the exact interval.',
        'If two histories need different futures, they must be different states.',
      ],
      callout:
        'Write the state as one sentence naming every constraint. Missing dice count, stop count, or tight flag is the most common counting-DP bug — the recurrence cannot reason about a fact the state forgot.',
    },
    {
      heading: 'Catalan and binary-tree counting via root splits',
      body: "Unique-bsts is the canonical Catalan problem, and the walkthrough computes dp[0..5] = 1, 1, 2, 5, 14, 42. The idea is to pick a distinguished part and let the rest split into independent pieces. For BST shapes the distinguished part is the root: choosing root d leaves d - 1 keys on the left and n - d keys on the right, so the two subtree counts multiply and every root choice contributes one product. For n = 5 the splits are dp[0] * dp[4], dp[1] * dp[3], dp[2] * dp[2], dp[3] * dp[1], and dp[4] * dp[0], which sum to 14 + 5 + 4 + 5 + 14 = 42.\n\nThe multiplication is valid because any left shape combines with any right shape to form a distinct tree for that root, and the addition is valid because different roots produce disjoint trees. Memoization caches each dp[i] and tabulation fills i upward; both are the same recurrence with different scheduling. The proof pattern generalises: distinguish one choice, prove the pieces are independent, multiply across pieces, and sum over the choices. That is exactly how dice-sums multiplies nothing but adds over last-face choices — there the pieces are disjoint by last die, so they add instead.",
      bullets: [
        'unique-bsts: dp[n] = sum over root d of dp[d - 1] * dp[n - d].',
        'Multiply independent left and right subtree counts for a fixed root.',
        'Add over roots; root position makes the families disjoint.',
        'dp[0] = 1 seeds every split where one side is empty.',
        'Fill dp upward so both factors are final before their product.',
      ],
      callout:
        'The diagram highlights each factor by its label, not just its color, because mirrored splits like dp[1] * dp[3] and dp[3] * dp[1] are different root families that happen to have equal size.',
    },
    {
      heading: 'Layered and tight digit DP',
      body: "Layered DP counts walks or routes step by step by making the layer an explicit dimension. Knight-probability fills one board layer per knight move: dp[t][cell] is the number of walks of exactly t moves ending at cell, and each next layer is the sum of the previous layer over all knight-neighbours. The final answer divides the walk count by 8^k, because each move has 8 equally likely choices. A node-only table would merge walks that arrived in different numbers of steps and lose exactly the information the transition needs.\n\nDigit-dp is the same layered idea with a tighter state. It walks the decimal digits of n left to right with pos, tight, and noFour. While tight is true, the next digit may not exceed the digit of n at pos; choosing a smaller digit flips tight to false forever and frees the remaining digits to 0..9. The noFour flag remembers whether a 4 already appeared, so the finished rows can sum only the columns where noFour is true. Flattening (tight, noFour) into four columns gives the row counts dp[pos][0..3]; the answer for n = 19 is dp[L][tight+no4] + dp[L][loose+no4] = 18, excluding the two numbers 4 and 14. In both problems the fill order is forced: layer t + 1 after layer t, digit pos + 1 after pos, never sideways.",
      bullets: [
        'Layer = moves used, digits fixed, or flights taken; fill layer by layer.',
        'Copy forward for at most t steps; no copy for exactly t steps.',
        'Tight means the prefix still equals the bound and caps the next digit.',
        'digit-dp flattens (tight, noFour) into 4 columns and sums noFour columns.',
        'knight-probability divides staying walks by 8^k for the probability.',
      ],
      callout:
        'Dropping the tight flag or the move layer does not simplify the problem; it changes the question to an unconstrained one and silently overcounts.',
    },
    {
      heading: 'Minimax optimal play on intervals',
      body: "Predict-the-winner and stone-game look like counting problems but answer a game question, and the counting mindset changes from sum to max. The state dp[l][r] is the best score the player to move can still collect from stones nums[l..r] when both play optimally. Taking the left end gives nums[l] plus whatever the current player collects from the rest after the opponent has taken optimally from nums[l+1..r]; prefix sums give that rest total in O(1) as intervalTotal - dp[l+1][r]. The recurrence takes the max of take-left and take-right. The sign flips because the opponent's gain is the current player's loss.",
      bullets: [
        'predict-the-winner: dp[l][r] is the best score for the player to move.',
        'stone-game: same interval state decides whether the first player wins.',
        'Take-left value = nums[l] + (intervalTotal - dp[l+1][r]); take-right mirrors it.',
        'Fill short intervals before long ones: length 1, then 2, up to n.',
        'Answer compares dp[0][n-1] with half the total (ties favour player 1).',
      ],
      callout:
        'Define dp[l][r] for whoever moves now, never for player 1 always. An always-player-1 state cannot add the opponent branch without flipping its meaning mid-recurrence.',
    },
    {
      heading: 'Pitfalls: double counting, sentinels, and blow-ups',
      body: "Double counting means the same object arrives through two transitions that are not disjoint. In unique-bsts the root is the disjoint key, so summing over roots is safe; in coin-style counting, iterating in the wrong direction lets one selection be built in several orders and counts permutations instead of combinations. Before adding, ask what distinguishes the families — last face, root position, or next digit — and point every transition at one distinguished feature. When in doubt, enumerate a tiny case by hand (n = 2 dice, or 0..19 for digit-dp) and compare the table against the list.\n\nSentinels and blow-ups are the other two classic failures. Use -1 or a separate unreachable marker for uncomputed game or minimax states, and never let a sentinel leak into sums where 0 means 'no ways' and infinity means 'unreachable' are different facts. Exponential blow-ups come from recursion without memo or tabulation: the Catalan recurrence without a cache recomputes dp[4] for every split of dp[5], and interval games without a table re-solve overlapping [l..r] pairs. If a state is visited twice in hand-simulation, memoize it. Finally, test the smallest cases — empty tree, zero dice, k = 0 knight moves, one-stone intervals — because bases like dp[0][0] = 1 and dp[0] = 1 are load-bearing, not decorative.",
      bullets: [
        'Add only over disjoint families; multiply only over independent pieces.',
        'Use 0 for no ways, and keep unreachable or uncomputed distinct from both.',
        'Memoize or tabulate any state reachable more than once; never recompute it.',
        'Test n = 0 and n = 1 first; wrong bases shift the whole table.',
        'Recompute tiny cases by hand to expose double counting and sentinel leaks.',
      ],
      callout:
        'If the answer is exactly double the expected count, suspect you are counting an object and its mirror, or both orders of a combination. If it explodes on small inputs, suspect a missing memo entry.',
    },
  ],
  diagram: {
    rendererId: 'table1d',
    steps: buildDiagramSteps(),
  },
};

export default lesson;
