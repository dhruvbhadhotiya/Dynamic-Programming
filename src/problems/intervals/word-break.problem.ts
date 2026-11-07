import { StepRecorder } from '../../engine/dpHelpers';
import type { Highlight, Mode, ProblemModule, Step, Table1DState } from '../../engine/types';

export interface WordBreakInput {
  s: string;
  wordDict: string[];
}

const MAX_LENGTH = 8;
const MAX_WORDS = 5;
const MAX_WORD_LENGTH = 5;

const pythonCode = [
  'def word_break(s, words):',
  '    n = len(s)',
  '    dp = [False] * (n + 1); dp[n] = True',
  '    for i in range(n - 1, -1, -1):',
  '        # dp[i] is true when some word starts at i and leaves a segmentable suffix',
  '        dp[i] = any(s.startswith(w, i) and dp[i + len(w)] for w in words)',
  '    return dp[0]',
].join('\n');

const javascriptCode = [
  'function wordBreak(s, words) {',
  '  const n = s.length;',
  '  const dp = new Array(n + 1).fill(false); dp[n] = true;',
  '  for (let i = n - 1; i >= 0; i--)',
  '    // dp[i] is true when some word starts at i and leaves a segmentable suffix',
  '    dp[i] = words.some((w) => s.startsWith(w, i) && dp[i + w.length]);',
  '  return dp[0];',
  '}',
].join('\n');

const cppCode = [
  'bool wordBreak(string s, vector<string>& words) {',
  '  int n = s.size();',
  '  vector<bool> dp(n + 1, false); dp[n] = true;',
  '  for (int i = n - 1; i >= 0; i--)',
  '    // dp[i] is true when some word starts at i and leaves a segmentable suffix',
  '    for (string w : words) if (s.compare(i, w.size(), w) == 0 && dp[i + w.size()]) dp[i] = true;',
  '  return dp[0];',
  '}',
].join('\n');

function normalizeInput(input: WordBreakInput): { s: string; words: string[] } {
  const rawS = typeof input.s === 'string' ? input.s : '';
  const s = rawS.toLowerCase().replace(/[^a-z]/g, '').slice(0, MAX_LENGTH) || 'a';

  const rawWords = Array.isArray(input.wordDict) ? input.wordDict : [];
  const seen = new Set<string>();
  const words: string[] = [];
  for (const value of rawWords) {
    if (words.length >= MAX_WORDS) break;
    if (typeof value !== 'string') continue;
    const word = value.toLowerCase().replace(/[^a-z]/g, '').slice(0, MAX_WORD_LENGTH);
    if (word.length === 0 || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }
  return { s, words: words.length > 0 ? words : ['a'] };
}

function makeRecorder(s: string, words: string[]): StepRecorder<Table1DState> {
  return new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: s.length + 1 }, () => null),
      labels: Array.from({ length: s.length + 1 }, (_value, index) =>
        index === s.length ? 'empty suffix' : s.slice(index),
      ),
      indexName: 'start index i',
      caption: `Word Break: dp[i] = can the suffix s[i..] be split into dictionary words? Dictionary: ${words.join(', ')}`,
    },
    { codeLine: 1 },
  );
}

function suffixHighlights(i: number, word: string, kind: 'dependency' | 'pruned'): Highlight[] {
  return [{ pos: [i + word.length], kind, label: `rest after "${word}"` }];
}

function recursiveSteps(s: string, words: string[], useMemo: boolean): Step[] {
  const n = s.length;
  const rec = makeRecorder(s, words);
  const cache = new Map<number, boolean>();
  let calls = 0;
  let hits = 0;
  let probes = 0;

  rec.at(1).record(
    useMemo
      ? `Memoization: solve the suffix starting at index 0, but cache every dp[i] so overlapping suffixes are not explored twice.`
      : `Brute force: try every dictionary word at each position and recurse on the rest. Different splits can reach the same suffix, so work is repeated.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'start here' }],
      vars: { s, words: words.join(', '), calls: 0, hits: 0 },
    },
  );

  const solve = (i: number): boolean => {
    if (useMemo && cache.has(i)) {
      hits += 1;
      const value = cache.get(i) === true;
      rec.at(6).record(
        `Cache hit: dp[${i}] is already ${value ? 'true' : 'false'}, so reuse it instead of exploring the suffix "${s.slice(i) || 'empty'}" again.`,
        {
          codeLine: 6,
          highlights: [{ pos: [i], kind: 'result', label: 'memo hit' }],
          vars: { i, value, calls, hits },
        },
      );
      return value;
    }

    calls += 1;

    if (i === n) {
      cache.set(n, true);
      rec.at(3).fill(
        [n],
        true,
        useMemo
          ? `Base case cached: dp[${n}] = true — the empty suffix needs no more words.`
          : `Base case: dp[${n}] = true — the empty suffix needs no more words.`,
        { kind: 'base', codeLine: 3, vars: { i, calls, hits } },
      );
      return true;
    }

    let found = false;
    let chosen = '';

    for (const word of words) {
      probes += 1;
      if (!s.startsWith(word, i)) {
        rec.at(6).record(
          `At index ${i}, "${word}" does not match "${s.slice(i, i + word.length)}", so this branch is impossible.`,
          {
            codeLine: 6,
            highlights: [{ pos: [i], kind: 'active', label: 'trying a word' }],
            vars: { i, word, fits: false, calls, hits },
          },
        );
        continue;
      }

      const rest = solve(i + word.length);
      if (rest) {
        found = true;
        chosen = word;
        break;
      }

      rec.at(6).record(
        `"${word}" matches at ${i}, but the remaining suffix needs ${i + word.length} more cuts and is not segmentable; try another word.`,
        {
          codeLine: 6,
          highlights: [
            { pos: [i], kind: 'active', label: `"${word}"` },
            ...suffixHighlights(i, word, 'pruned'),
          ],
          vars: { i, word, fits: true, calls, hits },
        },
      );
    }

    if (useMemo) cache.set(i, found);
    rec.at(6).fill(
      [i],
      found,
      found
        ? `${useMemo ? 'Cache' : 'Record'} dp[${i}] = true: choosing "${chosen}" leaves a suffix that can be split.`
        : `${useMemo ? 'Cache' : 'Record'} dp[${i}] = false: no dictionary word leaves a segmentable suffix.`,
      {
        kind: found ? 'result' : 'pruned',
        codeLine: 6,
        vars: { i, found, calls, hits, probes },
      },
    );
    return found;
  };

  const answer = solve(0);
  rec.at(7).record(`The answer is ${answer} — s ${answer ? 'can' : 'cannot'} be segmented with the given dictionary.`, {
    codeLine: 7,
    highlights: [{ pos: [0], kind: 'result', label: 'answer' }],
    vars: { answer, s, calls, hits, probes },
  });

  return [...rec.steps];
}

function tabulationSteps(s: string, words: string[]): Step[] {
  const n = s.length;
  const rec = makeRecorder(s, words);
  const dp: boolean[] = Array.from({ length: n + 1 }, () => false);
  dp[n] = true;
  let checks = 0;

  rec.at(2).record(
    `Tabulation: fill the table from right to left. dp[${n}] is the empty suffix, and each earlier cell only reads cells further right that are already final.`,
    {
      codeLine: 2,
      highlights: [{ pos: [n], kind: 'active', label: 'start at the end' }],
      vars: { s, words: words.join(', '), checks: 0 },
    },
  );
  rec.at(3).fill([n], true, `Base case: dp[${n}] = true — the empty suffix needs no more words.`, {
    kind: 'base',
    codeLine: 3,
    vars: { i: n, checks: 0 },
  });

  for (let i = n - 1; i >= 0; i -= 1) {
    let found = false;
    let chosen = '';

    for (const word of words) {
      checks += 1;
      const fits = s.startsWith(word, i);
      const rest = fits ? (dp[i + word.length] ?? false) : false;

      rec.at(6).record(
        !fits
          ? `At i = ${i}, "${word}" does not match "${s.slice(i, i + word.length)}", so skip it.`
          : rest
            ? `"${word}" matches at ${i} and dp[${i + word.length}] is true, so dp[${i}] becomes true.`
            : `"${word}" matches at ${i}, but dp[${i + word.length}] is false, so this split fails.`,
        {
          codeLine: 6,
          highlights: [
            { pos: [i], kind: 'active', label: 'current start' },
            ...(fits ? suffixHighlights(i, word, rest ? 'dependency' : 'pruned') : []),
          ],
          vars: { i, word, fits, rest, checks },
        },
      );

      if (fits && rest) {
        found = true;
        chosen = word;
        break;
      }
    }

    dp[i] = found;
    rec.at(6).fill(
      [i],
      found,
      found
        ? `dp[${i}] = true: "${chosen}" covers s[${i}..${i + chosen.length - 1}] and the rest is segmentable.`
        : `dp[${i}] = false: no dictionary word at ${i} leaves a segmentable suffix.`,
      {
        kind: found ? 'result' : 'pruned',
        codeLine: 6,
        highlights: [{ pos: [i], kind: found ? 'result' : 'pruned', label: 'computed' }],
        vars: { i, found, checks },
      },
    );
  }

  const answer = dp[0] ?? false;
  rec.at(7).record(`The answer is ${answer} — s ${answer ? 'can' : 'cannot'} be segmented with the given dictionary.`, {
    codeLine: 7,
    highlights: [{ pos: [0], kind: 'result', label: 'answer' }],
    vars: { answer, s, checks },
  });

  return [...rec.steps];
}

const wordBreakModule: ProblemModule<WordBreakInput> = {
  id: 'word-break',
  title: 'Word Break',
  category: 'intervals',
  difficulty: 'medium',
  summary:
    'Decide whether a string can be split into dictionary words. Working from the end of the string gives dp[i] = "the suffix s[i..] is segmentable"; each cell tries every dictionary word that starts at i and reads a cell further right.',
  stateDefinition:
    'dp[i] = true when the suffix s[i..n-1] can be written as a sequence of one or more dictionary words, for 0 <= i <= n; dp[n] = true for the empty suffix.',
  recurrence:
    'dp[n] = true; dp[i] = OR over words w with s.startsWith(w, i) of dp[i + len(w)]. The answer is dp[0].',
  complexity: { time: 'O(n * m * L)', space: 'O(n)' },
  renderer: 'table1d',
  inputSchema: [
    {
      name: 's',
      label: 'string s',
      help: 'Lowercase letters only. Up to eight characters keeps every mode easy to follow.',
      type: 'text',
      minLength: 1,
      maxLength: MAX_LENGTH,
      pattern: '^[a-z]+$',
    },
    {
      name: 'wordDict',
      label: 'dictionary',
      help: 'Dictionary words separated by commas. Up to five lowercase words of five letters each.',
      type: 'array',
      itemType: 'string',
      minItems: 1,
      maxItems: MAX_WORDS,
    },
  ],
  defaultInput: { s: 'leetcode', wordDict: ['leet', 'code'] },
  modes: ['bruteforce', 'memo', 'tabulation'],
  generateSteps(input: WordBreakInput, mode: Mode): Step[] {
    const { s, words } = normalizeInput(input);
    if (mode === 'bruteforce') return recursiveSteps(s, words, false);
    if (mode === 'memo') return recursiveSteps(s, words, true);
    return tabulationSteps(s, words);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'Can "leetcode" be segmented using ["leet", "code"]?',
      options: ['Yes: "leet" + "code"', 'No: no split works', 'Yes, but only with three words', 'No: "code" is too short'],
      answer: 0,
      why: '"leetcode" is exactly "leet" followed by "code", so dp[0] is true.',
    },
    {
      q: 'Why is the table filled from right to left?',
      options: [
        'dp[i] depends only on cells further right, i + len(word)',
        'Because dictionaries are sorted backwards',
        'To make the answer smaller',
        'Because recursion always starts at the end',
      ],
      answer: 0,
      why: 'Each transition jumps forward by a word length, so suffixes to the right must already be known before computing dp[i].',
    },
    {
      q: 'What does dp[i] mean in this formulation?',
      options: [
        'Whether the suffix s[i..] can be split into dictionary words',
        'Whether the prefix s[0..i] can be split',
        'The number of words used so far',
        'The shortest dictionary word starting at i',
      ],
      answer: 0,
      why: 'Index i is the start of the remaining suffix; dp[n] is the empty suffix, which is trivially segmentable.',
    },
    {
      q: 'What is the time complexity with n characters, m dictionary words, and max word length L?',
      options: ['O(n * m * L)', 'O(n * m)', 'O(n²)', 'O(2^n)'],
      answer: 0,
      why: 'Each of the n positions checks m words, and comparing a word against the string costs up to L character comparisons.',
    },
  ],
  relatedIds: ['palindrome-partition-ii', 'decode-ways', 'split-array-largest-sum'],
  lessonId: 'intervals',
};

export default wordBreakModule;
