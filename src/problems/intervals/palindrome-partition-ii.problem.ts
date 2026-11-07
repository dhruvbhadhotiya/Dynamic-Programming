import { StepRecorder, create2D } from '../../engine/dpHelpers';
import type { Highlight, IntervalTriangleState, Mode, ProblemModule, Step } from '../../engine/types';

export interface PalindromePartitionIIInput {
  s: string;
}

const MAX_LENGTH = 7;

const pythonCode = [
  'def min_cut(s):',
  '    n = len(s)',
  '    dp = [[0] * n for _ in range(n)]',
  '    for length in range(2, n + 1):',
  '        for i in range(n - length + 1):',
  '            j = i + length - 1; dp[i][j] = 0 if s[i:j+1] == s[i:j+1][::-1] else 1 + min(dp[i][k] + dp[k+1][j] for k in range(i, j))',
  '    return dp[0][n - 1]',
].join('\n');

const javascriptCode = [
  'function minCut(s) {',
  '  const n = s.length, dp = Array.from({ length: n }, () => Array(n).fill(0));',
  '  for (let len = 2; len <= n; len++) for (let i = 0; i + len <= n; i++) {',
  '    const j = i + len - 1, sub = s.slice(i, j + 1);',
  '    const pal = sub === [...sub].reverse().join(\'\');',
  '    dp[i][j] = pal ? 0 : 1 + Math.min(...Array.from({ length: len - 1 }, (_, x) => dp[i][i + x] + dp[i + x + 1][j])); }',
  '  return dp[0][n - 1];',
  '}',
].join('\n');

const cppCode = [
  'int minCut(string s) {',
  '  int n = s.size(); vector<vector<int>> dp(n, vector<int>(n, 0));',
  '  for (int len = 2; len <= n; len++) for (int i = 0; i + len <= n; i++) {',
  '    int j = i + len - 1; string sub = s.substr(i, len), rev = sub; reverse(rev.begin(), rev.end());',
  '    int best = INT_MAX;',
  '    if (sub == rev) best = 0; else for (int k = i; k < j; k++) best = min(best, 1 + dp[i][k] + dp[k+1][j]); dp[i][j] = best; }',
  '  return dp[0][n - 1];',
  '}',
].join('\n');

function normalizeString(input: PalindromePartitionIIInput): string {
  const raw = typeof input.s === 'string' ? input.s : '';
  const s = raw.toLowerCase().replace(/[^a-z]/g, '').slice(0, MAX_LENGTH);
  return s.length > 0 ? s : 'a';
}

function isPalindrome(s: string, i: number, j: number): boolean {
  let left = i;
  let right = j;
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left += 1;
    right -= 1;
  }
  return true;
}

function makeRecorder(s: string): StepRecorder<IntervalTriangleState> {
  const chars = s.split('');
  return new StepRecorder<IntervalTriangleState>(
    {
      kind: 'intervalTriangle',
      values: create2D(s.length, s.length, () => null),
      rowLabels: chars.map((char, i) => `${i}: ${char}`),
      colLabels: chars.map((char, j) => `${j}: ${char}`),
      caption: 'Palindrome Partitioning II: dp[i][j] = minimum cuts needed for the substring s[i..j]',
    },
    { codeLine: 1 },
  );
}

function intervalSteps(s: string, memo: boolean): Step[] {
  const n = s.length;
  const rec = makeRecorder(s);
  const dp = create2D(n, n, () => 0);

  rec.at(1).record(
    `Palindrome Partitioning II: split "${s}" into palindromic pieces with the fewest cuts. dp[i][j] answers the substring s[${0}..${n - 1}]; if the whole substring is already a palindrome it costs 0 cuts, otherwise try every cut position.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0, n - 1], kind: 'active', label: 'whole string' }],
      vars: { length: n },
    },
  );

  for (let i = 0; i < n; i += 1) {
    rec.at(3).fill([i, i], 0, memo
      ? `Memo base: cache dp[${i}][${i}] = 0 — the single character "${s[i]}" is a palindrome.`
      : `Base case: dp[${i}][${i}] = 0 — a single character is already a palindrome.`, {
      kind: 'base',
      codeLine: 3,
      vars: { i, answer: 0 },
    });
  }

  for (let length = 2; length <= n; length += 1) {
    rec.at(4).record(
      memo
        ? `Memoized recursion now handles substrings of length ${length}, reusing cached cuts for both sides.`
        : `Tabulation fills substrings of length ${length}; each cut reads two shorter substrings.`,
      {
        codeLine: 4,
        highlights: [],
        vars: { length },
      },
    );

    for (let i = 0; i + length <= n; i += 1) {
      const j = i + length - 1;
      const piece = s.slice(i, j + 1);

      if (isPalindrome(s, i, j)) {
        const row = dp[i];
        if (row) row[j] = 0;
        rec.at(6).fill(
          [i, j],
          0,
          memo
            ? `Memo palindrome: "${piece}" reads the same both ways, so cache dp[${i}][${j}] = 0.`
            : `"${piece}" is a palindrome, so no cut is needed: dp[${i}][${j}] = 0.`,
          {
            kind: 'base',
            codeLine: 6,
            highlights: [{ pos: [i, j], kind: 'base', label: 'palindrome' }],
            vars: { i, j, answer: 0 },
          },
        );
        continue;
      }

      let best = Number.POSITIVE_INFINITY;
      let bestK = i;

      for (let k = i; k < j; k += 1) {
        const left = dp[i]?.[k] ?? 0;
        const right = dp[k + 1]?.[j] ?? 0;
        const cuts = 1 + left + right;
        if (cuts < best) {
          best = cuts;
          bestK = k;
        }
        const highlights: Highlight[] = [
          { pos: [i, j], kind: 'active', label: 'solving' },
          { pos: [i, k], kind: 'dependency', label: 'left piece' },
          { pos: [k + 1, j], kind: 'dependency', label: 'right piece' },
        ];
        rec.at(6).record(
          memo
            ? `Memo cut k=${k}: cached "${s.slice(i, k + 1)}" needs ${left} and "${s.slice(k + 1, j + 1)}" needs ${right}; adding this cut gives ${cuts}.`
            : `Cut k=${k}: "${s.slice(i, k + 1)}" needs ${left} cuts and "${s.slice(k + 1, j + 1)}" needs ${right}; total = 1 + ${left} + ${right} = ${cuts}.`,
          {
            codeLine: 6,
            highlights,
            vars: { i, j, k, cuts },
          },
        );
      }

      const row = dp[i];
      if (row) row[j] = best;
      rec.at(6).fill(
        [i, j],
        best,
        memo
          ? `Memo result: cache dp[${i}][${j}] = ${best}, cut after index ${bestK}.`
          : `Best for "${piece}": cut after index ${bestK}, so dp[${i}][${j}] = ${best}.`,
        {
          codeLine: 6,
          highlights: [
            { pos: [i, bestK], kind: 'dependency', label: 'left piece' },
            { pos: [bestK + 1, j], kind: 'dependency', label: 'right piece' },
          ],
          vars: { i, j, bestK, best },
        },
      );
    }
  }

  const answer = dp[0]?.[n - 1] ?? 0;
  rec.at(7).record(`The answer is ${answer} — the minimum number of cuts.`, {
    codeLine: 7,
    highlights: [{ pos: [0, n - 1], kind: 'result', label: 'answer' }],
    vars: { answer },
  });

  return [...rec.steps];
}

const palindromePartitionIIModule: ProblemModule<PalindromePartitionIIInput> = {
  id: 'palindrome-partition-ii',
  title: 'Palindrome Partitioning II',
  category: 'intervals',
  difficulty: 'hard',
  summary:
    'Cut a string into the fewest palindromic pieces. Interval DP answers every substring: a palindrome needs zero cuts, otherwise one cut plus the best answers for the two pieces it creates.',
  stateDefinition:
    'dp[i][j] = minimum cuts needed so that every piece of s[i..j] is a palindrome, for 0 <= i <= j < n.',
  recurrence:
    'dp[i][i] = 0; if s[i..j] is a palindrome, dp[i][j] = 0; otherwise dp[i][j] = 1 + min over i <= k < j of dp[i][k] + dp[k+1][j].',
  complexity: { time: 'O(n³)', space: 'O(n²)' },
  renderer: 'intervalTriangle',
  inputSchema: [
    {
      name: 's',
      label: 'string',
      help: 'Lowercase letters only. Up to seven characters keeps the triangle readable.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LENGTH,
      pattern: '^[a-z]*$',
    },
  ],
  defaultInput: { s: 'aab' },
  modes: ['memo', 'tabulation'],
  generateSteps(input: PalindromePartitionIIInput, mode: Mode): Step[] {
    return intervalSteps(normalizeString(input), mode === 'memo');
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'How many cuts are needed for "aab"?',
      options: ['1', '0', '2', '3'],
      answer: 0,
      why: '"aa" is already a palindrome, so cut once between "aa" and "b": two palindromic pieces need one cut.',
    },
    {
      q: 'What does dp[i][j] represent?',
      options: [
        'The minimum cuts so that every piece of s[i..j] is a palindrome',
        'Whether s[i..j] is a palindrome',
        'The length of the longest palindrome in s[i..j]',
        'The number of palindromic substrings inside s[i..j]',
      ],
      answer: 0,
      why: 'The state stores the optimal number of cuts for exactly the substring s[i..j].',
    },
    {
      q: 'What is dp[i][j] when s[i..j] is already a palindrome?',
      options: ['0', '1', 'j - i', 'The answer depends on i'],
      answer: 0,
      why: 'No cut is required when the whole substring is a palindrome, so the state is 0.',
    },
    {
      q: 'What are the time and space complexities for a string of length n?',
      options: ['O(n³) time, O(n²) space', 'O(n²) time, O(n²) space', 'O(n²) time, O(n) space', 'O(2^n) time, O(n²) space'],
      answer: 0,
      why: 'There are O(n²) substrings, each trying O(n) cut positions; the triangle table uses O(n²) entries.',
    },
  ],
  relatedIds: ['matrix-chain', 'burst-balloons', 'min-cost-cut-stick'],
  lessonId: 'intervals',
};

export default palindromePartitionIIModule;
