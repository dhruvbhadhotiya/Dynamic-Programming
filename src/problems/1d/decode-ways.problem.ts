import { StepRecorder } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface DecodeWaysInput {
  s: string;
}

const MAX_LEN = 12;

const pythonCode = [
  'def decode(s):',
  '    n = len(s)',
  '    dp = [0] * (n + 1)',
  '    dp[0] = 1',
  '    for i in range(1, n + 1):',
  "        dp[i] = (dp[i - 1] if s[i - 1] != '0' else 0) + (dp[i - 2] if i >= 2 and 10 <= int(s[i - 2:i]) <= 26 else 0)",
  '    return dp[n]',
].join('\n');

const javascriptCode = [
  'function decode(s) {',
  '  const n = s.length;',
  '  const dp = new Array(n + 1).fill(0);',
  '  dp[0] = 1;',
  '  for (let i = 1; i <= n; i++)',
  "    dp[i] = (s[i - 1] !== '0' ? dp[i - 1] : 0) + (i >= 2 && Number(s.slice(i - 2, i)) >= 10 && Number(s.slice(i - 2, i)) <= 26 ? dp[i - 2] : 0);",
  '  return dp[n];',
  '}',
].join('\n');

const cppCode = [
  'int decode(string s) {',
  '  int n = s.length();',
  '  vector<int> dp(n + 1, 0);',
  '  dp[0] = 1;',
  '  for (int i = 1; i <= n; i++)',
  "    dp[i] = (s[i - 1] != '0' ? dp[i - 1] : 0) + (i >= 2 && stoi(s.substr(i - 2, 2)) >= 10 && stoi(s.substr(i - 2, 2)) <= 26 ? dp[i - 2] : 0);",
  '  return dp[n];',
  '}',
].join('\n');

function twoDigitValid(s: string, i: number): boolean {
  if (i < 2) return false;
  const two = Number(s.slice(i - 2, i));
  return two >= 10 && two <= 26;
}

function dependencyHighlights(s: string, i: number): Highlight[] {
  const highlights: Highlight[] = [];
  if (s[i - 1] !== '0') {
    highlights.push({ pos: [i - 1], kind: 'dependency', label: `dp[${i - 1}]` });
  }
  if (twoDigitValid(s, i)) {
    highlights.push({ pos: [i - 2], kind: 'dependency', label: `dp[${i - 2}]` });
  }
  return highlights;
}

function makeRecorder(s: string): StepRecorder<Table1DState> {
  const n = s.length;
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n + 1 }, () => null),
      labels: Array.from({ length: n + 1 }, (_value, index) => `dp[${index}]`),
      indexName: 'i',
      caption: 'Decode-ways table dp[i] = ways for first i digits',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<Table1DState>,
  s: string,
  answer: number,
  extra: Record<string, string | number>,
): Step[] {
  const n = s.length;
  rec.at(7).record(`The answer is ${answer}.`, {
    codeLine: 7,
    highlights: [{ pos: [n], kind: 'result', label: 'answer' }],
    vars: { answer, s, ...extra },
  });
  return [...rec.steps];
}

function bruteForceSteps(s: string): Step[] {
  const rec = makeRecorder(s);
  let calls = 0;
  rec.at(1).record(
    `Brute force: call ways(${s.length}) recursively with no cache. Overlapping subproblems will be recomputed.`,
    {
      codeLine: 1,
      highlights: [{ pos: [s.length], kind: 'active', label: `ways(${s.length})` }],
      vars: { s, calls: 0 },
    },
  );

  const solve = (k: number): number => {
    calls += 1;
    if (k === 0) {
      rec.at(4).fill([0], 1, 'Base case: dp[0] = 1 (one way to decode zero digits).', {
        kind: 'base',
        codeLine: 4,
        vars: { s, calls, k },
      });
      return 1;
    }
    let value = 0;
    let singlePart = 0;
    let twoPart = 0;
    if (s[k - 1] !== '0') {
      singlePart = solve(k - 1);
      value += singlePart;
    }
    if (twoDigitValid(s, k)) {
      twoPart = solve(k - 2);
      value += twoPart;
    }
    rec.at(6).fill(
      [k],
      value,
      `Recomputed dp[${k}] = ${singlePart} + ${twoPart} = ${value}. Nothing was remembered.`,
      {
        codeLine: 6,
        highlights: dependencyHighlights(s, k),
        vars: { s, calls, k },
      },
    );
    return value;
  };

  const answer = solve(s.length);
  return finish(rec, s, answer, { calls });
}

function iterativeSteps(s: string, memo: boolean): Step[] {
  const rec = makeRecorder(s);
  const n = s.length;
  const dp: number[] = Array.from({ length: n + 1 }, () => 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? `Memoization: cache each dp[i] once. Look up cached dp[i-1] and dp[i-2] to build larger values.`
      : `Tabulation: build the table bottom-up from dp[0]. Smaller cells are final before larger ones.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { s, computed: 0, reused: 0 },
    },
  );

  dp[0] = 1;
  computed = 1;
  rec.at(4).fill([0], 1, 'Base case: dp[0] = 1 — one way to decode zero digits.', {
    kind: 'base',
    codeLine: 4,
    vars: { s, computed: 1, reused: 0 },
  });

  for (let i = 1; i <= n; i += 1) {
    let value = 0;
    let singlePart = 0;
    let twoPart = 0;
    const singleOk = s[i - 1] !== '0';
    const twoOk = twoDigitValid(s, i);
    if (singleOk) {
      singlePart = dp[i - 1] ?? 0;
      value += singlePart;
    }
    if (twoOk) {
      twoPart = dp[i - 2] ?? 0;
      value += twoPart;
    }
    dp[i] = value;
    computed += 1;
    reused += (singleOk ? 1 : 0) + (twoOk ? 1 : 0);
    const singleText = singleOk
      ? `single digit '${s[i - 1]}' uses dp[${i - 1}] = ${singlePart}`
      : `single digit '${s[i - 1]}' is '0' and cannot stand alone`;
    const twoText = twoOk
      ? `two digits '${s.slice(i - 2, i)}' use dp[${i - 2}] = ${twoPart}`
      : i < 2
        ? 'two-digit decode needs at least 2 digits'
        : `two digits '${s.slice(i - 2, i)}' are outside 10..26`;
    rec.at(6).fill(
      [i],
      value,
      memo
        ? `Cache hit: ${singleText}; ${twoText}; dp[${i}] = ${singlePart} + ${twoPart} = ${value}.`
        : `dp[${i}] = ${singlePart} + ${twoPart} = ${value}. ${singleText.charAt(0).toUpperCase()}${singleText.slice(1)}; ${twoText}. Both dependencies are already final.`,
      {
        codeLine: 6,
        highlights: dependencyHighlights(s, i),
        vars: { s, computed, reused, i },
      },
    );
  }

  return finish(rec, s, dp[n] ?? 0, { computed, reused });
}

function normalizeInput(input: DecodeWaysInput): string {
  const raw = typeof input.s === 'string' ? input.s : '';
  const digits = raw.replace(/[^0-9]/g, '').slice(0, MAX_LEN);
  return digits.length > 0 ? digits : '1';
}

const decodeWaysModule: ProblemModule<DecodeWaysInput> = {
  id: 'decode-ways',
  title: 'Decode Ways',
  category: '1d',
  difficulty: 'medium',
  summary:
    'Count the distinct ways to decode a digit string where 1-26 map to A-Z. Digits of 0 cannot stand alone and two-digit numbers must lie in 10..26. Brute force recomputes overlapping prefixes; memoization caches them and tabulation fills the table bottom-up, so each dp[i] is computed once.',
  stateDefinition: 'dp[i] = ways to decode the first i digits of s, for 0 <= i <= len(s).',
  recurrence:
    'dp[0] = 1; dp[i] = (s[i-1] != "0" ? dp[i-1] : 0) + (i >= 2 and 10 <= int(s[i-2:i]) <= 26 ? dp[i-2] : 0).',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 's',
      label: 's',
      help: 'Digits only, e.g. 226. Keep s short to see brute-force overlap.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
      pattern: '^[0-9]+$',
    },
  ],
  defaultInput: { s: '226' },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: DecodeWaysInput, mode: Mode): Step[] {
    const s = normalizeInput(input);
    if (mode === 'bruteforce') return bruteForceSteps(s);
    if (mode === 'memo') return iterativeSteps(s, true);
    return iterativeSteps(s, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'How many ways are there to decode "226"?',
      options: ['3', '2', '6', '5'],
      answer: 0,
      why: 'The decodings are 2-2-6 (BBF), 22-6 (VF) and 2-26 (BZ), so dp[3] = 3.',
    },
    {
      q: 'How many ways are there to decode "06"?',
      options: ['0', '1', '6', '2'],
      answer: 0,
      why: 'A leading zero cannot start a letter, so "06" has 0 decodings.',
    },
    {
      q: 'In this module, what does dp[i] mean?',
      options: [
        'Ways to decode the first i digits',
        'Ways to decode the last i digits',
        'Ways to decode starting at digit i',
        'Number of letters used so far',
      ],
      answer: 0,
      why: 'dp[i] counts decodings of the prefix s[0..i-1] (the first i characters).',
    },
    {
      q: 'How do memoization/tabulation compare to brute force on decode ways?',
      options: ['O(n) vs O(2^n)', 'O(n^2) vs O(n)', 'The same', 'O(1) vs O(n)'],
      answer: 0,
      why: 'Caching computes each dp[i] once in O(n); brute force recomputes overlapping prefixes, giving exponential time.',
    },
  ],
};

export default decodeWaysModule;
