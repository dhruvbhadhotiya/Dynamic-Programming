import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, TreeDPNode, TreeDPState } from '../../engine/types';

export interface HouseRobberIiiInput {
  nodes: number[];
}

const MAX_NODES = 7;
const FALLBACK = [3, 2, 3, -1, 3, -1, 1];

const pythonCode = [
  'def rob(root):',
  '    def dfs(node):',
  '        if not node: return (0, 0)',
  '        rob_left, skip_left = dfs(node.left)',
  '        rob_right, skip_right = dfs(node.right)',
  '        rob = node.val + skip_left + skip_right',
  '        skip = max(rob_left, skip_left) + max(rob_right, skip_right)',
  '        return rob, skip',
  '    rob_root, skip_root = dfs(root)',
  '    return max(rob_root, skip_root)',
].join('\n');

const javascriptCode = [
  'function rob(root) {',
  '  function dfs(node) {',
  '    if (!node) return [0, 0];',
  '    const [robLeft, skipLeft] = dfs(node.left);',
  '    const [robRight, skipRight] = dfs(node.right);',
  '    const rob = node.val + skipLeft + skipRight;',
  '    const skip = Math.max(robLeft, skipLeft) + Math.max(robRight, skipRight);',
  '    return [rob, skip];',
  '  }',
  '  const [robRoot, skipRoot] = dfs(root); return Math.max(robRoot, skipRoot);',
  '}',
].join('\n');

const cppCode = [
  'int rob(TreeNode* root) {',
  '  function<pair<int,int>(TreeNode*)> dfs = [&](TreeNode* node) {',
  '    if (!node) return make_pair(0, 0);',
  '    auto [robLeft, skipLeft] = dfs(node->left);',
  '    auto [robRight, skipRight] = dfs(node->right);',
  '    int rob = node->val + skipLeft + skipRight;',
  '    int skip = max(robLeft, skipLeft) + max(robRight, skipRight);',
  '    return make_pair(rob, skip);',
  '  };',
  '  auto [robRoot, skipRoot] = dfs(root); return max(robRoot, skipRoot);',
  '}',
].join('\n');

interface RobberTree {
  values: number[];
  left: Array<number | null>;
  right: Array<number | null>;
  ids: number[];
  nodes: TreeDPNode[];
}

function normalizeNodes(input: HouseRobberIiiInput): number[] {
  const raw = Array.isArray(input.nodes) ? input.nodes.slice(0, MAX_NODES) : [];
  if (raw.length === 0) return [...FALLBACK];
  if (typeof raw[0] !== 'number' || !Number.isFinite(raw[0]) || raw[0] < 0) {
    return [...FALLBACK];
  }
  return raw;
}

function buildTree(raw: number[]): RobberTree {
  const exists: boolean[] = [];
  const values: number[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    if (index === 0) {
      exists.push(true);
      values.push(clamp(Math.trunc(raw[0] ?? 0), 0, 99));
      continue;
    }
    const parent = Math.floor((index - 1) / 2);
    const value = raw[index];
    const valid =
      exists[parent] === true &&
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0;
    exists.push(valid);
    values.push(valid ? clamp(Math.trunc(value), 0, 99) : -1);
  }

  const ids: number[] = [];
  const value: number[] = [];
  const nodeIndexByLevel = new Map<number, number>();

  for (let index = 0; index < exists.length; index += 1) {
    if (!exists[index]) continue;
    nodeIndexByLevel.set(index, ids.length);
    ids.push(index);
    value.push(values[index] ?? 0);
  }

  const left: Array<number | null> = Array.from({ length: ids.length }, () => null);
  const right: Array<number | null> = Array.from({ length: ids.length }, () => null);

  for (let index = 1; index < exists.length; index += 1) {
    if (!exists[index]) continue;
    const parentLevel = Math.floor((index - 1) / 2);
    const parentNode = nodeIndexByLevel.get(parentLevel);
    const childNode = nodeIndexByLevel.get(index);
    if (parentNode === undefined || childNode === undefined) continue;
    if (index % 2 === 1) left[parentNode] = childNode;
    else right[parentNode] = childNode;
  }

  const nodes: TreeDPNode[] = ids.map((level, nodeIndex) => {
    const parentLevel = level === 0 ? null : Math.floor((level - 1) / 2);
    const parentNode = parentLevel === null ? null : nodeIndexByLevel.get(parentLevel);
    const node: TreeDPNode = {
      id: `n${level}`,
      label: `node ${level}: $${value[nodeIndex] ?? 0}`,
      detail: parentNode === null || parentNode === undefined ? 'root' : `parent ${ids[parentNode] ?? 0}`,
      kind: 'pending',
    };
    if (parentNode !== null && parentNode !== undefined) node.parentId = `n${ids[parentNode] ?? 0}`;
    return node;
  });

  return { values: value, left, right, ids, nodes };
}

function makeRecorder(tree: RobberTree): StepRecorder<TreeDPState> {
  return new StepRecorder<TreeDPState>(
    {
      kind: 'treeDP',
      nodes: tree.nodes,
      caption:
        'House Robber III: rob[node] = value + skipped children; skip[node] = max(rob, skip) per child',
    },
    { codeLine: 1 },
  );
}

function childHighlights(tree: RobberTree, index: number) {
  return [tree.left[index] ?? null, tree.right[index] ?? null]
    .filter((child): child is number => child !== null)
    .map((child) => ({ pos: [child], kind: 'dependency' as const, label: 'child pair' }));
}

function memoSteps(tree: RobberTree): Step[] {
  const rec = makeRecorder(tree);
  let visits = 0;

  rec.at(1).record(
    'Post-order walk: each subtree returns two numbers. rob = money if this node is robbed (children must be skipped); skip = best money if this node is not robbed (each child is free).',
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'root' }],
      vars: { nodes: tree.values.length, visits: 0 },
    },
  );

  const dfs = (index: number): { rob: number; skip: number } => {
    visits += 1;
    rec.at(4).record(
      `Visit node ${tree.ids[index] ?? 0} ($${tree.values[index] ?? 0}) and solve both child subtrees before deciding whether to rob it.`,
      {
        codeLine: 4,
        highlights: [{ pos: [index], kind: 'active', label: 'visiting' }],
        vars: { node: tree.ids[index] ?? 0, visits },
      },
    );

    const leftIndex = tree.left[index] ?? null;
    const rightIndex = tree.right[index] ?? null;
    const left = leftIndex === null ? { rob: 0, skip: 0 } : dfs(leftIndex);
    const right = rightIndex === null ? { rob: 0, skip: 0 } : dfs(rightIndex);

    const rob = (tree.values[index] ?? 0) + left.skip + right.skip;
    const skip =
      Math.max(left.rob, left.skip) + Math.max(right.rob, right.skip);

    rec.at(8).update(
      (draft) => {
        const node = draft.nodes[index];
        if (node) {
          node.kind = 'done';
          node.values = { rob, skip };
        }
      },
      `Node ${tree.ids[index] ?? 0}: rob = $${tree.values[index] ?? 0} + ${left.skip} + ${right.skip} = ${rob}; skip = max(${left.rob}, ${left.skip}) + max(${right.rob}, ${right.skip}) = ${skip}. Best here = ${Math.max(rob, skip)}.`,
      {
        codeLine: 8,
        highlights: [
          { pos: [index], kind: 'result', label: 'pair computed' },
          ...childHighlights(tree, index),
        ],
        vars: { node: tree.ids[index] ?? 0, rob, skip, visits },
      },
    );

    return { rob, skip };
  };

  const root = dfs(0);
  const answer = Math.max(root.rob, root.skip);

  rec.at(10).record(
    `The answer is ${answer} — the root is either robbed (${root.rob}) or skipped (${root.skip}), and we take the better plan.`,
    {
      codeLine: 10,
      highlights: [{ pos: [0], kind: 'result', label: 'answer' }],
      vars: { answer, robRoot: root.rob, skipRoot: root.skip },
    },
  );

  return [...rec.steps];
}

function tabulationSteps(tree: RobberTree): Step[] {
  const rec = makeRecorder(tree);
  const count = tree.values.length;
  const rob = new Array<number>(count).fill(0);
  const skip = new Array<number>(count).fill(0);

  rec.at(1).record(
    'Bottom-up tabulation: children are created after their parent in level order, so scanning node-array indices from last to first computes every child pair before its parent. No recursion stack is needed.',
    {
      codeLine: 1,
      highlights: [{ pos: [count - 1], kind: 'active', label: 'start at the last node' }],
      vars: { nodes: count },
    },
  );

  for (let index = count - 1; index >= 0; index -= 1) {
    const leftIndex = tree.left[index] ?? null;
    const rightIndex = tree.right[index] ?? null;
    const leftRob = leftIndex === null ? 0 : (rob[leftIndex] ?? 0);
    const leftSkip = leftIndex === null ? 0 : (skip[leftIndex] ?? 0);
    const rightRob = rightIndex === null ? 0 : (rob[rightIndex] ?? 0);
    const rightSkip = rightIndex === null ? 0 : (skip[rightIndex] ?? 0);

    rob[index] = (tree.values[index] ?? 0) + leftSkip + rightSkip;
    skip[index] = Math.max(leftRob, leftSkip) + Math.max(rightRob, rightSkip);

    rec.at(8).update(
      (draft) => {
        const node = draft.nodes[index];
        if (node) {
          node.kind = 'done';
          node.values = { rob: rob[index] ?? 0, skip: skip[index] ?? 0 };
        }
      },
      `Node ${tree.ids[index] ?? 0}: rob = $${tree.values[index] ?? 0} + ${leftSkip} + ${rightSkip} = ${rob[index] ?? 0}; skip = ${Math.max(leftRob, leftSkip)} + ${Math.max(rightRob, rightSkip)} = ${skip[index] ?? 0}. Children were already final.`,
      {
        codeLine: 8,
        highlights: [
          { pos: [index], kind: 'result', label: 'computed bottom-up' },
          ...childHighlights(tree, index),
        ],
        vars: {
          node: tree.ids[index] ?? 0,
          rob: rob[index] ?? 0,
          skip: skip[index] ?? 0,
        },
      },
    );
  }

  const answer = Math.max(rob[0] ?? 0, skip[0] ?? 0);

  rec.at(10).record(
    `The answer is ${answer} — max(rob root ${rob[0] ?? 0}, skip root ${skip[0] ?? 0}) is the best legal haul.`,
    {
      codeLine: 10,
      highlights: [{ pos: [0], kind: 'result', label: 'answer' }],
      vars: { answer, robRoot: rob[0] ?? 0, skipRoot: skip[0] ?? 0 },
    },
  );

  return [...rec.steps];
}

const houseRobberIiiModule: ProblemModule<HouseRobberIiiInput> = {
  id: 'house-robber-iii',
  title: 'House Robber III',
  category: 'tree',
  difficulty: 'medium',
  summary:
    'Houses form a binary tree, and robbing a node forbids robbing its immediate children. A post-order DFS returns two totals per subtree: the best haul with the node robbed and the best haul with it skipped.',
  stateDefinition:
    'rob[node] = value[node] + skip[left] + skip[right]; skip[node] = max(rob[left], skip[left]) + max(rob[right], skip[right]). Missing children contribute 0.',
  recurrence:
    'rob[leaf] = value[leaf], skip[leaf] = 0; answer = max(rob[root], skip[root]).',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'treeDP',
  inputSchema: [
    {
      name: 'nodes',
      label: 'level-order tree',
      help: 'Level-order house values with -1 for an empty slot. Up to seven slots keeps every pair visible.',
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
  generateSteps(input: HouseRobberIiiInput, mode: Mode): Step[] {
    const tree = buildTree(normalizeNodes(input));
    return mode === 'tabulation' ? tabulationSteps(tree) : memoSteps(tree);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the default tree [3, 2, 3, -1, 3, -1, 1], what is the maximum haul?',
      options: ['7', '6', '9', '8'],
      answer: 0,
      why: 'Robbing the root (3) together with grandchildren node 4 (3) and node 6 (1) gives 7; the root and its grandchildren are not adjacent. Robbing nodes 1 and 2 gives only 5.',
    },
    {
      q: 'What does skip[node] contain?',
      options: [
        'The best haul from the subtree when node is not robbed',
        'The best haul when node is robbed',
        'The number of skipped children',
        'The value of the lightest child',
      ],
      answer: 0,
      why: 'When a node is skipped, each child may be robbed or skipped independently, so we add max(rob, skip) for both children.',
    },
    {
      q: 'Why does rob[node] add skip values from the children?',
      options: [
        'Robbing a node forbids robbing its immediate children',
        'Children are always worth more than parents',
        'The tree is sorted by value',
        'Skip values include the grandchildren automatically',
      ],
      answer: 0,
      why: 'The only restriction is parent-child adjacency, so a robbed node forces each child to be skipped; grandchildren are handled inside those child subtrees.',
    },
    {
      q: 'What are the time and space complexities?',
      options: ['O(n) time, O(n) space', 'O(n²) time, O(n²) space', 'O(n log n) time, O(1) space', 'O(2^n) time, O(n) space'],
      answer: 0,
      why: 'Each node is visited once and stores two numbers; the recursion stack is O(n) in the worst case.',
    },
  ],
  relatedIds: ['max-independent-set', 'tree-diameter', 'binary-tree-cameras'],
  lessonId: 'tree-dp',
};

export default houseRobberIiiModule;
