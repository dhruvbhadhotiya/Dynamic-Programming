import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { Highlight, IntervalTriangleState, Mode, ProblemModule, Step } from '../../engine/types';

export interface MinCostCutStickInput {
  n: number;
  cuts: number[];
}

const MAX_CUTS = 6;

const pythonCode = [
  'def min_cost(n, cuts):',
  '    points = [0] + sorted(cuts) + [n]',
  '    m = len(points); dp = [[0] * m for _ in range(m)]',
  '    for length in range(2, m):',
  '        for i in range(m - length):',
  '            j = i + length; dp[i][j] = min(dp[i][k] + dp[k][j] + points[j] - points[i] for k in range(i + 1, j)) if j > i + 1 else 0',
  '    return dp[0][m - 1]',
].join('\n');

const javascriptCode = [
  'function minCost(n, cuts) {',
  '  const points = [0, ...cuts.slice().sort((a, b) => a - b), n];',
  '  const m = points.length, dp = Array.from({ length: m }, () => Array(m).fill(0));',
  '  for (let len = 2; len < m; len++) for (let i = 0; i + len < m; i++) {',
  '    const j = i + len;',
  '    for (let k = i + 1; k < j; k++) dp[i][j] = Math.min(dp[i][j] || Infinity, dp[i][k] + dp[k][j] + points[j] - points[i]); }',
  '  return dp[0][m - 1];',
  '}',
].join('\n');

const cppCode = [
  'int minCost(int n, vector<int>& cuts) {',
  '  vector<int> points = {0}; points.insert(points.end(), cuts.begin(), cuts.end()); points.push_back(n); sort(points.begin(), points.end());',
  '  int m = points.size(); vector<vector<int>> dp(m, vector<int>(m, 0));',
  '  for (int len = 2; len < m; len++) for (int i = 0; i + len < m; i++) {',
  '    int j = i + len;',
  '    for (int k = i + 1; k < j; k++) { int cost = dp[i][k] + dp[k][j] + points[j] - points[i]; dp[i][j] = dp[i][j] == 0 ? cost : min(dp[i][j], cost); } }',
  '  return dp[0][m - 1];',
  '}',
].join('\n');

function normalizeInput(input: MinCostCutStickInput): { n: number; cuts: number[] } {
  const n =
    typeof input.n === 'number' && Number.isFinite(input.n)
      ? clamp(Math.trunc(input.n), 4, 12)
      : 4;
  const raw = Array.isArray(input.cuts) ? input.cuts : [];
  const seen = new Set<number>();
  const cuts: number[] = [];
  for (const value of raw) {
    if (cuts.length >= MAX_CUTS) break;
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const cut = Math.trunc(value);
    if (cut < 1 || cut > n - 1 || seen.has(cut)) continue;
    seen.add(cut);
    cuts.push(cut);
  }
  cuts.sort((a, b) => a - b);
  return { n, cuts };
}

function makeRecorder(points: number[]): StepRecorder<IntervalTriangleState> {
  return new StepRecorder<IntervalTriangleState>(
    {
      kind: 'intervalTriangle',
      values: create2D(points.length, points.length, () => null),
      rowLabels: points.map((point) => `${point}`),
      colLabels: points.map((point) => `${point}`),
      caption: `Cut points ${points.join(', ')}: dp[i][j] = minimum cost to cut the stick between points[i] and points[j]`,
    },
    { codeLine: 1 },
  );
}

function intervalSteps(n: number, cuts: number[], memo: boolean): Step[] {
  const points = [0, ...cuts, n];
  const m = points.length;
  const rec = makeRecorder(points);
  const dp = create2D(m, m, () => 0);

  rec.at(1).record(
    `Stick length ${n}, cuts at ${cuts.length > 0 ? cuts.join(', ') : 'no interior points'}. dp[i][j] is the cheapest way to make every required cut strictly between points[i] and points[j]; the first cut splits the stick into two independent pieces.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0, m - 1], kind: 'active', label: 'whole stick' }],
      vars: { n, cuts: cuts.length },
    },
  );

  for (let i = 0; i < m; i += 1) {
    rec.at(3).fill([i, i], 0, memo
      ? `Memo base: cache dp[${i}][${i}] = 0 — no stick between a point and itself.`
      : `Base case: dp[${i}][${i}] = 0 — a zero-length segment needs no cuts.`, {
      kind: 'base',
      codeLine: 3,
      vars: { i, answer: 0 },
    });
  }

  for (let length = 2; length < m; length += 1) {
    rec.at(4).record(
      memo
        ? `Memoized recursion closes segments of ${length === 2 ? 'two points' : `${length} points`} once both sides are cached.`
        : `Tabulation fills gaps of ${length === 2 ? 'two points' : `${length} points`}; every first cut reads only shorter gaps.`,
      {
        codeLine: 4,
        highlights: [],
        vars: { length },
      },
    );

    for (let i = 0; i + length < m; i += 1) {
      const j = i + length;
      const from = points[i] ?? 0;
      const to = points[j] ?? 0;

      if (j === i + 1) {
        const row = dp[i];
        if (row) row[j] = 0;
        rec.at(6).fill([i, j], 0, `Adjacent points ${from} and ${to} have no required cut between them, so dp[${i}][${j}] = 0.`, {
          kind: 'base',
          codeLine: 6,
          vars: { i, j, answer: 0 },
        });
        continue;
      }

      let best = Number.POSITIVE_INFINITY;
      let bestK = i + 1;

      for (let k = i + 1; k < j; k += 1) {
        const left = dp[i]?.[k] ?? 0;
        const right = dp[k]?.[j] ?? 0;
        const cost = left + right + (to - from);
        if (cost < best) {
          best = cost;
          bestK = k;
        }
        const highlights: Highlight[] = [
          { pos: [i, j], kind: 'active', label: 'solving' },
          { pos: [i, k], kind: 'dependency', label: 'left piece' },
          { pos: [k, j], kind: 'dependency', label: 'right piece' },
        ];
        rec.at(6).record(
          memo
            ? `Memo first cut at ${points[k]}: cache dp[${i}][${k}] = ${left} and dp[${k}][${j}] = ${right}; cutting the current ${from}..${to} stick adds ${to - from}, total ${cost}.`
            : `First cut at ${points[k]}: left = ${left}, right = ${right}; cutting the ${from}..${to} stick costs ${to - from}, total = ${cost}.`,
          {
            codeLine: 6,
            highlights,
            vars: { i, j, k, cost },
          },
        );
      }

      const row = dp[i];
      if (row) row[j] = best;
      rec.at(6).fill(
        [i, j],
        best,
        memo
          ? `Memo result: cache dp[${i}][${j}] = ${best}, first cut at ${points[bestK]}.`
          : `Best for ${from}..${to}: make the first cut at ${points[bestK]}, so dp[${i}][${j}] = ${best}.`,
        {
          codeLine: 6,
          highlights: [
            { pos: [i, bestK], kind: 'dependency', label: 'left piece' },
            { pos: [bestK, j], kind: 'dependency', label: 'right piece' },
          ],
          vars: { i, j, bestK, best },
        },
      );
    }
  }

  const answer = dp[0]?.[m - 1] ?? 0;
  rec.at(7).record(`The answer is ${answer} — the minimum total cost of all cuts.`, {
    codeLine: 7,
    highlights: [{ pos: [0, m - 1], kind: 'result', label: 'answer' }],
    vars: { answer },
  });

  return [...rec.steps];
}

const minCostCutStickModule: ProblemModule<MinCostCutStickInput> = {
  id: 'min-cost-cut-stick',
  title: 'Minimum Cost to Cut a Stick',
  category: 'intervals',
  difficulty: 'hard',
  summary:
    'Each cut costs the current length of the stick, and every cut splits the stick into two independent pieces. Adding the stick boundaries to the cut list turns the task into interval DP over consecutive cut points.',
  stateDefinition:
    'points = [0, ...sorted cuts, n]; dp[i][j] = minimum total cost to perform all cuts strictly between points[i] and points[j].',
  recurrence:
    'dp[i][i] = 0; for j > i+1, dp[i][j] = min over i < k < j of dp[i][k] + dp[k][j] + points[j] - points[i]; adjacent points cost 0.',
  complexity: { time: 'O(m³)', space: 'O(m²)' },
  renderer: 'intervalTriangle',
  inputSchema: [
    {
      name: 'n',
      label: 'stick length',
      help: 'Total length of the stick. Cuts must lie strictly inside it.',
      type: 'number',
      min: 4,
      max: 12,
    },
    {
      name: 'cuts',
      label: 'cut positions',
      help: 'Positions to cut. Duplicates and positions outside 1..n-1 are ignored.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_CUTS,
      min: 1,
      max: 9,
    },
  ],
  defaultInput: { n: 7, cuts: [1, 3, 4, 5] },
  modes: ['memo', 'tabulation'],
  generateSteps(input: MinCostCutStickInput, mode: Mode): Step[] {
    const normalized = normalizeInput(input);
    return intervalSteps(normalized.n, normalized.cuts, mode === 'memo');
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'A stick of length 7 must be cut at positions [1, 3, 4, 5]. What is the minimum total cost?',
      options: ['16', '14', '18', '12'],
      answer: 0,
      why: 'Cut at 3 (cost 7), then 1 (cost 3), then 5 (cost 4), then 4 (cost 2): 7 + 3 + 4 + 2 = 16.',
    },
    {
      q: 'What does dp[i][j] represent?',
      options: [
        'Minimum cost to make every cut strictly between points[i] and points[j]',
        'The number of cuts between points[i] and points[j]',
        'The length of the stick after cutting at i and j',
        'The maximum cost of cutting the whole stick',
      ],
      answer: 0,
      why: 'The interval state isolates the piece between two cut points; those boundary points are not cut again, only the cuts strictly inside are performed.',
    },
    {
      q: 'Why does each candidate first cut add points[j] - points[i]?',
      options: [
        'Cutting the current piece costs its current length',
        'It is the number of remaining cuts',
        'It is the value of the cut position',
        'It is the cost of the last cut only',
      ],
      answer: 0,
      why: 'Every cut is charged the length of the stick piece it is applied to, which is exactly the distance between the interval boundaries.',
    },
    {
      q: 'What are the time and space complexities with m = number of cuts + 2 points?',
      options: ['O(m³) time, O(m²) space', 'O(m²) time, O(m) space', 'O(m log m) time, O(m) space', 'O(2^m) time, O(m²) space'],
      answer: 0,
      why: 'There are O(m²) intervals and each tries O(m) first cuts; the triangle table uses O(m²) entries.',
    },
  ],
  relatedIds: ['matrix-chain', 'burst-balloons', 'palindrome-partition-ii'],
  lessonId: 'intervals',
};

export default minCostCutStickModule;
