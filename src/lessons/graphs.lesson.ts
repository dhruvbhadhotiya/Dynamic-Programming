import { StepRecorder } from '../engine/dpHelpers';
import type { Lesson } from '../engine/lessonTypes';
import type { DagGraphState, GraphEdge, GraphNode, Highlight, Step } from '../engine/types';

type NodeId = 'A' | 'B' | 'C' | 'D' | 'E';

const NODE_INDEX: Record<NodeId, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };

const WEIGHT = {
  AB: 3,
  AC: 6,
  BC: 2,
  BD: 5,
  CD: 1,
  CE: 7,
  DE: 2,
} as const;

const NODES: GraphNode[] = [
  { id: 'A', label: 'A', x: 0.08, y: 0.5, detail: 'dp 0' },
  { id: 'B', label: 'B', x: 0.3, y: 0.2, detail: 'dp 0' },
  { id: 'C', label: 'C', x: 0.3, y: 0.8, detail: 'dp 0' },
  { id: 'D', label: 'D', x: 0.59, y: 0.5, detail: 'dp 0' },
  { id: 'E', label: 'E', x: 0.86, y: 0.5, detail: 'dp 0' },
];

const EDGES: GraphEdge[] = [
  { from: 'A', to: 'B', label: `${WEIGHT.AB}` },
  { from: 'A', to: 'C', label: `${WEIGHT.AC}` },
  { from: 'B', to: 'C', label: `${WEIGHT.BC}` },
  { from: 'B', to: 'D', label: `${WEIGHT.BD}` },
  { from: 'C', to: 'D', label: `${WEIGHT.CD}` },
  { from: 'C', to: 'E', label: `${WEIGHT.CE}` },
  { from: 'D', to: 'E', label: `${WEIGHT.DE}` },
];

function nodeHL(id: NodeId, kind: Highlight['kind'], label: string): Highlight {
  return { pos: [NODE_INDEX[id]], kind, label, target: 'node' };
}

function edgePosition(from: NodeId, to: NodeId): number {
  const index = EDGES.findIndex((edge) => edge.from === from && edge.to === to);
  if (index < 0) throw new Error(`Missing edge ${from} -> ${to}`);
  return index;
}

function edgeHL(from: NodeId, to: NodeId, kind: Highlight['kind'], label: string): Highlight {
  return { pos: [edgePosition(from, to)], kind, label, target: 'edge' };
}

function setNodeDetail(draft: DagGraphState, id: NodeId, detail: string): void {
  const node = draft.nodes[NODE_INDEX[id]];
  if (node) node.detail = detail;
}

function setEdgeLabel(draft: DagGraphState, from: NodeId, to: NodeId, label: string): void {
  const edge = draft.edges[edgePosition(from, to)];
  if (edge) edge.label = label;
}

function buildDiagramSteps(): Step[] {
  const rec = new StepRecorder<DagGraphState>(
    {
      kind: 'dagGraph',
      nodes: NODES.map((node) => ({ ...node })),
      edges: EDGES.map((edge) => ({ ...edge })),
      directed: true,
      caption: 'Longest path from A: dp[u] = max over u -> v of w(u, v) + dp[v]',
    },
    { codeLine: 1 },
  );

  rec.at(1).record(
    'Initialize dp[u] = 0 for every node: stopping immediately is always a legal path, so the empty path is the base case. The topological order is A -> B -> C -> D -> E because all seven edges point forward. Process nodes in reverse order E, D, C, B, A so every successor dp is final before it is read.',
    {
      codeLine: 1,
      highlights: [
        nodeHL('A', 'base', 'source, dp 0'),
        nodeHL('B', 'base', 'dp 0'),
        nodeHL('C', 'base', 'dp 0'),
        nodeHL('D', 'base', 'dp 0'),
        nodeHL('E', 'active', 'process first'),
      ],
      vars: {
        nodes: NODES.length,
        edges: EDGES.length,
        order: 'A -> B -> C -> D -> E',
        processing: 'E -> D -> C -> B -> A',
      },
    },
  );

  rec.at(2).update(
    (draft) => setNodeDetail(draft, 'E', 'dp 0'),
    'Process E first. E has no outgoing edge, so dp[E] = 0: the best path from E is the empty path. Its value is now final, and the predecessors D and C can safely read it.',
    {
      codeLine: 2,
      highlights: [nodeHL('E', 'result', 'dp 0 final')],
      vars: { node: 'E', outDegree: 0, dp: 0 },
    },
  );

  rec.at(3).update(
    (draft) => {
      setNodeDetail(draft, 'D', `dp ${WEIGHT.DE}`);
      setEdgeLabel(draft, 'D', 'E', `${WEIGHT.DE} ✓`);
    },
    `Process D: its only edge is D -> E with weight ${WEIGHT.DE}. dp[E] is final at 0, so the candidate is ${WEIGHT.DE} + 0 = ${WEIGHT.DE}. It beats the empty path 0, so dp[D] = ${WEIGHT.DE} and next[D] = E.`,
    {
      codeLine: 3,
      highlights: [
        nodeHL('D', 'result', `dp ${WEIGHT.DE} final`),
        nodeHL('E', 'dependency', 'dp 0'),
        edgeHL('D', 'E', 'path', 'chosen ✓'),
      ],
      vars: { node: 'D', edge: 'D -> E', candidate: WEIGHT.DE, dp: WEIGHT.DE },
    },
  );

  const cViaD = WEIGHT.CD + WEIGHT.DE;
  rec.at(5).update(
    (draft) => {
      setNodeDetail(draft, 'C', `dp ${cViaD}`);
      setEdgeLabel(draft, 'C', 'D', `${WEIGHT.CD} ✓`);
    },
    `Process C: test C -> D first. ${WEIGHT.CD} + dp[D] = ${WEIGHT.CD} + ${WEIGHT.DE} = ${cViaD}, which beats 0, so dp[C] becomes ${cViaD} and next[C] = D. This is only the current best, because C still has another edge to test.`,
    {
      codeLine: 5,
      highlights: [
        nodeHL('C', 'active', `dp ${cViaD} so far`),
        nodeHL('D', 'dependency', `dp ${WEIGHT.DE}`),
        edgeHL('C', 'D', 'path', 'current best ✓'),
      ],
      vars: { node: 'C', edge: 'C -> D', candidate: cViaD, best: cViaD },
    },
  );

  const cViaE = WEIGHT.CE;
  rec.at(6).update(
    (draft) => {
      setNodeDetail(draft, 'C', `dp ${cViaE}`);
      setEdgeLabel(draft, 'C', 'D', `${WEIGHT.CD} ×`);
      setEdgeLabel(draft, 'C', 'E', `${WEIGHT.CE} ✓`);
    },
    `Finish C: C -> E gives ${WEIGHT.CE} + dp[E] = ${WEIGHT.CE} + 0 = ${cViaE}, beating the current best ${cViaD}. Update dp[C] = ${cViaE} and next[C] = E. The earlier C -> D edge is still legal, but it is marked × because it is no longer the winner.`,
    {
      codeLine: 6,
      highlights: [
        nodeHL('C', 'result', `dp ${cViaE} final`),
        nodeHL('E', 'dependency', 'dp 0'),
        edgeHL('C', 'D', 'pruned', 'superseded ×'),
        edgeHL('C', 'E', 'path', 'best ✓'),
      ],
      vars: { node: 'C', edge: 'C -> E', candidate: cViaE, dp: cViaE },
    },
  );

  const bViaC = WEIGHT.BC + cViaE;
  rec.at(8).update(
    (draft) => {
      setNodeDetail(draft, 'B', `dp ${bViaC}`);
      setEdgeLabel(draft, 'B', 'C', `${WEIGHT.BC} ✓`);
    },
    `Process B: B -> C gives ${WEIGHT.BC} + dp[C] = ${WEIGHT.BC} + ${cViaE} = ${bViaC}, so dp[B] becomes ${bViaC} and next[B] = C. B must still test its second outgoing edge before its value is final.`,
    {
      codeLine: 8,
      highlights: [
        nodeHL('B', 'active', `dp ${bViaC} so far`),
        nodeHL('C', 'dependency', `dp ${cViaE}`),
        edgeHL('B', 'C', 'path', 'current best ✓'),
      ],
      vars: { node: 'B', edge: 'B -> C', candidate: bViaC, best: bViaC },
    },
  );

  const bViaD = WEIGHT.BD + WEIGHT.DE;
  rec.at(9).update(
    (draft) => {
      setNodeDetail(draft, 'B', `dp ${bViaC}`);
      setEdgeLabel(draft, 'B', 'D', `${WEIGHT.BD} ×`);
    },
    `Finish B: B -> D gives ${WEIGHT.BD} + dp[D] = ${WEIGHT.BD} + ${WEIGHT.DE} = ${bViaD}, which does not beat the current best ${bViaC}. Keep dp[B] = ${bViaC} and next[B] = C. The × beside B -> D records the rejected comparison, so the diagram does not rely on color alone.`,
    {
      codeLine: 9,
      highlights: [
        nodeHL('B', 'result', `keeps dp ${bViaC} final`),
        nodeHL('D', 'dependency', `dp ${WEIGHT.DE}`),
        edgeHL('B', 'D', 'pruned', `${bViaD} < ${bViaC} ×`),
      ],
      vars: { node: 'B', edge: 'B -> D', candidate: bViaD, best: bViaC },
    },
  );

  const aViaB = WEIGHT.AB + bViaC;
  rec.at(11).update(
    (draft) => {
      setNodeDetail(draft, 'A', `dp ${aViaB}`);
      setEdgeLabel(draft, 'A', 'B', `${WEIGHT.AB} ✓`);
    },
    `Process A: A -> B gives ${WEIGHT.AB} + dp[B] = ${WEIGHT.AB} + ${bViaC} = ${aViaB}, so the current best becomes ${aViaB} with next[A] = B. A still has A -> C to test.`,
    {
      codeLine: 11,
      highlights: [
        nodeHL('A', 'active', `dp ${aViaB} so far`),
        nodeHL('B', 'dependency', `dp ${bViaC}`),
        edgeHL('A', 'B', 'path', 'current best ✓'),
      ],
      vars: { node: 'A', edge: 'A -> B', candidate: aViaB, best: aViaB },
    },
  );

  const aViaC = WEIGHT.AC + cViaE;
  rec.at(12).update(
    (draft) => {
      setNodeDetail(draft, 'A', `dp ${aViaC}`);
      setEdgeLabel(draft, 'A', 'B', `${WEIGHT.AB} ×`);
      setEdgeLabel(draft, 'A', 'C', `${WEIGHT.AC} ✓`);
    },
    `Finish A: A -> C gives ${WEIGHT.AC} + dp[C] = ${WEIGHT.AC} + ${cViaE} = ${aViaC}, beating the current best ${aViaB}. Set dp[A] = ${aViaC} and next[A] = C. The earlier A -> B edge is marked × as superseded, not because it is invalid.`,
    {
      codeLine: 12,
      highlights: [
        nodeHL('A', 'result', `dp ${aViaC} final`),
        nodeHL('C', 'dependency', `dp ${cViaE}`),
        edgeHL('A', 'B', 'pruned', 'superseded ×'),
        edgeHL('A', 'C', 'path', 'best ✓'),
      ],
      vars: { node: 'A', edge: 'A -> C', candidate: aViaC, dp: aViaC },
    },
  );

  rec.at(14).record(
    `Reconstruct the best path from the next pointers: next[A] = C and next[C] = E, so the path is A -> C -> E. Its edges weigh ${WEIGHT.AC} + ${WEIGHT.CE} = ${aViaC}. Reconstruction is one lookup per node, and the ✓ / × labels on edges keep every choice visible without relying on color.`,
    {
      codeLine: 14,
      highlights: [
        nodeHL('A', 'path', 'path start'),
        nodeHL('C', 'path', 'best path'),
        nodeHL('E', 'path', 'path end'),
        edgeHL('A', 'C', 'path', 'best path ✓'),
        edgeHL('C', 'E', 'path', 'best path ✓'),
      ],
      vars: { path: 'A -> C -> E', hops: 2, total: aViaC },
    },
  );

  rec.at(15).record(
    `The answer is ${aViaC}: dp[A] = ${aViaC} is the largest dp value, and the winning path A -> C -> E totals ${WEIGHT.AC} + ${WEIGHT.CE} = ${aViaC}. The three-edge route A -> B -> C -> E totals only ${WEIGHT.AB + WEIGHT.BC + WEIGHT.CE}, so testing every outgoing edge mattered. Reverse topological order made one sweep enough.`,
    {
      codeLine: 15,
      highlights: [
        nodeHL('A', 'path', `answer ${aViaC}`),
        nodeHL('C', 'path', 'best path'),
        nodeHL('E', 'path', 'best path'),
        nodeHL('B', 'result', `dp ${bViaC}`),
        nodeHL('D', 'result', `dp ${WEIGHT.DE}`),
        edgeHL('A', 'C', 'path', 'best path ✓'),
        edgeHL('C', 'E', 'path', 'best path ✓'),
      ],
      vars: {
        answer: aViaC,
        path: 'A -> C -> E',
        hops: 2,
        nodes: NODES.length,
        edges: EDGES.length,
      },
    },
  );

  return [...rec.steps];
}

const lesson: Lesson = {
  id: 'graphs',
  title: 'Graph DP: Order the Graph, Then Relax',
  category: 'graphs',
  summary:
    'Graph DP turns path problems into table fills, but only after the dependency order is safe. A DAG supplies a topological order; general graphs replace that order with relaxation rounds (Bellman-Ford), an intermediate-node dimension (Floyd-Warshall), or an explicit edge budget (layered DP for at most k stops).',
  sections: [
    {
      heading: 'Topological order makes DP safe',
      body: 'Dynamic programming needs one guarantee: when a state is computed, every state it reads is already final. On a DAG, a topological order supplies that guarantee. It lists every node so that for every edge u -> v, u appears before v. If dp[u] describes a path that starts at u and continues through its successors, scanning the order in reverse finishes every successor before its predecessor. If dp[v] describes a path that ends at v, scanning forward gives the same safety in the other direction.\n\nKahn\'s algorithm builds the order by repeatedly removing a node with in-degree zero. If nodes remain after the queue empties, the graph contains a cycle and no topological order exists. That failure is informative: a cyclic graph is not solved by a better traversal, but by adding a dimension that makes the dependency finite, such as a round counter, allowed intermediate set, or edge budget. All four graph problems in this lesson use that idea in different ways.',
      bullets: [
        'Topological order: every edge u -> v places u before v.',
        'Paths starting at u: process nodes in reverse topological order.',
        'Paths ending at v: process nodes in forward topological order.',
        'Kahn\'s algorithm peels in-degree-zero nodes; leftovers mean a cycle.',
        'A cycle demands a new state dimension, not a cleverer DFS.',
      ],
      callout:
        'If a recurrence reads a value that is not final yet, stop coding and draw the dependency graph. The missing piece is usually an ordering rule or an extra dimension, not a bug in the loop bounds.',
    },
    {
      heading: 'DAG longest and shortest paths',
      body: 'The two recurrences mirror each other. For a longest path that starts at u and may stop anywhere, dp[u] = max(0, max over edges u -> v of weight(u, v) + dp[v]). The 0 is the empty-path base case, so a node with no useful outgoing edge is not forced to move. For a shortest path from a source s, scan forward: dist[s] = 0, every other dist starts at infinity, and each edge u -> v relaxes dist[v] = min(dist[v], dist[u] + weight(u, v)). Both directions touch every edge once, so the cost is O(V + E).\n\nThe dag-longest-path walkthrough is exactly the first recurrence: its upper-triangular adjacency matrix guarantees that every edge points to a larger index, so a reverse index sweep is a topological order. Store next[u] whenever the incumbent improves; following those pointers reconstructs the winning path in O(length). Negative edge weights are harmless here because no node is greedily finalised: a successor is read only after all of its own successors are settled.',
      bullets: [
        'Longest from u: dp[u] = max(0, max(weight + dp[v])); store next[u].',
        'Shortest from source: relax dist[v] = min(dist[v], dist[u] + weight) forward.',
        'Pick the base deliberately: 0 for "stop here", infinity for unreachable.',
        'Distinguish the answer at one target from the best answer over all starts.',
        'Reconstruct with next or parent pointers; never search the finished table again.',
      ],
      callout:
        'On a DAG, a single topological sweep handles negative edges correctly. The trouble starts only when cycles remove the order.',
    },
    {
      heading: 'Negative edges: Bellman-Ford vs Dijkstra',
      body: 'Dijkstra extracts the closest unsettled node and freezes it. That is valid only when every edge weight is non-negative: with a negative edge, a route discovered later can undercut a node that Dijkstra already declared final, so the greedy proof collapses. Bellman-Ford abandons greedy finalisation and relaxes every edge in rounds instead. After pass p, every shortest path that uses at most p edges is final. A simple path on V nodes uses at most V - 1 edges, so V - 1 passes suffice; one extra check detects a reachable negative cycle when an edge still relaxes. The bellman-ford walkthrough shows both the early exit and that final negative-cycle test.\n\nOn a DAG, negative edges do not require this machinery: reverse topological order fixes each node exactly once and is strictly faster. Bellman-Ford matters when cycles exist, and its pass counter is itself a DP dimension: pass p depends only on pass p - 1. That is the same layer idea used later for an explicit stop limit. Costs are O(V * E) time and O(V) space, and a pass that changes nothing proves convergence.',
      bullets: [
        'Dijkstra requires non-negative weights; one negative edge can break its finality claim.',
        'Bellman-Ford relaxes all edges; pass p finalises paths with at most p edges.',
        'Run V - 1 passes, then test every edge once more for a reachable negative cycle.',
        'Negative edge is fine; a reachable negative cycle makes shortest distance undefined.',
        'On a DAG with negative edges, use reverse topological order instead of rounds.',
      ],
      callout:
        'If Dijkstra returns a distance that is too large on a graph with a negative edge, the priority queue is not the problem; the greedy finalisation assumption is.',
    },
    {
      heading: 'Floyd-Warshall: one intermediate at a time',
      body: 'Floyd-Warshall answers all-pairs shortest paths by turning the set of allowed intermediate nodes into the DP round. Let dp_k[i][j] be the shortest path from i to j whose internal nodes all come from the first k nodes. For k = -1 the only paths are single edges plus the diagonal zero. Round k either keeps the old path or inserts node k into it: dp_k[i][j] = min(dp_{k-1}[i][j], dp_{k-1}[i][k] + dp_{k-1}[k][j]).\n\nThe 3D table rolls into a 2D table updated in place, and that trick is correct only when k is the outermost loop. Each round then reads values that already include all intermediates below k, while row k and column k cannot improve during the round unless a negative cycle exists. Putting k innermost mixes rounds and can let a path use k before the kth round has finished. The floyd-warshall walkthrough visualises the k rounds; at the end, a negative dist[i][i] exposes a negative cycle. Time is O(V^3), space is O(V^2), and the method is ideal for small dense graphs with many queries.',
      bullets: [
        'State: dp_k[i][j] uses only intermediate nodes from the first k nodes.',
        'Transition: min(keep the old path, go i -> k -> j through the new node).',
        'Keep k outermost; i and j inside may run in either order.',
        'Negative edges are allowed; dist[i][i] < 0 signals a negative cycle.',
        'Roll the k dimension into a 2D table for O(V^2) space.',
      ],
      callout:
        'A k-innermost triple loop is the classic Floyd-Warshall bug: it processes rounds out of order, so a path may use node k before the kth round is complete.',
    },
    {
      heading: 'Layered DP: at most k stops',
      body: 'When the problem caps the number of stops, the cheapest cost to a node is no longer a complete state. A cheaper route may already have spent the whole budget, while a slightly dearer route with fewer edges can still be extended. Add the edge count to the state: dp[t][v] = cheapest cost from the source to v using at most t edges. The base is dp[0][source] = 0 and infinity elsewhere. Each layer copies the previous one and relaxes every incoming edge: dp[t][v] = min(dp[t-1][v], min over u -> v of dp[t-1][u] + weight(u, v)). The copy is what makes the bound "at most"; dropping it makes the layer mean "exactly t edges".\n\nThe cheapest-flights-k-stops problem is this recurrence: k stops means at most k + 1 flights, so the answer is the best value in layers 0 through k + 1. Plain Dijkstra keyed only by node can be wrong because it discards the stop count. Bellman-Ford is the same layered idea without a stop cap, and its pass number is the edge budget. The layer count is at most k + 2 and each layer scans every edge, giving O(k * E) time and O(V) space after rolling the table.',
      bullets: [
        'State includes the budget: dp[t][v] is the best cost with at most t edges.',
        'Copy the previous layer first, then relax incoming edges into the current layer.',
        'k stops allows k + 1 edges; take the best over layers 0 through k + 1.',
        'Copy for "at most", no copy for "exactly"; mixing them changes the answer.',
        'A node-only Dijkstra state loses the stop count and can return a wrong route.',
      ],
      callout:
        'If the layer index disappears, test a graph where the cheapest route to the hub already uses all k stops. That case exposes why the node alone is not enough state.',
    },
  ],
  diagram: {
    rendererId: 'dagGraph',
    steps: buildDiagramSteps(),
  },
};

export default lesson;
