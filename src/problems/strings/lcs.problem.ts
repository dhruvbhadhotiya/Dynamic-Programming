import { StepRecorder, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, StringAlignState } from '../../engine/types';

export interface LcsInput {
  a: string;
  b: string;
}

const MAX_LEN = 8;

const pythonCode = [
  'def lcs(a, b):',
  '    m, n = len(a), len(b)',
  '    dp = [[0] * (n + 1) for _ in range(m + 1)]',
  '    for i in range(1, m + 1):',
  '        for j in range(1, n + 1):',
  '            dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(dp[i-1][j], dp[i][j-1])',
  '    return dp[m][n]',
].join('\n');

const javascriptCode = [
  'function lcs(a, b) {',
  '  const m = a.length, n = b.length;',
  '  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));',
  '  for (let i = 1; i <= m; i++)',
  '    for (let j = 1; j <= n; j++)',
  '      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);',
  '  return dp[m][n];',
  '}',
].join('\n');

const cppCode = [
  'int lcs(const string& a, const string& b) {',
  '  int m = a.size(), n = b.size();',
  '  vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));',
  '  for (int i = 1; i <= m; i++)',
  '    for (int j = 1; j <= n; j++)',
  '      dp[i][j] = a[i-1] == b[j-1] ? dp[i-1][j-1] + 1 : max(dp[i-1][j], dp[i][j-1]);',
  '  return dp[m][n];',
  '}',
].join('\n');

function makeRecorder(a: string, b: string): StepRecorder<StringAlignState> {
  const m = a.length;
  const n = b.length;
  return new StepRecorder<StringAlignState>(
    {
      kind: 'stringAlign',
      a,
      b,
      values: create2D(m + 1, n + 1, () => null),
      caption: 'dp[i][j] = LCS length of a[0..i-1] and b[0..j-1]',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<StringAlignState>,
  m: number,
  n: number,
  answer: number,
  extra: Record<string, string | number | boolean>,
): Step[] {
  rec.at(7).record(
    `The answer is ${answer}: the longest common subsequence of length ${answer} exists.`,
    {
      codeLine: 7,
      highlights: [{ pos: [m, n], kind: 'result', label: 'answer' }],
      vars: { answer, ...extra },
    },
  );
  return [...rec.steps];
}

function dependencyHighlights(i: number, j: number, match: boolean): Highlight[] {
  if (match) {
    return [{ pos: [i - 1, j - 1], kind: 'dependency', label: 'match' }];
  }
  return [
    { pos: [i - 1, j], kind: 'dependency', label: 'skip a' },
    { pos: [i, j - 1], kind: 'dependency', label: 'skip b' },
  ];
}

function iterativeSteps(a: string, b: string, memo: boolean): Step[] {
  const m = a.length;
  const n = b.length;
  const rec = makeRecorder(a, b);
  const dp = create2D(m + 1, n + 1, () => 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each (i, j) pair once. Reuse cached dp[i-1][j-1], dp[i-1][j] and dp[i][j-1] for each cell.'
      : 'Tabulation: build dp bottom-up from empty prefixes. Each (i, j) cell is final using only earlier cells.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, m, n, a, b },
    },
  );

  for (let j = 0; j <= n; j += 1) {
    const row = dp[0];
    if (row !== undefined) row[j] = 0;
    rec.at(3).fill([0, j], 0, `Base case: LCS of empty prefix of a with b[0..${j - 1}] is 0: dp[0][${j}] = 0.`, {
      kind: 'base',
      codeLine: 3,
      vars: { computed: computed + 1, reused, m, n, a, b },
    });
    computed += 1;
  }

  for (let i = 1; i <= m; i += 1) {
    const row = dp[i];
    if (row !== undefined) row[0] = 0;
    rec.at(3).fill([i, 0], 0, `Base case: LCS of a[0..${i - 1}] with empty prefix of b is 0: dp[${i}][0] = 0.`, {
      kind: 'base',
      codeLine: 3,
      vars: { computed: computed + 1, reused, m, n, i, a, b },
    });
    computed += 1;
  }

  for (let i = 1; i <= m; i += 1) {
    const ca = a[i - 1] ?? '';
    for (let j = 1; j <= n; j += 1) {
      const cb = b[j - 1] ?? '';
      const match = ca === cb;
      const diag = dp[i - 1]?.[j - 1] ?? 0;
      const up = dp[i - 1]?.[j] ?? 0;
      const left = dp[i]?.[j - 1] ?? 0;
      const result = match ? diag + 1 : Math.max(up, left);
      const row = dp[i];
      if (row !== undefined) row[j] = result;
      computed += 1;
      reused += match ? 1 : 2;
      rec.at(6).fill(
        [i, j],
        result,
        memo
          ? match
            ? `Cache hit for dp[${i}][${j}]: chars match (${ca} == ${cb}), reuse dp[${i - 1}][${j - 1}] = ${diag}; dp[${i}][${j}] = ${diag} + 1 = ${result}.`
            : `Cache hit for dp[${i}][${j}]: chars differ (${ca} != ${cb}), reuse dp[${i - 1}][${j}] = ${up} and dp[${i}][${j - 1}] = ${left}; dp[${i}][${j}] = max(${up}, ${left}) = ${result}.`
          : match
            ? `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${diag} + 1 = ${result} because a[${i - 1}] == b[${j - 1}] == ${ca}.`
            : `dp[${i}][${j}] = max(dp[${i - 1}][${j}], dp[${i}][${j - 1}]) = max(${up}, ${left}) = ${result} because a[${i - 1}] != b[${j - 1}] (${ca} != ${cb}).`,
        {
          codeLine: 6,
          highlights: dependencyHighlights(i, j, match),
          vars: { computed, reused, i, j, m, n, a, b },
        },
      );
    }
  }

  return finish(rec, m, n, dp[m]?.[n] ?? 0, { computed, reused });
}

function cleanString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase()
    .slice(0, MAX_LEN);
}

function normalizeInput(input: LcsInput): { a: string; b: string } {
  return { a: cleanString(input.a), b: cleanString(input.b) };
}

const lcsModule: ProblemModule<LcsInput> = {
  id: 'lcs',
  title: 'Longest Common Subsequence',
  category: 'strings',
  difficulty: 'medium',
  summary:
    'Find the length of the longest subsequence appearing in both strings. Brute force tries every subsequence; memoization caches each (i, j) pair and tabulation fills dp bottom-up, so each (i, j) cell is solved once.',
  stateDefinition: 'dp[i][j] = LCS length of a[0..i-1] and b[0..j-1], for 0 <= i <= m and 0 <= j <= n.',
  recurrence:
    'dp[0][j] = 0 and dp[i][0] = 0; dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1], else max(dp[i-1][j], dp[i][j-1]).',
  complexity: { time: 'O(m * n)', space: 'O(m * n)' },
  renderer: 'stringAlign',
  inputSchema: [
    {
      name: 'a',
      label: 'a',
      help: 'First string, lowercase letters only, up to 8 characters.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
      pattern: '^[a-z]*$',
    },
    {
      name: 'b',
      label: 'b',
      help: 'Second string, lowercase letters only, up to 8 characters.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
      pattern: '^[a-z]*$',
    },
  ],
  defaultInput: { a: 'abcde', b: 'ace' },
  modes: ['memo', 'tabulation'],
  generateSteps(input: LcsInput, mode: Mode): Step[] {
    const { a, b } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(a, b, true);
    return iterativeSteps(a, b, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the LCS length of "abcde" and "ace"?',
      options: ['3', '2', '5', '4'],
      answer: 0,
      why: '"ace" is a subsequence of both strings, and no longer common subsequence exists, so the length is 3.',
    },
    {
      q: 'What does dp[i][j] mean?',
      options: ['LCS length of a[0..i-1] and b[0..j-1]', 'Longest suffix of a and b', 'Number of edit steps', 'Length of b[0..j-1]'],
      answer: 0,
      why: 'dp[i][j] is the LCS length of the length-i prefix of a and the length-j prefix of b.',
    },
    {
      q: 'What is dp[i][j] when a[i-1] == b[j-1]?',
      options: ['dp[i-1][j-1] + 1', 'max(dp[i-1][j], dp[i][j-1])', 'dp[i-1][j-1]', 'dp[i-1][j] + 1'],
      answer: 0,
      why: 'When the last characters match, extend the LCS of the shorter prefixes by one.',
    },
    {
      q: 'How do memoization/tabulation compare to brute-force LCS?',
      options: ['O(m*n) vs O(2^m * 2^n)', 'O(m+n) vs O(m*n)', 'The same', 'O(m*n) vs O(m+n)'],
      answer: 0,
      why: 'Each (i, j) cell is solved once in O(m*n); brute force enumerates subsequences exponentially with no reuse.',
    },
  ],
};

export default lcsModule;
