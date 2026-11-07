import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type {
  DagGraphState,
  GraphEdge,
  GraphNode,
  Highlight,
  Mode,
  ProblemModule,
  Step,
} from '../../engine/types';

export interface BellmanFordInput {
  graph: number[][];
}

const MAX_NODES = 5;
const FALLBACK = [
  [0, 6, 7, 0, 0],
  [0, 0, 8, 5, -4],
  [0, 0, 0, -3, 9],
  [0, -2, 0, 0, 0],
  [2, 0, 0, 7, 0],
];

const pythonCode = [
  'def bellman_ford(n, edges, source):',
  '    dist = [INF] * n; dist[source] = 0',
  '    for _ in range(n - 1):',
  '        changed = False',
  '        for u, v, w in edges:',
  '            if dist[u] + w < dist[v]:',
  '                dist[v] = dist[u] + w; changed = True',
  '        if not changed: break',
  '    for u, v, w in edges:',
  '        if dist[u] + w < dist[v]: return None  # negative cycle',
  '    return dist',
  '# after p passes, every shortest path with at most p edges is final',
].join('\n');

const javascriptCode = [
  'function bellmanFord(n, edges, source) {',
  '  const dist = new Array(n).fill(Infinity); dist[source] = 0;',
  '  for (let pass = 0; pass < n - 1; pass++) {',
  '    let changed = false;',
  '    for (const [u, v, w] of edges) {',
  '      if (dist[u] + w < dist[v]) {',
  '        dist[v] = dist[u] + w; changed = true;',
  '      } }',
  '    if (!changed) break;',
  '  }',
  '  for (const [u, v, w] of edges) if (dist[u] + w < dist[v]) return null;',
  '  return dist;',
  '}',
  '// after p passes, every shortest path with at most p edges is final',
].join('\n');

const cppCode = [
  'vector<int> bellmanFord(int n, vector<array<int,3>>& edges, int source) {',
  '  vector<int> dist(n, INT_MAX); dist[source] = 0;',
  '  for (int pass = 0; pass < n - 1; pass++) {',
  '    bool changed = false;',
  '    for (auto [u, v, w] : edges) {',
  '      if (dist[u] != INT_MAX && dist[u] + w < dist[v]) {',
  '        dist[v] = dist[u] + w; changed = true;',
  '      } }',
  '    if (!changed) break;',
  '  }',
  '  for (auto [u, v, w] : edges) if (dist[u] != INT_MAX && dist[u] + w < dist[v]) return {};',
  '  return dist;',
  '}',
].join('\n');

interface DirectedEdge {
  from: number;
  to: number;
  weight: number;
  index: number;
}

interface BellmanModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  arcs: DirectedEdge[];
}

function normalizeGraph(input: BellmanFordInput): number[][] {
  const raw = Array.isArray(input.graph) ? input.graph : [];
  const rows = raw.slice(0, MAX_NODES).filter((row): row is number[] => Array.isArray(row));
  const source = rows.length > 0 ? rows : FALLBACK;
  const n = Math.max(1, Math.min(MAX_NODES, source.length));

  return Array.from({ length: n }, (_row, i) =>
    Array.from({ length: n }, (_cell, j) => {
      if (i === j) return 0;
      const cell = source[i]?.[j];
      return typeof cell === 'number' && Number.isFinite(cell) && cell !== 0
        ? clamp(Math.trunc(cell), -9, 9)
        : 0;
    }),
  );
}

function buildModel(matrix: number[][]): BellmanModel {
  const n = matrix.length;
  const nodes: GraphNode[] = matrix.map((_row, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(1, n);
    return {
      id: `v${index}`,
      label: `v${index}`,
      x: n === 1 ? 0.5 : 0.5 + 0.38 * Math.cos(angle),
      y: n === 1 ? 0.5 : 0.5 + 0.38 * Math.sin(angle),
      detail: index === 0 ? 'dist 0' : 'dist ∞',
    };
  });

  const edges: GraphEdge[] = [];
  const arcs: DirectedEdge[] = [];
  for (let from = 0; from < n; from += 1) {
    for (let to = 0; to < n; to += 1) {
      const weight = matrix[from]?.[to] ?? 0;
      if (from === to || weight === 0) continue;
      const index = edges.length;
      edges.push({ from: `v${from}`, to: `v${to}`, label: `${weight}` });
      arcs.push({ from, to, weight, index });
    }
  }

  return { nodes, edges, arcs };
}

function makeRecorder(model: BellmanModel): StepRecorder<DagGraphState> {
  return new StepRecorder<DagGraphState>(
    {
      kind: 'dagGraph',
      nodes: model.nodes,
      edges: model.edges,
      directed: true,
      caption: 'Bellman–Ford: relax every edge for up to n-1 passes; node detail is the current distance',
    },
    { codeLine: 1 },
  );
}

function nodeHL(index: number, kind: Highlight['kind'], label: string): Highlight {
  return { pos: [index], kind, label, target: 'node' };
}

function edgeHL(index: number, kind: Highlight['kind'], label: string): Highlight {
  return { pos: [index], kind, label, target: 'edge' };
}

function bellmanSteps(matrix: number[][]): Step[] {
  const n = matrix.length;
  const model = buildModel(matrix);
  const rec = makeRecorder(model);
  const dist = new Array<number>(n).fill(Number.POSITIVE_INFINITY);
  dist[0] = 0;
  let updates = 0;
  let converged = false;

  rec.at(2).record(
    'Initialise every distance to ∞ except the source v0, which is 0. Each pass relaxes every directed edge once, in a fixed order. After p passes, every shortest path that uses at most p edges is final.',
    {
      codeLine: 2,
      highlights: [nodeHL(0, 'base', 'source'), ...model.nodes.slice(1).map((_node, index) => nodeHL(index + 1, 'dependency', '∞'))],
      vars: { nodes: n, edges: model.arcs.length, source: 'v0' },
    },
  );

  for (let pass = 1; pass <= n - 1; pass += 1) {
    rec.at(3).record(
      `Pass ${pass} of ${n - 1}: scan all ${model.arcs.length} edges. A negative edge may lower a distance that looked settled in an earlier pass.`,
      {
        codeLine: 3,
        highlights: [nodeHL(0, 'active', 'source')],
        vars: { pass, passes: n - 1, updates },
      },
    );

    let changed = 0;
    for (const arc of model.arcs) {
      const base = dist[arc.from] ?? Number.POSITIVE_INFINITY;
      if (base === Number.POSITIVE_INFINITY) continue;
      const candidate = base + arc.weight;
      const current = dist[arc.to] ?? Number.POSITIVE_INFINITY;
      if (candidate >= current) continue;

      dist[arc.to] = candidate;
      changed += 1;
      updates += 1;

      rec.at(7).update(
        (draft) => {
          const target = draft.nodes[arc.to];
          if (target) target.detail = `dist ${candidate}`;
        },
        `Relax v${arc.from} -> v${arc.to} (weight ${arc.weight}): dist[v${arc.from}] + ${arc.weight} = ${base} + ${arc.weight} = ${candidate}, beating ${
          current === Number.POSITIVE_INFINITY ? '∞' : current
        }. Update dist[v${arc.to}].`,
        {
          codeLine: 7,
          highlights: [
            nodeHL(arc.from, 'active', `dist ${base}`),
            nodeHL(arc.to, 'result', `dist ${candidate}`),
            edgeHL(arc.index, 'path', 'relaxed'),
          ],
          vars: { pass, from: `v${arc.from}`, to: `v${arc.to}`, weight: arc.weight, dist: candidate },
        },
      );
    }

    if (changed === 0) {
      converged = true;
      rec.at(8).record(
        `Pass ${pass} changed nothing, so the distances have converged. No reachable negative cycle can exist: a negative cycle would keep one edge relaxable forever.`,
        {
          codeLine: 8,
          highlights: [nodeHL(0, 'result', 'converged')],
          vars: { pass, updates, converged: true },
        },
      );
      break;
    }

    rec.at(3).record(
      `Pass ${pass} finished with ${changed} relaxation${changed === 1 ? '' : 's'}. Another pass is needed because a newly lowered distance may enable a cheaper edge out of its node.`,
      {
        codeLine: 3,
        highlights: [nodeHL(0, 'active', 'continue')],
        vars: { pass, updates, changed },
      },
    );
  }

  if (!converged) {
    rec.at(9).record(
      `After ${n - 1} passes, test every edge one more time. If any edge can still relax, a negative cycle is reachable from v0 and shortest distances are undefined.`,
      {
        codeLine: 9,
        highlights: [nodeHL(0, 'active', 'final check')],
        vars: { passes: n - 1, updates },
      },
    );

    for (const arc of model.arcs) {
      const base = dist[arc.from] ?? Number.POSITIVE_INFINITY;
      if (base === Number.POSITIVE_INFINITY) continue;
      const candidate = base + arc.weight;
      const current = dist[arc.to] ?? Number.POSITIVE_INFINITY;
      if (candidate >= current) continue;

      rec.at(10).record(
        `The answer is negative-cycle — v${arc.from} -> v${arc.to} still relaxes after ${n - 1} passes (${base} + ${arc.weight} = ${candidate} < ${current}), so a negative cycle is reachable from v0.`,
        {
          codeLine: 10,
          highlights: [
            nodeHL(arc.from, 'pruned', 'still relaxable'),
            nodeHL(arc.to, 'pruned', 'still improving'),
            edgeHL(arc.index, 'pruned', 'negative cycle'),
          ],
          vars: { answer: 'negative-cycle', from: `v${arc.from}`, to: `v${arc.to}`, value: candidate },
        },
      );
      return [...rec.steps];
    }
  }

  const target = dist[n - 1] ?? Number.POSITIVE_INFINITY;
  if (target === Number.POSITIVE_INFINITY) {
    rec.at(11).record(
      `The answer is unreachable — v0 cannot reach v${n - 1}, even after every edge was relaxed ${converged ? 'until convergence' : `${n - 1} times`}.`,
      {
        codeLine: 11,
        highlights: [nodeHL(0, 'base', 'source'), nodeHL(n - 1, 'dependency', 'unreachable')],
        vars: { answer: 'unreachable', from: 'v0', to: `v${n - 1}` },
      },
    );
    return [...rec.steps];
  }

  rec.at(11).record(
    `The answer is ${target} — the shortest distance from v0 to v${n - 1}. ${converged ? 'The table converged early.' : `All ${n - 1} passes were used.`} Distances still in ∞ are unreachable from v0.`,
    {
      codeLine: 11,
      highlights: [nodeHL(n - 1, 'result', 'answer')],
      vars: { answer: target, from: 'v0', to: `v${n - 1}`, updates },
    },
  );

  return [...rec.steps];
}

const bellmanFordModule: ProblemModule<BellmanFordInput> = {
  id: 'bellman-ford',
  title: 'Bellman–Ford',
  category: 'graphs',
  difficulty: 'medium',
  summary:
    'Shortest paths from a source with negative edge weights. Repeatedly relax every edge; after p passes every path of at most p edges is final. One extra check detects a negative cycle reachable from the source.',
  stateDefinition:
    'dist[v] = best known distance from source v0 to v. Initially dist[v0] = 0 and all others ∞. A pass updates dist[v] = min(dist[v], dist[u] + weight(u, v)) for every edge u -> v. The answer is dist[last node], or a negative-cycle/unreachable marker.',
  recurrence:
    'Relax all edges n-1 times. If an edge still relaxes on pass n, a reachable negative cycle exists because a shortest simple path needs at most n-1 edges.',
  complexity: { time: 'O(V * E)', space: 'O(V)' },
  renderer: 'dagGraph',
  inputSchema: [
    {
      name: 'graph',
      label: 'weighted adjacency matrix',
      help: 'A nonzero off-diagonal cell is a directed edge weight from -9 to 9; 0 means no edge. The diagonal is 0. Up to five nodes.',
      type: 'matrix',
      minRows: 1,
      maxRows: MAX_NODES,
      maxCols: MAX_NODES,
      min: -9,
      max: 9,
      numeric: true,
    },
  ],
  defaultInput: { graph: FALLBACK },
  modes: ['tabulation'],
  generateSteps(input: BellmanFordInput, mode: Mode): Step[] {
    void mode;
    return bellmanSteps(normalizeGraph(input));
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the default graph, what is the shortest distance from v0 to v4?',
      options: ['-2', '2', '0', 'negative cycle'],
      answer: 0,
      why: 'v0 -> v2 -> v3 -> v1 -> v4 costs 7 - 3 - 2 - 4 = -2. The direct edge v1 -> v4 of -4 is used after the cheaper route to v1 is found.',
    },
    {
      q: 'Why are only n-1 relaxation passes needed?',
      options: [
        'A shortest simple path has at most n-1 edges, and each pass finalises at least one more edge of it',
        'Because every graph has n-1 edges',
        'Because negative edges are ignored after the first pass',
        'Because the source has no incoming edges',
      ],
      answer: 0,
      why: 'With n vertices a simple path visits at most n vertices and therefore uses at most n-1 edges; additional passes cannot improve a shortest simple path.',
    },
    {
      q: 'What does it mean if an edge still relaxes after n-1 passes?',
      options: [
        'A negative cycle is reachable from the source, so shortest distances are undefined',
        'The graph is disconnected',
        'The source has a self-loop',
        'The edge weights are all positive',
      ],
      answer: 0,
      why: 'A reachable negative cycle lets the total decrease forever, so no finite shortest distance exists and one more pass always finds an improvement.',
    },
    {
      q: 'Why can Dijkstra fail on this graph while Bellman–Ford succeeds?',
      options: [
        'Dijkstra finalises the closest node greedily, but a later negative edge can make that node cheaper',
        'Dijkstra cannot store more than four nodes',
        'Bellman–Ford only works on DAGs',
        'Negative weights make every path longer',
      ],
      answer: 0,
      why: 'Dijkstra assumes distances never decrease after a node is chosen. A negative edge can create a cheaper route later, which is exactly what Bellman–Ford handles by relaxing all edges again.',
    },
  ],
  relatedIds: ['floyd-warshall', 'dag-longest-path'],
  lessonId: 'graphs',
};

export default bellmanFordModule;
