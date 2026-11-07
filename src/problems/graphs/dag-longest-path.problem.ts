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

export interface DagLongestPathInput {
  graph: number[][];
}

const MAX_NODES = 6;
const FALLBACK = [
  [0, 3, 2, 0],
  [0, 0, 5, 1],
  [0, 0, 0, 4],
  [0, 0, 0, 0],
];

const pythonCode = [
  '# dp[u] = longest distance starting at u; nxt[u] = next hop on that path',
  '# memo: dfs caches each u. tabulation: scan u from n-1 down to 0 (edges go forward)',
  'def longest_path(w):',
  '    n = len(w)',
  '    dp, nxt = [0] * n, [-1] * n',
  '    def dfs(u):',
  '        for v in range(u + 1, n):',
  '            if w[u][v] > 0:',
  '                cand = w[u][v] + dfs(v)',
  '                if cand > dp[u]: dp[u], nxt[u] = cand, v',
  '        return dp[u]',
  '    for u in range(n): dfs(u)',
  '    start = max(range(n), key=lambda i: dp[i])',
  '    path, u = [], start',
  '    while u != -1: path.append(u); u = nxt[u]',
  '    return dp[start], path',
].join('\n');

const javascriptCode = [
  '// dp[u] = longest distance starting at u; nxt[u] = next hop on that path',
  '// memo: dfs caches each u. tabulation: scan u from n-1 down to 0 (edges go forward)',
  'function longestPath(w) {',
  '  const n = w.length;',
  '  const dp = new Array(n).fill(0), nxt = new Array(n).fill(-1);',
  '  function dfs(u) {',
  '    for (let v = u + 1; v < n; v++) {',
  '      if (w[u][v] > 0) {',
  '        const cand = w[u][v] + dfs(v);',
  '        if (cand > dp[u]) { dp[u] = cand; nxt[u] = v; }',
  '      } }',
  '    return dp[u];',
  '  }',
  '  for (let u = 0; u < n; u++) dfs(u);',
  '  let start = 0; for (let u = 1; u < n; u++) if (dp[u] > dp[start]) start = u;',
  '  const path = []; for (let u = start; u !== -1; u = nxt[u]) path.push(u); return [dp[start], path];',
  '}',
].join('\n');

const cppCode = [
  '// dp[u] = longest distance starting at u; nxt[u] = next hop on that path',
  '// memo: dfs caches each u. tabulation: scan u from n-1 down to 0 (edges go forward)',
  'pair<int, vector<int>> longestPath(vector<vector<int>>& w) {',
  '  int n = w.size(); vector<int> dp(n, 0), nxt(n, -1);',
  '  // post-order DFS returns the best distance starting at u',
  '  function<int(int)> dfs = [&](int u) {',
  '    for (int v = u + 1; v < n; v++) {',
  '      if (w[u][v] > 0) {',
  '        int cand = w[u][v] + dfs(v);',
  '        if (cand > dp[u]) { dp[u] = cand; nxt[u] = v; }',
  '      } }',
  '    return dp[u];',
  '  };',
  '  for (int u = 0; u < n; u++) dfs(u);',
  '  int start = max_element(dp.begin(), dp.end()) - dp.begin();',
  '  vector<int> path; for (int u = start; u != -1; u = nxt[u]) path.push_back(u); return {dp[start], path};',
  '}',
].join('\n');

interface Arrow {
  to: number;
  weight: number;
  edge: number;
}

interface DagModel {
  matrix: number[][];
  nodes: GraphNode[];
  edges: GraphEdge[];
  outgoing: Arrow[][];
}

function normalizeGraph(input: DagLongestPathInput): number[][] {
  const raw = Array.isArray(input.graph) ? input.graph : [];
  const rows = raw.slice(0, MAX_NODES).filter((row): row is number[] => Array.isArray(row));
  const source = rows.length > 0 ? rows : FALLBACK;
  const n = Math.max(1, Math.min(MAX_NODES, source.length));
  const matrix: number[][] = [];

  for (let i = 0; i < n; i += 1) {
    const row: number[] = [];
    for (let j = 0; j < n; j += 1) {
      const cell = source[i]?.[j];
      row.push(
        j > i && typeof cell === 'number' && Number.isFinite(cell)
          ? clamp(Math.trunc(cell), 0, 9)
          : 0,
      );
    }
    matrix.push(row);
  }

  return matrix;
}

function buildModel(matrix: number[][]): DagModel {
  const n = matrix.length;
  const nodes: GraphNode[] = matrix.map((_row, index) => ({
    id: `v${index}`,
    label: `v${index}`,
    x: n === 1 ? 0.5 : 0.08 + (0.84 * index) / (n - 1),
    y: n === 1 ? 0.5 : index % 2 === 0 ? 0.3 : 0.7,
    detail: 'dp ?',
  }));

  const edges: GraphEdge[] = [];
  const outgoing: Arrow[][] = Array.from({ length: n }, () => []);

  for (let from = 0; from < n; from += 1) {
    for (let to = from + 1; to < n; to += 1) {
      const weight = matrix[from]?.[to] ?? 0;
      if (weight <= 0) continue;
      const edge = edges.length;
      edges.push({ from: `v${from}`, to: `v${to}`, label: `${weight}` });
      outgoing[from]?.push({ to, weight, edge });
    }
  }

  return { matrix, nodes, edges, outgoing };
}

function makeRecorder(model: DagModel): StepRecorder<DagGraphState> {
  return new StepRecorder<DagGraphState>(
    {
      kind: 'dagGraph',
      nodes: model.nodes,
      edges: model.edges,
      directed: true,
      caption: 'Longest path in a DAG: dp[u] = best weighted distance starting at u',
    },
    { codeLine: 1 },
  );
}

function nodeHighlight(index: number, kind: Highlight['kind'], label: string): Highlight {
  return { pos: [index], kind, label, target: 'node' };
}

function edgeHighlight(index: number, kind: Highlight['kind'], label: string): Highlight {
  return { pos: [index], kind, label, target: 'edge' };
}

function solveStep(
  rec: StepRecorder<DagGraphState>,
  outgoing: Arrow,
  from: number,
  tail: number,
  better: boolean,
  currentBest: number,
): void {
  const candidate = outgoing.weight + tail;
  rec.at(9).record(
    `Relax edge v${from} -> v${outgoing.to} (weight ${outgoing.weight}): ${outgoing.weight} + dp[v${outgoing.to}] = ${outgoing.weight} + ${tail} = ${candidate}. ${
      better ? `This beats the current best ${currentBest}.` : `It does not beat ${currentBest}.`
    }`,
    {
      codeLine: 9,
      highlights: [
        nodeHighlight(from, 'active', 'from'),
        nodeHighlight(outgoing.to, 'dependency', `dp ${tail}`),
        edgeHighlight(outgoing.edge, better ? 'path' : 'pruned', better ? 'chosen' : 'not chosen'),
      ],
      vars: { from, to: outgoing.to, weight: outgoing.weight, candidate, best: currentBest },
    },
  );
}

function finish(
  rec: StepRecorder<DagGraphState>,
  model: DagModel,
  dp: number[],
  nxt: number[],
): Step[] {
  const n = model.matrix.length;
  let start = 0;
  for (let u = 1; u < n; u += 1) {
    if ((dp[u] ?? 0) > (dp[start] ?? 0)) start = u;
  }

  const path: number[] = [];
  const pathEdges: number[] = [];
  let u = start;
  while (u >= 0 && path.length <= n) {
    path.push(u);
    const next = nxt[u] ?? -1;
    if (next < 0) break;
    const arrow = (model.outgoing[u] ?? []).find((item) => item.to === next);
    if (arrow) pathEdges.push(arrow.edge);
    u = next;
  }

  const answer = dp[start] ?? 0;
  const pathText = path.map((index) => `v${index}`).join(' -> ');
  const highlights: Highlight[] = [
    ...path.map((index) => nodeHighlight(index, 'path', 'best path')),
    ...pathEdges.map((index) => edgeHighlight(index, 'path', 'best path')),
  ];

  rec.at(16).record(
    `The answer is ${answer} — the longest path is ${pathText}. Every edge goes forward, so the path is acyclic and the chosen next hops reconstruct it.`,
    {
      codeLine: 16,
      highlights,
      vars: { answer, path: pathText, start: `v${start}`, hops: path.length - 1 },
    },
  );

  return [...rec.steps];
}

function memoSteps(model: DagModel): Step[] {
  const rec = makeRecorder(model);
  const n = model.matrix.length;
  const dp = new Array<number>(n).fill(0);
  const nxt = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  let visits = 0;
  let hits = 0;

  rec.at(1).record(
    'Memoized DFS: dp[u] is the longest weighted distance starting at u. The answer may start anywhere, so run dfs from each node. A cached node returns its dp without exploring its edges again.',
    {
      codeLine: 1,
      highlights: [nodeHighlight(0, 'active', 'first start')],
      vars: { nodes: n, visits: 0, hits: 0 },
    },
  );

  const dfs = (u: number): number => {
    if (done[u]) {
      hits += 1;
      rec.at(2).record(
        `Memo hit at v${u}: dp[v${u}] = ${dp[u] ?? 0} is already final, so return it immediately and skip its outgoing edges.`,
        {
          codeLine: 2,
          highlights: [nodeHighlight(u, 'base', 'memo hit')],
          vars: { node: u, dp: dp[u] ?? 0, visits, hits },
        },
      );
      return dp[u] ?? 0;
    }

    visits += 1;
    rec.at(6).record(
      `Visit v${u} and solve every successor before choosing its best next hop. There are ${model.outgoing[u]?.length ?? 0} outgoing edge${(model.outgoing[u]?.length ?? 0) === 1 ? '' : 's'}.`,
      {
        codeLine: 6,
        highlights: [nodeHighlight(u, 'active', 'visiting')],
        vars: { node: u, visits, hits },
      },
    );

    let best = 0;
    let bestNext = -1;
    for (const arrow of model.outgoing[u] ?? []) {
      const tail = dfs(arrow.to);
      const candidate = arrow.weight + tail;
      const better = candidate > best;
      solveStep(rec, arrow, u, tail, better, best);
      if (better) {
        best = candidate;
        bestNext = arrow.to;
      }
    }

    dp[u] = best;
    nxt[u] = bestNext;
    done[u] = true;

    rec.at(10).update(
      (draft) => {
        const node = draft.nodes[u];
        if (node) node.detail = `dp ${best}`;
      },
      `Finished v${u}: dp[v${u}] = ${best}${
        bestNext >= 0 ? `, next hop v${bestNext}` : ', no outgoing edge'
      }.`,
      {
        codeLine: 10,
        highlights: [nodeHighlight(u, bestNext >= 0 ? 'result' : 'base', 'dp final')],
        vars: { node: u, dp: best, next: bestNext >= 0 ? `v${bestNext}` : 'none', visits, hits },
      },
    );

    return best;
  };

  for (let start = 0; start < n; start += 1) dfs(start);

  return finish(rec, model, dp, nxt);
}

function tabulationSteps(model: DagModel): Step[] {
  const rec = makeRecorder(model);
  const n = model.matrix.length;
  const dp = new Array<number>(n).fill(0);
  const nxt = new Array<number>(n).fill(-1);

  rec.at(2).record(
    'Tabulation: the node indices are already a topological order because every edge goes from a lower index to a higher index. Scan u from n-1 down to 0 so every successor dp is final before it is read.',
    {
      codeLine: 2,
      highlights: [nodeHighlight(n - 1, 'active', 'start at the last node')],
      vars: { nodes: n, mode: 'tabulation' },
    },
  );

  for (let u = n - 1; u >= 0; u -= 1) {
    let best = 0;
    let bestNext = -1;

    for (const arrow of model.outgoing[u] ?? []) {
      const tail = dp[arrow.to] ?? 0;
      const candidate = arrow.weight + tail;
      const better = candidate > best;
      solveStep(rec, arrow, u, tail, better, best);
      if (better) {
        best = candidate;
        bestNext = arrow.to;
      }
    }

    dp[u] = best;
    nxt[u] = bestNext;

    rec.at(10).update(
      (draft) => {
        const node = draft.nodes[u];
        if (node) node.detail = `dp ${best}`;
      },
      `Finished v${u}: dp[v${u}] = ${best}${
        bestNext >= 0 ? `, next hop v${bestNext}` : ', no outgoing edge'
      }. Its successors already had larger indices and were final.`,
      {
        codeLine: 10,
        highlights: [nodeHighlight(u, bestNext >= 0 ? 'result' : 'base', 'dp final')],
        vars: { node: u, dp: best, next: bestNext >= 0 ? `v${bestNext}` : 'none' },
      },
    );
  }

  return finish(rec, model, dp, nxt);
}

const dagLongestPathModule: ProblemModule<DagLongestPathInput> = {
  id: 'dag-longest-path',
  title: 'Longest Path in a DAG',
  category: 'graphs',
  difficulty: 'medium',
  summary:
    'Find the heaviest path in a directed acyclic graph. Because every edge points forward in topological order, dp[u] = max(weight(u, v) + dp[v]) can be computed in one reverse sweep, and next hops reconstruct the winning path.',
  stateDefinition:
    'dp[u] = maximum total edge weight of any path that starts at u and ends anywhere. nxt[u] = the first hop of a best such path, or -1 when u has no outgoing edge. Answer = max over all u of dp[u].',
  recurrence:
    'dp[u] = max(0, max over edges u -> v of weight(u, v) + dp[v]); nxt[u] records the edge that achieves the maximum. Processing u from n-1 down to 0 works because every edge goes to a larger index.',
  complexity: { time: 'O(V + E)', space: 'O(V)' },
  renderer: 'dagGraph',
  inputSchema: [
    {
      name: 'graph',
      label: 'upper-triangular adjacency matrix',
      help: 'graph[i][j] > 0 is a directed edge i -> j with that weight. Zeros and cells below the diagonal mean no edge. Up to six nodes.',
      type: 'matrix',
      minRows: 1,
      maxRows: MAX_NODES,
      maxCols: MAX_NODES,
      min: 0,
      max: 9,
      numeric: true,
    },
  ],
  defaultInput: { graph: FALLBACK },
  modes: ['memo', 'tabulation'],
  generateSteps(input: DagLongestPathInput, mode: Mode): Step[] {
    const model = buildModel(normalizeGraph(input));
    return mode === 'tabulation' ? tabulationSteps(model) : memoSteps(model);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the default graph, what is the longest weighted path?',
      options: ['12', '9', '10', '6'],
      answer: 0,
      why: 'The path v0 -> v1 -> v2 -> v3 uses edges 3 + 5 + 4 = 12, which beats v0 -> v2 -> v3 (6) and v1 -> v2 -> v3 (9).',
    },
    {
      q: 'What does dp[u] mean in this module?',
      options: [
        'The longest weighted distance starting at u and ending anywhere',
        'The longest weighted distance ending at u',
        'The shortest number of edges from node 0 to u',
        'The number of paths that start at u',
      ],
      answer: 0,
      why: 'Each successor v is solved first, then dp[u] extends its best path with the edge u -> v; the path can end at any node.',
    },
    {
      q: 'Why can tabulation scan nodes from n-1 down to 0?',
      options: [
        'Every edge goes from a lower index to a higher index, so all successors are already final',
        'Edge weights are sorted in descending order',
        'The graph is always a binary tree',
        'Reverse order finds the shortest path instead',
      ],
      answer: 0,
      why: 'The upper-triangular matrix guarantees i < j for every edge i -> j. Scanning downward therefore computes successors before predecessors.',
    },
    {
      q: 'Why is the longest path easy here but hard in a general graph?',
      options: [
        'A DAG has no cycles, so a topological order exists; longest simple path in a general graph is NP-hard',
        'A DAG always has fewer than six nodes',
        'General graphs cannot be stored in a matrix',
        'Negative weights make the DAG version exponential',
      ],
      answer: 0,
      why: 'The topological order lets each node reuse its successors once. With cycles, a simple path can revisit nothing and the problem becomes NP-hard.',
    },
  ],
  relatedIds: ['shortest-path-all-nodes', 'tsp'],
  lessonId: 'graphs',
};

export default dagLongestPathModule;
