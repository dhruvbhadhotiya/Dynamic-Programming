import { StepRecorder, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, StringAlignState } from '../../engine/types';

export interface LongestCommonSubstringInput {
  a: string;
  b: string;
}

const MAX_LEN = 8;

const pythonCode = [
  'def longest_common_substring(a, b):',
  '    n, m = len(a), len(b)',
  '    dp = [[0] * (m + 1) for _ in range(n + 1)]',
  '    best = 0',
  '    for i in range(1, n + 1):',
  '        for j in range(1, m + 1):',
  '            dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else 0; best = max(best, dp[i][j])',
  '    return best',
].join('\n');

const javascriptCode = [
  'function longestCommonSubstring(a, b) {',
  '  const n = a.length, m = b.length;',
  '  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));',
  '  let best = 0;',
  '  for (let i = 1; i <= n; i++)',
  '    for (let j = 1; j <= m; j++)',
  '      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : 0, best = Math.max(best, dp[i][j]);',
  '  return best;',
  '}',
].join('\n');

const cppCode = [
  'int longestCommonSubstring(string a, string b) {',
  '  int n = a.size(), m = b.size();',
  '  vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));',
  '  int best = 0;',
  '  for (int i = 1; i <= n; i++)',
  '    for (int j = 1; j <= m; j++)',
  '      dp[i][j] = a[i-1] == b[j-1] ? dp[i-1][j-1] + 1 : 0, best = max(best, dp[i][j]);',
  '  return best;',
  '}',
].join('\n');

function makeRecorder(a: string, b: string): StepRecorder<StringAlignState> {
  return new StepRecorder<StringAlignState>(
    {
      kind: 'stringAlign',
      a,
      b,
      values: create2D(a.length + 1, b.length + 1, () => null),
      caption: 'Longest common substring table dp[i][j] = longest common substring ending at a[i-1], b[j-1]',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<StringAlignState>,
  best: number,
  bestI: number,
  bestJ: number,
  substring: string,
  extra: Record<string, string | number>,
): Step[] {
  rec.at(8).record(
    best > 0
      ? `The answer is ${best}: longest common substring is '${substring}' (length ${best}).`
      : 'The answer is 0: no common characters, so the longest common substring is empty.',
    {
      codeLine: 8,
      highlights: [{ pos: [bestI, bestJ], kind: 'result', label: 'answer' }],
      vars: { answer: best, substring, ...extra },
    },
  );
  return [...rec.steps];
}

function iterativeSteps(a: string, b: string, memo: boolean): Step[] {
  const n = a.length;
  const m = b.length;
  const rec = makeRecorder(a, b);
  const dp = create2D(n + 1, m + 1, () => 0);
  let computed = 0;
  let reused = 0;
  let best = 0;
  let bestI = 0;
  let bestJ = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each dp[i][j] once. Reuse cached dp[i-1][j-1] for every cell.'
      : 'Tabulation: build dp bottom-up from empty prefixes. Each cell is final using only the diagonal above-left.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, n, m },
    },
  );

  for (let j = 0; j <= m; j += 1) {
    computed += 1;
    rec.at(3).fill([0, j], 0, `Base case: dp[0][${j}] = 0 — empty a prefix has no common substring.`, {
      kind: 'base',
      codeLine: 3,
      vars: { computed, reused: 0, i: 0, j },
    });
  }
  for (let i = 1; i <= n; i += 1) {
    computed += 1;
    rec.at(3).fill([i, 0], 0, `Base case: dp[${i}][0] = 0 — empty b prefix has no common substring.`, {
      kind: 'base',
      codeLine: 3,
      vars: { computed, reused: 0, i, j: 0 },
    });
  }

  for (let i = 1; i <= n; i += 1) {
    const aChar = a[i - 1] ?? '';
    for (let j = 1; j <= m; j += 1) {
      const bChar = b[j - 1] ?? '';
      const matched = aChar === bChar;
      const diag = dp[i - 1]?.[j - 1] ?? 0;
      const value = matched ? diag + 1 : 0;
      const row = dp[i];
      if (row !== undefined) row[j] = value;
      computed += 1;
      reused += 1;
      if (value > best) {
        best = value;
        bestI = i;
        bestJ = j;
      }
      const highlights: Highlight[] = matched
        ? [{ pos: [i - 1, j - 1], kind: 'dependency', label: `dp[${i - 1}][${j - 1}]` }]
        : [];
      const message = matched
        ? memo
          ? `Cache hit: a[${i - 1}]='${aChar}' equals b[${j - 1}]='${bChar}', reuse dp[${i - 1}][${j - 1}] = ${diag}; dp[${i}][${j}] = ${diag} + 1 = ${value}.`
          : `a[${i - 1}]='${aChar}' equals b[${j - 1}]='${bChar}', so dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${diag} + 1 = ${value}.`
        : `a[${i - 1}]='${aChar}' differs from b[${j - 1}]='${bChar}', so dp[${i}][${j}] = 0 (substrings ending here break).`;
      rec.at(7).fill([i, j], value, message, {
        codeLine: 7,
        highlights,
        vars: { computed, reused, i, j, best },
      });
    }
  }

  const substring = best > 0 ? a.slice(bestI - best, bestI) : '';
  return finish(rec, best, bestI, bestJ, substring, { computed, reused });
}

function normalizeInput(input: LongestCommonSubstringInput): { a: string; b: string } {
  const rawA = typeof input.a === 'string' ? input.a : '';
  const rawB = typeof input.b === 'string' ? input.b : '';
  const a = rawA.slice(0, MAX_LEN);
  const b = rawB.slice(0, MAX_LEN);
  return { a: a.length > 0 ? a : 'a', b: b.length > 0 ? b : 'a' };
}

const longestCommonSubstringModule: ProblemModule<LongestCommonSubstringInput> = {
  id: 'longest-common-substring',
  title: 'Longest Common Substring',
  category: 'strings',
  difficulty: 'easy',
  summary:
    'Find the longest contiguous string appearing in both a and b. Memoization caches each (i, j) length and tabulation fills dp bottom-up, so each cell is solved once.',
  stateDefinition:
    'dp[i][j] = length of the longest common substring ending at a[i-1] and b[j-1], for 0 <= i <= n and 0 <= j <= m.',
  recurrence:
    'dp[0][j] = dp[i][0] = 0; dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else 0. Answer is max dp[i][j].',
  complexity: { time: 'O(n * m)', space: 'O(n * m)' },
  renderer: 'stringAlign',
  inputSchema: [
    {
      name: 'a',
      label: 'a',
      help: 'First string. Every character is part of a possible substring.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
    },
    {
      name: 'b',
      label: 'b',
      help: 'Second string. Only contiguous matches count.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
    },
  ],
  defaultInput: { a: 'abcde', b: 'bcd' },
  modes: ['memo', 'tabulation'],
  generateSteps(input: LongestCommonSubstringInput, mode: Mode): Step[] {
    const { a, b } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(a, b, true);
    return iterativeSteps(a, b, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the longest common substring of "abcde" and "bcd"?',
      options: ['3', '1', '5', '0'],
      answer: 0,
      why: '"bcd" appears in both strings, so the length is 3.',
    },
    {
      q: 'What does dp[i][j] mean?',
      options: [
        'Longest common substring ending at a[i-1], b[j-1]',
        'Longest common subsequence of first i, j chars',
        'Longest common substring starting at i, j',
        'Length of longest matching prefix',
      ],
      answer: 0,
      why: 'dp[i][j] counts contiguous characters of a[0..i-1] and b[0..j-1] ending exactly at those positions.',
    },
    {
      q: 'What is the recurrence for dp[i][j]?',
      options: [
        'dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else 0',
        'max(dp[i-1][j], dp[i][j-1])',
        'dp[i-1][j] + 1 if a[i-1] == b[j-1] else 0',
        'dp[i-1][j-1] + 1 always',
      ],
      answer: 0,
      why: 'A match extends the diagonal by one; a mismatch breaks the run, so the cell is 0.',
    },
    {
      q: 'How do memoization/tabulation compare to brute force?',
      options: ['O(n*m) vs O(2^n)', 'O(n) vs O(n*m)', 'The same', 'O(1) vs O(n)'],
      answer: 0,
      why: 'Each (i, j) cell is solved once in O(n*m); brute force checks all substrings with no reuse.',
    },
  ],
};

export default longestCommonSubstringModule;
