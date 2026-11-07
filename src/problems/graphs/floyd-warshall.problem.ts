import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type {
  CellValue,
  Highlight,
  Mode,
  ProblemModule,
  Step,
  Table2DState,
} from '../../engine/types';

export interface FloydWarshallInput {
  graph: number[][];
}

const MAX_NODES = 6;
const FALLBACK = [
  [0, 3, 9, -1],
  [-1, 0, 1, 6],
  [-1, -1, 0, 2],
  [-1, -1, -1, 0],
];

const pythonCode = [
  'def floyd_warshall(w):',
  '    n = len(w)',
  '    dist = [[0 if i == j else (w[i][j] if w[i][j] > 0 else INF) for j in range(n)] for i in range(n)]',
  '    for k in range(n):',
  '        for i in range(n):',
  '            for j in range(n):',
  '                if dist[i][k] + dist[k][j] < dist[i][j]:',
  '                    dist[i][j] = dist[i][k] + dist[k][j]',
  '    return dist[0][n - 1]  # INF if unreachable',
  '# the k loop must be outermost: once k is fixed, every i -> k -> j is final',
].join('\n');

const javascriptCode = [
  'function floydWarshall(w) {',
  '  const n = w.length;',
  '  const dist = w.map((row, i) => row.map((cell, j) => i === j ? 0 : cell > 0 ? cell : Infinity));',
  '  for (let k = 0; k < n; k++)',
  '    for (let i = 0; i < n; i++)',
  '      for (let j = 0; j < n; j++)',
  '        if (dist[i][k] + dist[k][j] < dist[i][j])',
  '          dist[i][j] = dist[i][k] + dist[k][j];',
  '  return dist[0][n - 1];',
  '}',
  '// the k loop must be outermost: once k is fixed, every i -> k -> j is final',
].join('\n');

const cppCode = [
  'int floydWarshall(vector<vector<int>>& w) {',
  '  int n = w.size(), INF = 1e9; vector<vector<int>> dist = w;',
  '  for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) dist[i][j] = i == j ? 0 : (w[i][j] > 0 ? w[i][j] : INF);',
  '  for (int k = 0; k < n; k++)',
  '    for (int i = 0; i < n; i++)',
  '      for (int j = 0; j < n; j++)',
  '        if (dist[i][k] + dist[k][j] < dist[i][j])',
  '          dist[i][j] = dist[i][k] + dist[k][j];',
  '  return dist[0][n - 1];',
  '}',
  '// the k loop must be outermost: once k is fixed, every i -> k -> j is final',
].join('\n');

function normalizeGraph(input: FloydWarshallInput): number[][] {
  const raw = Array.isArray(input.graph) ? input.graph : [];
  const rows = raw.slice(0, MAX_NODES).filter((row): row is number[] => Array.isArray(row));
  const source = rows.length > 0 ? rows : FALLBACK;
  const n = Math.max(1, Math.min(MAX_NODES, source.length));

  return Array.from({ length: n }, (_row, i) =>
    Array.from({ length: n }, (_cell, j) => {
      if (i === j) return 0;
      const cell = source[i]?.[j];
      return typeof cell === 'number' && Number.isFinite(cell) && cell > 0
        ? clamp(Math.trunc(cell), 1, 9)
        : -1;
    }),
  );
}

function makeRecorder(weights: number[][]): StepRecorder<Table2DState> {
  const labels = weights.map((_row, index) => `v${index}`);
  const values: CellValue[][] = weights.map((row) =>
    row.map((weight) => (weight < 0 ? '∞' : weight)),
  );
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values,
      rowLabels: labels,
      colLabels: labels,
      rowHeader: 'from',
      colHeader: 'to',
      caption: 'dist[i][j] = shortest distance from i to j; ∞ means no path yet',
    },
    { codeLine: 1 },
  );
}

function dependencyHighlights(i: number, k: number, j: number): Highlight[] {
  return [
    { pos: [i, k], kind: 'dependency', label: `v${i} → v${k}` },
    { pos: [k, j], kind: 'dependency', label: `v${k} → v${j}` },
  ];
}

function floydSteps(weights: number[][]): Step[] {
  const n = weights.length;
  const rec = makeRecorder(weights);
  const dist: number[][] = weights.map((row) =>
    row.map((weight) => (weight < 0 ? Number.POSITIVE_INFINITY : weight)),
  );

  rec.at(2).record(
    'Initialise dist with direct edges: the diagonal is 0, a positive cell is an edge weight, and -1 becomes ∞ (no direct path). Diagonal 0 also anchors every shortest path to itself.',
    {
      codeLine: 2,
      highlights: [{ pos: [0, 0], kind: 'base', label: 'start' }],
      vars: { nodes: n, intermediate: 'none' },
    },
  );

  for (let k = 0; k < n; k += 1) {
    rec.at(4).record(
      `Round k = v${k}: now allow v${k} as an intermediate vertex. Before this round, every dist value used only v0..v${k - 1} as intermediates.`,
      {
        codeLine: 4,
        highlights: [{ pos: [k, k], kind: 'active', label: `intermediate v${k}` }],
        vars: { k, nodes: n, improved: 0 },
      },
    );

    let improved = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const row = dist[i];
        if (!row) continue;
        const left = row[k] ?? Number.POSITIVE_INFINITY;
        const right = dist[k]?.[j] ?? Number.POSITIVE_INFINITY;
        const viaK = left + right;
        const current = row[j] ?? Number.POSITIVE_INFINITY;
        if (viaK >= current) continue;
        row[j] = viaK;
        improved += 1;
        const oldText = current === Number.POSITIVE_INFINITY ? '∞' : `${current}`;
        rec.at(8).fill(
          [i, j],
          viaK,
          `Go through v${k}: dist[v${i}][v${k}] + dist[v${k}][v${j}] = ${
            left === Number.POSITIVE_INFINITY ? '∞' : left
          } + ${
            right === Number.POSITIVE_INFINITY ? '∞' : right
          } = ${viaK}, which beats ${oldText}. Update dist[v${i}][v${j}] to ${viaK}.`,
          {
            kind: 'active',
            label: `via v${k}`,
            codeLine: 8,
            highlights: dependencyHighlights(i, k, j),
            vars: { k, i, j, from: `v${i}`, through: `v${k}`, to: `v${j}`, value: viaK },
          },
        );
      }
    }

    if (improved === 0) {
      rec.at(4).record(
        `Round k = v${k} found no improvement. Every pair already had a path at least as cheap as going through v${k}.`,
        {
          codeLine: 4,
          highlights: [{ pos: [k, k], kind: 'result', label: 'round complete' }],
          vars: { k, nodes: n, improved: 0 },
        },
      );
    }
  }

  const target = dist[0]?.[n - 1] ?? Number.POSITIVE_INFINITY;
  const answer = target === Number.POSITIVE_INFINITY ? -1 : target;
  const lastRow = rec.read().values[0] ?? [];

  rec.at(9).record(
    answer >= 0
      ? `The answer is ${answer} — shortest distance from v0 to v${n - 1}. The whole table now holds every pair's shortest distance.`
      : `The answer is -1 — v${n - 1} is unreachable from v0 even after every vertex was allowed as an intermediate.`,
    {
      codeLine: 9,
      highlights: [
        { pos: [0, n - 1], kind: 'result', label: 'answer' },
        { pos: [0, 0], kind: 'base', label: 'source' },
      ],
      vars: { answer, from: 'v0', to: `v${n - 1}`, cells: lastRow.length },
    },
  );

  return [...rec.steps];
}

const floydWarshallModule: ProblemModule<FloydWarshallInput> = {
  id: 'floyd-warshall',
  title: 'Floyd–Warshall',
  category: 'graphs',
  difficulty: 'medium',
  summary:
    'Compute shortest paths between every pair of vertices by allowing one new intermediate vertex per round. The in-place table starts with direct edges and improves a pair whenever going through the current intermediate is cheaper.',
  stateDefinition:
    'dist[i][j] = shortest distance from i to j using only vertices v0..vk as intermediates after round k. The final table holds all-pairs shortest distances; the displayed answer is dist[0][n-1], or -1 when unreachable.',
  recurrence:
    'Initialise dist[i][j] to the direct edge weight (∞ if none), with dist[i][i] = 0. For each intermediate k, dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).',
  complexity: { time: 'O(n³)', space: 'O(n²)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'graph',
      label: 'weighted adjacency matrix',
      help: 'Positive weights 1–9 for directed edges; -1 or 0 means no edge. The diagonal is 0. Up to six nodes.',
      type: 'matrix',
      minRows: 1,
      maxRows: MAX_NODES,
      maxCols: MAX_NODES,
      min: -1,
      max: 9,
      numeric: true,
    },
  ],
  defaultInput: { graph: FALLBACK },
  modes: ['tabulation'],
  generateSteps(input: FloydWarshallInput, mode: Mode): Step[] {
    void mode;
    return floydSteps(normalizeGraph(input));
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the default graph, what is the shortest distance from v0 to v3?',
      options: ['6', '9', '11', '3'],
      answer: 0,
      why: 'v0 -> v1 -> v2 -> v3 costs 3 + 1 + 2 = 6, beating the direct v0 -> v1 -> v3 route of 9 and the direct v0 -> v2 -> v3 route of 11.',
    },
    {
      q: 'Why must the intermediate loop k be the outermost loop?',
      options: [
        'Each round must finish using all pairs that treat k as an intermediate before k+1 is allowed',
        'Because the table is symmetric',
        'To keep the diagonal at zero',
        'Because edge weights are sorted before the loops start',
      ],
      answer: 0,
      why: 'dist[i][k] and dist[k][j] must already include every intermediate up to k-1. Interleaving k inside i or j would let a later k reuse values that are not final.',
    },
    {
      q: 'After round k, what does dist[i][j] contain?',
      options: [
        'The shortest i -> j path using only v0..vk as intermediate vertices',
        'The direct edge weight from i to j',
        'The number of paths from i to j',
        'The shortest path that starts and ends at k',
      ],
      answer: 0,
      why: 'Round k adds exactly one new allowed intermediate vertex, so after the round the table is correct for the prefix v0..vk.',
    },
    {
      q: 'What are the time and space complexities for n vertices?',
      options: ['O(n³) time, O(n²) space', 'O(n²) time, O(n²) space', 'O(n³) time, O(n) space', 'O(2^n) time, O(n) space'],
      answer: 0,
      why: 'There are n rounds and each round checks n² pairs, while the distance table stores n² entries.',
    },
  ],
  relatedIds: ['dag-longest-path', 'bellman-ford'],
  lessonId: 'graphs',
};

export default floydWarshallModule;
