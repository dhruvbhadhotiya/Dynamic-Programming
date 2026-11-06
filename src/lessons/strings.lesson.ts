import { StepRecorder, create2D } from '../engine/dpHelpers';
import type { Lesson } from '../engine/lessonTypes';
import type { Step, StringAlignState } from '../engine/types';

function buildDiagramSteps(): Step[] {
  const a = 'abcde';
  const b = 'ace';
  const m = a.length;
  const n = b.length;

  const rec = new StepRecorder<StringAlignState>(
    {
      kind: 'stringAlign',
      a,
      b,
      values: create2D(m + 1, n + 1, () => null),
      caption: 'LCS table dp[i][j] = longest common subsequence of a[0..i-1] and b[0..j-1]',
    },
    { codeLine: 1 },
  );

  rec.at(1).record(
    `Tabulation: align a = "${a}" against b = "${b}". Each cell dp[i][j] answers how much the two prefixes still share. Bases: empty prefixes share nothing, so the first row and column are 0.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0, 0], kind: 'active' }],
      vars: { i: 0, j: 0, answer: 0 },
    },
  );

  for (let j = 1; j <= n; j += 1) {
    rec.at(2).fill([0, j], 0, `Base case: dp[0][${j}] = 0 — an empty a-prefix shares nothing with b[0..${j - 1}].`, {
      kind: 'base',
      codeLine: 2,
      vars: { i: 0, j, answer: 0 },
    });
  }
  for (let i = 1; i <= m; i += 1) {
    rec.at(2).fill([i, 0], 0, `Base case: dp[${i}][0] = 0 — an empty b-prefix shares nothing with a[0..${i - 1}].`, {
      kind: 'base',
      codeLine: 2,
      vars: { i, j: 0, answer: 0 },
    });
  }

  const dp = create2D(m + 1, n + 1, () => 0);
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const match = a[i - 1] === b[j - 1];
      if (match) {
        const best = (dp[i - 1]?.[j - 1] ?? 0) + 1;
        const row = dp[i];
        if (row) row[j] = best;
        rec.at(4).fill(
          [i, j],
          best,
          `Match: a[${i - 1}] = b[${j - 1}] = "${a[i - 1]}", so extend the diagonal: dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${best}.`,
          {
            codeLine: 4,
            highlights: [{ pos: [i - 1, j - 1], kind: 'dependency', label: 'diagonal' }],
            vars: { i, j, answer: best },
          },
        );
      } else {
        const up = dp[i - 1]?.[j] ?? 0;
        const left = dp[i]?.[j - 1] ?? 0;
        const best = Math.max(up, left);
        const row = dp[i];
        if (row) row[j] = best;
        rec.at(4).fill(
          [i, j],
          best,
          `Mismatch: a[${i - 1}] = "${a[i - 1]}" vs b[${j - 1}] = "${b[j - 1]}", so take the better neighbor: dp[${i}][${j}] = max(dp[${i - 1}][${j}] = ${up}, dp[${i}][${j - 1}] = ${left}) = ${best}.`,
          {
            codeLine: 4,
            highlights: [
              { pos: [i - 1, j], kind: 'dependency', label: 'up' },
              { pos: [i, j - 1], kind: 'dependency', label: 'left' },
            ],
            vars: { i, j, answer: best },
          },
        );
      }
    }
  }

  rec.at(6).record('The answer is dp[5][3] = 3 — the longest common subsequence is "ace".', {
    codeLine: 6,
    highlights: [{ pos: [5, 3], kind: 'result', label: 'answer' }],
    vars: { i: m, j: n, answer: 3 },
  });

  return [...rec.steps];
}

const lesson: Lesson = {
  id: 'strings',
  title: 'String DP',
  category: 'strings',
  summary:
    'String DP aligns two sequences cell by cell: dp[i][j] summarizes the prefixes a[0..i-1] and b[0..j-1], and the recurrence only looks at the diagonal, the cell above, and the cell to the left. LCS, edit distance, and subsequence counting are all the same table with different base rows, recurrences, and answers.',
  sections: [
    {
      heading: 'Two prefixes, one table',
      body: 'A string DP state names how much of each string has been consumed. Write dp[i][j] as the answer for the prefixes a[0..i-1] and b[0..j-1] — note the off-by-one: i and j count characters, so the full strings live at dp[m][n]. From cell (i, j) the next decision only ever involves a[i] and b[j], the next unconsumed characters.\n\nThat framing turns every alignment problem into three questions: what is the base row and column (empty prefixes), what does the recurrence read (diagonal, up, left), and which cell or maximum is the answer. In the diagram, a = "abcde" against b = "ace" fills to dp[5][3] = 3, the subsequence "ace".',
      bullets: [
        'dp[i][j]: answer for prefixes a[0..i-1], b[0..j-1] — i, j count characters.',
        'Every recurrence reads only (i-1, j-1), (i-1, j), (i, j-1) — never the current cell.',
        'Base row/column: empty prefix vs anything.',
        'Answer usually at dp[m][n], or the maximum cell for substring problems.',
      ],
      callout: 'Say dp[i][j] in a full sentence — "the longest common subsequence of the first i characters of a and first j of b" — before writing the recurrence.',
    },
    {
      heading: 'Match extends the diagonal',
      body: 'When the next characters are equal, the diagonal is free progress: take the best answer for the shorter prefixes and add one. LCS does exactly this — dp[i][j] = dp[i-1][j-1] + 1 on a match. Subsequence counting uses the diagonal too, but adds the "skip" branch: matching lets you extend every subsequence ending at the previous position, so dp[i][j] = dp[i-1][j] + dp[i-1][j-1].\n\nThe structure to memorize: a match never needs the up or left neighbor because the diagonal already dominates them. In the diagram every matching cell (a/c, b/e... the a, c, e diagonal) extends its diagonal neighbor by one, and those +1s are what accumulate to 3.',
      bullets: [
        'LCS match: dp[i][j] = dp[i-1][j-1] + 1.',
        'Distinct subsequences match: dp[i][j] = dp[i-1][j] + dp[i-1][j-1].',
        'Edit distance match: dp[i][j] = dp[i-1][j-1] (no cost to keep).',
        'A match never needs up or left — the diagonal already beats them.',
      ],
      callout: 'Match = diagonal plus something. The something is what changes per problem.',
    },
    {
      heading: 'Mismatch takes the better neighbor',
      body: 'When the next characters differ, no alignment can use both right now, so the answer is the better of dropping a character from a (the cell above) or from b (the cell to the left). LCS takes max(up, left); edit distance takes 1 + min(diagonal, up, left) — delete, insert, or substitute; shortest common supersequence takes 1 + min(up, left) — you must emit one of the two characters.\n\nFilling order is forced: rows top to bottom, columns left to right, because every recurrence reads only cells already written. In the diagram, mismatching cells propagate the growing best value sideways and downward until the next match extends it.',
      bullets: [
        'LCS mismatch: max(up, left).',
        'Edit distance mismatch: 1 + min(diagonal, up, left).',
        'SCS mismatch: 1 + min(up, left).',
        'Fill top-to-bottom, left-to-right — every source cell is already final.',
      ],
      callout: 'Mismatch = best neighbor, possibly plus a cost. The fill order guarantees the neighbors are done.',
    },
    {
      heading: 'One table, many problems',
      body: 'The same (m + 1) x (n + 1) skeleton solves most of string DP because only three things change: the base row/column, the recurrence, and where the answer lives. Subsequence vs substring is the cleanest contrast — LCS propagates the best value through mismatches, while longest common substring resets to 0 on a mismatch and answers with the maximum cell anywhere, because a substring must be contiguous.\n\nPalindromes reduce to alignment too: the longest palindromic subsequence of s is LCS(s, reverse(s)). Wildcard matching keeps the table but makes the answer boolean, with * reading both the cell above (consume a character) and the cell to the left (consume nothing). Recognizing the shared skeleton is what turns seven problems into one idea with seven parameter choices.',
      bullets: [
        'LCS: propagate best on mismatch; answer dp[m][n].',
        'Longest common substring: reset to 0 on mismatch; answer = max cell.',
        'LPS(s) = LCS(s, reverse(s)).',
        'Wildcard matching: boolean table; * reads up or left.',
        'Edit distance: costs on the three branches; answer dp[m][n].',
      ],
      callout: 'Before coding, place the problem on the skeleton: bases? recurrence? answer cell? Then only the details are new.',
    },
    {
      heading: 'Common pitfalls',
      body: 'The most common string-DP bug is an indexing slip: a[i] vs a[i - 1]. The table has (m + 1) x (n + 1) cells but the strings have m and n characters, so cell (i, j) reads a[i - 1] and b[j - 1]. Writing a[i] silently runs off the end and corrupts every later cell.\n\nThree more traps recur: forgetting the base row/column is part of the answer (edit distance starts dp[0][j] = j, dp[i][0] = i, not 0); answering with dp[m][n] for substring problems, which must search the whole table for the maximum; and for LPS-via-LCS, forgetting to reverse the second string — LCS(s, s) is just s itself. Check the first row, the first character pair, and one mismatch cell by hand before trusting the loops.',
      bullets: [
        'Cell (i, j) reads a[i - 1], b[j - 1] — the table is (m+1) x (n+1), the strings are m x n.',
        'Edit distance bases are dp[0][j] = j and dp[i][0] = i, not 0.',
        'Substring problems answer with the max cell, not dp[m][n].',
        'LPS via LCS needs reverse(s) — LCS(s, s) = s is meaningless.',
      ],
      callout: 'Hand-check the base row and the first mismatching cell — off-by-one errors hide in exactly those two places.',
    },
  ],
  diagram: {
    rendererId: 'stringAlign',
    steps: buildDiagramSteps(),
  },
};

export default lesson;
