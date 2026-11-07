import { StepRecorder, clamp, create2D } from '../../engine/dpHelpers';
import type { ProblemModule, Step, Table2DState } from '../../engine/types';

export interface ShortestPathAllNodesInput {
  graph: number[][];
}

const MIN_NODES = 2;
const MAX_NODES = 4;

const pythonCode = [
  'from collections import deque',
  'def shortest_path(graph):',
  '    n = len(graph); full = (1 << n) - 1; dist = [[-1] * n for _ in range(1 << n)]; q = deque()',
  '    for i in range(n): dist[1 << i][i] = 0; q.append((1 << i, i))',
  '    while q:',
  '        mask, node = q.popleft()',
  '        for nxt in range(n):',
  '            if graph[node][nxt] and dist[mask | (1 << nxt)][nxt] < 0: dist[mask | (1 << nxt)][nxt] = dist[mask][node] + 1; q.append((mask | (1 << nxt), nxt))',
  '    return min(dist[full]) if min(dist[full]) >= 0 else -1',
].join('\n');

const javascriptCode = [
  'function shortestPath(graph) {',
  '  const n = graph.length, full = (1 << n) - 1;',
  '  const dist = Array.from({ length: 1 << n }, () => new Array(n).fill(-1));',
  '  const queue = [];',
  '  for (let i = 0; i < n; i++) { dist[1 << i][i] = 0; queue.push([1 << i, i]); }',
  '  for (let head = 0; head < queue.length; head++) {',
  '    const [mask, node] = queue[head];',
  '    for (let nxt = 0; nxt < n; nxt++) if (graph[node][nxt] && dist[mask | (1 << nxt)][nxt] < 0) { dist[mask | (1 << nxt)][nxt] = dist[mask][node] + 1; queue.push([mask | (1 << nxt), nxt]); }',
  '  }',
  '  const best = Math.min(...dist[full]); return best >= 0 ? best : -1;',
  '}',
].join('\n');

const cppCode = [
  'int shortestPath(vector<vector<int>>& graph) {',
  '  int n = graph.size(), full = (1 << n) - 1; vector<vector<int>> dist(1 << n, vector<int>(n, -1)); queue<pair<int,int>> q;',
  '  for (int i = 0; i < n; i++) { dist[1 << i][i] = 0; q.push({1 << i, i}); }',
  '  while (!q.empty()) {',
  '    auto [mask, node] = q.front(); q.pop();',
  '    for (int nxt = 0; nxt < n; nxt++)',
  '      // every unvisited state is discovered once by BFS',
  '      if (graph[node][nxt] && dist[mask | (1 << nxt)][nxt] < 0) { dist[mask | (1 << nxt)][nxt] = dist[mask][node] + 1; q.push({mask | (1 << nxt), nxt}); }',
  '  }',
  '  int best = 1e9; for (int x : dist[full]) if (x >= 0) best = min(best, x);',
  '  return best == 1e9 ? -1 : best;',
  '}',
].join('\n');

const FALLBACK: number[][] = [
  [0, 1, 1, 1],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
];

function normalizeInput(input: ShortestPathAllNodesInput): number[][] {
  const rawRows = Array.isArray(input.graph) ? input.graph : [];
  const width = rawRows[0]?.length ?? 0;
  const square =
    rawRows.length >= MIN_NODES &&
    width >= MIN_NODES &&
    rawRows.every((row) => Array.isArray(row) && row.length === width);

  if (!square) return FALLBACK.map((row) => [...row]);

  const n = clamp(Math.min(rawRows.length, width), MIN_NODES, MAX_NODES);
  const isEdge = (row: number, col: number): boolean => {
    const forward = rawRows[row]?.[col];
    const backward = rawRows[col]?.[row];
    return (
      (typeof forward === 'number' && Number.isFinite(forward) && forward >= 1) ||
      (typeof backward === 'number' && Number.isFinite(backward) && backward >= 1)
    );
  };

  return create2D(n, n, (row, col) => (row !== col && isEdge(row, col) ? 1 : 0));
}

function makeRecorder(n: number): StepRecorder<Table2DState> {
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D<number | null>(1 << n, n, () => null),
      rowLabels: Array.from({ length: 1 << n }, (_value, mask) =>
        `mask ${mask.toString(2).padStart(n, '0')}`,
      ),
      colLabels: Array.from({ length: n }, (_value, node) => `node ${node}`),
      rowHeader: 'visited set',
      colHeader: 'current node',
      caption: `Shortest Path Visiting All Nodes: dist[mask][node] = fewest edges to reach node having visited exactly mask`,
    },
    { codeLine: 1 },
  );
}

function shortestPathSteps(graph: number[][]): Step[] {
  const n = graph.length;
  const full = (1 << n) - 1;
  const rec = makeRecorder(n);
  const dist = create2D<number | null>(1 << n, n, () => null);
  const queue: Array<[number, number]> = [];
  let discovered = 0;

  rec.at(1).record(
    `BFS over (mask, node) states. A state records both which nodes have been visited and where the walk currently stands. Start from every node because the walk may begin anywhere; every edge costs 1, so BFS discovers states in increasing distance.`,
    {
      codeLine: 1,
      highlights: [{ pos: [1, 0], kind: 'active', label: 'one possible start' }],
      vars: { nodes: n, masks: 1 << n, discovered: 0 },
    },
  );

  for (let node = 0; node < n; node += 1) {
    const mask = 1 << node;
    const row = dist[mask];
    if (row) row[node] = 0;
    queue.push([mask, node]);
    discovered += 1;
    rec.at(3).fill(
      [mask, node],
      0,
      `Start at node ${node}: mask ${mask.toString(2).padStart(n, '0')} contains only that node, and zero edges have been used.`,
      {
        kind: 'base',
        codeLine: 3,
        vars: { mask, node, distance: 0, discovered },
      },
    );
  }

  for (let head = 0; head < queue.length; head += 1) {
    const state = queue[head];
    if (!state) continue;
    const [mask, node] = state;
    const current = dist[mask]?.[node] ?? 0;

    rec.at(6).record(
      `Pop state mask ${mask.toString(2).padStart(n, '0')} at node ${node}: distance ${current}. Try every neighbour of node ${node}.`,
      {
        codeLine: 6,
        highlights: [{ pos: [mask, node], kind: 'active', label: 'current state' }],
        vars: { mask, node, distance: current, discovered },
      },
    );

    for (let next = 0; next < n; next += 1) {
      if (graph[node]?.[next] !== 1) continue;
      const nextMask = mask | (1 << next);
      const row = dist[nextMask];
      if (!row || row[next] !== null) continue;

      const nextDistance = current + 1;
      row[next] = nextDistance;
      queue.push([nextMask, next]);
      discovered += 1;
      rec.at(8).fill(
        [nextMask, next],
        nextDistance,
        `Move ${node} -> ${next}: new mask ${nextMask.toString(2).padStart(n, '0')} at node ${next} is first reached in ${nextDistance} edge${nextDistance === 1 ? '' : 's'}.`,
        {
          kind: 'path',
          codeLine: 8,
          highlights: [{ pos: [mask, node], kind: 'dependency', label: 'previous state' }],
          vars: { mask, node, next, nextMask, distance: nextDistance, discovered },
        },
      );
    }
  }

  let answer = -1;
  let bestNode = -1;
  for (let node = 0; node < n; node += 1) {
    const value = dist[full]?.[node];
    if (value === null || value === undefined) continue;
    if (answer < 0 || value < answer) {
      answer = value;
      bestNode = node;
    }
  }

  rec.at(9).record(
    answer < 0
      ? `The answer is -1 — no walk can visit every node because the graph is disconnected.`
      : `The answer is ${answer} — the shortest walk visits every node and finishes at node ${bestNode}.`,
    {
      codeLine: 9,
      highlights: [{ pos: [full, Math.max(bestNode, 0)], kind: 'result', label: 'answer' }],
      vars: { answer, full, discovered },
    },
  );

  return [...rec.steps];
}

const shortestPathAllNodesModule: ProblemModule<ShortestPathAllNodesInput> = {
  id: 'shortest-path-all-nodes',
  title: 'Shortest Path Visiting All Nodes',
  category: 'bitmask',
  difficulty: 'hard',
  summary:
    'Find the shortest walk that touches every node, where nodes and edges may be revisited. BFS over (visited mask, current node) explores states in increasing number of edges; the first time the full mask appears is the shortest walk.',
  stateDefinition:
    'dist[mask][node] = minimum number of edges in a walk that starts anywhere, visits exactly the nodes in mask, and currently stands at node. The answer is the minimum distance among dist[full][*].',
  recurrence:
    'Initialise dist[1<<i][i] = 0 for every start i. From (mask, node), each neighbour next that is not yet at (mask | 1<<next, next) gets distance dist[mask][node] + 1. BFS guarantees the first assignment is shortest.',
  complexity: { time: 'O(2^n * n²)', space: 'O(2^n * n)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'graph',
      label: 'adjacency matrix',
      help: 'Square 0/1 matrix. An edge in either direction is treated as undirected. Two to four nodes keeps the state table readable.',
      type: 'matrix',
      minRows: MIN_NODES,
      maxRows: MAX_NODES,
      maxCols: MAX_NODES,
      min: 0,
      max: 1,
      numeric: true,
    },
  ],
  defaultInput: { graph: FALLBACK },
  modes: ['tabulation'],
  generateSteps(input: ShortestPathAllNodesInput): Step[] {
    return shortestPathSteps(normalizeInput(input));
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the default star graph, how many edges does the shortest walk need to visit every node?',
      options: ['4', '3', '5', '6'],
      answer: 0,
      why: 'Start at leaf 1, go to centre 0, then leaf 2, back through 0, then leaf 3: 1 -> 0 -> 2 -> 0 -> 3 uses 4 edges.',
    },
    {
      q: 'What does dist[mask][node] represent?',
      options: [
        'Fewest edges to stand at node after visiting exactly the nodes in mask',
        'Whether node is reachable from mask',
        'The number of nodes in mask that are adjacent to node',
        'The longest simple path through mask ending at node',
      ],
      answer: 0,
      why: 'The mask records the visited set and node records the current position; the value is the BFS distance of that state.',
    },
    {
      q: 'Why does BFS initialise every node as a possible start?',
      options: [
        'The walk may begin at any node, so every singleton state has distance 0',
        'Because node 0 is always the cheapest start',
        'To make the mask table square',
        'Because edges are directed',
      ],
      answer: 0,
      why: 'There is no fixed start; all singleton states are valid starting points, so they all enter the queue at distance 0.',
    },
    {
      q: 'What are the time and space complexities for n nodes?',
      options: ['O(2^n * n²) time, O(2^n * n) space', 'O(n²) time, O(n) space', 'O(2^n) time, O(2^n) space', 'O(n!) time, O(n²) space'],
      answer: 0,
      why: 'There are 2^n * n states and each tries n neighbours; the distance table stores 2^n * n entries.',
    },
  ],
  relatedIds: ['tsp', 'assignment', 'dag-longest-path'],
  lessonId: 'bitmask',
};

export default shortestPathAllNodesModule;
