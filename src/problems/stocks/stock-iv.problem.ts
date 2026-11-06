import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { CellValue, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface StockIvInput {
  k: number;
  prices: number[];
}

const MAX_DAYS = 8;
const INF = 1e9;

const pythonCode = [
  'def max_profit(k, prices):',
  '    n = len(prices)',
  '    if k == 0 or n == 0: return 0',
  '    cash = [0] * (k + 1)',
  '    hold = [-prices[0]] * (k + 1)',
  '    for i in range(1, n):',
  '        for t in range(k, 0, -1):',
  '            hold[t] = max(hold[t], cash[t - 1] - prices[i])',
  '            cash[t] = max(cash[t], hold[t] + prices[i])',
  '    return cash[k]',
].join('\n');

const javascriptCode = [
  'function maxProfit(k, prices) {',
  '  const n = prices.length;',
  '  if (k === 0 || n === 0) return 0;',
  '  const cash = new Array(k + 1).fill(0);',
  '  const hold = new Array(k + 1).fill(-prices[0]);',
  '  for (let i = 1; i < n; i++) {',
  '    for (let t = k; t >= 1; t--) {',
  '      hold[t] = Math.max(hold[t], cash[t - 1] - prices[i]);',
  '      cash[t] = Math.max(cash[t], hold[t] + prices[i]);',
  '  return cash[k];',
  '}',
].join('\n');

const cppCode = [
  'int maxProfit(int k, vector<int>& prices) {',
  '  int n = prices.size();',
  '  if (k == 0 || n == 0) return 0;',
  '  vector<int> cash(k + 1, 0);',
  '  vector<int> hold(k + 1, -prices[0]);',
  '  for (int i = 1; i < n; i++) {',
  '    for (int t = k; t >= 1; t--) {',
  '      hold[t] = max(hold[t], cash[t - 1] - prices[i]);',
  '      cash[t] = max(cash[t], hold[t] + prices[i]);',
  '  return cash[k];',
  '}',
].join('\n');

function show(value: number): string {
  return value <= -INF ? '-INF' : `${value}`;
}

function makeRecorder(k: number): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: k + 1 }, () => null as CellValue),
      labels: Array.from({ length: k + 1 }, (_value, t) => `cash[${t}]`),
      indexName: 't',
      caption: 'cash[t] = max profit with at most t transactions using prices seen so far',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  k: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(10).record(`The answer is cash[${k}] = ${answer}.`, {
    codeLine: 10,
    highlights: [{ pos: [k], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(k: number, prices: number[], memo: boolean): Step[] {
  const n = prices.length;
  const rec = makeRecorder(k);
  const cash: number[] = Array.from({ length: k + 1 }, () => 0);
  const hold: number[] = Array.from({ length: k + 1 }, () => -(prices[0] ?? 0));
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    `n = ${n}, k = ${k}, prices = [${prices.join(', ')}]. cash[t] is the best profit with at most t transactions; hold[t] is the best "buy then hold" value for the t-th transaction.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active', label: 'cash[0]' }],
      vars: { computed: 0, reused: 0, k, n },
    },
  );

  if (k === 0 || n === 0) {
    rec.at(3).fill([0], 0, 'Zero transactions allowed (or no prices), so the profit is 0.', {
      kind: 'base',
      codeLine: 3,
      vars: { computed: 1, reused: 0, k, n },
    });
    return finish(rec, 0, 0, { computed: 1, reused: 0, k, n });
  }

  for (let t = 0; t <= k; t += 1) {
    rec.at(4).fill([t], 0, `Initial cash[${t}] = 0: with no prices processed, any transaction count gives profit 0.`, {
      kind: 'base',
      codeLine: 4,
      vars: { computed: computed + 1, reused, k, n, t },
    });
    computed += 1;
  }

  rec.at(5).record(
    `hold[t] = -prices[0] = ${show(hold[0] ?? 0)} for all t = 0..${k}: the share was bought on day 0, so hold tracks "bought on day 0 and still holding". Later days may offer a cheaper buy.`,
    {
      codeLine: 5,
      highlights: [{ pos: [0], kind: 'active', label: 'cash[0]' }],
      vars: { computed, reused, k, n },
    },
  );

  for (let i = 1; i < n; i += 1) {
    const price = prices[i] ?? 0;
    rec.at(6).record(`Day i = ${i}, price = ${price}. Sweep t = ${k} down to 1 so cash[t - 1] still means "yesterday".`, {
      codeLine: 6,
      highlights: [{ pos: [k], kind: 'active', label: `cash[${k}]` }],
      vars: { computed, reused, i, k, n, price },
    });

    for (let t = k; t >= 1; t -= 1) {
      const cashPrev = cash[t - 1] ?? 0;
      const oldHold = hold[t] ?? -INF;
      const buy = cashPrev - price;
      const newHold = Math.max(oldHold, buy);
      hold[t] = newHold;
      const oldCash = cash[t] ?? 0;
      const sell = newHold + price;
      const newCash = Math.max(oldCash, sell);
      cash[t] = newCash;
      computed += 1;
      reused += 2;

      const buyWins = buy >= oldHold;
      const sellWins = sell >= oldCash;
      const message = memo
        ? `Cache hit: reuse cash[${t - 1}] = ${cashPrev} and hold[${t}] = ${show(oldHold)}; hold[${t}] = max(${show(oldHold)}, ${cashPrev} - ${price}) = ${show(newHold)}, cash[${t}] = max(${oldCash}, ${show(newHold)} + ${price}) = ${newCash}.`
        : `hold[${t}] = max(hold[${t}] = ${show(oldHold)}, cash[${t - 1}] - price = ${cashPrev} - ${price} = ${buy}) = ${show(newHold)}; cash[${t}] = max(cash[${t}] = ${oldCash}, hold[${t}] + price = ${show(sell)}) = ${newCash}. ${buyWins ? 'Buying today wins for hold.' : 'Keeping the old buy wins.'} ${sellWins ? 'Selling today wins for cash.' : 'Keeping cash wins.'}`;
      rec.at(9).fill([t], newCash, message, {
        codeLine: 9,
        highlights: [{ pos: [t - 1], kind: 'dependency', label: `cash[${t - 1}]` }],
        vars: { computed, reused, i, k, price, t },
      });
    }
  }

  return finish(rec, k, cash[k] ?? 0, { computed, reused, k, n });
}

function normalizeInput(input: StockIvInput): { k: number; prices: number[] } {
  const rawPrices = Array.isArray(input.prices) ? input.prices : [];
  const prices = rawPrices
    .slice(0, MAX_DAYS)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 0, 20) : 0,
    );
  const k =
    typeof input.k === 'number' && Number.isFinite(input.k) ? clamp(Math.trunc(input.k), 0, 3) : 0;
  return { k, prices: prices.length > 0 ? prices : [0] };
}

const stockIvModule: ProblemModule<StockIvInput> = {
  id: 'stock-iv',
  title: 'Best Time to Buy and Sell Stock IV',
  category: 'stocks',
  difficulty: 'hard',
  summary:
    'Maximum profit with at most k transactions. Memoization caches cash[t] and hold[t] for each transaction count; tabulation sweeps days and updates them bottom-up in O(nk).',
  stateDefinition:
    'cash[t] = maximum profit using at most t transactions among prices seen so far; hold[t] = maximum (profit minus buy price) when holding one share for the t-th transaction, for 0 <= t <= k.',
  recurrence:
    'Initially cash[t] = 0, hold[t] = -prices[0] for all t; for each price, hold[t] = max(hold[t], cash[t-1] - price) and cash[t] = max(cash[t], hold[t] + price), sweeping t descending. The answer is cash[k].',
  complexity: { time: 'O(n × k)', space: 'O(k)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 'k',
      label: 'k',
      help: 'Maximum number of transactions.',
      type: 'number',
      min: 0,
      max: 3,
    },
    {
      name: 'prices',
      label: 'prices',
      help: 'Price on each day; buy low and sell high at most k times.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_DAYS,
      min: 0,
      max: 20,
    },
  ],
  defaultInput: { k: 2, prices: [3, 2, 6, 5, 0, 3] },
  modes: ['memo', 'tabulation'],
  generateSteps(input: StockIvInput, mode: Mode): Step[] {
    const { k, prices } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(k, prices, true);
    return iterativeSteps(k, prices, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the maximum profit for k = 2 and prices [3, 2, 6, 5, 0, 3]?',
      options: ['7', '6', '8', '4'],
      answer: 0,
      why: 'Buy at 2 sell at 6 (profit 4) and buy at 0 sell at 3 (profit 3) totals 7, better than any single transaction.',
    },
    {
      q: 'On each day with price p, how do hold[t] and cash[t] update?',
      options: [
        'hold[t] = max(hold[t], cash[t-1] - p); cash[t] = max(cash[t], hold[t] + p)',
        'hold[t] = cash[t-1] - p; cash[t] = hold[t] + p',
        'hold[t] = max(cash[t-1] - p, p); cash[t] = max(cash[t], p)',
        'hold[t] = cash[t]; cash[t] = hold[t]',
      ],
      answer: 0,
      why: 'Either keep the old state or buy now (cash[t-1] minus p) for hold, and keep or sell now (hold[t] plus p) for cash.',
    },
    {
      q: 'What is the maximum profit for k = 1 and prices [2, 4, 1]?',
      options: ['2', '3', '0', '1'],
      answer: 0,
      why: 'One transaction: buy at 2 and sell at 4 for profit 2 is the best single trade.',
    },
    {
      q: 'Why sweep t from k down to 1 on each day?',
      options: [
        'So cash[t - 1] is still yesterday’s value, not today’s',
        'It makes the loop faster',
        'It is required for the answer to exist',
        'It uses less memory',
      ],
      answer: 0,
      why: 'Descending t keeps cash[t - 1] from the previous day, so today’s sell cannot fund today’s buy in the same step.',
    },
  ],
};

export default stockIvModule;
