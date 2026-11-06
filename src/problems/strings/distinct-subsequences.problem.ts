import { StepRecorder, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, StringAlignState } from '../../engine/types';

export interface DistinctSubsequencesInput {
  s: string;
  t: string;
}

const MAX_LEN = 7;

const pythonCode = [
  'def num_distinct(s, t):',
  '    m, n = len(s), len(t)',
  '    dp = [[0] * (n + 1) for _ in range(m + 1)]',
  '    for i in range(m + 1): dp[i][0] = 1',
  '    for i in range(1, m + 1):',
  '        for j in range(1, n + 1):',
  '            dp[i][j] = dp[i-1][j] + dp[i-1][j-1] if s[i-1] == t[j-1] else dp[i-1][j]',
  '    return dp[m][n]',
].join('\n');

const javascriptCode = [
  'function numDistinct(s, t) {',
  '  const m = s.length, n = t.length;',
  '  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));',
  '  for (let i = 0; i <= m; i++) dp[i][0] = 1;',
  '  for (let i = 1; i <= m; i++)',
  '    for (let j = 1; j <= n; j++)',
  '      dp[i][j] = s[i - 1] === t[j - 1] ? dp[i - 1][j] + dp[i - 1][j - 1] : dp[i - 1][j];',
  '  return dp[m][n];',
  '}',
].join('\n');

const cppCode = [
  'int numDistinct(const string& s, const string& t) {',
  '  int m = s.size(), n = t.size();',
  '  vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));',
  '  for (int i = 0; i <= m; i++) dp[i][0] = 1;',
  '  for (int i = 1; i <= m; i++)',
  '    for (int j = 1; j <= n; j++)',
  '      dp[i][j] = s[i-1] == t[j-1] ? dp[i-1][j] + dp[i-1][j-1] : dp[i-1][j];',
  '  return dp[m][n];',
  '}',
].join('\n');

function makeRecorder(s: string, t: string): StepRecorder<StringAlignState> {
  const m = s.length;
  const n = t.length;
  return new StepRecorder<StringAlignState>(
    {
      kind: 'stringAlign',
      a: s,
      b: t,
      values: create2D(m + 1, n + 1, () => null),
      caption: 'dp[i][j] = ways t[0..j-1] is a subsequence of s[0..i-1]',
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
  rec.at(8).record(
    `The answer is ${answer}: there are ${answer} distinct subsequences of s equal to t.`,
    {
      codeLine: 8,
      highlights: [{ pos: [m, n], kind: 'result', label: 'answer' }],
      vars: { answer, ...extra },
    },
  );
  return [...rec.steps];
}

function dependencyHighlights(i: number, j: number, match: boolean): Highlight[] {
  if (match) {
    return [
      { pos: [i - 1, j], kind: 'dependency', label: 'skip s' },
      { pos: [i - 1, j - 1], kind: 'dependency', label: 'take' },
    ];
  }
  return [{ pos: [i - 1, j], kind: 'dependency', label: 'skip s' }];
}

function iterativeSteps(s: string, t: string, memo: boolean): Step[] {
  const m = s.length;
  const n = t.length;
  const rec = makeRecorder(s, t);
  const dp = create2D(m + 1, n + 1, () => 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each (i, j) pair once. Reuse cached dp[i-1][j] and dp[i-1][j-1] for each cell.'
      : 'Tabulation: build dp bottom-up from empty prefixes. Each (i, j) cell is final using only earlier cells.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, m, n, s, t },
    },
  );

  for (let j = 0; j <= n; j += 1) {
    const value = j === 0 ? 1 : 0;
    const row = dp[0];
    if (row !== undefined) row[j] = value;
    rec.at(4).fill([0, j], value, `Base case: dp[0][${j}] = ${value} — ${j === 0 ? 'empty t is 1 way' : 'empty s cannot form a non-empty t'}.`, {
      kind: 'base',
      codeLine: 4,
      vars: { computed: computed + 1, reused, m, n, s, t },
    });
    computed += 1;
  }

  for (let i = 1; i <= m; i += 1) {
    const row = dp[i];
    if (row !== undefined) row[0] = 1;
    rec.at(4).fill([i, 0], 1, `Base case: empty t is a subsequence of s[0..${i - 1}] in exactly 1 way: dp[${i}][0] = 1.`, {
      kind: 'base',
      codeLine: 4,
      vars: { computed: computed + 1, reused, m, n, i, s, t },
    });
    computed += 1;
  }

  for (let i = 1; i <= m; i += 1) {
    const cs = s[i - 1] ?? '';
    for (let j = 1; j <= n; j += 1) {
      const ct = t[j - 1] ?? '';
      const match = cs === ct;
      const up = dp[i - 1]?.[j] ?? 0;
      const diag = dp[i - 1]?.[j - 1] ?? 0;
      const result = match ? up + diag : up;
      const row = dp[i];
      if (row !== undefined) row[j] = result;
      computed += 1;
      reused += match ? 2 : 1;
      rec.at(7).fill(
        [i, j],
        result,
        memo
          ? match
            ? `Cache hit for dp[${i}][${j}]: chars match (${cs} == ${ct}), reuse dp[${i - 1}][${j}] = ${up} and dp[${i - 1}][${j - 1}] = ${diag}; dp[${i}][${j}] = ${up} + ${diag} = ${result}.`
            : `Cache hit for dp[${i}][${j}]: chars differ (${cs} != ${ct}), reuse dp[${i - 1}][${j}] = ${up}; dp[${i}][${j}] = ${result}.`
          : match
            ? `dp[${i}][${j}] = dp[${i - 1}][${j}] + dp[${i - 1}][${j - 1}] = ${up} + ${diag} = ${result} because s[${i - 1}] == t[${j - 1}] == ${cs}.`
            : `dp[${i}][${j}] = dp[${i - 1}][${j}] = ${result} because s[${i - 1}] != t[${j - 1}] (${cs} != ${ct}).`,
        {
          codeLine: 7,
          highlights: dependencyHighlights(i, j, match),
          vars: { computed, reused, i, j, m, n, s, t },
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

function normalizeInput(input: DistinctSubsequencesInput): { s: string; t: string } {
  return { s: cleanString(input.s), t: cleanString(input.t) };
}

const distinctSubsequencesModule: ProblemModule<DistinctSubsequencesInput> = {
  id: 'distinct-subsequences',
  title: 'Distinct Subsequences',
  category: 'strings',
  difficulty: 'medium',
  summary:
    'Count distinct subsequences of s that equal t. Brute force enumerates every subsequence; memoization caches each (i, j) pair and tabulation fills dp bottom-up, so each (i, j) cell is solved once.',
  stateDefinition: 'dp[i][j] = number of ways t[0..j-1] appears as a subsequence in s[0..i-1], for 0 <= i <= m and 0 <= j <= n.',
  recurrence:
    'dp[i][0] = 1 and dp[0][j] = 0 for j > 0; dp[i][j] = dp[i-1][j] + dp[i-1][j-1] if s[i-1] == t[j-1], else dp[i-1][j].',
  complexity: { time: 'O(m * n)', space: 'O(m * n)' },
  renderer: 'stringAlign',
  inputSchema: [
    {
      name: 's',
      label: 's',
      help: 'Source string, lowercase letters only, up to 7 characters.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
      pattern: '^[a-z]*$',
    },
    {
      name: 't',
      label: 't',
      help: 'Target string, lowercase letters only, up to 7 characters.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
      pattern: '^[a-z]*$',
    },
  ],
  defaultInput: { s: 'rabbbit', t: 'rabbit' },
  modes: ['memo', 'tabulation'],
  generateSteps(input: DistinctSubsequencesInput, mode: Mode): Step[] {
    const { s, t } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(s, t, true);
    return iterativeSteps(s, t, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the number of distinct subsequences of "rabbbit" equal to "rabbit"?',
      options: ['3', '2', '5', '1'],
      answer: 0,
      why: 'The three ways to pick the three b\'s in "rabbbit" give 3 distinct subsequences equal to "rabbit".',
    },
    {
      q: 'What does dp[i][j] mean?',
      options: ['Ways t[0..j-1] appears as a subsequence in s[0..i-1]', 'Length of LCS of s and t', 'Number of ways to build s from t', 'Length of t[0..j-1]'],
      answer: 0,
      why: 'dp[i][j] counts the distinct subsequences of the length-i prefix of s that equal the length-j prefix of t.',
    },
    {
      q: 'What is dp[i][j] when s[i-1] == t[j-1]?',
      options: ['dp[i-1][j] + dp[i-1][j-1]', 'dp[i-1][j]', 'dp[i-1][j-1]', 'dp[i-1][j-1] + 1'],
      answer: 0,
      why: 'When the characters match, skip s[i-1] (dp[i-1][j] ways) or take it to match t[j-1] (dp[i-1][j-1] ways).',
    },
    {
      q: 'How do memoization/tabulation compare to brute-force enumeration?',
      options: ['O(m*n) vs O(2^m)', 'O(m+n) vs O(m*n)', 'The same', 'O(m*n) vs O(m+n)'],
      answer: 0,
      why: 'Each (i, j) cell is solved once in O(m*n); brute force enumerates all 2^m subsequences with no reuse.',
    },
  ],
};

export default distinctSubsequencesModule;
