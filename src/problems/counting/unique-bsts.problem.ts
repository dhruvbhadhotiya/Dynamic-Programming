import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface UniqueBstsInput {
  n: number;
}

const MIN_N = 1;
const MAX_N = 10;

const pythonCode = [
  'def num_trees(n):',
  '    dp = [0] * (n + 1)',
  '    dp[0] = 1',
  '    if n >= 1: dp[1] = 1',
  '    for i in range(2, n + 1):',
  '        dp[i] = sum(dp[k] * dp[i - 1 - k] for k in range(i))',
  '    return dp[n]',
].join('\n');

const javascriptCode = [
  'function numTrees(n) {',
  '  const dp = new Array(n + 1).fill(0);',
  '  dp[0] = 1;',
  '  if (n >= 1) dp[1] = 1;',
  '  for (let i = 2; i <= n; i++)',
  '    dp[i] = Array.from({ length: i }, (_, k) => dp[k] * dp[i - 1 - k]).reduce((a, b) => a + b, 0);',
  '  return dp[n];',
  '}',
].join('\n');

const cppCode = [
  'int numTrees(int n) {',
  '  vector<int> dp(n + 1, 0);',
  '  dp[0] = 1;',
  '  if (n >= 1) dp[1] = 1;',
  '  for (int i = 2; i <= n; i++)',
  '    for (int k = 0; k < i; k++) dp[i] += dp[k] * dp[i - 1 - k];',
  '  return dp[n];',
  '}',
].join('\n');

function makeRecorder(n: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n + 1 }, () => null),
      labels: Array.from({ length: n + 1 }, (_value, index) => `dp[${index}]`),
      indexName: 'keys',
      caption: 'Unique BSTs: dp[i] = distinct BST shapes storing i ordered keys',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  n: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(7).record(
    `The answer is ${answer}: there are ${answer} distinct BST shape(s) storing ${n} ordered key(s).`,
    {
      codeLine: 7,
      highlights: [{ pos: [n], kind: 'result', label: 'answer' }],
      vars: { answer, n, ...extra },
    },
  );
  return [...rec.steps];
}

function splitHighlights(i: number, left: number): Highlight[] {
  const right = i - 1 - left;
  const highlights: Highlight[] = [
    { pos: [left], kind: 'dependency', label: `dp[${left}]` },
  ];
  if (right !== left) {
    highlights.push({ pos: [right], kind: 'dependency', label: `dp[${right}]` });
  }
  return highlights;
}

function memoSteps(n: number): Step[] {
  const rec = makeRecorder(n);
  const cache: (number | null)[] = Array.from({ length: n + 1 }, () => null);
  let computed = 0;
  let hits = 0;

  rec.at(1).record(
    `Memoization: solve(i) tries every key as the root. A root leaves left keys on one side and i-1-left on the other, so the subtree counts multiply. Cached values are reused.`,
    {
      codeLine: 1,
      highlights: [{ pos: [n], kind: 'active', label: `solve(${n})` }],
      vars: { n, computed, hits },
    },
  );

  const solve = (i: number): number => {
    const cached = cache[i] ?? null;
    if (cached !== null) {
      hits += 1;
      rec.at(6).record(
        `Cache hit: solve(${i}) = ${cached} is already stored, so this subtree count is reused instead of recomputed.`,
        {
          codeLine: 6,
          highlights: [{ pos: [i], kind: 'result', label: `memo[${i}]` }],
          vars: { i, cached, computed, hits },
        },
      );
      return cached;
    }

    if (i === 0 || i === 1) {
      cache[i] = 1;
      computed += 1;
      rec.at(i === 0 ? 3 : 4).fill(
        [i],
        1,
        i === 0
          ? 'Base case: the empty tree is one shape, so dp[0] = 1.'
          : 'Base case: a single key has exactly one BST, so dp[1] = 1.',
        {
          kind: 'base',
          codeLine: i === 0 ? 3 : 4,
          vars: { i, computed, hits },
        },
      );
      return 1;
    }

    let total = 0;
    for (let left = 0; left < i; left += 1) {
      const leftCount = solve(left);
      const rightCount = solve(i - 1 - left);
      const term = leftCount * rightCount;
      total += term;
      rec.at(6).record(
        `Root choice ${left + 1}: ${left} key(s) left of the root give dp[${left}] = ${leftCount}; ${i - 1 - left} key(s) right give dp[${i - 1 - left}] = ${rightCount}; term ${leftCount} * ${rightCount} = ${term}.`,
        {
          codeLine: 6,
          highlights: [
            { pos: [i], kind: 'active', label: `solve(${i})` },
            ...splitHighlights(i, left),
          ],
          vars: { i, root: left + 1, term, total, computed, hits },
        },
      );
    }

    cache[i] = total;
    computed += 1;
    rec.at(6).fill(
      [i],
      total,
      `Store solve(${i}) = ${total}: add up dp[left] * dp[right] for all ${i} root choices.`,
      {
        kind: 'result',
        codeLine: 6,
        vars: { i, total, computed, hits },
      },
    );
    return total;
  };

  const answer = solve(n);
  return finish(rec, n, answer, { computed, hits });
}

function tabulationSteps(n: number): Step[] {
  const rec = makeRecorder(n);
  const dp: number[] = Array.from({ length: n + 1 }, () => 0);
  let fills = 0;

  rec.at(1).record(
    `Tabulation: fill dp[0..${n}] left to right. Each dp[i] sums dp[left] * dp[right] over all i possible root positions.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { n, fills: 0 },
    },
  );

  dp[0] = 1;
  fills += 1;
  rec.at(3).fill([0], 1, 'Base case: the empty tree is one shape, so dp[0] = 1.', {
    kind: 'base',
    codeLine: 3,
    vars: { n, fills },
  });

  dp[1] = 1;
  fills += 1;
  rec.at(4).fill([1], 1, 'Base case: a single key has exactly one BST, so dp[1] = 1.', {
    kind: 'base',
    codeLine: 4,
    vars: { n, fills },
  });

  for (let i = 2; i <= n; i += 1) {
    let total = 0;
    for (let left = 0; left < i; left += 1) {
      const term = (dp[left] ?? 0) * (dp[i - 1 - left] ?? 0);
      total += term;
      rec.at(6).record(
        `Root ${left + 1}: dp[${left}] * dp[${i - 1 - left}] = ${dp[left] ?? 0} * ${dp[i - 1 - left] ?? 0} = ${term}; running sum ${total}.`,
        {
          codeLine: 6,
          highlights: [
            { pos: [i], kind: 'active', label: `dp[${i}]` },
            ...splitHighlights(i, left),
          ],
          vars: { i, root: left + 1, term, total, fills },
        },
      );
    }

    dp[i] = total;
    fills += 1;
    rec.at(6).fill(
      [i],
      total,
      `dp[${i}] = ${total}: all ${i} root splits summed. Smaller key counts were already final.`,
      {
        kind: 'result',
        codeLine: 6,
        vars: { i, total, fills },
      },
    );
  }

  return finish(rec, n, dp[n] ?? 0, { fills });
}

function normalizeInput(input: UniqueBstsInput): number {
  const raw = typeof input.n === 'number' && Number.isFinite(input.n) ? Math.round(input.n) : MIN_N;
  return clamp(raw, MIN_N, MAX_N);
}

const uniqueBstsModule: ProblemModule<UniqueBstsInput> = {
  id: 'unique-bsts',
  title: 'Unique Binary Search Trees',
  category: 'counting',
  difficulty: 'medium',
  summary:
    'Count the distinct BST shapes that store n ordered keys. Choosing each key as the root splits the remaining keys into a left and a right subtree, whose shape counts multiply. Memoization caches each key count and tabulation fills dp left to right.',
  stateDefinition:
    'dp[i] = number of distinct binary search tree shapes storing i ordered keys, for 0 <= i <= n. dp[0] counts the empty tree.',
  recurrence:
    'dp[0] = 1; dp[1] = 1; for i >= 2, dp[i] = sum over root = 1..i of dp[root-1] * dp[i-root]. Equivalently dp[i] = sum over left = 0..i-1 of dp[left] * dp[i-1-left].',
  complexity: { time: 'O(n²)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'n',
      label: 'n',
      help: 'Number of ordered keys. n = 5 gives 42 distinct BST shapes.',
      type: 'number',
      min: MIN_N,
      max: MAX_N,
      step: 1,
    },
  ],
  defaultInput: { n: 5 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: UniqueBstsInput, mode: Mode): Step[] {
    const n = normalizeInput(input);
    return mode === 'memo' ? memoSteps(n) : tabulationSteps(n);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'How many distinct BST shapes store 5 ordered keys?',
      options: ['42', '14', '132', '30'],
      answer: 0,
      why: 'The counts are Catalan numbers: dp[0..5] = 1, 1, 2, 5, 14, 42.',
    },
    {
      q: 'What is the recurrence for dp[i]?',
      options: [
        'sum over root of dp[root-1] * dp[i-root]',
        'dp[i-1] + dp[i-2]',
        '2 * dp[i-1]',
        'i * dp[i-1]',
      ],
      answer: 0,
      why: 'Each root choice splits the remaining keys into independent left and right subtrees, so their shape counts multiply and the products add up.',
    },
    {
      q: 'Why is dp[0] defined as 1?',
      options: [
        'The empty tree counts as one shape, which makes dp[2] = 2',
        'Because zero keys cannot form a tree',
        'Because every tree has an empty root',
        'It is only a placeholder and never used',
      ],
      answer: 0,
      why: 'When the root takes one key, one side may have zero keys. Counting that empty side once gives dp[2] = dp[0]*dp[1] + dp[1]*dp[0] = 2.',
    },
    {
      q: 'What are the time and space complexities for n keys?',
      options: ['O(n²) time, O(n) space', 'O(n) time, O(n) space', 'O(2^n) time, O(n) space', 'O(n²) time, O(n²) space'],
      answer: 0,
      why: 'Each dp[i] sums i root splits, so the total work is 1 + 2 + ... + n = O(n²); only the one-dimensional table is stored.',
    },
  ],
};

export default uniqueBstsModule;
