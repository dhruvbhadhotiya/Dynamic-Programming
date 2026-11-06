import { StepRecorder } from '../engine/dpHelpers';
import type { Lesson } from '../engine/lessonTypes';
import type { Step, Table1DState } from '../engine/types';

function buildDiagramSteps(): Step[] {
  const n = 5;
  const rec = new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n + 1 }, () => null),
      labels: Array.from({ length: n + 1 }, (_value, index) => `ways(${index})`),
      indexName: 'i',
      caption: 'Climbing-stairs table dp[i] = ways to reach step i',
    },
    { codeLine: 1 },
  );

  rec.at(1).record(
    'Tabulation: build the table bottom-up for n = 5. Smaller cells are final before larger ones.',
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { n, i: 0 },
    },
  );

  rec.at(3).fill([0], 1, 'Base case: ways(0) = 1 — one way to stand at the ground.', {
    kind: 'base',
    codeLine: 3,
    vars: { n, i: 0, answer: 1 },
  });

  rec.at(4).fill([1], 1, 'Base case: ways(1) = 1 — one single step.', {
    kind: 'base',
    codeLine: 4,
    vars: { n, i: 1, answer: 1 },
  });

  const dp: number[] = [1, 1, 0, 0, 0, 0];

  for (let i = 2; i <= n; i += 1) {
    const left = dp[i - 1] ?? 0;
    const right = dp[i - 2] ?? 0;
    const value = left + right;
    dp[i] = value;
    rec.at(6).fill(
      [i],
      value,
      `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${left} + ${right} = ${value}. Both dependencies are already final.`,
      {
        codeLine: 6,
        highlights: [
          { pos: [i - 1], kind: 'dependency', label: `ways(${i - 1})` },
          { pos: [i - 2], kind: 'dependency', label: `ways(${i - 2})` },
        ],
        vars: { n, i, answer: value },
      },
    );
  }

  rec.at(7).record('The answer is ways(5) = 8.', {
    codeLine: 7,
    highlights: [{ pos: [5], kind: 'result', label: 'answer' }],
    vars: { n, answer: 8 },
  });

  return [...rec.steps];
}

const lesson: Lesson = {
  id: '1d',
  title: '1D Dynamic Programming',
  category: '1d',
  summary:
    '1D DP turns a recurrence into a left-to-right table — the shared idea behind Climbing Stairs (ways(n) = ways(n-1) + ways(n-2)), Fibonacci, House Robber and other linear problems. Name a state, write its recurrence, then fill each cell once.',
  sections: [
    {
      heading: 'Overlapping subproblems',
      body: 'Some problems break into smaller copies of themselves. Climbing stairs does: ways(5) needs ways(4) and ways(3), and both of those need ways(3) and ways(2) again. A naive recursion follows every branch and recomputes the same answers over and over.\n\nThat is overlapping subproblems: many distinct calls, but very few distinct questions. For stairs there are only n + 1 values to find — ways(0) through ways(n) — so recomputing them is pure waste. The same overlap makes naive fib(n) exponential even though there are only n + 1 fib values.',
      bullets: [
        'ways(4) calls ways(3) and ways(2); ways(3) calls ways(2) again — ways(2) is computed twice.',
        'fib(5) computes fib(3) twice for the same reason.',
        'Only n + 1 distinct values exist, but brute force explores about 2^n calls.',
      ],
      callout: 'If the same subproblem appears again and again, dynamic programming pays for it once and reuses it.',
    },
    {
      heading: 'State & recurrence',
      body: 'A state is one sentence that names what a table cell means. For climbing stairs: dp[i] = ways(i), the number of distinct ways to reach step i. From step i you must have arrived from i - 1 (one step) or i - 2 (two steps), so ways(i) = ways(i - 1) + ways(i - 2).\n\nFibonacci has the identical shape with different labels: dp[i] = fib(i), with fib(i) = fib(i - 1) + fib(i - 2). The recurrence is the same skeleton; only the meaning of dp[i] and the bases change. That is why mastering one 1D recurrence transfers to the next.',
      bullets: [
        'Stairs: ways(0) = 1, ways(1) = 1, and ways(n) = ways(n-1) + ways(n-2) for n >= 2.',
        'Fib: fib(0) = 0, fib(1) = 1, and fib(n) = fib(n-1) + fib(n-2) for n >= 2.',
        'In words: every way to reach i ends with a 1-step or a 2-step move — count both groups.',
      ],
      callout: 'Write dp[i] in a full sentence first. If you cannot say what it counts, you cannot write the recurrence.',
    },
    {
      heading: 'Base cases & building the table',
      body: 'Base cases are the smallest states you can answer by definition, with no recurrence needed. For stairs they are ways(0) = 1 (one way to stand at the ground) and ways(1) = 1 (one single step). Fill them first and treat them as final — later steps must never overwrite them.\n\nThen build left-to-right: for i = 2 to n, set dp[i] = dp[i - 1] + dp[i - 2]. For n = 5 the walk is 1, 1, 2, 3, 5, 8: dp[2] = 1 + 1, dp[3] = 2 + 1, dp[4] = 3 + 2, dp[5] = 5 + 3. Each cell reads only cells that are already final, so the table grows in a safe order.',
      bullets: [
        'Bases first: dp[0] and dp[1] come from definitions, not from the loop.',
        'Then increase i: by the time you write dp[i], both dp[i - 1] and dp[i - 2] are done.',
        'Answer: ways(5) = 8 — the last cell of the table.',
      ],
      callout: 'If your recurrence reads dp[i - 1] and dp[i - 2], fill i in increasing order.',
    },
    {
      heading: 'Memoization vs tabulation',
      body: 'Memoization is top-down: write the recursion you want, but cache each answer the first time you compute it. It only computes states you actually need, and the code mirrors the recurrence. Its costs are recursion depth, repeated cache lookups, and a less explicit fill order.\n\nTabulation is bottom-up: fill the table iteratively from the bases in a chosen order. There is no recursion, and the order is explicit, which usually makes the code faster and easier to step through. Its cost is that you may compute cells the recursion never needed.\n\nBoth compute the same recurrence with the same O(n) time and O(n) space for stairs and fib; they differ only in schedule — memoized asks on demand, tabulated fills in order.',
      bullets: [
        'Memo: recursion + cache; only reachable states are computed.',
        'Tabulation: loop + table; every cell is written in a fixed order.',
        'Recurrence and complexity are identical; choose based on clarity and stack limits.',
      ],
      callout: 'Same recurrence, same answer, two schedules: memo asks on demand, tabulation fills in order.',
    },
    {
      heading: 'Common pitfalls',
      body: 'Most 1D bugs are not arithmetic — they are setup. The classic is the ground state: counting ways(0) as 0 instead of 1 shifts the whole table, because the empty climb is one valid way to start. Always test your bases against the smallest cases by hand before trusting the loop.\n\nThe second classic is order: writing dp[i] before dp[i - 1] and dp[i - 2] are final. If you ever read a cell that is still empty (null in the animation), your fill order is wrong. The third is recomputation: a recursion without memo or tabulation will pass tiny samples and time out on real inputs.',
      bullets: [
        'Off-by-one on dp[0]: ways(0) = 1 for counting, not 0 — verify with n = 1 and n = 2.',
        'Wrong fill order: never read dp[i - 1] / dp[i - 2] before they are computed.',
        'Missing cache: recursion without memo is exponential on overlapping problems.',
        'Overwriting bases: the loop must start after the last base index.',
      ],
      callout: 'Check the first two or three table values by hand — if they are wrong, the loop will not save you.',
    },
  ],
  diagram: {
    rendererId: 'table1d',
    steps: buildDiagramSteps(),
  },
};

export default lesson;
