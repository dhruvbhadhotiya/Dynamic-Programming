import { StepRecorder, create2D } from '../engine/dpHelpers';
import type { Lesson } from '../engine/lessonTypes';
import type { IntervalTriangleState, Step } from '../engine/types';

function buildDiagramSteps(): Step[] {
  const dims = [1, 2, 3, 4];
  const count = dims.length - 1;
  const rec = new StepRecorder<IntervalTriangleState>(
    {
      kind: 'intervalTriangle',
      values: create2D<number | null>(count, count, () => null),
      rowLabels: Array.from({ length: count }, (_value, i) => `i=${i}`),
      colLabels: Array.from({ length: count }, (_value, j) => `j=${j}`),
      caption:
        'Matrix chain dims [1, 2, 3, 4]: dp[i][j] = cheapest scalar multiplications to multiply matrices i..j',
    },
    { codeLine: 1 },
  );

  rec.at(1).record(
    'Interval DP walkthrough with matrices of sizes 1x2, 2x3 and 3x4. dp[i][j] only makes sense for i <= j. Start with one-matrix intervals, then grow the interval length. Every longer interval reads only shorter intervals inside it, so the triangle fills from the diagonal outwards.',
    {
      codeLine: 1,
      highlights: [{ pos: [0, count - 1], kind: 'active', label: 'whole chain' }],
      vars: { matrices: count, answer: 0 },
    },
  );

  for (let i = 0; i < count; i += 1) {
    const left = dims[i] ?? 1;
    const right = dims[i + 1] ?? 1;
    rec.at(3).fill(
      [i, i],
      0,
      `Base case: matrix ${i} is ${left}x${right}; a single matrix needs no multiplication, so dp[${i}][${i}] = 0.`,
      { kind: 'base', codeLine: 3, vars: { i, answer: 0 } },
    );
  }

  rec.at(4).record(
    'Length 2: multiply two adjacent matrices. The only split is between them, and the cost is left rows x shared dimension x right columns.',
    {
      codeLine: 4,
      highlights: [
        { pos: [0, 0], kind: 'dependency', label: 'left matrix' },
        { pos: [1, 1], kind: 'dependency', label: 'right matrix' },
      ],
      vars: { length: 2 },
    },
  );

  const cost01 = (dims[0] ?? 1) * (dims[1] ?? 1) * (dims[2] ?? 1);
  rec.at(5).fill(
    [0, 1],
    cost01,
    `dp[0][1] = dp[0][0] + dp[1][1] + 1 x 2 x 3 = 0 + 0 + ${cost01} = ${cost01}. The split is the only gap between matrices 0 and 1.`,
    {
      kind: 'result',
      codeLine: 5,
      highlights: [{ pos: [1, 1], kind: 'dependency', label: 'right matrix' }],
      vars: { i: 0, j: 1, cost: cost01, answer: cost01 },
    },
  );

  const cost12 = (dims[1] ?? 1) * (dims[2] ?? 1) * (dims[3] ?? 1);
  rec.at(5).fill(
    [1, 2],
    cost12,
    `dp[1][2] = dp[1][1] + dp[2][2] + 2 x 3 x 4 = 0 + 0 + ${cost12} = ${cost12}.`,
    {
      kind: 'result',
      codeLine: 5,
      highlights: [{ pos: [1, 1], kind: 'dependency', label: 'left matrix' }],
      vars: { i: 1, j: 2, cost: cost12, answer: cost12 },
    },
  );

  rec.at(4).record(
    'Length 3: the whole chain. Try each split k as the last multiplication: multiply matrices 0..k first, matrices k+1..2 second, then combine the two results. Both pieces are already final.',
    {
      codeLine: 4,
      highlights: [{ pos: [0, 2], kind: 'active', label: 'solve whole chain' }],
      vars: { length: 3 },
    },
  );

  const splitAt0 = (dims[0] ?? 1) * (dims[1] ?? 1) * (dims[3] ?? 1);
  rec.at(5).record(
    `Split k = 0: dp[0][0] + dp[1][2] + 1 x 2 x 4 = 0 + ${cost12} + ${splitAt0} = ${cost12 + splitAt0}.`,
    {
      codeLine: 5,
      highlights: [
        { pos: [0, 2], kind: 'active', label: 'current interval' },
        { pos: [1, 2], kind: 'dependency', label: 'right part' },
      ],
      vars: { k: 0, cost: cost12 + splitAt0 },
    },
  );

  const splitAt1 = (dims[0] ?? 1) * (dims[2] ?? 1) * (dims[3] ?? 1);
  rec.at(5).record(
    `Split k = 1: dp[0][1] + dp[2][2] + 1 x 3 x 4 = ${cost01} + 0 + ${splitAt1} = ${cost01 + splitAt1}. Better than the first split.`,
    {
      codeLine: 5,
      highlights: [
        { pos: [0, 2], kind: 'active', label: 'current interval' },
        { pos: [0, 1], kind: 'dependency', label: 'left part' },
      ],
      vars: { k: 1, cost: cost01 + splitAt1 },
    },
  );

  const answer = Math.min(cost12 + splitAt0, cost01 + splitAt1);
  const bestSplit = cost01 + splitAt1 <= cost12 + splitAt0 ? 1 : 0;
  rec.at(5).fill(
    [0, 2],
    answer,
    `Best split k = ${bestSplit}, so dp[0][2] = ${answer}. Parenthesisation: multiply 0..${bestSplit} first, then combine with the rest.`,
    {
      kind: 'result',
      codeLine: 5,
      highlights: [{ pos: [0, 1], kind: 'dependency', label: 'left part' }],
      vars: { i: 0, j: 2, bestSplit, answer },
    },
  );

  rec.at(7).record(
    `The answer is ${answer} — the minimum scalar multiplications for the whole chain. Notice the triangle: every cell depends on cells in the same row and column that are closer to the diagonal.`,
    {
      codeLine: 7,
      highlights: [{ pos: [0, 2], kind: 'result', label: 'answer' }],
      vars: { answer },
    },
  );

  return [...rec.steps];
}

const lesson: Lesson = {
  id: 'intervals',
  title: 'Interval DP: Grow Intervals by Length',
  category: 'intervals',
  summary:
    'Interval DP answers questions about contiguous ranges — substrings, subarrays, or chains of matrices. Define dp[i][j] for the range i..j, solve short ranges first, and build longer ranges by trying every split point. The answer usually lives at dp[0][n-1].',
  sections: [
    {
      heading: 'The state is a range',
      body: 'Reach for interval DP when the input is a sequence and the answer for a range i..j can be built from answers for smaller ranges inside it. Define dp[i][j] as a complete sentence: "the minimum cost to multiply matrices i..j", "the maximum coins from bursting balloons i..j", or "the fewest cuts so every piece of s[i..j] is a palindrome".\n\nOnly i <= j is meaningful, which is why the table is drawn as a triangle. The full answer is dp[0][n-1]; subranges are intermediate states, not separate problems. Write the state definition before choosing a recurrence — most interval-DP bugs are ambiguous state definitions.',
      bullets: [
        'dp[i][j] describes exactly the contiguous range i..j.',
        'Base cases are the shortest ranges: one element, or two boundary points.',
        'The final answer is usually dp[0][n-1].',
        'Draw the triangle: cells below the diagonal are unused.',
      ],
      callout: 'If your state needs information from outside the range, say so explicitly — Burst Balloons includes the two outside neighbours in its definition.',
    },
    {
      heading: 'Fill by length, not by index',
      body: 'A direct double loop over i and j can read a cell that has not been computed yet. Fill by increasing interval length instead. First solve every range of length 1, then length 2, then length 3, and so on. When computing length L, every split refers to ranges strictly shorter than L, so both sides are already final.\n\nIn the diagram, length 1 fills the diagonal with zeros, length 2 fills dp[0][1] and dp[1][2], and only then can length 3 compute dp[0][2]. There are O(n²) ranges; each tries O(n) split points, giving O(n³) time and O(n²) space. That is the standard interval-DP cost.',
      bullets: [
        'for length = 1..n: for i = 0..n-length: j = i + length - 1.',
        'Read only ranges shorter than the current length.',
        'O(n²) states x O(n) splits = O(n³) time.',
        'The triangle renderer exists to make this fill order visible.',
      ],
      callout: 'If a transition reads the same length, the recurrence is wrong or the state is missing information.',
    },
    {
      heading: 'Split, or choose the last operation',
      body: 'Most interval recurrences try a split k between i and j: dp[i][j] = best over k of combine(dp[i][k], dp[k+1][j]). Matrix Chain multiplies the left and right results last. Palindrome Partitioning II cuts between two palindromic pieces. Minimum Cost to Cut a Stick chooses the first cut and adds the current stick length.\n\nBurst Balloons flips the story: choose the balloon that is burst LAST in the interval. Once it is last, every other balloon inside is gone, so its neighbours are the fixed boundaries i-1 and j+1 and the left and right parts become independent. That gives dp[i][j] = max(dp[i][k-1] + dp[k+1][j] + nums[i-1] * nums[k] * nums[j+1]). Choosing the last action is the standard trick when actions change the neighbours of later actions.',
      bullets: [
        'Split pattern: combine dp[i][k] and dp[k+1][j].',
        'Cut pattern: add the cost of the current range, then recurse on both pieces.',
        'Last-operation pattern: freeze the boundaries, then solve left and right independently.',
        'Burst Balloons uses k-1 and k+1, so handle empty sides explicitly.',
      ],
      callout: 'When an operation changes the array, ask which operation happens last — then the rest of the range is already gone and the boundaries are stable.',
    },
    {
      heading: 'Variants and neighbouring shapes',
      body: 'Word Break looks like interval DP but only needs a suffix state dp[i] = "can s[i..] be split?", so a 1D table is enough. Split Array Largest Sum adds a part counter: dp[p][i] = best largest group when the first i numbers form p groups, and each cell tries every last cut. Both still read shorter ranges, but the dimension depends on what the state must remember.\n\nPalindrome Partitioning II, Matrix Chain, Burst Balloons and Minimum Cost to Cut a Stick all use the triangle. If a problem adds "at most k pieces", "k transactions", or "p parts", expect one extra dimension on top of the interval state. If it only asks about suffixes or prefixes, collapse the interval to a single index.',
      bullets: [
        'Matrix Chain / Burst Balloons / Cut Stick / Palindrome Partition II: triangle.',
        'Word Break: suffix dp[i], filled right to left.',
        'Split Array Largest Sum: dp[parts][prefix] with an extra dimension.',
        'Extra constraints usually add a dimension, not a new algorithm.',
      ],
      callout: 'Choose the smallest state that remembers everything the future needs; do not add a dimension out of habit.',
    },
    {
      heading: 'Common pitfalls',
      body: 'Boundary mistakes dominate. A single element usually costs 0, but a cut problem with two boundary points may need length 2 as its first real case. In Burst Balloons the subproblems are i..k-1 and k+1..j, not i..k and k..j — using the wrong pair double-counts the balloon. In Matrix Chain, dims[i] x dims[k+1] x dims[j+1] is the combine cost; writing dims[k] instead of dims[k+1] silently produces plausible wrong answers.\n\nAlso check the answer location and the fill direction. For suffix DP (Word Break) fill right to left and read dp[0]; for prefix DP (Split Array) fill forward and read dp[k][n]. Hand-check a two-element case and a one-element case before trusting a longer run, and make sure every transition reads a strictly shorter interval.',
      bullets: [
        'Base case: one element is usually 0, but cut problems may start at length 2.',
        'Burst Balloons: left part is i..k-1 and right part is k+1..j.',
        'Matrix Chain combine cost uses dims[k+1], not dims[k].',
        'Answer is dp[0][n-1] for the triangle, dp[0] for suffix DP, dp[k][n] for prefix-plus-parts.',
        'Test n = 1 and n = 2 by hand before trusting the animation.',
      ],
      callout: 'A correct-looking table can still be wrong: verify the final cell against a brute-force answer on a tiny input.',
    },
  ],
  diagram: {
    rendererId: 'intervalTriangle',
    steps: buildDiagramSteps(),
  },
};

export default lesson;
