import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface DigitDpInput {
  n: number;
}

const MAX_N = 999;
const COL_LABELS = ['tight, no 4', 'tight, has 4', 'loose, no 4', 'loose, has 4'];

const pythonCode = [
  'def count_no_four(n):',
  '    s = str(n)',
  '    dp = [[0] * 4 for _ in range(len(s) + 1)]',
  '    dp[0][0] = 1',
  '    for pos in range(len(s)):',
  '        for c in range(4):',
  '            if dp[pos][c] == 0: continue',
  '            tight = c < 2; no_four = c % 2 == 0',
  '            limit = int(s[pos]) if tight else 9',
  '            for d in range(limit + 1): dp[pos+1][(0 if tight and d == limit else 2) + (0 if no_four and d != 4 else 1)] += dp[pos][c]',
  '    return dp[len(s)][0] + dp[len(s)][2]',
].join('\n');

const javascriptCode = [
  'function countNoFour(n) {',
  '  const s = String(n);',
  '  const dp = Array.from({ length: s.length + 1 }, () => new Array(4).fill(0));',
  '  dp[0][0] = 1;',
  '  for (let pos = 0; pos < s.length; pos++)',
  '    for (let c = 0; c < 4; c++) {',
  '      if (dp[pos][c] === 0) continue;',
  '      const tight = c < 2, noFour = c % 2 === 0;',
  '      const limit = tight ? Number(s[pos]) : 9;',
  '      for (let d = 0; d <= limit; d++) dp[pos + 1][(tight && d === limit ? 0 : 2) + (noFour && d !== 4 ? 0 : 1)] += dp[pos][c];',
  '  return dp[s.length][0] + dp[s.length][2];',
  '}',
].join('\n');

const cppCode = [
  'int count_no_four(int n) {',
  '  string s = to_string(n);',
  '  vector<vector<int>> dp(s.size() + 1, vector<int>(4, 0));',
  '  dp[0][0] = 1;',
  '  for (size_t pos = 0; pos < s.size(); pos++)',
  '    for (int c = 0; c < 4; c++) {',
  '      if (dp[pos][c] == 0) continue;',
  '      bool tight = c < 2, noFour = c % 2 == 0;',
  '      int limit = tight ? s[pos] - \'0\' : 9;',
  '      for (int d = 0; d <= limit; d++) dp[pos + 1][(tight && d == limit ? 0 : 2) + (noFour && d != 4 ? 0 : 1)] += dp[pos][c];',
  '  return dp[s.size()][0] + dp[s.size()][2];',
  '}',
].join('\n');

function colIndex(tight: boolean, noFour: boolean): number {
  return (tight ? 0 : 2) + (noFour ? 0 : 1);
}

function makeRecorder(digits: readonly number[]): StepRecorder<Table2DState> {
  const length = digits.length;
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D(length + 1, 4, () => null),
      rowLabels: Array.from({ length: length + 1 }, (_value, pos) => `pos=${pos}`),
      colLabels: [...COL_LABELS],
      rowHeader: 'pos (digits filled so far)',
      colHeader: 'state (tight, noFour): 0=tight+no4, 1=tight+has4, 2=loose+no4, 3=loose+has4',
      caption:
        'Digit DP: rows are digit positions filled so far (0..L); columns are [tight+no4, tight+has4, loose+no4, loose+has4]; the answer is dp[L][0] + dp[L][2] (only no-4 columns in the final row).',
    },
    { codeLine: 1 },
  );
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), min, max);
}

function normalizeInput(input: DigitDpInput): DigitDpInput {
  return { n: clampInt(input?.n, 0, MAX_N, 19) };
}

/** Fill the forward table (dp[pos][c] = prefixes of length pos in state c) and return its answer. */
function buildForward(rec: StepRecorder<Table2DState>, n: number, digits: readonly number[]): number {
  const length = digits.length;
  const dp = create2D(length + 1, 4, () => 0);
  dp[0]![0] = 1;

  rec.at(4).fill(
    [0, 0],
    1,
    'Base: dp[0][0] = 1 — before any digit is placed we are tight to the bound and have seen no 4. All other dp[0][c] are 0.',
    { kind: 'base', codeLine: 4, vars: { n, pos: 0, computed: 1 } },
  );
  for (let c = 1; c < 4; c += 1) {
    dp[0]![c] = 0;
    rec.at(4).fill([0, c], 0, `Base: dp[0][${c}] = 0 — the empty prefix cannot be in state ${COL_LABELS[c]}.`, {
      kind: 'base',
      codeLine: 4,
      vars: { n, pos: 0, computed: 1 + c },
    });
  }

  for (let pos = 0; pos < length; pos += 1) {
    rec.at(5).record(`Process digit position ${pos} (digit ${digits[pos]} of ${n}): carry each non-zero state forward by choosing the next digit.`, {
      codeLine: 5,
      highlights: [{ pos: [pos, 0], kind: 'active', label: `pos ${pos}` }],
      vars: { n, pos },
    });

    const nextRow = [0, 0, 0, 0];
    const parts: string[][] = [[], [], [], []];
    const deps: { pos: number[]; kind: 'dependency'; label: string }[][] = [[], [], [], []];

    for (let c = 0; c < 4; c += 1) {
      const ways = dp[pos]![c] ?? 0;
      if (ways === 0) continue;
      const tight = c < 2;
      const noFour = c % 2 === 0;
      const limit = tight ? (digits[pos] ?? 0) : 9;
      for (let d = 0; d <= limit; d += 1) {
        const nextTight = tight && d === limit;
        const nextNoFour = noFour && d !== 4;
        const nextCol = colIndex(nextTight, nextNoFour);
        nextRow[nextCol]! += ways;
        parts[nextCol]!.push(`dp[${pos}][${c}]=${ways} via digit ${d}`);
        deps[nextCol]!.push({ pos: [pos, c], kind: 'dependency', label: `digit ${d}` });
      }
    }

    for (let c = 0; c < 4; c += 1) {
      dp[pos + 1]![c] = nextRow[c]!;
      const message =
        parts[c]!.length === 0
          ? `dp[${pos + 1}][${c}] (${COL_LABELS[c]}) = 0: no prefix of length ${pos} in a live state chooses a digit that lands here.`
          : `dp[${pos + 1}][${c}] (${COL_LABELS[c]}) = ${parts[c]!.join(' + ')} = ${nextRow[c]}.`;
      rec.at(10).fill([pos + 1, c], nextRow[c]!, message, {
        codeLine: 10,
        highlights: deps[c]!,
        vars: { n, pos, c, dp: nextRow[c]! },
      });
    }
  }

  return (dp[length]![0] ?? 0) + (dp[length]![2] ?? 0);
}

function finish(rec: StepRecorder<Table2DState>, n: number, digits: readonly number[], answer: number): Step[] {
  const length = digits.length;
  rec.at(11).record(
    `The answer is ${answer}: there are ${answer} numbers from 0 to ${n} with no digit 4, namely dp[${length}][0] + dp[${length}][2] (final-row no-4 columns only).`,
    {
      codeLine: 11,
      highlights: [
        { pos: [length, 0], kind: 'result', label: 'answer: tight, no 4' },
        { pos: [length, 2], kind: 'result', label: 'answer: loose, no 4' },
      ],
      vars: { answer, n },
    },
  );
  return [...rec.steps];
}

function tabulationSteps(n: number, digits: readonly number[]): Step[] {
  const rec = makeRecorder(digits);
  rec.at(1).record(
    `Tabulation: build dp[pos][state] left to right for the digits of ${n}. Columns are [tight+no4, tight+has4, loose+no4, loose+has4]; only no-4 columns count at the end.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0, 0], kind: 'active', label: 'dp[0][0]' }],
      vars: { n, pos: 0 },
    },
  );
  const answer = buildForward(rec, n, digits);
  return finish(rec, n, digits, answer);
}

function memoSteps(n: number, digits: readonly number[]): Step[] {
  const length = digits.length;
  const rec = makeRecorder(digits);
  rec.at(1).record(
    `Memoization: solve count(pos, tight, noFour) recursively — the number of valid completions from position ${length} onward. Cache each state once; the forward table below shows how many prefixes reach each state.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0, 0], kind: 'active', label: 'count(0, tight, noFour)' }],
      vars: { n, pos: 0 },
    },
  );

  const memo = new Map<string, number>();
  let reused = 0;
  let computed = 0;

  function count(pos: number, tight: boolean, noFour: boolean): number {
    if (pos === length) {
      computed += 1;
      return noFour ? 1 : 0;
    }
    const key = `${pos}:${tight ? 1 : 0}:${noFour ? 1 : 0}`;
    const cached = memo.get(key);
    if (cached !== undefined) {
      reused += 1;
      rec.at(10).record(
        `Memo hit: count(${pos}, tight=${tight ? 1 : 0}, noFour=${noFour ? 1 : 0}) = ${cached} is already cached, so reuse it instead of trying every digit.`,
        {
          codeLine: 10,
          highlights: [{ pos: [pos, colIndex(tight, noFour)], kind: 'dependency', label: 'cached' }],
          vars: { n, pos, computed, reused, cached },
        },
      );
      return cached;
    }

    const limit = tight ? (digits[pos] ?? 0) : 9;
    let total = 0;
    const parts: string[] = [];
    for (let d = 0; d <= limit; d += 1) {
      const part = count(pos + 1, tight && d === limit, noFour && d !== 4);
      total += part;
      parts.push(`digit ${d} -> ${part}`);
    }
    memo.set(key, total);
    computed += 1;
    rec.at(10).record(
      `count(${pos}, tight=${tight ? 1 : 0}, noFour=${noFour ? 1 : 0}) = ${parts.join(' + ')} = ${total}. Cache it for reuse.`,
      {
        codeLine: 10,
        highlights: [{ pos: [pos, colIndex(tight, noFour)], kind: 'active', label: `count=${total}` }],
        vars: { n, pos, computed, reused, total },
      },
    );
    return total;
  }

  const suffixAnswer = count(0, true, true);
  rec.at(11).record(
    `Recursive count finished with ${suffixAnswer} valid completions. Now fill the forward table (same states, forward counts) so the answer is visible as dp[${length}][0] + dp[${length}][2].`,
    {
      codeLine: 11,
      highlights: [{ pos: [length, 0], kind: 'active', label: `suffix=${suffixAnswer}` }],
      vars: { n, pos: 0, computed, reused },
    },
  );

  const answer = buildForward(rec, n, digits);
  return finish(rec, n, digits, answer);
}

const digitDpModule: ProblemModule<DigitDpInput> = {
  id: 'digit-dp',
  title: 'Digit DP: Numbers With No 4',
  category: 'counting',
  difficulty: 'hard',
  summary:
    'Count numbers from 0 to n whose decimal representation contains no digit 4 by walking the digits left to right. The state tracks whether the prefix is still tight to n and whether it has stayed free of 4; flattened into four columns, the answer is the sum of the no-4 columns in the final row. Default n=19 gives 18 (0..19 has 20 numbers; only 4 and 14 contain a 4).',
  stateDefinition:
    'dp[pos][c] = number of prefixes of length pos (digits filled so far) ending in state c, where c flattens (tight, noFour): 0=tight+no4, 1=tight+has4, 2=loose+no4, 3=loose+has4. Rows are pos=0..L, columns are those four states; the answer is dp[L][0] + dp[L][2].',
  recurrence:
    'dp[0][0]=1 and dp[0][c]=0 for c>0. For each pos, decode tight=c<2 and noFour=c%2==0, set limit=tight?digit[pos]:9, and for each d=0..limit add dp[pos][c] to dp[pos+1][next] with next=(tight&&d==limit?0:2)+(noFour&&d!=4?0:1). The answer is dp[L][0]+dp[L][2].',
  complexity: { time: 'O(L * 4 * 10) = O(L)', space: 'O(L) table (L+1 rows x 4 states)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'n',
      label: 'n',
      help: 'Upper bound n (0 to 999). Count numbers 0..n with no digit 4.',
      type: 'number',
      min: 0,
      max: MAX_N,
      step: 1,
    },
  ],
  defaultInput: { n: 19 },
  modes: ['memo', 'tabulation'],
  generateSteps(input: DigitDpInput, mode: Mode): Step[] {
    const { n } = normalizeInput(input);
    const digits = String(n).split('').map(Number);
    if (mode === 'memo') return memoSteps(n, digits);
    return tabulationSteps(n, digits);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'How many numbers from 0 to 19 contain no digit 4?',
      options: ['20', '18', '16', '19'],
      answer: 1,
      why: 'There are 20 numbers 0..19; only 4 and 14 contain a 4, so 20 - 2 = 18. The table gives dp[2][0]=1 plus dp[2][2]=17.',
    },
    {
      q: 'What does the tight flag mean in state (pos, tight, noFour)?',
      options: [
        'The prefix is already below n, so the next digit can be 0..9',
        'The prefix so far equals the prefix of n, so the next digit must be 0..digit[pos]',
        'The number is already known to contain a 4',
        'The position is the last digit of n',
      ],
      answer: 1,
      why: 'Tight means every digit so far matches n exactly, so the next digit cannot exceed digit[pos]. Once a smaller digit is chosen, tight becomes false (loose) forever.',
    },
    {
      q: 'Why do we need the noFour flag instead of just counting all valid prefixes?',
      options: [
        'To know whether the tight bound can still be met',
        'To prefer numbers with leading zeros',
        'Because the final answer must exclude prefixes that already contain a 4, even if tight',
        'NoFour is only needed for the first digit',
      ],
      answer: 2,
      why: 'A prefix can be tight or loose and still contain a 4. Without noFour we could not distinguish those prefixes at the end, and loose+has4 prefixes would be wrongly counted.',
    },
    {
      q: 'Why is the answer dp[L][0] + dp[L][2] and not the sum of all four final columns?',
      options: [
        'Columns 1 and 3 are zero for every n',
        'Columns 0 and 2 are the only states with noFour true, and only those prefixes are valid',
        'Columns 0 and 2 are the tight columns',
        'All columns contribute, but the answer is the product',
      ],
      answer: 1,
      why: 'Columns 0 (tight, no 4) and 2 (loose, no 4) are exactly the states whose prefixes never used digit 4. Columns 1 and 3 have has4 true and must be excluded.',
    },
  ],
};

export default digitDpModule;
