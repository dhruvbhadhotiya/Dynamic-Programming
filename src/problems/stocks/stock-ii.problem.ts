import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface StockIIInput {
  prices: number[];
}

const MAX_ITEMS = 8;
const MAX_PRICE = 20;

const pythonCode = [
  'def max_profit(prices):',
  '    n = len(prices)',
  '    cash = [0] * n',
  '    hold = -prices[0]',
  '    for i in range(1, n):',
  '        cash[i] = max(cash[i - 1], hold + prices[i]); hold = max(hold, cash[i - 1] - prices[i])',
  '    return cash[-1]',
].join('\n');

const javascriptCode = [
  'function maxProfit(prices) {',
  '  const n = prices.length;',
  '  const cash = new Array(n).fill(0);',
  '  let hold = -prices[0];',
  '  for (let i = 1; i < n; i++)',
  '    cash[i] = Math.max(cash[i - 1], hold + prices[i]); hold = Math.max(hold, cash[i - 1] - prices[i]);',
  '  return cash[n - 1];',
  '}',
].join('\n');

const cppCode = [
  'int maxProfit(vector<int>& prices) {',
  '  int n = prices.size();',
  '  vector<int> cash(n, 0);',
  '  int hold = -prices[0];',
  '  for (int i = 1; i < n; i++)',
  '    cash[i] = max(cash[i-1], hold + prices[i]); hold = max(hold, cash[i-1] - prices[i]);',
  '  return cash[n-1];',
  '}',
].join('\n');

function makeRecorder(n: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n }, () => null),
      labels: Array.from({ length: n }, (_value, index) => `cash[${index}]`),
      indexName: 'i',
      caption: 'Stock II table cash[i] = best profit up to day i, not holding stock',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  lastIndex: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(7).record(`The answer is cash[${lastIndex}] = ${answer}, the best profit without holding stock.`, {
    codeLine: 7,
    highlights: [{ pos: [lastIndex], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(prices: number[], memo: boolean): Step[] {
  const n = prices.length;
  const rec = makeRecorder(n);
  const cash: number[] = Array.from({ length: n }, () => 0);
  let hold = -(prices[0] ?? 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: remember the best profit with and without a share, then reuse cash[i - 1] and hold for each new day.'
      : 'Tabulation: build cash bottom-up day by day. Each cash[i] is final before the next day uses it.',
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n },
    },
  );

  cash[0] = 0;
  rec.at(4).fill(
    [0],
    0,
    `Base case: cash[0] = 0 (no completed trade yet) and hold = -prices[0] = ${hold} (bought on day 0).`,
    {
      kind: 'base',
      codeLine: 4,
      vars: { computed: 1, hold, n, reused: 0 },
    },
  );
  computed = 1;

  if (n > 1) {
    rec.at(5).record(`Loop i = 1..${n - 1}: each day either sell the share held from before, keep cash, keep holding, or buy today.`, {
      codeLine: 5,
      highlights: [{ pos: [1], kind: 'active', label: 'cash[1]' }],
      vars: { computed, hold, n, reused },
    });
  }

  for (let i = 1; i < n; i += 1) {
    const prevCash = cash[i - 1] ?? 0;
    const price = prices[i] ?? 0;
    const sell = hold + price;
    const nextCash = Math.max(prevCash, sell);
    const nextHold = Math.max(hold, prevCash - price);
    cash[i] = nextCash;
    computed += 1;
    reused += 1;
    const sellText =
      sell > prevCash
        ? `Selling today wins (${sell} > ${prevCash}).`
        : `Keeping cash wins for now (${sell} <= ${prevCash}).`;
    const buyText =
      prevCash - price > hold
        ? `Buying today improves hold to ${nextHold}.`
        : `Keeping the existing share wins (${nextHold} = max(${hold}, ${prevCash - price})).`;
    const message = memo
      ? `Cache hit: reuse cash[${i - 1}] = ${prevCash} and hold = ${hold}; cash[${i}] = max(${prevCash}, ${hold} + ${price}) = ${nextCash}. ${sellText} ${buyText}`
      : `cash[${i}] = max(cash[${i - 1}] = ${prevCash}, hold + prices[${i}] = ${sell}) = ${nextCash}. ${sellText} Updated hold = max(${hold}, ${prevCash} - ${price}) = ${nextHold}. ${buyText}`;
    rec.at(6).fill([i], nextCash, message, {
      codeLine: 6,
      highlights: [{ pos: [i - 1], kind: 'dependency', label: `cash[${i - 1}]` }],
      vars: { cash: nextCash, computed, hold: nextHold, i, n, reused },
    });
    hold = nextHold;
  }

  return finish(rec, n - 1, cash[n - 1] ?? 0, { computed, hold, n, reused });
}

function normalizeInput(input: StockIIInput): number[] {
  const raw = Array.isArray(input.prices) ? input.prices : [];
  const cleaned = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, MAX_PRICE) : 0));
  return cleaned.length > 0 ? cleaned : [0];
}

const stockIIModule: ProblemModule<StockIIInput> = {
  id: 'stock-ii',
  title: 'Best Time to Buy and Sell Stock II',
  category: 'stocks',
  difficulty: 'medium',
  summary:
    'Buy and sell one share any number of times to maximize profit. The cash and hold states track the best profit without and with a share; memoization reuses them and tabulation fills cash bottom-up in O(n).',
  stateDefinition:
    'cash[i] = maximum profit using prices[0..i] without holding stock at the end of day i; hold[i] = maximum profit using prices[0..i] while holding one share. The table stores cash[i].',
  recurrence:
    'cash[0] = 0, hold[0] = -prices[0]; cash[i] = max(cash[i - 1], hold[i - 1] + prices[i]); hold[i] = max(hold[i - 1], cash[i - 1] - prices[i]). The answer is cash[n - 1].',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'prices',
      label: 'prices',
      help: 'Daily prices; you may buy and sell one share any number of times.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 0,
      max: MAX_PRICE,
    },
  ],
  defaultInput: { prices: [7, 1, 5, 3, 6, 4] },
  modes: ['memo', 'tabulation'],
  generateSteps(input: StockIIInput, mode: Mode): Step[] {
    return iterativeSteps(normalizeInput(input), mode === 'memo');
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the maximum profit for prices [7, 1, 5, 3, 6, 4] with unlimited transactions?',
      options: ['5', '7', '4', '9'],
      answer: 1,
      why: 'Buy at 1 and sell at 5, then buy at 3 and sell at 6: (5 - 1) + (6 - 3) = 7.',
    },
    {
      q: 'What is the maximum profit for prices [6, 5, 4, 3, 2, 1] with unlimited transactions?',
      options: ['0', '5', '1', '-1'],
      answer: 0,
      why: 'Prices only fall, so every trade loses money; the best choice is to never trade, for profit 0.',
    },
    {
      q: 'What is the recurrence for cash[i], the best profit up to day i without holding stock?',
      options: [
        'max(cash[i - 1], hold[i - 1] + prices[i])',
        'cash[i - 1] + prices[i]',
        'hold[i - 1] + prices[i]',
        'max(cash[i - 1], prices[i])',
      ],
      answer: 0,
      why: 'Either keep the previous cash, or sell the share held since an earlier day at today\'s price prices[i].',
    },
    {
      q: 'Why does unlimited trading capture every upward move?',
      options: [
        'Prices always rise at least once',
        'You must hold from the first day to the last day',
        'Selling before a dip and rebuying after captures each upward move',
        'Transaction fees are always zero',
      ],
      answer: 2,
      why: 'There is no limit on trades, so selling before a dip and rebuying afterwards banks each rise separately.',
    },
  ],
};

export default stockIIModule;
