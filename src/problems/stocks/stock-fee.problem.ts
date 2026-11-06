import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface StockFeeInput {
  prices: number[];
  fee: number;
}

const MAX_ITEMS = 8;
const MAX_PRICE = 20;
const MAX_FEE = 5;

const pythonCode = [
  'def max_profit(prices, fee):',
  '    n = len(prices)',
  '    cash = [0] * n',
  '    hold = -prices[0]',
  '    for i in range(1, n):',
  '        cash[i] = max(cash[i - 1], hold + prices[i] - fee); hold = max(hold, cash[i - 1] - prices[i])',
  '    return cash[-1]',
].join('\n');

const javascriptCode = [
  'function maxProfit(prices, fee) {',
  '  const n = prices.length;',
  '  const cash = new Array(n).fill(0);',
  '  let hold = -prices[0];',
  '  for (let i = 1; i < n; i++)',
  '    cash[i] = Math.max(cash[i - 1], hold + prices[i] - fee); hold = Math.max(hold, cash[i - 1] - prices[i]);',
  '  return cash[n - 1];',
  '}',
].join('\n');

const cppCode = [
  'int maxProfit(vector<int>& prices, int fee) {',
  '  int n = prices.size();',
  '  vector<int> cash(n, 0);',
  '  int hold = -prices[0];',
  '  for (int i = 1; i < n; i++)',
  '    cash[i] = max(cash[i-1], hold + prices[i] - fee); hold = max(hold, cash[i-1] - prices[i]);',
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
      caption: 'Stock with fee table cash[i] = best profit up to day i, not holding stock (fee charged on sale)',
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
  rec.at(7).record(`The answer is cash[${lastIndex}] = ${answer}, the best profit without holding stock after fees.`, {
    codeLine: 7,
    highlights: [{ pos: [lastIndex], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(prices: number[], fee: number, memo: boolean): Step[] {
  const n = prices.length;
  const rec = makeRecorder(n);
  const cash: number[] = Array.from({ length: n }, () => 0);
  let hold = -(prices[0] ?? 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? `Memoization: remember the best profit with and without a share, then reuse cash[i - 1] and hold for each new day. Fee ${fee} is charged on each sale.`
      : `Tabulation: build cash bottom-up day by day. Each cash[i] is final before the next day uses it. Fee ${fee} is charged on each sale.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { computed: 0, fee, n, reused: 0 },
    },
  );

  cash[0] = 0;
  rec.at(4).fill(
    [0],
    0,
    `Base case: cash[0] = 0 (no completed trade yet) and hold = -prices[0] = ${hold} (bought on day 0, fee not yet paid).`,
    {
      kind: 'base',
      codeLine: 4,
      vars: { computed: 1, fee, hold, n, reused: 0 },
    },
  );
  computed = 1;

  if (n > 1) {
    rec.at(5).record(
      `Loop i = 1..${n - 1}: each day either sell the share held from before (paying fee ${fee}), keep cash, keep holding, or buy today.`,
      {
        codeLine: 5,
        highlights: [{ pos: [1], kind: 'active', label: 'cash[1]' }],
        vars: { computed, fee, hold, n, reused },
      },
    );
  }

  for (let i = 1; i < n; i += 1) {
    const prevCash = cash[i - 1] ?? 0;
    const price = prices[i] ?? 0;
    const sell = hold + price - fee;
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
      ? `Cache hit: reuse cash[${i - 1}] = ${prevCash} and hold = ${hold}; cash[${i}] = max(${prevCash}, ${hold} + ${price} - ${fee}) = ${nextCash}. ${sellText} ${buyText}`
      : `cash[${i}] = max(cash[${i - 1}] = ${prevCash}, hold + prices[${i}] - fee = ${sell}) = ${nextCash}. ${sellText} Updated hold = max(${hold}, ${prevCash} - ${price}) = ${nextHold}. ${buyText}`;
    rec.at(6).fill([i], nextCash, message, {
      codeLine: 6,
      highlights: [{ pos: [i - 1], kind: 'dependency', label: `cash[${i - 1}]` }],
      vars: { cash: nextCash, computed, fee, hold: nextHold, i, n, reused },
    });
    hold = nextHold;
  }

  return finish(rec, n - 1, cash[n - 1] ?? 0, { computed, fee, hold, n, reused });
}

function normalizeInput(input: StockFeeInput): { prices: number[]; fee: number } {
  const raw = Array.isArray(input.prices) ? input.prices : [];
  const prices = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, MAX_PRICE) : 0));
  const fee = typeof input.fee === 'number' && Number.isFinite(input.fee) ? clamp(Math.trunc(input.fee), 0, MAX_FEE) : 0;
  return { prices: prices.length > 0 ? prices : [0], fee };
}

const stockFeeModule: ProblemModule<StockFeeInput> = {
  id: 'stock-fee',
  title: 'Best Time to Buy and Sell Stock with Transaction Fee',
  category: 'stocks',
  difficulty: 'medium',
  summary:
    'Buy and sell one share any number of times with a fee per completed transaction. The cash and hold states track the best profit without and with a share; the fee is subtracted on each sale.',
  stateDefinition:
    'cash[i] = maximum profit using prices[0..i] without holding stock at the end of day i; hold[i] = maximum profit using prices[0..i] while holding one share. The table stores cash[i].',
  recurrence:
    'cash[0] = 0, hold[0] = -prices[0]; cash[i] = max(cash[i - 1], hold[i - 1] + prices[i] - fee); hold[i] = max(hold[i - 1], cash[i - 1] - prices[i]). The answer is cash[n - 1].',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'prices',
      label: 'prices',
      help: 'Daily prices; you may buy and sell one share any number of times, paying fee per sale.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 0,
      max: MAX_PRICE,
    },
    {
      name: 'fee',
      label: 'fee',
      help: 'Transaction fee charged once per completed sale (buy then sell).',
      type: 'number',
      min: 0,
      max: MAX_FEE,
    },
  ],
  defaultInput: { prices: [1, 3, 2, 8, 4, 10], fee: 2 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: StockFeeInput, mode: Mode): Step[] {
    const { prices, fee } = normalizeInput(input);
    return iterativeSteps(prices, fee, mode === 'memo');
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the maximum profit for prices [1, 3, 2, 8, 4, 10] with fee 2?',
      options: ['8', '9', '14', '10'],
      answer: 1,
      why: 'Buy at 1 and sell at 8 for (8 - 1 - 2) = 5, then buy at 4 and sell at 10 for (10 - 4 - 2) = 4; total 9.',
    },
    {
      q: 'What is the maximum profit for prices [1, 3, 2, 8, 4, 10] with fee 0?',
      options: ['8', '9', '14', '6'],
      answer: 2,
      why: 'With no fee, capture every rise: (3 - 1) + (8 - 2) + (10 - 4) = 2 + 6 + 6 = 14.',
    },
    {
      q: 'What is the maximum profit for prices [6, 5, 4, 3, 2, 1] with fee 2?',
      options: ['0', '5', '1', '-1'],
      answer: 0,
      why: 'Prices only fall, so every sale loses money after the fee; the best choice is to never trade, for profit 0.',
    },
    {
      q: 'What is the recurrence for cash[i], the best profit up to day i without holding stock?',
      options: [
        'max(cash[i - 1], hold[i - 1] + prices[i] - fee)',
        'cash[i - 1] + prices[i]',
        'hold[i - 1] + prices[i]',
        'max(cash[i - 1], prices[i] - fee)',
      ],
      answer: 0,
      why: 'Either keep the previous cash, or sell the share held since an earlier day at today\'s price minus the fee.',
    },
  ],
};

export default stockFeeModule;
