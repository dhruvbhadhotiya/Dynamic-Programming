import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface StockCooldownInput {
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
  '        prev = cash[i - 2] if i >= 2 else 0; cash[i] = max(cash[i - 1], hold + prices[i]); hold = max(hold, prev - prices[i])',
  '    return cash[n - 1]',
].join('\n');

const javascriptCode = [
  'function maxProfit(prices) {',
  '  const n = prices.length;',
  '  const cash = new Array(n).fill(0);',
  '  let hold = -prices[0];',
  '  for (let i = 1; i < n; i++)',
  '    { const prev = i >= 2 ? cash[i - 2] : 0; cash[i] = Math.max(cash[i - 1], hold + prices[i]); hold = Math.max(hold, prev - prices[i]); }',
  '  return cash[n - 1];',
  '}',
].join('\n');

const cppCode = [
  'int maxProfit(vector<int>& prices) {',
  '  int n = prices.size();',
  '  vector<int> cash(n, 0);',
  '  int hold = -prices[0];',
  '  for (int i = 1; i < n; i++)',
  '    { int prev = i >= 2 ? cash[i-2] : 0; cash[i] = max(cash[i-1], hold + prices[i]); hold = max(hold, prev - prices[i]); }',
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
      caption: 'Stock with Cooldown table cash[i] = best profit up to day i, not holding stock after a rest day',
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
      ? 'Memoization: remember the best profit with and without a share, then reuse cash and hold for each new day, resting one day after every sale.'
      : 'Tabulation: build cash bottom-up day by day. Each cash[i] is final before the next day uses it, with a one-day cooldown after selling.',
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
    rec.at(5).record(`Loop i = 1..${n - 1}: after selling you must rest one day, so a new buy can only use cash[i - 2].`, {
      codeLine: 5,
      highlights: [{ pos: [1], kind: 'active', label: 'cash[1]' }],
      vars: { computed, hold, n, reused },
    });
  }

  for (let i = 1; i < n; i += 1) {
    const prevCash = cash[i - 1] ?? 0;
    const prevPrev = i >= 2 ? (cash[i - 2] ?? 0) : 0;
    const price = prices[i] ?? 0;
    const sell = hold + price;
    const nextCash = Math.max(prevCash, sell);
    const buy = prevPrev - price;
    const nextHold = Math.max(hold, buy);
    cash[i] = nextCash;
    computed += 1;
    reused += 1;
    const sellText =
      sell > prevCash
        ? `Selling today wins (${sell} > ${prevCash}).`
        : `Keeping cash wins for now (${sell} <= ${prevCash}).`;
    const buyText =
      buy > hold
        ? `Buying today (after the rest day) improves hold to ${nextHold}.`
        : `Keeping the existing share wins (${nextHold} = max(${hold}, ${prevPrev} - ${price})).`;
    const message = memo
      ? `Cache hit: reuse cash[${i - 1}] = ${prevCash} and cash[${i - 2}] = ${prevPrev}; cash[${i}] = max(${prevCash}, ${hold} + ${price}) = ${nextCash}. ${sellText} ${buyText}`
      : `cash[${i}] = max(cash[${i - 1}] = ${prevCash}, hold + prices[${i}] = ${sell}) = ${nextCash}. ${sellText} Updated hold = max(${hold}, cash[${i - 2}] = ${prevPrev} - ${price}) = ${nextHold}, resting one day after any sale. ${buyText}`;
    rec.at(6).fill([i], nextCash, message, {
      codeLine: 6,
      highlights: [{ pos: [i - 1], kind: 'dependency', label: `cash[${i - 1}]` }],
      vars: { cash: nextCash, computed, hold: nextHold, i, n, reused },
    });
    hold = nextHold;
  }

  return finish(rec, n - 1, cash[n - 1] ?? 0, { computed, hold, n, reused });
}

function normalizeInput(input: StockCooldownInput): number[] {
  const raw = Array.isArray(input.prices) ? input.prices : [];
  const cleaned = raw
    .slice(0, MAX_ITEMS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, MAX_PRICE) : 0));
  return cleaned.length > 0 ? cleaned : [0];
}

const stockCooldownModule: ProblemModule<StockCooldownInput> = {
  id: 'stock-cooldown',
  title: 'Best Time to Buy and Sell Stock with Cooldown',
  category: 'stocks',
  difficulty: 'medium',
  summary:
    'Buy and sell one share any number of times with a one-day cooldown after every sale. The cash and hold states track the best profit without and with a share; buying uses cash[i - 2] to enforce the rest day, and memoization or tabulation runs in O(n).',
  stateDefinition:
    'cash[i] = maximum profit using prices[0..i] without holding stock at the end of day i (after any required rest day); hold[i] = maximum profit using prices[0..i] while holding one share. The table stores cash[i].',
  recurrence:
    'cash[0] = 0, hold[0] = -prices[0]; cash[i] = max(cash[i - 1], hold[i - 1] + prices[i]); hold[i] = max(hold[i - 1], (cash[i - 2] ?? 0) - prices[i]). The answer is cash[n - 1].',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'prices',
      label: 'prices',
      help: 'Daily prices; you may buy and sell one share any number of times, resting one day after each sale.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_ITEMS,
      min: 0,
      max: MAX_PRICE,
    },
  ],
  defaultInput: { prices: [1, 2, 3, 0, 2] },
  modes: ['memo', 'tabulation'],
  generateSteps(input: StockCooldownInput, mode: Mode): Step[] {
    return iterativeSteps(normalizeInput(input), mode === 'memo');
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the maximum profit for prices [1, 2, 3, 0, 2] with a one-day cooldown?',
      options: ['3', '4', '2', '5'],
      answer: 0,
      why: 'Buy at 1 and sell at 2, rest one day, then buy at 0 and sell at 2: (2 - 1) + (2 - 0) = 3.',
    },
    {
      q: 'What is the maximum profit for prices [1] with a one-day cooldown?',
      options: ['1', '0', '-1', '2'],
      answer: 1,
      why: 'With only one day there is no sale possible, so the best choice is to never trade, for profit 0.',
    },
    {
      q: 'What is the recurrence for hold[i], the best profit up to day i while holding one share?',
      options: [
        'max(hold[i - 1], (cash[i - 2] ?? 0) - prices[i])',
        'max(hold[i - 1], cash[i - 1] - prices[i])',
        'cash[i - 1] - prices[i]',
        'hold[i - 1] + prices[i]',
      ],
      answer: 0,
      why: 'A new buy must respect the cooldown, so it pays prices[i] from the cash two days earlier, cash[i - 2] (or 0 before day 0).',
    },
    {
      q: 'Why must a new buy wait two days after the previous cash instead of one?',
      options: [
        'Prices are always zero on alternating days',
        'Selling incurs a one-day rest before buying again',
        'You must hold the stock for at least two days',
        'The cooldown only applies on weekends',
      ],
      answer: 1,
      why: 'After a sale you must rest exactly one day, so the earliest next buy is two indices later, which is why hold[i] reads cash[i - 2].',
    },
  ],
};

export default stockCooldownModule;
