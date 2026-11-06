import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface RodCuttingInput {
  prices: number[];
  n: number;
}

const MAX_PIECES = 6;

const pythonCode = [
  'def rod_cutting(prices, n):',
  '    m = len(prices)',
  '    dp = [[0] * (n + 1) for _ in range(m + 1)]',
  '    for i in range(1, m + 1):',
  '        piece = i; price = prices[i-1]',
  '        for l in range(n + 1):',
  '            dp[i][l] = dp[i-1][l] if piece > l else max(dp[i-1][l], dp[i][l-piece] + price)',
  '    return dp[m][n]',
].join('\n');

const javascriptCode = [
  'function rodCutting(prices, n) {',
  '  const m = prices.length;',
  '  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));',
  '  for (let i = 1; i <= m; i++) {',
  '    const piece = i, price = prices[i-1];',
  '    for (let l = 0; l <= n; l++)',
  '      dp[i][l] = piece > l ? dp[i-1][l] : Math.max(dp[i-1][l], dp[i][l-piece] + price);',
  '  return dp[m][n];',
  '}',
].join('\n');

const cppCode = [
  'int rodCutting(vector<int>& prices, int n) {',
  '  int m = prices.size();',
  '  vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));',
  '  for (int i = 1; i <= m; i++) {',
  '    int piece = i, price = prices[i-1];',
  '    for (int l = 0; l <= n; l++)',
  '      dp[i][l] = piece > l ? dp[i-1][l] : max(dp[i-1][l], dp[i][l-piece] + price);',
  '  return dp[m][n];',
  '}',
].join('\n');

function makeRecorder(m: number, n: number): StepRecorder<Table2DState> {
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: Array.from({ length: m + 1 }, () =>
        Array.from({ length: n + 1 }, () => null),
      ),
      rowLabels: Array.from({ length: m + 1 }, (_, i) => `i=${i}`),
      colLabels: Array.from({ length: n + 1 }, (_, l) => `${l}`),
      rowHeader: 'piece lengths',
      colHeader: 'rod length',
      caption: 'Rod Cutting: dp[i][l] = max revenue for rod length l using first i piece lengths (unlimited)',
    },
    { codeLine: 3 },
  );
}

function finish(
  rec: StepRecorder<Table2DState>,
  m: number,
  n: number,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(8).record(`The answer is ${answer}.`, {
    codeLine: 8,
    highlights: [{ pos: [m, n], kind: 'result', label: 'answer' }],
    vars: { answer, ...extra },
  });
  return [...rec.steps];
}

function iterativeSteps(prices: number[], n: number, memo: boolean): Step[] {
  const m = prices.length;
  const rec = makeRecorder(m, n);
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  let computed = 0;
  let reused = 0;

  rec.at(3).record(
    memo
      ? 'Memoization: cache each best revenue once. Reuse cached rows so every (piece lengths used, rod length) pair is solved once.'
      : 'Tabulation: build dp bottom-up row by row. Each row is final before the next piece length is considered.',
    {
      codeLine: 3,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, m, n },
    },
  );

  for (let l = 0; l <= n; l += 1) {
    const row0 = dp[0];
    if (row0 !== undefined) row0[l] = 0;
    rec.at(3).fill([0, l], 0, `Base case: no piece lengths available, dp[0][${l}] = 0.`, {
      kind: 'base',
      codeLine: 3,
      vars: { computed: computed + 1, reused: 0, i: 0, l },
    });
    computed += 1;
  }

  for (let i = 1; i <= m; i += 1) {
    const piece = i;
    const price = prices[i - 1] ?? 0;
    rec.at(4).record(
      memo
        ? `Piece length ${piece}: price ${price} (unlimited). Cached row dp[${i - 1}][*] decides each rod length.`
        : `Piece length ${piece}: price ${price} (unlimited). Fill row dp[${i}] from row dp[${i - 1}] and this row itself.`,
      {
        codeLine: 4,
        highlights: [{ pos: [i - 1, 0], kind: 'active' }],
        vars: { computed, reused, i, piece, price },
      },
    );

    for (let l = 0; l <= n; l += 1) {
      const skip = dp[i - 1]?.[l] ?? 0;
      const row = dp[i];

      if (l < piece) {
        if (row !== undefined) row[l] = skip;
        computed += 1;
        reused += 1;
        rec.at(7).fill([i, l], skip, `Piece length ${piece} does not fit rod length ${l}, so dp[${i}][${l}] = dp[${i - 1}][${l}] = ${skip}.`, {
          codeLine: 7,
          highlights: [{ pos: [i - 1, l], kind: 'dependency', label: `dp[${i - 1}][${l}]` }],
          vars: { computed, reused, i, l, piece, price },
        });
      } else {
        const prev = dp[i]?.[l - piece] ?? 0;
        const take = prev + price;
        const best = Math.max(skip, take);
        if (row !== undefined) row[l] = best;
        computed += 1;
        reused += 2;
        rec.at(7).fill(
          [i, l],
          best,
          memo
            ? `Cache hit: reuse dp[${i - 1}][${l}] = ${skip} and dp[${i}][${l - piece}] = ${prev}; dp[${i}][${l}] = max(${skip}, ${take}) = ${best}.`
            : `dp[${i}][${l}] = max(dp[${i - 1}][${l}] = ${skip}, dp[${i}][${l - piece}] + ${price} = ${take}) = ${best}. ${take > skip ? 'Cutting off a piece of length ' + piece + ' wins.' : 'Not using piece length ' + piece + ' wins.'}`,
          {
            codeLine: 7,
            highlights: [
              { pos: [i - 1, l], kind: 'dependency', label: `dp[${i - 1}][${l}]` },
              { pos: [i, l - piece], kind: 'dependency', label: `dp[${i}][${l - piece}]` },
            ],
            vars: { computed, reused, i, l, piece, price },
          },
        );
      }
    }
  }

  return finish(rec, m, n, dp[m]?.[n] ?? 0, { computed, reused });
}

function normalizeInput(input: RodCuttingInput): { prices: number[]; n: number } {
  const rawPrices = Array.isArray(input.prices) ? input.prices : [];
  const prices = rawPrices
    .slice(0, MAX_PIECES)
    .map((value) =>
      typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 17) : 1,
    );
  const n =
    typeof input.n === 'number' && Number.isFinite(input.n)
      ? clamp(Math.trunc(input.n), 1, 12)
      : 1;
  return { prices, n };
}

const rodCuttingModule: ProblemModule<RodCuttingInput> = {
  id: 'rod-cutting',
  title: 'Rod Cutting',
  category: 'knapsack',
  difficulty: 'easy',
  summary:
    'Cut a rod of length n into pieces (piece length l earns prices[l-1]) to maximize total revenue. Memoization caches each (piece lengths used, rod length) subproblem and tabulation fills dp bottom-up; pieces can repeat, so taking a piece reads the current row.',
  stateDefinition:
    'dp[i][l] = maximum revenue for rod length l using the first i piece lengths (each unlimited), for 0 <= i <= m and 0 <= l <= n, where m = len(prices) and piece length i has price prices[i-1].',
  recurrence:
    'dp[0][l] = 0; dp[i][l] = dp[i-1][l] if i > l, else max(dp[i-1][l], dp[i][l-i] + prices[i-1]).',
  complexity: { time: 'O(m × n)', space: 'O(m × n)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'prices',
      label: 'prices',
      help: 'Price of each piece length. prices[i] is the price for a piece of length i+1.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_PIECES,
      min: 1,
      max: 17,
    },
    {
      name: 'n',
      label: 'n',
      help: 'Rod length to cut into pieces.',
      type: 'number',
      min: 1,
      max: 12,
    },
  ],
  defaultInput: { prices: [1, 5, 8, 9, 10, 17], n: 5 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: RodCuttingInput, mode: Mode): Step[] {
    const { prices, n } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(prices, n, true);
    return iterativeSteps(prices, n, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the maximum revenue for prices [1, 5, 8, 9, 10, 17] and rod length 5?',
      options: ['13', '10', '12', '17'],
      answer: 0,
      why: 'Cut lengths 2 and 3: prices are 5 and 8, total 5 + 8 = 13. No other combination fits length 5 with more revenue.',
    },
    {
      q: 'When piece length i fits (i <= l), what is dp[i][l]?',
      options: [
        'dp[i-1][l] + prices[i-1] only',
        'max(dp[i-1][l], dp[i][l-i] + prices[i-1])',
        'dp[i][l-i] + prices[i-1] only',
        'max(dp[i-1][l], prices[i-1])',
      ],
      answer: 1,
      why: 'Either skip piece length i and keep dp[i-1][l], or cut off one piece of length i and add its price prices[i-1] to the best revenue for the remaining length l-i.',
    },
    {
      q: 'Why does cutting off piece length i use dp[i][l-i] (same row) instead of dp[i-1][l-i]?',
      options: [
        'Rows fill left to right, so dp[i][l-i] is already done',
        'It makes no difference',
        'It allows the same piece length to be used again (unlimited pieces)',
        'It is faster',
      ],
      answer: 2,
      why: 'Staying in row i lets the same piece length be taken more times; dp[i-1] would allow each piece length at most once.',
    },
    {
      q: 'How do memoization/tabulation compare to brute force?',
      options: ['O(m × n) vs exponential in n', 'O(n) vs exponential in n', 'The same', 'O(m × n) vs O(n)'],
      answer: 0,
      why: 'Memoization/tabulation solve each of the m × n subproblems once; brute force explores every way to cut the rod, which grows exponentially with n.',
    },
  ],
};

export default rodCuttingModule;
