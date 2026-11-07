import { StepRecorder, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, StringAlignState } from '../../engine/types';

export interface EditDistanceInput {
  a: string;
  b: string;
}

const MAX_LEN = 7;

const pythonCode = [
  'def edit_distance(a, b):',
  '    m, n = len(a), len(b)',
  '    dp = [[i + j for j in range(n + 1)] for i in range(m + 1)]',
  '    for i in range(1, m + 1):',
  '        for j in range(1, n + 1):',
  '            dp[i][j] = dp[i-1][j-1] if a[i-1] == b[j-1] else 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])',
  '    return dp[m][n]',
].join('\n');

const javascriptCode = [
  'function editDistance(a, b) {',
  '  const m = a.length, n = b.length;',
  '  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i + j));',
  '  for (let i = 1; i <= m; i++)',
  '    for (let j = 1; j <= n; j++)',
  '      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);',
  '  return dp[m][n];',
  '}',
].join('\n');

const cppCode = [
  'int editDistance(const string& a, const string& b) {',
  '  int m = a.size(), n = b.size();',
  '  vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0)); for (int i = 0; i <= m; i++) dp[i][0] = i; for (int j = 0; j <= n; j++) dp[0][j] = j;',
  '  for (int i = 1; i <= m; i++)',
  '    for (int j = 1; j <= n; j++)',
  '      dp[i][j] = a[i-1] == b[j-1] ? dp[i-1][j-1] : 1 + min({dp[i-1][j-1], dp[i-1][j], dp[i][j-1]});',
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
      caption: 'dp[i][j] = edit distance of a[0..i-1] and b[0..j-1]',
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
    `The answer is ${answer}: the minimum edit distance between the two strings is ${answer}.`,
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
    { pos: [i - 1, j - 1], kind: 'dependency', label: 'substitute' },
    { pos: [i - 1, j], kind: 'dependency', label: 'delete' },
    { pos: [i, j - 1], kind: 'dependency', label: 'insert' },
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
    rec.at(3).fill([0, j], j, `Base case: edit distance from empty prefix of a to b[0..${j - 1}] is ${j} insertions: dp[0][${j}] = ${j}.`, {
      kind: 'base',
      codeLine: 3,
      vars: { computed: computed + 1, reused, m, n, a, b },
    });
    computed += 1;
  }

  for (let i = 1; i <= m; i += 1) {
    const row = dp[i];
    if (row !== undefined) row[0] = i;
    rec.at(3).fill([i, 0], i, `Base case: edit distance from a[0..${i - 1}] to empty prefix of b is ${i} deletions: dp[${i}][0] = ${i}.`, {
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
      const result = match ? diag : 1 + Math.min(diag, up, left);
      const row = dp[i];
      if (row !== undefined) row[j] = result;
      computed += 1;
      reused += match ? 1 : 3;
      rec.at(6).fill(
        [i, j],
        result,
        memo
          ? match
            ? `Cache hit for dp[${i}][${j}]: chars match (${ca} == ${cb}), reuse dp[${i - 1}][${j - 1}] = ${diag}; dp[${i}][${j}] = ${diag} = ${result} (no edit needed).`
            : `Cache hit for dp[${i}][${j}]: chars differ (${ca} != ${cb}), reuse dp[${i - 1}][${j - 1}] = ${diag}, dp[${i - 1}][${j}] = ${up} and dp[${i}][${j - 1}] = ${left}; dp[${i}][${j}] = 1 + min(${diag}, ${up}, ${left}) = ${result}.`
          : match
            ? `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${diag} because a[${i - 1}] == b[${j - 1}] == ${ca} (no edit needed).`
            : `dp[${i}][${j}] = 1 + min(dp[${i - 1}][${j - 1}], dp[${i - 1}][${j}], dp[${i}][${j - 1}]) = 1 + min(${diag}, ${up}, ${left}) = ${result} because a[${i - 1}] != b[${j - 1}] (${ca} != ${cb}).`,
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

function normalizeInput(input: EditDistanceInput): { a: string; b: string } {
  return { a: cleanString(input.a), b: cleanString(input.b) };
}

const editDistanceModule: ProblemModule<EditDistanceInput> = {
  id: 'edit-distance',
  title: 'Edit Distance',
  category: 'strings',
  difficulty: 'medium',
  summary:
    'Transform a into b using insert, delete, or substitute, each costing 1. Memoization caches each (i, j) pair and tabulation fills dp bottom-up, so each cell is solved once.',
  stateDefinition: 'dp[i][j] = minimum edits to convert a[0..i-1] into b[0..j-1], for 0 <= i <= m and 0 <= j <= n.',
  recurrence:
    'dp[0][j] = j and dp[i][0] = i; dp[i][j] = dp[i-1][j-1] if a[i-1] == b[j-1], else 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]).',
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
  defaultInput: { a: 'horse', b: 'ros' },
  modes: ['memo', 'tabulation'],
  generateSteps(input: EditDistanceInput, mode: Mode): Step[] {
    const { a, b } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(a, b, true);
    return iterativeSteps(a, b, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the edit distance of "horse" and "ros"?',
      options: ['3', '2', '4', '1'],
      answer: 0,
      why: 'Substitute h->r, delete r, delete e takes 3 edits (horse -> rorse -> rose -> ros), and no shorter sequence works.',
    },
    {
      q: 'What does dp[i][j] mean?',
      options: ['Minimum edits to convert a[0..i-1] into b[0..j-1]', 'Longest common subsequence length', 'Number of matching characters', 'Length of b[0..j-1]'],
      answer: 0,
      why: 'dp[i][j] is the minimum insert/delete/substitute cost to turn the length-i prefix of a into the length-j prefix of b.',
    },
    {
      q: 'What is dp[i][j] when a[i-1] != b[j-1]?',
      options: ['1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])', 'dp[i-1][j-1]', 'max(dp[i-1][j], dp[i][j-1])', 'dp[i-1][j] + 1'],
      answer: 0,
      why: 'On a mismatch you must edit: substitute, delete, or insert, each reusing a neighboring prefix with one extra operation.',
    },
    {
      q: 'What are the base cases dp[0][j] and dp[i][0]?',
      options: ['j and i', '0 and 0', '1 and 1', 'm and n'],
      answer: 0,
      why: 'Converting an empty string to b[0..j-1] needs j insertions; converting a[0..i-1] to empty needs i deletions.',
    },
  ],
};

export default editDistanceModule;
