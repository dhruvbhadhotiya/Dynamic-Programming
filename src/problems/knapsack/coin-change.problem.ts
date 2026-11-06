import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { CellValue, Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface CoinChangeInput {
  coins: number[];
  amount: number;
}

const MAX_COINS = 5;
const INF = 1e9;

const pythonCode = [
  'def coin_change(coins, amount):',
  '    INF = 10 ** 9',
  '    dp = [[INF] * (amount + 1) for _ in range(len(coins) + 1)]',
  '    dp[0][0] = 0',
  '    for i, coin in enumerate(coins, 1):',
  '        for a in range(amount + 1):',
  '            dp[i][a] = dp[i-1][a] if coin > a else min(dp[i-1][a], dp[i][a - coin] + 1)',
  '    return dp[-1][amount] if dp[-1][amount] < INF else -1',
].join('\n');

const javascriptCode = [
  'function coinChange(coins, amount) {',
  '  const INF = 1e9;',
  '  const dp = Array.from({ length: coins.length + 1 }, () => new Array(amount + 1).fill(INF));',
  '  dp[0][0] = 0;',
  '  for (let i = 1; i <= coins.length; i++) {',
  '    for (let a = 0; a <= amount; a++) {',
  '      const coin = coins[i-1]; dp[i][a] = coin > a ? dp[i-1][a] : Math.min(dp[i-1][a], dp[i][a-coin] + 1);',
  '  return dp[coins.length][amount] >= INF ? -1 : dp[coins.length][amount];',
  '}',
].join('\n');

const cppCode = [
  'int coinChange(vector<int>& coins, int amount) {',
  '  const int INF = 1e9;',
  '  vector<vector<int>> dp(coins.size() + 1, vector<int>(amount + 1, INF));',
  '  dp[0][0] = 0;',
  '  for (int i = 1; i <= coins.size(); i++) {',
  '    for (int a = 0; a <= amount; a++) {',
  '      int coin = coins[i-1]; dp[i][a] = coin > a ? dp[i-1][a] : min(dp[i-1][a], dp[i][a-coin] + 1);',
  '  return dp[coins.size()][amount] >= INF ? -1 : dp[coins.size()][amount];',
  '}',
].join('\n');

function display(value: number): CellValue {
  return value >= INF ? '∞' : value;
}

function show(value: number): string {
  return value >= INF ? '∞' : `${value}`;
}

function makeRecorder(n: number, amount: number): StepRecorder<Table2DState> {
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: Array.from({ length: n + 1 }, () =>
        Array.from({ length: amount + 1 }, () => null),
      ),
      rowLabels: Array.from({ length: n + 1 }, (_, i) => `i=${i}`),
      colLabels: Array.from({ length: amount + 1 }, (_, a) => `${a}`),
      rowHeader: 'coin types',
      colHeader: 'amount',
      caption: 'Coin Change: dp[i][a] = fewest coins using first i coin types (unlimited) to reach amount a',
    },
    { codeLine: 3 },
  );
}

function finish(
  rec: StepRecorder<Table2DState>,
  n: number,
  amount: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(8).record(`The answer is ${answer}.`, {
    codeLine: 8,
    highlights: [{ pos: [n, amount], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(coins: number[], amount: number, memo: boolean): Step[] {
  const n = coins.length;
  const rec = makeRecorder(n, amount);
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(amount + 1).fill(INF),
  );
  let computed = 0;
  let reused = 0;

  rec.at(3).record(
    memo
      ? 'Memoization: cache each fewest-coins value once. Reuse cached rows so every (coin type, amount) pair is solved once.'
      : 'Tabulation: build dp bottom-up row by row. Each row is final before the next coin type is considered.',
    {
      codeLine: 3,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n, amount },
    },
  );

  const row0 = dp[0];
  if (row0 !== undefined) row0[0] = 0;
  rec.at(4).fill([0, 0], 0, 'Base case: making amount 0 needs 0 coins, dp[0][0] = 0.', {
    kind: 'base',
    codeLine: 4,
    vars: { computed: 1, reused: 0, amount },
  });
  computed += 1;

  for (let a = 1; a <= amount; a += 1) {
    const row = dp[0];
    if (row !== undefined) row[a] = INF;
    computed += 1;
    rec.at(3).fill(
      [0, a],
      display(INF),
      `With no coin types, amount ${a} is unreachable, so dp[0][${a}] = ∞ (INF).`,
      {
        kind: 'base',
        codeLine: 3,
        vars: { computed, reused: 0, i: 0, a },
      },
    );
  }

  for (let i = 1; i <= n; i += 1) {
    const coin = coins[i - 1] ?? 1;
    rec.at(5).record(
      memo
        ? `Coin type ${i - 1}: value ${coin} (unlimited). Cached row dp[${i - 1}][*] decides each amount.`
        : `Coin type ${i - 1}: value ${coin} (unlimited). Fill row dp[${i}] from row dp[${i - 1}] and this row itself.`,
      {
        codeLine: 5,
        highlights: [{ pos: [i - 1, 0], kind: 'active' }],
        vars: { computed, reused, i, coin },
      },
    );

    for (let a = 0; a <= amount; a += 1) {
      const skip = dp[i - 1]?.[a] ?? INF;
      const prev = a >= coin ? dp[i]?.[a - coin] ?? INF : INF;
      const take = a >= coin && prev < INF ? prev + 1 : INF;
      const best = Math.min(skip, take);
      const row = dp[i];
      if (row !== undefined) row[a] = best;
      computed += 1;
      reused += a >= coin ? 2 : 1;

      if (a < coin) {
        rec.at(7).fill(
          [i, a],
          display(best),
          `Coin ${coin} does not fit amount ${a}, so dp[${i}][${a}] = dp[${i - 1}][${a}] = ${show(skip)}.`,
          {
            codeLine: 7,
            highlights: [{ pos: [i - 1, a], kind: 'dependency', label: `dp[${i - 1}][${a}]` }],
            vars: { computed, reused, i, a, coin },
          },
        );
      } else {
        rec.at(7).fill(
          [i, a],
          display(best),
          memo
            ? `Cache hit: reuse dp[${i - 1}][${a}] = ${show(skip)} and dp[${i}][${a - coin}] = ${show(prev)}; dp[${i}][${a}] = min(${show(skip)}, ${show(take)}) = ${show(best)}.`
            : `dp[${i}][${a}] = min(dp[${i - 1}][${a}] = ${show(skip)}, dp[${i}][${a - coin}] + 1 = ${show(take)}) = ${show(best)}. ${take < skip ? 'Using coin ' + coin + ' wins.' : 'Skipping coin ' + coin + ' wins.'}`,
          {
            codeLine: 7,
            highlights: [
              { pos: [i - 1, a], kind: 'dependency', label: `dp[${i - 1}][${a}]` },
              { pos: [i, a - coin], kind: 'dependency', label: `dp[${i}][${a - coin}]` },
            ],
            vars: { computed, reused, i, a, coin },
          },
        );
      }
    }
  }

  const raw = dp[n]?.[amount] ?? INF;
  return finish(rec, n, amount, raw >= INF ? -1 : raw, { computed, reused });
}

function normalizeInput(input: CoinChangeInput): { coins: number[]; amount: number } {
  const rawCoins = Array.isArray(input.coins) ? input.coins : [];
  const coins = rawCoins
    .slice(0, MAX_COINS)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 9) : 1,
    )
    .sort((a, b) => a - b);
  const amount =
    typeof input.amount === 'number' && Number.isFinite(input.amount)
      ? clamp(Math.trunc(input.amount), 0, 15)
      : 0;
  return { coins, amount };
}

const coinChangeModule: ProblemModule<CoinChangeInput> = {
  id: 'coin-change',
  title: 'Coin Change',
  category: 'knapsack',
  difficulty: 'easy',
  summary:
    'Use unlimited coins of given denominations to make an exact amount with the fewest coins, or report -1 when it is impossible. Memoization caches each subproblem and tabulation fills dp bottom-up; unreachable amounts stay at INF.',
  stateDefinition:
    'dp[i][a] = fewest coins to reach amount a using the first i coin types (each unlimited), for 0 <= i <= n and 0 <= a <= amount.',
  recurrence:
    'dp[0][0] = 0, dp[0][a] = INF for a > 0; dp[i][a] = dp[i-1][a] if coins[i-1] > a, else min(dp[i-1][a], dp[i][a - coins[i-1]] + 1).',
  complexity: { time: 'O(n × amount)', space: 'O(n × amount)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'coins',
      label: 'coins',
      help: 'Coin denominations. Each coin can be used any number of times.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_COINS,
      min: 1,
      max: 9,
    },
    {
      name: 'amount',
      label: 'amount',
      help: 'Target amount to make exactly.',
      type: 'number',
      min: 0,
      max: 15,
    },
  ],
  defaultInput: { coins: [1, 2, 5], amount: 11 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: CoinChangeInput, mode: Mode): Step[] {
    const { coins, amount } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(coins, amount, true);
    return iterativeSteps(coins, amount, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'How many coins are needed for coins [1, 2, 5] and amount 11?',
      options: ['3', '4', '2', '6'],
      answer: 0,
      why: 'Use 5 + 5 + 1 = 11 with 3 coins. Two coins can reach at most 10, so 3 is optimal.',
    },
    {
      q: 'When coin c fits (c <= a), what is dp[i][a]?',
      options: [
        'dp[i-1][a] + 1 only',
        'min(dp[i-1][a], dp[i][a-c] + 1)',
        'dp[i][a-c] + 1 only',
        'min(dp[i-1][a], c)',
      ],
      answer: 1,
      why: 'Either skip this coin type and keep dp[i-1][a], or use one coin and add it to the best for the remainder a-c.',
    },
    {
      q: 'Why does using coin c read dp[i][a-c] (same row) instead of dp[i-1][a-c]?',
      options: [
        'Rows fill left to right, so dp[i][a-c] is already done',
        'It makes no difference',
        'It allows the same coin type to be used again (unlimited coins)',
        'It is faster',
      ],
      answer: 2,
      why: 'Staying in row i lets the same coin type be taken more times; dp[i-1] would allow each coin type at most once.',
    },
    {
      q: 'What does the answer -1 mean, and what value fills unreachable cells?',
      options: ['Impossible; cells stay INF', 'Amount 0; cells stay 0', 'Use one coin; cells stay 1', 'The answer is 0; cells stay null'],
      answer: 0,
      why: 'When no combination of coins sums to the amount, dp stays INF (a huge sentinel) and the module reports -1 instead of INF.',
    },
  ],
};

export default coinChangeModule;
