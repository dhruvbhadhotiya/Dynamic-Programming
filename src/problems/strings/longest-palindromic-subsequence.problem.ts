import { StepRecorder, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, StringAlignState } from '../../engine/types';

export interface LongestPalindromicSubsequenceInput {
  s: string;
}

const MAX_LENGTH = 8;

const pythonCode = [
  'def longest_pal_subseq(s):',
  '    n = len(s)',
  '    b = s[::-1]',
  '    dp = [[0] * (n + 1) for _ in range(n + 1)]',
  '    for i in range(1, n + 1):',
  '        for j in range(1, n + 1):',
  '            dp[i][j] = dp[i - 1][j - 1] + 1 if s[i - 1] == b[j - 1] else max(dp[i - 1][j], dp[i][j - 1])',
  '    return dp[n][n]',
].join('\n');

const javascriptCode = [
  'function longestPalSubseq(s) {',
  '  const n = s.length;',
  "  const b = s.split('').reverse().join('');",
  '  const dp = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));',
  '  for (let i = 1; i <= n; i++)',
  '    for (let j = 1; j <= n; j++)',
  '      dp[i][j] = s[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);',
  '  return dp[n][n];',
  '}',
].join('\n');

const cppCode = [
  'int longestPalSubseq(string s) {',
  '  int n = s.size();',
  '  string b = s; reverse(b.begin(), b.end());',
  '  vector<vector<int>> dp(n + 1, vector<int>(n + 1, 0));',
  '  for (int i = 1; i <= n; i++)',
  '    for (int j = 1; j <= n; j++)',
  '      dp[i][j] = (s[i - 1] == b[j - 1]) ? dp[i-1][j-1] + 1 : max(dp[i-1][j], dp[i][j-1]);',
  '  return dp[n][n];',
  '}',
].join('\n');

function reverseOf(s: string): string {
  return [...s].reverse().join('');
}

function makeRecorder(s: string, b: string): StepRecorder<StringAlignState> {
  const n = s.length;
  return new StepRecorder<StringAlignState>(
    {
      kind: 'stringAlign',
      a: s,
      b,
      values: create2D(n + 1, n + 1, () => null),
      caption: 'LPS as LCS of s and reversed s: dp[i][j] = LPS length for s[0..i-1] vs b[0..j-1]',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<StringAlignState>,
  n: number,
  answer: number,
  extra: Record<string, string | number | boolean>,
): Step[] {
  rec.at(8).record(
    `The answer is ${answer}: the longest palindromic subsequence has length ${answer}.`,
    {
      codeLine: 8,
      highlights: [{ pos: [n, n], kind: 'result', label: 'answer' }],
      vars: { answer, ...extra },
    },
  );
  return [...rec.steps];
}

function dependencyHighlights(i: number, j: number, matched: boolean): Highlight[] {
  if (matched) {
    return [{ pos: [i - 1, j - 1], kind: 'dependency', label: 'extend' }];
  }
  return [
    { pos: [i - 1, j], kind: 'dependency', label: 'drop s' },
    { pos: [i, j - 1], kind: 'dependency', label: 'drop b' },
  ];
}

function iterativeSteps(s: string, memo: boolean): Step[] {
  const b = reverseOf(s);
  const n = s.length;
  const rec = makeRecorder(s, b);
  const dp = create2D(n + 1, n + 1, () => 0);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? `Memoization: cache each (i, j) length once. Reuse cached dp[i-1][j-1], dp[i-1][j] and dp[i][j-1] so every pair is solved once.`
      : `Tabulation: build dp bottom-up row by row. Each (i, j) cell is final using only the row above and the current row's left cell.`,
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n, s, b },
    },
  );

  const baseRow = dp[0];
  if (baseRow !== undefined) baseRow[0] = 0;
  rec.at(4).fill([0, 0], 0, 'Base case: the empty prefix has LPS length 0: dp[0][0] = 0.', {
    kind: 'base',
    codeLine: 4,
    vars: { computed: 1, reused: 0, n, s, b },
  });
  computed = 1;

  for (let j = 1; j <= n; j += 1) {
    const row = dp[0];
    if (row !== undefined) row[j] = 0;
    rec.at(4).fill([0, j], 0, `Base case: an empty prefix of s cannot match b[0..${j - 1}], so dp[0][${j}] = 0.`, {
      kind: 'base',
      codeLine: 4,
      vars: { computed: computed + 1, reused: 0, n, s, b },
    });
    computed += 1;
  }

  for (let i = 1; i <= n; i += 1) {
    const row = dp[i];
    if (row !== undefined) row[0] = 0;
    rec.at(4).fill([i, 0], 0, `Base case: an empty prefix of b cannot match s[0..${i - 1}], so dp[${i}][0] = 0.`, {
      kind: 'base',
      codeLine: 4,
      vars: { computed: computed + 1, reused: 0, n, s, b },
    });
    computed += 1;
  }

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const si = s[i - 1] ?? '';
      const bj = b[j - 1] ?? '';
      const matched = si === bj;
      const diag = dp[i - 1]?.[j - 1] ?? 0;
      const up = dp[i - 1]?.[j] ?? 0;
      const left = dp[i]?.[j - 1] ?? 0;
      const result = matched ? diag + 1 : Math.max(up, left);
      const row = dp[i];
      if (row !== undefined) row[j] = result;
      computed += 1;
      reused += matched ? 1 : 2;
      const reason = matched
        ? `s[${i - 1}] '${si}' matches b[${j - 1}] '${bj}', so extend the diagonal`
        : `s[${i - 1}] '${si}' does not match b[${j - 1}] '${bj}', so keep the better of the two neighbours`;
      rec.at(7).fill(
        [i, j],
        result,
        memo
          ? `Cache hit for dp[${i}][${j}]: reuse dp[${i - 1}][${j - 1}] = ${diag}, dp[${i - 1}][${j}] = ${up} and dp[${i}][${j - 1}] = ${left}; dp[${i}][${j}] = ${result} because ${reason}.`
          : `dp[${i}][${j}] = ${matched ? `dp[${i - 1}][${j - 1}] + 1 = ${diag} + 1` : `max(dp[${i - 1}][${j}], dp[${i}][${j - 1}]) = max(${up}, ${left})`} = ${result} because ${reason}.`,
        {
          codeLine: 7,
          highlights: dependencyHighlights(i, j, matched),
          vars: { computed, reused, i, j, n, s, b },
        },
      );
    }
  }

  return finish(rec, n, dp[n]?.[n] ?? 0, { computed, reused });
}

function normalizeInput(input: LongestPalindromicSubsequenceInput): { s: string } {
  const raw = typeof input.s === 'string' ? input.s : '';
  return { s: raw.slice(0, MAX_LENGTH) };
}

const longestPalindromicSubsequenceModule: ProblemModule<LongestPalindromicSubsequenceInput> = {
  id: 'longest-palindromic-subsequence',
  title: 'Longest Palindromic Subsequence',
  category: 'strings',
  difficulty: 'medium',
  summary:
    'Find the length of the longest subsequence of s that reads the same forwards and backwards. A palindromic subsequence of s is a common subsequence of s and reversed s, so its length equals the LCS length of the two strings; memoization caches each (i, j) cell and tabulation fills dp bottom-up, so each pair is solved once.',
  stateDefinition:
    'dp[i][j] = length of the longest common subsequence of s[0..i-1] and b[0..j-1], where b is s reversed; dp[n][n] is the LPS length of s.',
  recurrence:
    'dp[0][j] = dp[i][0] = 0; dp[i][j] = dp[i-1][j-1] + 1 if s[i-1] == b[j-1], else max(dp[i-1][j], dp[i][j-1]).',
  complexity: { time: 'O(n^2)', space: 'O(n^2)' },
  renderer: 'stringAlign',
  inputSchema: [
    {
      name: 's',
      label: 's',
      help: 'String to keep characters from. Order is preserved; characters may be skipped.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LENGTH,
    },
  ],
  defaultInput: { s: 'bbbab' },
  modes: ['memo', 'tabulation'],
  generateSteps(input: LongestPalindromicSubsequenceInput, mode: Mode): Step[] {
    const { s } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(s, true);
    return iterativeSteps(s, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: "What is the longest palindromic subsequence length of 'bbbab'?",
      options: ['4', '3', '5', '2'],
      answer: 0,
      why: "'bbbb' is a subsequence of 'bbbab' (skip the 'a') with length 4, and no palindromic subsequence of length 5 exists.",
    },
    {
      q: 'What does dp[i][j] mean in this module?',
      options: ['LPS length of s[0..i-1] vs reversed s[0..j-1]', 'Longest palindrome substring starting at i', 'Number of palindromic subsequences', 'Longest prefix that is a palindrome'],
      answer: 0,
      why: 'dp[i][j] is the LCS length of the two prefixes, so dp[n][n] equals the longest palindromic subsequence length of s.',
    },
    {
      q: 'What is the recurrence for dp[i][j]?',
      options: [
        'dp[i-1][j-1] + 1 if s[i-1]==b[j-1], else max(dp[i-1][j], dp[i][j-1])',
        'dp[i-1][j] + 1 always',
        'max(dp[i-1][j-1], dp[i][j]) + 1 always',
        'dp[i-1][j-1] if s[i-1]==b[j-1], else 0',
      ],
      answer: 0,
      why: 'Matching characters extend the diagonal match; otherwise one side must be skipped, and the best neighbour wins.',
    },
    {
      q: 'Why does LCS(s, reverse(s)) equal LPS(s)?',
      options: ['A palindrome reads the same reversed, so it is a common subsequence of both', 'Reversing doubles the string', 'LCS counts palindromes', 'Every subsequence of s reversed is in s'],
      answer: 0,
      why: 'Reading a subsequence forwards and backwards gives the same palindrome, so the longest palindrome is a common subsequence of s and s reversed (and vice versa).',
    },
  ],
};

export default longestPalindromicSubsequenceModule;
