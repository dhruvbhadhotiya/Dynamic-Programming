import { StepRecorder, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, StringAlignState } from '../../engine/types';

export interface ShortestCommonSupersequenceInput {
  a: string;
  b: string;
}

const MAX_LEN = 7;

const pythonCode = [
  'def scs(a, b):',
  '    m, n = len(a), len(b)',
  '    dp = [[i + j for j in range(n + 1)] for i in range(m + 1)]',
  '    for i in range(1, m + 1):',
  '        for j in range(1, n + 1):',
  '            dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else 1 + min(dp[i-1][j], dp[i][j-1])',
  '    return dp[m][n]',
].join('\n');

const javascriptCode = [
  'function scs(a, b) {',
  '  const m = a.length, n = b.length;',
  '  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i + j));',
  '  for (let i = 1; i <= m; i++)',
  '    for (let j = 1; j <= n; j++)',
  '      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : 1 + Math.min(dp[i - 1][j], dp[i][j - 1]);',
  '  return dp[m][n];',
  '}',
].join('\n');

const cppCode = [
  'int scs(const string& a, const string& b) {',
  '  int m = a.size(), n = b.size();',
  '  vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0)); for (int i = 0; i <= m; i++) for (int j = 0; j <= n; j++) dp[i][j] = i + j;',
  '  for (int i = 1; i <= m; i++)',
  '    for (int j = 1; j <= n; j++)',
  '      dp[i][j] = a[i-1] == b[j-1] ? dp[i-1][j-1] + 1 : 1 + min(dp[i-1][j], dp[i][j-1]);',
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
      caption: 'dp[i][j] = SCS length of a[0..i-1] and b[0..j-1]',
    },
    { codeLine: 1 },
  );
}

function buildSupersequence(a: string, b: string, dp: number[][]): string {
  let i = a.length;
  let j = b.length;
  const chars: string[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      chars.push(a[i - 1] ?? '');
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || (dp[i]?.[j - 1] ?? 0) <= (dp[i - 1]?.[j] ?? 0))) {
      chars.push(b[j - 1] ?? '');
      j -= 1;
    } else {
      chars.push(a[i - 1] ?? '');
      i -= 1;
    }
  }
  return chars.reverse().join('');
}

function finish(
  rec: StepRecorder<StringAlignState>,
  m: number,
  n: number,
  answer: number,
  extra: Record<string, string | number | boolean>,
): Step[] {
  rec.at(7).record(
    `The answer is ${answer}: a shortest common supersequence has length ${answer} (e.g. "${String(extra['supersequence'] ?? '')}").`,
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
    return [{ pos: [i - 1, j - 1], kind: 'dependency', label: 'together' }];
  }
  return [
    { pos: [i - 1, j], kind: 'dependency', label: 'take a' },
    { pos: [i, j - 1], kind: 'dependency', label: 'take b' },
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
    if (row !== undefined) row[j] = j;
    rec.at(3).fill([0, j], j, `Base case: SCS of empty prefix of a with b[0..${j - 1}] is "${b.slice(0, j)}", length ${j}: dp[0][${j}] = ${j}.`, {
      kind: 'base',
      codeLine: 3,
      vars: { computed: computed + 1, reused, m, n, a, b },
    });
    computed += 1;
  }

  for (let i = 1; i <= m; i += 1) {
    const row = dp[i];
    if (row !== undefined) row[0] = i;
    rec.at(3).fill([i, 0], i, `Base case: SCS of a[0..${i - 1}] with empty prefix of b is "${a.slice(0, i)}", length ${i}: dp[${i}][0] = ${i}.`, {
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
      const result = match ? diag + 1 : 1 + Math.min(up, left);
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
            : `Cache hit for dp[${i}][${j}]: chars differ (${ca} != ${cb}), reuse dp[${i - 1}][${j}] = ${up} and dp[${i}][${j - 1}] = ${left}; dp[${i}][${j}] = 1 + min(${up}, ${left}) = ${result}.`
          : match
            ? `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${diag} + 1 = ${result} because a[${i - 1}] == b[${j - 1}] == ${ca} (take the shared char once).`
            : `dp[${i}][${j}] = 1 + min(dp[${i - 1}][${j}], dp[${i}][${j - 1}]) = 1 + min(${up}, ${left}) = ${result} because a[${i - 1}] != b[${j - 1}] (${ca} != ${cb}).`,
        {
          codeLine: 6,
          highlights: dependencyHighlights(i, j, match),
          vars: { computed, reused, i, j, m, n, a, b },
        },
      );
    }
  }

  const answer = dp[m]?.[n] ?? 0;
  const supersequence = buildSupersequence(a, b, dp);
  return finish(rec, m, n, answer, { computed, reused, supersequence, lcsLength: m + n - answer });
}

function cleanString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase()
    .slice(0, MAX_LEN);
}

function normalizeInput(input: ShortestCommonSupersequenceInput): { a: string; b: string } {
  return { a: cleanString(input.a), b: cleanString(input.b) };
}

const shortestCommonSupersequenceModule: ProblemModule<ShortestCommonSupersequenceInput> = {
  id: 'shortest-common-supersequence',
  title: 'Shortest Common Supersequence',
  category: 'strings',
  difficulty: 'medium',
  summary:
    'Find the length of the shortest string containing both strings as subsequences. Brute force tries every merge; memoization caches each (i, j) pair and tabulation fills dp bottom-up, so each (i, j) cell is solved once. The length also equals len(a) + len(b) - LCS(a, b).',
  stateDefinition: 'dp[i][j] = SCS length of a[0..i-1] and b[0..j-1], for 0 <= i <= m and 0 <= j <= n.',
  recurrence:
    'dp[0][j] = j and dp[i][0] = i; dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1], else 1 + min(dp[i-1][j], dp[i][j-1]).',
  complexity: { time: 'O(m * n)', space: 'O(m * n)' },
  renderer: 'stringAlign',
  inputSchema: [
    {
      name: 'a',
      label: 'a',
      help: 'First string, lowercase letters only, up to 7 characters.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
      pattern: '^[a-z]*$',
    },
    {
      name: 'b',
      label: 'b',
      help: 'Second string, lowercase letters only, up to 7 characters.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
      pattern: '^[a-z]*$',
    },
  ],
  defaultInput: { a: 'abac', b: 'cab' },
  modes: ['memo', 'tabulation'],
  generateSteps(input: ShortestCommonSupersequenceInput, mode: Mode): Step[] {
    const { a, b } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(a, b, true);
    return iterativeSteps(a, b, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the SCS length of "abac" and "cab"?',
      options: ['5', '4', '3', '7'],
      answer: 0,
      why: 'LCS("abac", "cab") is 2 (e.g. "ab"), so SCS = 4 + 3 - 2 = 5; no length-4 string contains both.',
    },
    {
      q: 'What does dp[i][j] mean?',
      options: ['SCS length of a[0..i-1] and b[0..j-1]', 'LCS length of the two suffixes', 'Number of edit steps', 'Length of b[0..j-1]'],
      answer: 0,
      why: 'dp[i][j] is the shortest common supersequence length of the length-i prefix of a and the length-j prefix of b.',
    },
    {
      q: 'What is dp[i][j] when a[i-1] == b[j-1]?',
      options: ['dp[i-1][j-1] + 1', '1 + min(dp[i-1][j], dp[i][j-1])', 'dp[i-1][j-1]', 'dp[i-1][j] + 1'],
      answer: 0,
      why: 'A matching last character can be taken once, extending the SCS of the shorter prefixes by one.',
    },
    {
      q: 'How does SCS length relate to LCS length?',
      options: ['len(a) + len(b) - LCS(a, b)', 'LCS(a, b)', 'max(len(a), len(b))', 'len(a) * len(b) - LCS(a, b)'],
      answer: 0,
      why: 'A common subsequence of length k lets k characters be shared, so the merged length is m + n - k; maximizing sharing means using the LCS.',
    },
  ],
};

export default shortestCommonSupersequenceModule;
