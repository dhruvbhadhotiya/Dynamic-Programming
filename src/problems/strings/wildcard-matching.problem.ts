import { StepRecorder, create2D } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, StringAlignState } from '../../engine/types';

export interface WildcardMatchingInput {
  s: string;
  p: string;
}

const MAX_LEN = 6;

const pythonCode = [
  'def wildcard_match(s, p):',
  '    m, n = len(s), len(p)',
  '    dp = [[False] * (n + 1) for _ in range(m + 1)]',
  '    dp[0][0] = True',
  "    for j in range(1, n + 1): dp[0][j] = dp[0][j-1] and p[j-1] == '*'",
  '    for i in range(1, m + 1):',
  "        for j in range(1, n + 1): dp[i][j] = dp[i-1][j] or dp[i][j-1] if p[j-1] == '*' else dp[i-1][j-1] if p[j-1] == '?' or p[j-1] == s[i-1] else False",
  '    return dp[m][n]',
].join('\n');

const javascriptCode = [
  'function wildcard_match(s, p) {',
  '  const m = s.length, n = p.length;',
  '  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));',
  '  dp[0][0] = true;',
  "  for (let j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] && p[j - 1] === '*';",
  '  for (let i = 1; i <= m; i++)',
  "    for (let j = 1; j <= n; j++) dp[i][j] = p[j - 1] === '*' ? dp[i - 1][j] || dp[i][j - 1] : p[j - 1] === '?' || p[j - 1] === s[i - 1] ? dp[i - 1][j - 1] : false;",
  '  return dp[m][n];',
  '}',
].join('\n');

const cppCode = [
  'bool wildcard_match(const string& s, const string& p) {',
  '  int m = s.size(), n = p.size();',
  '  vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));',
  '  dp[0][0] = true;',
  "  for (int j = 1; j <= n; j++) dp[0][j] = dp[0][j-1] && p[j-1] == '*';",
  '  for (int i = 1; i <= m; i++)',
  "    for (int j = 1; j <= n; j++) dp[i][j] = p[j-1] == '*' ? dp[i-1][j] || dp[i][j-1] : p[j-1] == '?' || p[j-1] == s[i-1] ? dp[i-1][j-1] : false;",
  '  return dp[m][n];',
  '}',
].join('\n');

function makeRecorder(s: string, p: string): StepRecorder<StringAlignState> {
  return new StepRecorder<StringAlignState>(
    {
      kind: 'stringAlign',
      a: s,
      b: p,
      values: create2D(s.length + 1, p.length + 1, () => null),
      caption: 'dp[i][j] = true if s[0..i-1] matches p[0..j-1] (? matches one char, * matches any sequence)',
    },
    { codeLine: 1 },
  );
}

function finish(
  rec: StepRecorder<StringAlignState>,
  m: number,
  n: number,
  s: string,
  p: string,
  answer: boolean,
  extra: Record<string, string | number | boolean>,
): Step[] {
  rec.at(8).record(
    `The answer is ${String(answer)}: s='${s}' ${answer ? 'matches' : 'does not match'} p='${p}'.`,
    {
      codeLine: 8,
      highlights: [{ pos: [m, n], kind: 'result', label: 'answer' }],
      vars: { answer, ...extra },
    },
  );
  return [...rec.steps];
}

function iterativeSteps(s: string, p: string, memo: boolean): Step[] {
  const m = s.length;
  const n = p.length;
  const rec = makeRecorder(s, p);
  const dp = create2D(m + 1, n + 1, () => false);
  let computed = 0;
  let reused = 0;

  rec.at(2).record(
    memo
      ? 'Memoization: cache each (i, j) pair once. Reuse cached dp[i-1][j], dp[i][j-1] and dp[i-1][j-1] for each cell.'
      : 'Tabulation: build dp bottom-up from empty prefixes. Each (i, j) cell is final using only earlier cells.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { computed: 0, reused: 0, m, n, s, p },
    },
  );

  const baseRow = dp[0];
  if (baseRow !== undefined) baseRow[0] = true;
  rec.at(4).fill([0, 0], true, 'Base case: empty string matches empty pattern: dp[0][0] = true.', {
    kind: 'base',
    codeLine: 4,
    vars: { computed: 1, reused, m, n, s, p },
  });
  computed = 1;

  for (let j = 1; j <= n; j += 1) {
    const pc = p[j - 1] ?? '';
    const value = (dp[0]?.[j - 1] ?? false) && pc === '*';
    const row = dp[0];
    if (row !== undefined) row[j] = value;
    rec.at(5).fill(
      [0, j],
      value,
      `Base case: empty string vs p[0..${j - 1}]='${p.slice(0, j)}' is ${String(value)}: dp[0][${j}] = dp[0][${j - 1}] and p[${j - 1}] == '*' = ${String(value)}.`,
      {
        kind: 'base',
        codeLine: 5,
        vars: { computed: computed + 1, reused, m, n, s, p },
      },
    );
    computed += 1;
  }

  for (let i = 1; i <= m; i += 1) {
    const row = dp[i];
    if (row !== undefined) row[0] = false;
    rec.at(3).fill([i, 0], false, `Base case: non-empty s[0..${i - 1}]='${s.slice(0, i)}' vs empty pattern is false: dp[${i}][0] = false.`, {
      kind: 'base',
      codeLine: 3,
      vars: { computed: computed + 1, reused, m, n, i, s, p },
    });
    computed += 1;
  }

  for (let i = 1; i <= m; i += 1) {
    const sc = s[i - 1] ?? '';
    for (let j = 1; j <= n; j += 1) {
      const pc = p[j - 1] ?? '';
      const diag = dp[i - 1]?.[j - 1] ?? false;
      const up = dp[i - 1]?.[j] ?? false;
      const left = dp[i]?.[j - 1] ?? false;
      let result: boolean;
      let matches = false;
      let reason: string;
      if (pc === '*') {
        result = up || left;
        reason = `p[${j - 1}] is '*', so '*' consumes s[${i - 1}] if dp[${i - 1}][${j}] = ${String(up)} or matches empty if dp[${i}][${j - 1}] = ${String(left)}; dp[${i}][${j}] = ${String(result)}.`;
      } else if (pc === '?' || pc === sc) {
        matches = true;
        result = diag;
        reason = pc === '?'
          ? `p[${j - 1}] is '?', which matches any single char s[${i - 1}] = '${sc}'; dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${String(result)}.`
          : `chars match (s[${i - 1}] == p[${j - 1}] == '${sc}'); dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${String(result)}.`;
      } else {
        result = false;
        reason = `chars differ (s[${i - 1}] = '${sc}' != p[${j - 1}] = '${pc}'), so dp[${i}][${j}] = false even though dp[${i - 1}][${j - 1}] = ${String(diag)}.`;
      }
      const row = dp[i];
      if (row !== undefined) row[j] = result;
      computed += 1;
      reused += pc === '*' ? 2 : 1;
      const highlights: Highlight[] =
        pc === '*'
          ? [
              { pos: [i - 1, j], kind: 'dependency', label: 'star consumes s char' },
              { pos: [i, j - 1], kind: 'dependency', label: 'star matches empty' },
            ]
          : [{ pos: [i - 1, j - 1], kind: 'dependency', label: matches ? 'match' : 'mismatch' }];
      rec.at(7).fill([i, j], result, memo ? `Cache hit for dp[${i}][${j}]: reuse ${reason}` : `dp[${i}][${j}] = ${String(result)} because ${reason}`, {
        codeLine: 7,
        highlights,
        vars: { computed, reused, i, j, m, n, s, p },
      });
    }
  }

  return finish(rec, m, n, s, p, dp[m]?.[n] ?? false, { computed, reused });
}

function normalizeInput(input: WildcardMatchingInput): { s: string; p: string } {
  const s = typeof input.s === 'string' ? input.s.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, MAX_LEN) : '';
  const p = typeof input.p === 'string' ? input.p.replace(/[^a-zA-Z?*]/g, '').toLowerCase().slice(0, MAX_LEN) : '';
  return { s, p };
}

const wildcardMatchingModule: ProblemModule<WildcardMatchingInput> = {
  id: 'wildcard-matching',
  title: 'Wildcard Matching',
  category: 'strings',
  difficulty: 'medium',
  summary:
    'Decide whether string s matches pattern p where ? matches any single character and * matches any sequence (including empty). Memoization caches each (i, j) pair and tabulation fills dp bottom-up, so each cell is solved once.',
  stateDefinition: 'dp[i][j] = true if s[0..i-1] matches p[0..j-1] (? matches one char, * matches any sequence), for 0 <= i <= m and 0 <= j <= n.',
  recurrence:
    "dp[0][0] = true, dp[0][j] = dp[0][j-1] and p[j-1] == '*', dp[i][0] = false; dp[i][j] = dp[i-1][j] or dp[i][j-1] if p[j-1] == '*', else dp[i-1][j-1] if p[j-1] == '?' or p[j-1] == s[i-1], else false.",
  complexity: { time: 'O(m * n)', space: 'O(m * n)' },
  renderer: 'stringAlign',
  inputSchema: [
    {
      name: 's',
      label: 's',
      help: 'Text string, lowercase letters only, up to 6 characters.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
      pattern: '^[a-z]*$',
    },
    {
      name: 'p',
      label: 'p',
      help: "Pattern with lowercase letters, ? (any single char) and * (any sequence), up to 6 characters.",
      type: 'text',
      minLength: 1,
      maxLength: MAX_LEN,
      pattern: '^[a-z?*]*$',
    },
  ],
  defaultInput: { s: 'aa', p: '*' },
  modes: ['memo', 'tabulation'],
  generateSteps(input: WildcardMatchingInput, mode: Mode): Step[] {
    const { s, p } = normalizeInput(input);
    if (mode === 'memo') return iterativeSteps(s, p, true);
    return iterativeSteps(s, p, false);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: "Does 'aa' match '*'?",
      options: ['true', 'false', 'Only if s is empty', 'Only first character'],
      answer: 0,
      why: "'*' matches any sequence of characters, including 'aa', so the answer is true.",
    },
    {
      q: "Does 'cb' match '?a'?",
      options: ['false', 'true', 'Depends on s', 'Always true'],
      answer: 0,
      why: "'?' matches 'c', but the second character 'a' does not match 'b', so the answer is false.",
    },
    {
      q: "Does 'adceb' match '*a*b'?",
      options: ['true', 'false', 'Only with empty s', 'Only if pattern has no *'],
      answer: 0,
      why: "'*' can match 'd', then 'a' matches, then '*' matches 'dce', then 'b' matches, so the answer is true.",
    },
    {
      q: 'What does dp[i][j] mean?',
      options: ['true if s[0..i-1] matches p[0..j-1]', 'Longest common subsequence length', 'Number of wildcards used', 'Length of s prefix only'],
      answer: 0,
      why: 'dp[i][j] records whether the first i characters of s match the first j characters of the pattern p.',
    },
  ],
};

export default wildcardMatchingModule;
