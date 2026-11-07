import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, TreeDPNode, TreeDPState } from '../../engine/types';

export interface RerootingInput {
  parents: number[];
}

const MAX_NODES = 7;
const FALLBACK = [-1, 0, 1, 2];

const pythonCode = [
  'def reroot(parents):',
  '    n = len(parents); children = [[] for _ in range(n)]',
  '    for i in range(1, n): children[parents[i]].append(i)',
  '    size = [1] * n; down = [0] * n',
  '    for i in range(n - 1, -1, -1):',
  '        for c in children[i]: size[i] += size[c]; down[i] += down[c] + size[c]',
  '    total = [0] * n; total[0] = down[0]',
  '    for i in range(1, n): total[i] = total[parents[i]] + n - 2 * size[i]',
  '    # rerooting changed only one root at a time, so each child is O(1)',
  '    return min(total)',
].join('\n');

const javascriptCode = [
  'function reroot(parents) {',
  '  const n = parents.length, children = Array.from({ length: n }, () => []);',
  '  for (let i = 1; i < n; i++) children[parents[i]].push(i);',
  '  const size = new Array(n).fill(1), down = new Array(n).fill(0);',
  '  for (let i = n - 1; i >= 0; i--)',
  '    for (const c of children[i]) { size[i] += size[c]; down[i] += down[c] + size[c]; }',
  '  const total = new Array(n).fill(0); total[0] = down[0];',
  '  for (let i = 1; i < n; i++) total[i] = total[parents[i]] + n - 2 * size[i];',
  '  // rerooting changed only one root at a time, so each child is O(1)',
  '  return Math.min(...total);',
  '}',
].join('\n');

const cppCode = [
  'int reroot(vector<int>& parents) {',
  '  int n = parents.size(); vector<vector<int>> children(n);',
  '  for (int i = 1; i < n; i++) children[parents[i]].push_back(i);',
  '  vector<int> size(n, 1), down(n, 0);',
  '  for (int i = n - 1; i >= 0; i--)',
  '    for (int c : children[i]) { size[i] += size[c]; down[i] += down[c] + size[c]; }',
  '  vector<int> total(n, 0); total[0] = down[0];',
  '  for (int i = 1; i < n; i++) total[i] = total[parents[i]] + n - 2 * size[i];',
  '  // rerooting changed only one root at a time, so each child is O(1)',
  '  return *min_element(total.begin(), total.end());',
  '}',
].join('\n');

interface RerootTree {
  parents: number[];
  children: number[][];
  nodes: TreeDPNode[];
}

function normalizeInput(input: RerootingInput): number[] {
  const raw = Array.isArray(input.parents) ? input.parents.slice(0, MAX_NODES) : [];
  if (raw.length === 0) return [...FALLBACK];

  return raw.map((value, index) => {
    if (index === 0) return -1;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
    return clamp(Math.trunc(value), 0, index - 1);
  });
}

function buildTree(parents: number[]): RerootTree {
  const children: number[][] = Array.from({ length: parents.length }, () => []);
  const nodes: TreeDPNode[] = parents.map((parent, index) => {
    const node: TreeDPNode = {
      id: `n${index}`,
      label: `node ${index}`,
      detail: parent < 0 ? 'root' : `parent ${parent}`,
      kind: 'pending',
    };
    if (parent >= 0) {
      children[parent]?.push(index);
      node.parentId = `n${parent}`;
    }
    return node;
  });
  return { parents, children, nodes };
}

function makeRecorder(tree: RerootTree): StepRecorder<TreeDPState> {
  return new StepRecorder<TreeDPState>(
    {
      kind: 'treeDP',
      nodes: tree.nodes,
      caption:
        'Rerooting: size = subtree nodes, down = distance sum inside subtree, total = distance sum from this node',
    },
    { codeLine: 1 },
  );
}

function childHighlights(tree: RerootTree, node: number) {
  return (tree.children[node] ?? []).map((child) => ({
    pos: [child],
    kind: 'dependency' as const,
    label: 'child subtree',
  }));
}

function memoSteps(tree: RerootTree): Step[] {
  const rec = makeRecorder(tree);
  const count = tree.parents.length;
  const size = new Array<number>(count).fill(1);
  const down = new Array<number>(count).fill(0);
  const total = new Array<number>(count).fill(0);

  rec.at(1).record(
    'Two passes over the tree. First compute subtree size and down[i] = sum of distances from i to nodes below it. Then reroot from the parent: moving the root into a child makes distances to that child subtree one shorter and all other distances one longer.',
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'root' }],
      vars: { nodes: count },
    },
  );

  const solveSizes = (node: number): void => {
    let subtreeSize = 1;
    let subtreeDown = 0;
    for (const child of tree.children[node] ?? []) {
      solveSizes(child);
      subtreeSize += size[child] ?? 1;
      subtreeDown += (down[child] ?? 0) + (size[child] ?? 1);
    }
    size[node] = subtreeSize;
    down[node] = subtreeDown;

    rec.at(6).update(
      (draft) => {
        const draftNode = draft.nodes[node];
        if (draftNode) {
          draftNode.kind = 'done';
          draftNode.values = { size: subtreeSize, down: subtreeDown };
        }
      },
      `Post-order node ${node}: subtree size = ${subtreeSize}; down = sum of child down + child size = ${subtreeDown}. Every child is already complete.`,
      {
        codeLine: 6,
        highlights: [
          { pos: [node], kind: 'result', label: 'subtree finished' },
          ...childHighlights(tree, node),
        ],
        vars: { node, size: subtreeSize, down: subtreeDown },
      },
    );
  };

  const spread = (node: number): void => {
    for (const child of tree.children[node] ?? []) {
      total[child] = (total[node] ?? 0) + count - 2 * (size[child] ?? 1);
      rec.at(8).update(
        (draft) => {
          const draftNode = draft.nodes[child];
          if (draftNode) {
            draftNode.kind = 'done';
            draftNode.values = { size: size[child] ?? 1, total: total[child] ?? 0 };
          }
        },
        `Reroot at child ${child}: total[${child}] = total[${node}] + n - 2 x size[${child}] = ${total[node] ?? 0} + ${count} - 2 x ${size[child] ?? 1} = ${total[child] ?? 0}.`,
        {
          codeLine: 8,
          highlights: [
            { pos: [child], kind: 'active', label: 'new root' },
            { pos: [node], kind: 'dependency', label: 'old root' },
          ],
          vars: { node, child, total: total[child] ?? 0 },
        },
      );
      spread(child);
    }
  };

  solveSizes(0);
  total[0] = down[0] ?? 0;
  rec.at(7).record(
    `Root 0 is done: size = ${size[0] ?? 1}, total distance = down[0] = ${total[0] ?? 0}. Now push this value down to every other node.`,
    {
      codeLine: 7,
      highlights: [{ pos: [0], kind: 'result', label: 'base total' }],
      vars: { node: 0, total: total[0] ?? 0 },
    },
  );
  spread(0);

  let answer = Number.POSITIVE_INFINITY;
  let bestNode = 0;
  for (let node = 0; node < count; node += 1) {
    if ((total[node] ?? 0) < answer) {
      answer = total[node] ?? 0;
      bestNode = node;
    }
  }

  rec.at(10).record(
    `The answer is ${answer} — node ${bestNode} minimises the total distance to every node.`,
    {
      codeLine: 10,
      highlights: [{ pos: [bestNode], kind: 'result', label: 'best meeting node' }],
      vars: { answer, bestNode },
    },
  );

  return [...rec.steps];
}

function tabulationSteps(tree: RerootTree): Step[] {
  const rec = makeRecorder(tree);
  const count = tree.parents.length;
  const size = new Array<number>(count).fill(1);
  const down = new Array<number>(count).fill(0);
  const total = new Array<number>(count).fill(0);

  rec.at(1).record(
    'Bottom-up then top-down. Parents appear before children, so reverse index order finalises subtree sizes and down[] without recursion. A forward pass then applies the reroot formula to each child in O(1).',
    {
      codeLine: 1,
      highlights: [{ pos: [count - 1], kind: 'active', label: 'start at the last node' }],
      vars: { nodes: count },
    },
  );

  for (let node = count - 1; node >= 0; node -= 1) {
    let subtreeSize = 1;
    let subtreeDown = 0;
    for (const child of tree.children[node] ?? []) {
      subtreeSize += size[child] ?? 1;
      subtreeDown += (down[child] ?? 0) + (size[child] ?? 1);
    }
    size[node] = subtreeSize;
    down[node] = subtreeDown;

    rec.at(6).update(
      (draft) => {
        const draftNode = draft.nodes[node];
        if (draftNode) {
          draftNode.kind = 'done';
          draftNode.values = { size: subtreeSize, down: subtreeDown };
        }
      },
      `Reverse pass node ${node}: size = ${subtreeSize}; down = ${subtreeDown}. Children have larger indices, so both values are final.`,
      {
        codeLine: 6,
        highlights: [
          { pos: [node], kind: 'result', label: 'subtree finished' },
          ...childHighlights(tree, node),
        ],
        vars: { node, size: subtreeSize, down: subtreeDown },
      },
    );
  }

  total[0] = down[0] ?? 0;
  rec.at(7).record(
    `total[0] starts at down[0] = ${total[0] ?? 0}. The forward pass now reroots at every child in index order, so its parent total is already known.`,
    {
      codeLine: 7,
      highlights: [{ pos: [0], kind: 'result', label: 'base total' }],
      vars: { node: 0, total: total[0] ?? 0 },
    },
  );

  for (let node = 1; node < count; node += 1) {
    const parent = tree.parents[node] ?? 0;
    total[node] = (total[parent] ?? 0) + count - 2 * (size[node] ?? 1);
    rec.at(8).update(
      (draft) => {
        const draftNode = draft.nodes[node];
        if (draftNode) {
          draftNode.kind = 'done';
          draftNode.values = { size: size[node] ?? 1, total: total[node] ?? 0 };
        }
      },
      `Reroot at node ${node}: total = total[${parent}] + ${count} - 2 x ${size[node] ?? 1} = ${total[node] ?? 0}.`,
      {
        codeLine: 8,
        highlights: [
          { pos: [node], kind: 'active', label: 'new root' },
          { pos: [parent], kind: 'dependency', label: 'parent total' },
        ],
        vars: { node, parent, total: total[node] ?? 0 },
      },
    );
  }

  let answer = Number.POSITIVE_INFINITY;
  let bestNode = 0;
  for (let node = 0; node < count; node += 1) {
    if ((total[node] ?? 0) < answer) {
      answer = total[node] ?? 0;
      bestNode = node;
    }
  }

  rec.at(10).record(
    `The answer is ${answer} — node ${bestNode} has the smallest total distance to every node.`,
    {
      codeLine: 10,
      highlights: [{ pos: [bestNode], kind: 'result', label: 'best meeting node' }],
      vars: { answer, bestNode },
    },
  );

  return [...rec.steps];
}

const rerootingModule: ProblemModule<RerootingInput> = {
  id: 'tree-rerooting',
  title: 'Tree Rerooting: Best Meeting Node',
  category: 'tree',
  difficulty: 'hard',
  summary:
    'Find the node whose total distance to every other node is smallest. One post-order pass computes subtree sizes and distance sums inside each subtree; one reroot pass updates the total in O(1) when the root moves to a child.',
  stateDefinition:
    'size[node] = number of nodes in node\'s subtree. down[node] = sum of distances from node to nodes in its subtree. total[node] = sum of distances from node to every node in the tree. Answer = min over nodes of total[node].',
  recurrence:
    'down[node] = sum over children c of (down[c] + size[c]); total[root] = down[root]; total[child] = total[parent] + n - 2 * size[child].',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'treeDP',
  inputSchema: [
    {
      name: 'parents',
      label: 'parent array',
      help: 'Parent index for each node; node 0 is the root. Later nodes may only point to earlier nodes. Up to seven nodes.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_NODES,
      min: -1,
      max: MAX_NODES - 1,
    },
  ],
  defaultInput: { parents: FALLBACK },
  modes: ['memo', 'tabulation'],
  generateSteps(input: RerootingInput, mode: Mode): Step[] {
    const tree = buildTree(normalizeInput(input));
    return mode === 'tabulation' ? tabulationSteps(tree) : memoSteps(tree);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the path 0-1-2-3, which node minimises the total distance, and what is the total?',
      options: ['Node 1 or 2, total 4', 'Node 0, total 6', 'Node 3, total 6', 'All nodes, total 4'],
      answer: 0,
      why: 'From node 1 the distances are 1, 0, 1 and 2, summing to 4; node 2 is symmetric. The endpoints need 6.',
    },
    {
      q: 'When the root moves from parent to child, what changes?',
      options: [
        'Distances to the child subtree shrink by 1; all other distances grow by 1',
        'Every distance shrinks by 1',
        'Only the child distance changes',
        'Nothing changes because the tree is undirected',
      ],
      answer: 0,
      why: 'The child subtree has size[c] nodes that become one step closer; the other n - size[c] nodes become one step farther. Net change = n - 2*size[c].',
    },
    {
      q: 'What is down[node] in the first pass?',
      options: [
        'The sum of distances from node to nodes in its subtree',
        'The number of children of node',
        'The height of node',
        'The total distance from node to every node in the tree',
      ],
      answer: 0,
      why: 'down is built only from children; the second pass extends it to the whole tree using the reroot formula.',
    },
    {
      q: 'What are the time and space complexities?',
      options: ['O(n) time, O(n) space', 'O(n²) time, O(n) space', 'O(n log n) time, O(1) space', 'O(2^n) time, O(n) space'],
      answer: 0,
      why: 'Each node is processed once in the post-order pass and once in the reroot pass, and the arrays store O(n) values.',
    },
  ],
  relatedIds: ['tree-diameter', 'max-independent-set', 'house-robber-iii'],
  lessonId: 'tree-dp',
};

export default rerootingModule;
