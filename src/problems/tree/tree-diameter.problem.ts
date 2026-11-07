import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, TreeDPNode, TreeDPState } from '../../engine/types';

export interface TreeDiameterInput {
  nodes: number[];
}

const MAX_NODES = 7;
const FALLBACK = [1, 2, 3, 4, 5, -1, -1];

const pythonCode = [
  'def diameter(root):',
  '    best = 0',
  '    def dfs(node):',
  '        nonlocal best',
  '        if not node: return 0',
  '        l, r = dfs(node.left), dfs(node.right); best = max(best, l + r); return 1 + max(l, r)',
  '    dfs(root); return best',
].join('\n');

const javascriptCode = [
  'function diameter(root) {',
  '  let best = 0;',
  '  function dfs(node) {',
  '    if (!node) return 0;',
  '    const l = dfs(node.left), r = dfs(node.right);',
  '    best = Math.max(best, l + r); return 1 + Math.max(l, r); }',
  '  dfs(root); return best;',
  '}',
].join('\n');

const cppCode = [
  'int diameter(TreeNode* root) {',
  '  int best = 0;',
  '  function<int(TreeNode*)> dfs = [&](TreeNode* node) {',
  '    if (!node) return 0;',
  '    int l = dfs(node->left), r = dfs(node->right);',
  '    best = max(best, l + r); return 1 + max(l, r); };',
  '  dfs(root); return best;',
  '}',
].join('\n');

interface BinaryTree {
  ids: number[];
  parent: Array<number | null>;
  value: number[];
  left: Array<number | null>;
  right: Array<number | null>;
}

interface BuiltTree {
  tree: BinaryTree;
  nodes: TreeDPNode[];
}

function normalizeLevelOrder(input: TreeDiameterInput): number[] {
  const raw = Array.isArray(input.nodes) ? input.nodes.slice(0, MAX_NODES) : [];
  if (raw.length === 0) return [...FALLBACK];
  if (typeof raw[0] !== 'number' || !Number.isFinite(raw[0]) || raw[0] < 0) return [...FALLBACK];
  return raw;
}

function buildTree(raw: number[]): BuiltTree {
  const exists: boolean[] = [];
  const values: number[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    if (index === 0) {
      exists.push(true);
      values.push(clamp(Math.trunc(raw[0] ?? 0), 0, 99));
      continue;
    }
    const parent = Math.floor((index - 1) / 2);
    const rawValue = raw[index];
    const valid =
      exists[parent] === true &&
      typeof rawValue === 'number' &&
      Number.isFinite(rawValue) &&
      rawValue >= 0;
    exists.push(valid);
    values.push(valid ? clamp(Math.trunc(rawValue), 0, 99) : -1);
  }

  const ids: number[] = [];
  const parent: Array<number | null> = [];
  const value: number[] = [];
  const nodeIndexByLevel = new Map<number, number>();

  for (let index = 0; index < exists.length; index += 1) {
    if (!exists[index]) continue;
    nodeIndexByLevel.set(index, ids.length);
    ids.push(index);
    value.push(values[index] ?? 0);
    parent.push(index === 0 ? null : (nodeIndexByLevel.get(Math.floor((index - 1) / 2)) ?? null));
  }

  const left: Array<number | null> = Array.from({ length: ids.length }, () => null);
  const right: Array<number | null> = Array.from({ length: ids.length }, () => null);
  for (let nodeIndex = 1; nodeIndex < ids.length; nodeIndex += 1) {
    const parentIndex = parent[nodeIndex];
    if (parentIndex === null || parentIndex === undefined) continue;
    if (left[parentIndex] === null) left[parentIndex] = nodeIndex;
    else if (right[parentIndex] === null) right[parentIndex] = nodeIndex;
  }

  const nodes: TreeDPNode[] = ids.map((index, nodeIndex) => {
    const parentIndex = parent[nodeIndex];
    const node: TreeDPNode = {
      id: `n${index}`,
      label: `node ${index}: ${value[nodeIndex] ?? 0}`,
      detail:
        parentIndex === null || parentIndex === undefined
          ? 'root'
          : `parent ${ids[parentIndex] ?? 0}`,
      kind: 'pending',
    };
    if (parentIndex !== null && parentIndex !== undefined) node.parentId = `n${ids[parentIndex] ?? 0}`;
    return node;
  });

  return {
    tree: { ids, parent, value, left, right },
    nodes,
  };
}

function makeRecorder(tree: BuiltTree): StepRecorder<TreeDPState> {
  return new StepRecorder<TreeDPState>(
    {
      kind: 'treeDP',
      nodes: tree.nodes,
      caption: 'Binary tree diameter: post-order height at each node; best path through a node = left height + right height',
    },
    { codeLine: 1 },
  );
}

function diameterSteps(raw: number[]): Step[] {
  const built = buildTree(raw);
  const rec = makeRecorder(built);
  const { left, right, value, ids } = built.tree;
  let best = 0;

  rec.at(1).record(
    `Post-order diameter. For each node, height = longest downward path in edges. The best diameter through that node joins its left and right downward paths. Every node reports to its parent after both children, so the root sees the whole tree.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'root' }],
      vars: { nodes: ids.length, best: 0 },
    },
  );

  const dfs = (index: number): number => {
    rec.at(3).record(`Visit level-order node ${ids[index] ?? 0} (value ${value[index] ?? 0}) and solve its children first.`, {
      codeLine: 3,
      highlights: [{ pos: [index], kind: 'active', label: 'visiting' }],
      vars: { node: ids[index] ?? 0, best },
    });

    const leftIndex = left[index] ?? null;
    const rightIndex = right[index] ?? null;
    const leftHeight = leftIndex === null ? 0 : dfs(leftIndex);
    const rightHeight = rightIndex === null ? 0 : dfs(rightIndex);
    const height = Math.max(leftIndex === null ? 0 : leftHeight + 1, rightIndex === null ? 0 : rightHeight + 1);
    const through =
      (leftIndex === null ? 0 : leftHeight + 1) + (rightIndex === null ? 0 : rightHeight + 1);
    best = Math.max(best, through);

    const childDeps = [
      ...(leftIndex === null ? [] : [{ pos: [leftIndex], kind: 'dependency' as const, label: 'left height' }]),
      ...(rightIndex === null ? [] : [{ pos: [rightIndex], kind: 'dependency' as const, label: 'right height' }]),
    ];
    rec.at(6).update(
      (draft) => {
        const node = draft.nodes[index];
        if (node) {
          node.kind = 'done';
          node.values = { height, through };
        }
      },
      `Node ${ids[index] ?? 0}: left ${leftIndex === null ? 'absent' : leftHeight}, right ${rightIndex === null ? 'absent' : rightHeight}. Best through it = ${through}; downward height = ${height}. Global best is now ${best}.`,
      {
        codeLine: 6,
        highlights: [{ pos: [index], kind: 'result', label: 'computed' }, ...childDeps],
        vars: { node: ids[index] ?? 0, height, through, best },
      },
    );
    return height;
  };

  dfs(0);

  rec.at(7).record(`The answer is ${best} — the diameter is measured in edges, not nodes.`, {
    codeLine: 7,
    highlights: [{ pos: [0], kind: 'result', label: 'answer' }],
    vars: { answer: best },
  });

  return [...rec.steps];
}

function tabulationSteps(raw: number[]): Step[] {
  const built = buildTree(raw);
  const rec = makeRecorder(built);
  const { left, right, value, ids } = built.tree;
  const heights: number[] = Array.from({ length: ids.length }, () => 0);
  let best = 0;

  rec.at(1).record(
    'Tabulation: unroll the post-order recursion. Every child is created after its parent in level order, so processing node-array positions from last to first guarantees both children are final before their parent.',
    {
      codeLine: 1,
      highlights: [{ pos: [ids.length - 1], kind: 'active', label: 'start at the last node' }],
      vars: { nodes: ids.length, best: 0 },
    },
  );

  for (let index = ids.length - 1; index >= 0; index -= 1) {
    const leftIndex = left[index] ?? null;
    const rightIndex = right[index] ?? null;
    const leftBranch = leftIndex === null ? 0 : (heights[leftIndex] ?? 0) + 1;
    const rightBranch = rightIndex === null ? 0 : (heights[rightIndex] ?? 0) + 1;
    const height = Math.max(leftBranch, rightBranch);
    const through = leftBranch + rightBranch;
    heights[index] = height;
    best = Math.max(best, through);

    const childDeps = [
      ...(leftIndex === null
        ? []
        : [{ pos: [leftIndex], kind: 'dependency' as const, label: 'left height' }]),
      ...(rightIndex === null
        ? []
        : [{ pos: [rightIndex], kind: 'dependency' as const, label: 'right height' }]),
    ];

    rec.at(6).update(
      (draft) => {
        const node = draft.nodes[index];
        if (node) {
          node.kind = 'done';
          node.values = { height, through };
        }
      },
      `Node ${ids[index] ?? 0} (value ${value[index] ?? 0}): left branch ${leftBranch}, right branch ${rightBranch}. Through it = ${through}; height = ${height}. Global best is now ${best}.`,
      {
        codeLine: 6,
        highlights: [{ pos: [index], kind: 'result', label: 'computed bottom-up' }, ...childDeps],
        vars: { node: ids[index] ?? 0, height, through, best },
      },
    );
  }

  rec.at(7).record(`The answer is ${best} — the diameter is measured in edges, not nodes.`, {
    codeLine: 7,
    highlights: [{ pos: [0], kind: 'result', label: 'answer' }],
    vars: { answer: best },
  });

  return [...rec.steps];
}

const treeDiameterModule: ProblemModule<TreeDiameterInput> = {
  id: 'tree-diameter',
  title: 'Binary Tree Diameter',
  category: 'tree',
  difficulty: 'medium',
  summary:
    'The diameter is the longest path between any two nodes, measured in edges. A post-order DFS returns each node\'s downward height and combines the left and right heights to test every path that bends at that node.',
  stateDefinition:
    'height[node] = longest downward path from node to a leaf in its subtree, in edges. through[node] = left height + right height, the longest path that passes through node and uses two different children.',
  recurrence:
    'height[leaf] = 0; height[node] = 1 + max(height[left], height[right]); through[node] = (left ? 1 + height[left] : 0) + (right ? 1 + height[right] : 0); answer = max over nodes of through[node].',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'treeDP',
  inputSchema: [
    {
      name: 'nodes',
      label: 'level-order tree',
      help: 'Level-order values with -1 for an empty slot. Up to seven slots keeps the tree readable.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_NODES,
      min: -1,
      max: 99,
    },
  ],
  defaultInput: { nodes: FALLBACK },
  modes: ['memo', 'tabulation'],
  generateSteps(input: TreeDiameterInput, mode: Mode): Step[] {
    const raw = normalizeLevelOrder(input);
    return mode === 'tabulation' ? tabulationSteps(raw) : diameterSteps(raw);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'What is the diameter of the default tree [1, 2, 3, 4, 5, -1, -1]?',
      options: ['3 edges', '2 edges', '4 edges', '5 edges'],
      answer: 0,
      why: 'The longest path is 4 -> 2 -> 1 -> 3 (or 5 -> 2 -> 1 -> 3), which uses 3 edges.',
    },
    {
      q: 'What does the DFS return for each node?',
      options: [
        'The longest downward path from that node to a leaf',
        'The number of nodes in its subtree',
        'The diameter of the whole tree',
        'The sum of its children\'s values',
      ],
      answer: 0,
      why: 'The height is what the parent needs to extend a path upward; the diameter through the node is computed as a side effect.',
    },
    {
      q: 'Why does the best path through a node use its two tallest children?',
      options: [
        'A path that bends at the node needs one downward branch on each side',
        'Because the left child is always taller',
        'Because the tree is sorted',
        'To avoid visiting the root twice',
      ],
      answer: 0,
      why: 'A simple path cannot branch more than once; at the highest node it uses exactly two downward branches, so their heights add.',
    },
    {
      q: 'What are the time and space complexities?',
      options: ['O(n) time, O(n) space', 'O(n²) time, O(n²) space', 'O(log n) time, O(1) space', 'O(n log n) time, O(n) space'],
      answer: 0,
      why: 'Every node is visited once post-order; the recursion stack and the stored heights use O(n) space.',
    },
  ],
  relatedIds: ['house-robber-iii', 'binary-tree-cameras', 'tree-rerooting'],
  lessonId: 'tree-dp',
};

export default treeDiameterModule;
