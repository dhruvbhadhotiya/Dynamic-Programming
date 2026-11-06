import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface CoinChangeIIInput {
  coins: number[];
  amount: number;
}

const MAX_COINS = 5;
const MAX_AMOUNT = 12;

const pythonCode = [
  'def coin_change(coins, amount):',
  '    n = len(coins)',
  '    dp = [[0] * (amount + 1) for _ in range(n + 1)]',
  '    dp[0][0] = 1',
  '    for i in range(1, n + 1):',
  '        for a in range(amount + 1):',
  '            dp[i][a] = dp[i-1][a] + (dp[i][a - coins[i-1]] if a >= coins[i-1] else 0)',
  '    return dp[n][amount]',
].join('\n');

const javascriptCode = [
  'function coinChange(coins, amount) {',
  '  const n = coins.length;',
  '  const dp = Array.from({ length: n + 1 }, () => new Array(amount + 1).fill(0));',
  '  dp[0][0] = 1;',
  '  for (let i = 1; i <= n; i++)',
  '    for (let a = 0; a <= amount; a++)',
  '      dp[i][a] = dp[i - 1][a] + (a >= coins[i - 1] ? dp[i][a - coins[i - 1]] : 0);',
  '  return dp[n][amount]; }',
].join('\n');

const cppCode = [
  'int coinChange(vector<int>& coins, int amount) {',
  '  int n = coins.size();',
  '  vector<vector<int>> dp(n + 1, vector<int>(amount + 1, 0));',
  '  dp[0][0] = 1;',
  '  for (int i = 1; i <= n; i++)',
  '    for (int a = 0; a <= amount; a++)',
  '      dp[i][a] = dp[i-1][a] + (a >= coins[i-1] ? dp[i][a-coins[i-1]] : 0);',
  '  return dp[n][amount]; }',
].join('\n');

function makeRecorder(coins: number[], amount: number): StepRecorder<Table2DState> {
  const n = coins.length;
  const rowLabels = ['0 coins', ...coins.map((value, index) => `${index + 1}: ${value}`)];
  const colLabels = Array.from({ length: amount + 1 }, (_v, a) => String(a));
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D(n + 1, amount + 1, () => null),
      rowLabels,
      colLabels,
      rowHeader: 'coins i',
      colHeader: 'amount a',
      caption: 'Coin Change II: dp[i][a] counts combinations (order ignored) of the first i coin types summing to a',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table2DState>,
  n: number,
  amount: number,
  answer: number,
  extra: Record<string, string | number | boolean>,
): Step[] {
  rec.at(8).record(`The answer is ${answer}: ${answer} combination${answer === 1 ? '' : 's'} sum to ${amount}.`, {
    codeLine: 8,
    highlights: [{ pos: [n, amount], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function dependencyHighlights(i: number, a: number, value: number): Highlight[] {
  const highlights: Highlight[] = [{ pos: [i - 1, a], kind: 'dependency', label: 'skip' }];
  if (a >= value) {
    highlights.push({ pos: [i, a - value], kind: 'dependency', label: 'take' });
  }
  return highlights;
}

function iterativeSteps(coins: number[], amount: number, memo: boolean): Step[] {
  const n = coins.length;
  const rec = makeRecorder(coins, amount);
  const dp = create2D(n + 1, amount + 1, () => 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each (i, a) count once. Reuse cached dp[i-1][a] and dp[i][a - coin] for each cell.'
      : 'Tabulation: build dp bottom-up row by row. Coin types stay in the outer loop so order does not matter, and each cell uses only finished entries.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n, amount },
    },
  );

  const base = dp[0];
  if (base !== undefined) base[0] = 1;
  rec.at(4).fill([0, 0], 1, 'Base case: with 0 coins, amount 0 has exactly one combination (choose nothing): dp[0][0] = 1.', {
    kind: 'base',
    codeLine: 4,
    vars: { computed: 1, reused: 0, n, amount },
  });
  computed = 1;

  for (let a = 1; a <= amount; a += 1) {
    const row = dp[0];
    if (row !== undefined) row[a] = 0;
    rec.at(4).fill([0, a], 0, `Base case: with 0 coins, amount ${a} cannot be made: dp[0][${a}] = 0.`, {
      kind: 'base',
      codeLine: 4,
      vars: { computed: computed + 1, reused: 0, a, n, amount },
    });
    computed += 1;
  }

  for (let i = 1; i <= n; i += 1) {
    const value = coins[i - 1] ?? 0;
    for (let a = 0; a <= amount; a += 1) {
      const skip = dp[i - 1]?.[a] ?? 0;
      const take = a >= value ? (dp[i]?.[a - value] ?? 0) : 0;
      const result = skip + take;
      const row = dp[i];
      if (row !== undefined) row[a] = result;
      computed += 1;
      reused += a >= value ? 2 : 1;
      const reason =
        a < value
          ? `coin ${value} cannot fit into amount ${a}`
          : take === 0
            ? 'take adds 0 new combinations'
            : `take adds ${take} combination${take === 1 ? '' : 's'}`;
      rec.at(7).fill(
        [i, a],
        result,
        memo
          ? `Cache hit for dp[${i}][${a}]: reuse dp[${i - 1}][${a}] = ${skip} and ${a >= value ? `dp[${i}][${a - value}] = ${take}` : `a < ${value} so take is impossible`}; dp[${i}][${a}] = ${skip} + ${take} = ${result} because ${reason}.`
          : `dp[${i}][${a}] = dp[${i - 1}][${a}] + (dp[${i}][${a} - ${value}] if ${a} >= ${value} else 0) = ${skip} + ${take} = ${result} because ${reason}.`,
        {
          codeLine: 7,
          highlights: dependencyHighlights(i, a, value),
          vars: { computed, reused, i, a, value, n, amount },
        },
      );
    }
  }

  return finish(rec, n, amount, dp[n]?.[amount] ?? 0, { computed, reused });
}

function normalizeInput(input: CoinChangeIIInput): { coins: number[]; amount: number } {
  const rawCoins = Array.isArray(input.coins) ? input.coins : [];
  const coins = rawCoins
    .slice(0, MAX_COINS)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 9) : 1));
  const safeCoins = coins.length > 0 ? coins : [1];
  const rawAmount = typeof input.amount === 'number' && Number.isFinite(input.amount) ? input.amount : 0;
  const amount = clamp(Math.trunc(rawAmount), 0, MAX_AMOUNT);
  return { coins: safeCoins, amount };
}

const coinChangeIIModule: ProblemModule<CoinChangeIIInput> = {
  id: 'coin-change-ii',
  title: 'Coin Change II',
  category: 'knapsack',
  difficulty: 'medium',
  summary:
    'Count combinations of unlimited coins summing to amount, where order does not matter. Brute force enumerates multisets; memoization caches each (i, a) count and tabulation fills dp bottom-up with coin types as the outer loop.',
  stateDefinition:
    'dp[i][a] = number of combinations using the first i coin types (coins[0..i-1], each available in unlimited copies, order ignored) to make amount a, for 0 <= i <= n and 0 <= a <= amount.',
  recurrence:
    'dp[0][0] = 1, dp[0][a] = 0 for a > 0; dp[i][a] = dp[i-1][a] + (a >= coins[i-1] ? dp[i][a - coins[i-1]] : 0) (skip this coin type, or take one more of it).',
  complexity: { time: 'O(n * amount)', space: 'O(n * amount)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'coins',
      label: 'coins',
      help: 'Coin denominations. Each type can be used unlimited times.',
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
      help: 'Sum to reach with combinations of unlimited coins.',
      type: 'number',
      min: 0,
      max: MAX_AMOUNT,
    },
  ],
  defaultInput: { coins: [1, 2, 5], amount: 5 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: CoinChangeIIInput, mode: Mode): Step[] {
    const { coins, amount } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(coins, amount, true);
    return iterativeSteps(coins, amount, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'How many combinations (order does not matter) make amount 5 with coins [1, 2, 5]?',
      options: ['4', '9', '3', '7'],
      answer: 0,
      why: 'The combinations are 5; 2+2+1; 2+1+1+1; 1+1+1+1+1 — with 1+2 vs 2+1 counted once.',
    },
    {
      q: 'What does dp[i][a] mean?',
      options: [
        'Ways to make a using all coins with order counted',
        'Ways to make amount a using the first i coin types (unlimited, order ignored)',
        'Least number of coins needed to make a',
        'Ways to make a using exactly i coins',
      ],
      answer: 1,
      why: 'i indexes how many coin types have been considered; each type may be reused freely and each multiset is counted once, not per permutation.',
    },
    {
      q: 'When c = coins[i-1] and a >= c, what is dp[i][a]?',
      options: ['dp[i][a-c] only', 'dp[i-1][a] only', 'dp[i-1][a] + dp[i][a-c]', 'dp[i-1][a] * dp[i][a-c]'],
      answer: 2,
      why: 'Skip the coin type and keep dp[i-1][a], or take one more of it and solve a-c with the same row still available so the coin can be reused.',
    },
    {
      q: 'Why does the recurrence read dp[i][a-c] (same row) instead of dp[i-1][a-c]?',
      options: [
        'To allow unlimited copies and keep counting combinations, not permutations',
        'To count permutations',
        'Because row i-1 is not ready yet',
        'It makes no difference',
      ],
      answer: 0,
      why: 'The same row lets the current coin be taken again for unlimited supply; keeping coin types in the outer loop counts each multiset once, so 1+2 and 2+1 are not double-counted.',
    },
  ],
};

export default coinChangeIIModule;
