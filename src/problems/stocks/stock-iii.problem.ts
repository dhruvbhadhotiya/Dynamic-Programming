import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface StockIIIInput {
  prices: number[];
}

const MAX_ITEMS = 8;

const pythonCode = [
  'def max_profit(prices):',
  '    n = len(prices)',
  '    h1 = h2 = -10**9',
  '    c1 = c2 = 0',
  '    dp = [0] * n',
  '    for i in range(n):',
  '        p = prices[i]',
  '        c2 = max(c2, h2 + p)',
  '        h2 = max(h2, c1 - p)',
  '        c1 = max(c1, h1 + p)',
  '        h1 = max(h1, -p)',
  '        dp[i] = c2',
  '',
  '    return c2',
].join('\n');

const javascriptCode = [
  'function maxProfit(prices) {',
  '  const n = prices.length;',
  '  let h1 = h2 = -1e9;',
  '  let c1 = c2 = 0;',
  '  const dp = new Array(n).fill(0);',
  '  for (let i = 0; i < n; i++) {',
  '    const p = prices[i];',
  '    c2 = Math.max(c2, h2 + p);',
  '    h2 = Math.max(h2, c1 - p);',
  '    c1 = Math.max(c1, h1 + p);',
  '    h1 = Math.max(h1, -p);',
  '    dp[i] = c2;',
  '  }',
  '  return c2;',
  '}',
].join('\n');

const cppCode = [
  'int maxProfit(vector<int>& prices) {',
  '  int n = prices.size();',
  '  int h1 = -1000000000, h2 = -1000000000;',
  '  int c1 = 0, c2 = 0;',
  '  vector<int> dp(n, 0);',
  '  for (int i = 0; i < n; i++) {',
  '    int p = prices[i];',
  '    c2 = max(c2, h2 + p);',
  '    h2 = max(h2, c1 - p);',
  '    c1 = max(c1, h1 + p);',
  '    h1 = max(h1, -p);',
  '    dp[i] = c2;',
  '  }',
  '  return c2;',
  '}',
].join('\n');

function makeRecorder(n: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n }, () => null),
      labels: Array.from({ length: n }, (_value, index) => `dp[${index}]`),
      indexName: 'i',
      caption: 'Stock III table dp[i] = best profit with at most 2 transactions using prices[0..i]',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  bestIndex: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(14).record(`The answer is ${answer}, the best profit with at most 2 transactions.`, {
    codeLine: 14,
    highlights: [{ pos: [bestIndex], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(prices: number[], memo: boolean): Step[] {
  const n = prices.length;
  const rec = makeRecorder(n);
  const dp: number[] = Array.from({ length: n }, () => 0);
  let computed = 0;
  let reused = 0;
  const neg = -1000000000;
  let h1 = neg;
  let h2 = neg;
  let c1 = 0;
  let c2 = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache the four state values (hold1, cash1, hold2, cash2) and reuse them each day instead of re-exploring every buy/sell pair.'
      : 'Tabulation: build dp bottom-up day by day. Each day updates the four states once, so dp[i] is final before day i+1.',
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n },
    },
  );

  let best = 0;
  let bestIndex = 0;

  if (n > 1) {
    rec.at(6).record(`Loop i = 0..${n - 1}: at each price, update the states in reverse order (c2, h2, c1, h1) so one day is never used twice.`, {
      codeLine: 6,
      highlights: [{ pos: [0], kind: 'active', label: 'dp[0]' }],
      vars: { computed, reused, n },
    });
  }

  for (let i = 0; i < n; i += 1) {
    const p = prices[i] ?? 0;
    const prevH1 = h1;
    const prevH2 = h2;
    const prevC1 = c1;
    const prevC2 = c2;
    c2 = Math.max(prevC2, prevH2 + p);
    h2 = Math.max(prevH2, prevC1 - p);
    c1 = Math.max(prevC1, prevH1 + p);
    h1 = Math.max(prevH1, -p);
    dp[i] = c2;
    computed += 1;
    reused += 1;
    if (i === 0) {
      best = c2;
      bestIndex = 0;
    } else if (c2 > best) {
      best = c2;
      bestIndex = i;
    }
    const dependency: Highlight | null =
      i > 0 ? { pos: [i - 1], kind: 'dependency', label: `dp[${i - 1}]` } : null;
    const extras: Highlight[] = dependency === null ? [] : [dependency];
    const stateText =
      `states after day ${i}: h1=${h1}, c1=${c1}, h2=${h2}, c2=${c2}`;
    rec.at(12).fill(
      [i],
      c2,
      i === 0
        ? `First price ${p}: h1 = max(-inf, -p) = ${h1}, so dp[0] = c2 = ${c2}. No sale is possible yet.`
        : memo
          ? `Cache hit: reuse states from day ${i - 1}; at price ${p}, c2 = max(${prevC2}, ${prevH2}+${p}) = ${c2}, so dp[${i}] = ${c2} (${stateText}).`
          : `At price ${p}, update in reverse: c2 = max(${prevC2}, ${prevH2}+${p}) = ${c2}, h2 = max(${prevH2}, ${prevC1}-${p}) = ${h2}, c1 = max(${prevC1}, ${prevH1}+${p}) = ${c1}, h1 = max(${prevH1}, -${p}) = ${h1}; dp[${i}] = ${c2}.`,
      {
        codeLine: 12,
        highlights: extras,
        vars: { best, computed, i, n, reused },
      },
    );
  }

  return finish(rec, bestIndex, best, { computed, reused, n });
}

function normalizeInput(input: StockIIIInput): number[] {
  const raw = Array.isArray(input.prices) ? input.prices : [];
  const cleaned = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, 20) : 0));
  return cleaned.length > 0 ? cleaned : [0];
}

const stockIIIModule: ProblemModule<StockIIIInput> = {
  id: 'stock-iii',
  title: 'Best Time to Buy and Sell Stock III',
  category: 'stocks',
  difficulty: 'medium',
  summary:
    'Maximize profit with at most 2 transactions. Four states (hold1, cash1, hold2, cash2) update in reverse order each day, and dp[i] records the best profit so far.',
  stateDefinition:
    'dp[i] = best profit with at most 2 transactions using prices[0..i]. h1/c1 track holding/cashed after transaction 1; h2/c2 after transaction 2.',
  recurrence:
    'c2 = max(c2, h2+p); h2 = max(h2, c1-p); c1 = max(c1, h1+p); h1 = max(h1, -p) (cash0 = 0); dp[i] = c2. The answer is c2 after the last day.',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'prices',
      label: 'prices',
      help: 'Daily prices; complete at most two buy-then-sell transactions.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 0,
      max: 20,
    },
  ],
  defaultInput: { prices: [3, 2, 6, 5, 0, 3] },
  modes: ['memo', 'tabulation'],
  generateSteps(input: StockIIIInput, mode: Mode): Step[] {
    const prices = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(prices, true);
    return iterativeSteps(prices, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the maximum profit with at most 2 transactions for [3, 2, 6, 5, 0, 3]?',
      options: ['7', '6', '5', '9'],
      answer: 0,
      why: 'Buy at 2 and sell at 6 (+4), then buy at 0 and sell at 3 (+3): total 7.',
    },
    {
      q: 'What is the maximum profit with at most 2 transactions for [2, 4, 1]?',
      options: ['2', '1', '0', '6'],
      answer: 0,
      why: 'The only profitable trade is buying at 2 and selling at 4 (+2); the drop to 1 allows no further gain.',
    },
    {
      q: 'Why are the four states updated in reverse order (c2, h2, c1, h1) each day?',
      options: ['So one day is not used for both a sell and a buy in the same step', 'So the array is sorted', 'To use less memory', 'To skip the last day'],
      answer: 0,
      why: 'Reverse order ensures every transition reads yesterday\'s states, so a single day cannot fund both a sale and the next purchase.',
    },
    {
      q: 'How does the 2-transaction machine differ from the 1-transaction machine?',
      options: ['It adds a second hold/cash pair (h2, c2)', 'It is identical', 'It needs an O(n^2) table', 'It cannot hold cash'],
      answer: 0,
      why: 'Stock I tracks one hold/cash pair; Stock III adds h2 (holding the second share) and c2 (profit after the second sale), so dp[i] = c2.',
    },
  ],
};

export default stockIIIModule;
