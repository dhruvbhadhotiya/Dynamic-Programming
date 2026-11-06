import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface StockInput {
  prices: number[];
}

const MAX_ITEMS = 8;

const pythonCode = [
  'def max_profit(prices):',
  '    n = len(prices)',
  '    dp = [0] * n',
  '    min_price = prices[0]',
  '    for i in range(1, n):',
  '        dp[i] = max(dp[i - 1], prices[i] - min_price)',
  '        if prices[i] < min_price:',
  '            min_price = prices[i]',
  '    return dp[n - 1]',
].join('\n');

const javascriptCode = [
  'function maxProfit(prices) {',
  '  const n = prices.length;',
  '  const dp = new Array(n).fill(0);',
  '  let minPrice = prices[0];',
  '  for (let i = 1; i < n; i++) {',
  '    dp[i] = Math.max(dp[i - 1], prices[i] - minPrice);',
  '    if (prices[i] < minPrice) minPrice = prices[i];',
  '  }',
  '  return dp[n - 1];',
  '}',
].join('\n');

const cppCode = [
  'int maxProfit(vector<int>& prices) {',
  '  int n = prices.size();',
  '  vector<int> dp(n, 0);',
  '  int minPrice = prices[0];',
  '  for (int i = 1; i < n; i++) {',
  '    dp[i] = max(dp[i - 1], prices[i] - minPrice);',
  '    if (prices[i] < minPrice) minPrice = prices[i];',
  '  }',
  '  return dp[n - 1];',
  '}',
].join('\n');

function makeRecorder(n: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n }, () => null),
      labels: Array.from({ length: n }, (_value, index) => `best[${index}]`),
      indexName: 'i',
      caption: 'Stock I table dp[i] = best profit using prices up to day i',
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
  rec.at(9).record(`The answer is dp[n - 1] = ${answer}, the best profit with one transaction.`, {
    codeLine: 9,
    highlights: [{ pos: [bestIndex], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(prices: number[], memo: boolean): Step[] {
  const n = prices.length;
  const rec = makeRecorder(n);
  const dp: number[] = Array.from({ length: n }, () => 0);
  const initialMin = prices[0] ?? 1;
  let minPrice = initialMin;
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: remember the cheapest price seen so far in min_price, then reuse it for each new day to price a sale.'
      : 'Tabulation: build dp bottom-up from day 0. Each best-profit value is final before the next day uses it.',
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { computed: 0, minPrice, n, reused: 0 },
    },
  );

  rec.at(3).fill(
    [0],
    0,
    `Base case: with only prices[0] = ${initialMin} seen, no transaction has happened yet, so dp[0] = 0. min_price starts at prices[0] = ${initialMin}.`,
    {
      kind: 'base',
      codeLine: 3,
      vars: { computed: 1, minPrice, n, reused: 0 },
    },
  );
  computed = 1;
  let best = 0;
  let bestIndex = 0;

  if (n > 1) {
    rec.at(5).record(`Loop i = 1..${n - 1}: consider selling on day i at prices[i], using the cheapest buy day seen before it.`, {
      codeLine: 5,
      highlights: [{ pos: [1], kind: 'active', label: 'best[1]' }],
      vars: { computed, minPrice, n, reused },
    });
  }

  for (let i = 1; i < n; i += 1) {
    const price = prices[i] ?? 0;
    const prev = dp[i - 1] ?? 0;
    const candidate = price - minPrice;
    dp[i] = Math.max(prev, candidate);
    computed += 1;
    reused += 1;
    if ((dp[i] ?? 0) > best) {
      best = dp[i] ?? 0;
      bestIndex = i;
    }
    const oldMin = minPrice;
    if (price < minPrice) minPrice = price;
    const dependency: Highlight = { pos: [i - 1], kind: 'dependency', label: `best[${i - 1}]` };
    rec.at(6).fill(
      [i],
      dp[i] ?? 0,
      memo
        ? `Cache hit: reuse min_price = ${oldMin} from earlier days; candidate = prices[${i}] - ${oldMin} = ${candidate}; dp[${i}] = max(dp[${i - 1}] = ${prev}, ${candidate}) = ${dp[i] ?? 0}. ${candidate >= prev ? 'Selling today wins.' : 'Keeping the earlier best wins.'} min_price becomes ${minPrice}.`
        : `dp[${i}] = max(dp[${i - 1}] = ${prev}, prices[${i}] = ${price} - min_price ${oldMin} = ${candidate}) = ${dp[i] ?? 0}. ${candidate >= prev ? 'Selling today wins.' : 'Keeping the earlier best wins.'} min_price becomes ${minPrice}. Best so far is ${best}.`,
      {
        codeLine: 6,
        highlights: [dependency],
        vars: { best, candidate, computed, i, minPrice, n, reused },
      },
    );
  }

  return finish(rec, bestIndex, best, { computed, minPrice, n, reused });
}

function normalizeInput(input: StockInput): number[] {
  const raw = Array.isArray(input.prices) ? input.prices : [];
  const cleaned = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 20) : 1));
  return cleaned.length > 0 ? cleaned : [1];
}

const stockIModule: ProblemModule<StockInput> = {
  id: 'stock-i',
  title: 'Best Time to Buy and Sell Stock I',
  category: 'stocks',
  difficulty: 'easy',
  summary:
    'Given daily prices, buy once and sell once on a later day for the maximum profit, or do nothing for 0. Memoization reuses the cheapest price seen so far; tabulation fills dp bottom-up, so both run in linear time.',
  stateDefinition: 'dp[i] = maximum profit achievable with at most one transaction considering prices[0..i].',
  recurrence:
    'dp[0] = 0; dp[i] = max(dp[i - 1], prices[i] - minPrice) where minPrice is the cheapest price before day i (updated after computing dp[i]). The answer is dp[n - 1].',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'prices',
      label: 'prices',
      help: 'Daily prices; buy once and sell once on a later day for the maximum profit.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 1,
      max: 20,
    },
  ],
  defaultInput: { prices: [7, 1, 5, 3, 6, 4] },
  modes: ['memo', 'tabulation'],
  generateSteps(input: StockInput, mode: Mode): Step[] {
    const prices = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(prices, true);
    return iterativeSteps(prices, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the maximum profit for prices [7, 1, 5, 3, 6, 4] with one transaction?',
      options: ['5', '4', '6', '0'],
      answer: 0,
      why: 'Buy at 1 and sell at 6 for a profit of 5; no other pair does better.',
    },
    {
      q: 'What is the maximum profit for prices [7, 6, 4, 3, 2, 1] with one transaction?',
      options: ['0', '1', '-1', '6'],
      answer: 0,
      why: 'Prices only fall, so every buy-then-sell pair loses money; doing nothing gives 0.',
    },
    {
      q: 'What does min_price track, and when does dp[i] use it?',
      options: [
        'The cheapest price seen before day i; dp[i] = max(dp[i - 1], prices[i] - min_price)',
        'The latest price; dp[i] = dp[i - 1] + prices[i]',
        'The most expensive price; dp[i] = max_price - prices[i]',
        'dp[i - 1] itself; dp[i] = dp[i - 1] + min_price',
      ],
      answer: 0,
      why: 'Selling on day i is best after the cheapest earlier buy, so compare keeping the best past profit vs selling today.',
    },
    {
      q: 'How do memoization and tabulation compare to trying every buy/sell pair?',
      options: ['O(n) vs O(n^2)', 'O(n^2) vs O(n)', 'The same', 'O(n) vs O(2^n)'],
      answer: 0,
      why: 'Both DP passes touch each day once in O(n); enumerating every buy and later sell pair takes O(n^2) time.',
    },
  ],
};

export default stockIModule;
