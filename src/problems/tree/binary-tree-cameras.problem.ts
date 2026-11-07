import { StepRecorder } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, TreeDPNode, TreeDPState } from '../../engine/types';

export interface BinaryTreeCamerasInput {
  nodes: number[];
}

const MAX_NODES = 7;
const FALLBACK = [0, 0, -1, 0, 0];

const pythonCode = [
  'def min_cameras(root):',
  '    cameras = 0',
  '    def dfs(node):',
  '        if not node: return 1',
  '        left, right = dfs(node.left), dfs(node.right)',
  '        if left == 0 or right == 0:',
  '            nonlocal cameras; cameras += 1; return 2',
  '        if left == 2 or right == 2: return 1',
  '        return 0',
  '    # 0 = needs coverage, 1 = covered, 2 = has a camera',
  '    state = dfs(root)',
  '    # an uncovered root needs one final camera',
  '    return cameras + (1 if state == 0 else 0)',
].join('\n');

const javascriptCode = [
  'function minCameras(root) {',
  '  let cameras = 0;',
  '  function dfs(node) {',
  '    if (!node) return 1;',
  '    const left = dfs(node.left), right = dfs(node.right);',
  '    if (left === 0 || right === 0) {',
  '      cameras++; return 2;',
  '    }',
  '    if (left === 2 || right === 2) return 1;',
  '    return 0;',
  '  }',
  '  // 0 = needs coverage, 1 = covered, 2 = has a camera',
  '  const state = dfs(root); return cameras + (state === 0 ? 1 : 0);',
  '}',
].join('\n');

const cppCode = [
  'int minCameras(TreeNode* root) {',
  '  int cameras = 0;',
  '  function<int(TreeNode*)> dfs = [&](TreeNode* node) {',
  '    if (!node) return 1;',
  '    int left = dfs(node->left), right = dfs(node->right);',
  '    if (left == 0 || right == 0) {',
  '      cameras++; return 2;',
  '    }',
  '    if (left == 2 || right == 2) return 1;',
  '    return 0;',
  '  };',
  '  // 0 = needs coverage, 1 = covered, 2 = has a camera',
  '  int state = dfs(root); return cameras + (state == 0 ? 1 : 0);',
  '}',
].join('\n');

type CameraState = 'NEEDS' | 'COVERED' | 'CAMERA';

interface CameraTree {
  values: number[];
  left: Array<number | null>;
  right: Array<number | null>;
  ids: number[];
  nodes: TreeDPNode[];
}

function normalizeNodes(input: BinaryTreeCamerasInput): number[] {
  const raw = Array.isArray(input.nodes) ? input.nodes.slice(0, MAX_NODES) : [];
  if (raw.length === 0) return [...FALLBACK];
  if (typeof raw[0] !== 'number' || !Number.isFinite(raw[0]) || raw[0] < 0) {
    return [...FALLBACK];
  }
  return raw;
}

function buildTree(raw: number[]): CameraTree {
  const exists: boolean[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    if (index === 0) {
      exists.push(true);
      continue;
    }
    const parent = Math.floor((index - 1) / 2);
    const value = raw[index];
    exists.push(
      exists[parent] === true &&
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0,
    );
  }

  const ids: number[] = [];
  const values: number[] = [];
  const nodeIndexByLevel = new Map<number, number>();

  for (let index = 0; index < exists.length; index += 1) {
    if (!exists[index]) continue;
    nodeIndexByLevel.set(index, ids.length);
    ids.push(index);
    values.push(0);
  }

  const left: Array<number | null> = Array.from({ length: ids.length }, () => null);
  const right: Array<number | null> = Array.from({ length: ids.length }, () => null);

  for (let index = 1; index < exists.length; index += 1) {
    if (!exists[index]) continue;
    const parentNode = nodeIndexByLevel.get(Math.floor((index - 1) / 2));
    const childNode = nodeIndexByLevel.get(index);
    if (parentNode === undefined || childNode === undefined) continue;
    if (index % 2 === 1) left[parentNode] = childNode;
    else right[parentNode] = childNode;
  }

  const nodes: TreeDPNode[] = ids.map((level) => {
    const parentLevel = level === 0 ? null : Math.floor((level - 1) / 2);
    const parentNode = parentLevel === null ? null : nodeIndexByLevel.get(parentLevel);
    const node: TreeDPNode = {
      id: `n${level}`,
      label: `node ${level}`,
      detail: parentNode === null || parentNode === undefined ? 'root' : `parent ${ids[parentNode] ?? 0}`,
      kind: 'pending',
    };
    if (parentNode !== null && parentNode !== undefined) node.parentId = `n${ids[parentNode] ?? 0}`;
    return node;
  });

  return { values, left, right, ids, nodes };
}

function makeRecorder(tree: CameraTree): StepRecorder<TreeDPState> {
  return new StepRecorder<TreeDPState>(
    {
      kind: 'treeDP',
      nodes: tree.nodes,
      caption:
        'Binary tree cameras: NEEDS = uncovered, COVERED = no camera but covered, CAMERA = camera placed here',
    },
    { codeLine: 1 },
  );
}

function childHighlights(tree: CameraTree, index: number) {
  return [tree.left[index] ?? null, tree.right[index] ?? null]
    .filter((child): child is number => child !== null)
    .map((child) => ({ pos: [child], kind: 'dependency' as const, label: 'child state' }));
}

function stateName(state: number): CameraState {
  return state === 2 ? 'CAMERA' : state === 1 ? 'COVERED' : 'NEEDS';
}

function recordNode(
  rec: StepRecorder<TreeDPState>,
  tree: CameraTree,
  index: number,
  state: number,
  cameras: number,
): void {
  const name = stateName(state);
  const line = state === 2 ? 7 : state === 1 ? 9 : 10;
  rec.at(line).update(
    (draft) => {
      const node = draft.nodes[index];
      if (node) {
        node.kind = 'done';
        node.values = { state: name };
      }
    },
    state === 2
      ? `Node ${tree.ids[index] ?? 0}: a child still NEEDS coverage, so place a camera here (${cameras} total). Returning CAMERA covers this node, its parent and its children.`
      : state === 1
        ? `Node ${tree.ids[index] ?? 0}: a child already has a CAMERA, so this node is covered without one. Return COVERED.`
        : `Node ${tree.ids[index] ?? 0}: both children are COVERED or absent, so this node is not covered yet. Return NEEDS and let the parent place a camera.`,
    {
      codeLine: line,
      highlights: [{ pos: [index], kind: state === 2 ? 'base' : 'result', label: name }, ...childHighlights(tree, index)],
      vars: { node: tree.ids[index] ?? 0, state: name, cameras },
    },
  );
}

function memoSteps(tree: CameraTree): Step[] {
  const rec = makeRecorder(tree);
  let cameras = 0;

  rec.at(1).record(
    'Post-order greedy with three states. 0/NEEDS means the node is not covered and must be covered by its parent. 1/COVERED means it is covered and has no camera. 2/CAMERA means a camera sits here. A null child counts as COVERED.',
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'root' }],
      vars: { nodes: tree.values.length, cameras: 0 },
    },
  );

  const dfs = (index: number): number => {
    rec.at(5).record(
      `Visit node ${tree.ids[index] ?? 0}: solve the left and right children before classifying this node.`,
      {
        codeLine: 5,
        highlights: [{ pos: [index], kind: 'active', label: 'visiting' }],
        vars: { node: tree.ids[index] ?? 0, cameras },
      },
    );

    const leftIndex = tree.left[index] ?? null;
    const rightIndex = tree.right[index] ?? null;
    const left = leftIndex === null ? 1 : dfs(leftIndex);
    const right = rightIndex === null ? 1 : dfs(rightIndex);

    let state: number;
    if (left === 0 || right === 0) {
      cameras += 1;
      state = 2;
    } else if (left === 2 || right === 2) {
      state = 1;
    } else {
      state = 0;
    }

    recordNode(rec, tree, index, state, cameras);
    return state;
  };

  const rootState = dfs(0);
  if (rootState === 0) {
    cameras += 1;
    rec.at(13).update(
      (draft) => {
        const root = draft.nodes[0];
        if (root) {
          root.kind = 'done';
          root.values = { state: 'CAMERA (root)' };
        }
      },
      `The root is still NEEDS, so one final camera must be placed at the root (${cameras} total). No parent exists to cover it.`,
      {
        codeLine: 13,
        highlights: [{ pos: [0], kind: 'base', label: 'final camera' }],
        vars: { state: 'CAMERA (root)', cameras },
      },
    );
  }

  rec.at(13).record(
    `The answer is ${cameras} — the minimum number of cameras that covers every node.`,
    {
      codeLine: 13,
      highlights: [{ pos: [0], kind: 'result', label: 'answer' }],
      vars: { answer: cameras },
    },
  );

  return [...rec.steps];
}

function tabulationSteps(tree: CameraTree): Step[] {
  const rec = makeRecorder(tree);
  const count = tree.values.length;
  const states = new Array<number>(count).fill(1);
  let cameras = 0;

  rec.at(1).record(
    'Bottom-up tabulation: children have larger node-array indices than their parent, so reverse index order processes both children before the parent. The same three-state greedy rule then runs without recursion.',
    {
      codeLine: 1,
      highlights: [{ pos: [count - 1], kind: 'active', label: 'start at the last node' }],
      vars: { nodes: count, cameras: 0 },
    },
  );

  for (let index = count - 1; index >= 0; index -= 1) {
    const leftIndex = tree.left[index] ?? null;
    const rightIndex = tree.right[index] ?? null;
    const left = leftIndex === null ? 1 : (states[leftIndex] ?? 1);
    const right = rightIndex === null ? 1 : (states[rightIndex] ?? 1);

    if (left === 0 || right === 0) {
      cameras += 1;
      states[index] = 2;
    } else if (left === 2 || right === 2) {
      states[index] = 1;
    } else {
      states[index] = 0;
    }

    recordNode(rec, tree, index, states[index] ?? 0, cameras);
  }

  if ((states[0] ?? 0) === 0) {
    cameras += 1;
    rec.at(13).update(
      (draft) => {
        const root = draft.nodes[0];
        if (root) {
          root.kind = 'done';
          root.values = { state: 'CAMERA (root)' };
        }
      },
      `The root is still NEEDS, so place the final camera at the root (${cameras} total).`,
      {
        codeLine: 13,
        highlights: [{ pos: [0], kind: 'base', label: 'final camera' }],
        vars: { state: 'CAMERA (root)', cameras },
      },
    );
  }

  rec.at(13).record(
    `The answer is ${cameras} — every node is covered and no smaller camera set works.`,
    {
      codeLine: 13,
      highlights: [{ pos: [0], kind: 'result', label: 'answer' }],
      vars: { answer: cameras },
    },
  );

  return [...rec.steps];
}

const binaryTreeCamerasModule: ProblemModule<BinaryTreeCamerasInput> = {
  id: 'binary-tree-cameras',
  title: 'Binary Tree Cameras',
  category: 'tree',
  difficulty: 'hard',
  summary:
    'Place the fewest cameras so every node is covered by a camera at itself, its parent, or one of its children. A post-order greedy returns three states and places a camera only when a child is still uncovered.',
  stateDefinition:
    'Need = 0: this node is uncovered and needs its parent. Covered = 1: this node is covered without a camera. Camera = 2: this node has a camera. A missing child counts as Covered.',
  recurrence:
    'If either child is Need, place a camera here (Camera, count++). Else if either child has a Camera, return Covered. Else return Need. If the root ends as Need, add one final camera.',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'treeDP',
  inputSchema: [
    {
      name: 'nodes',
      label: 'level-order tree',
      help: 'Level-order slots: 0 (or any non-negative number) is a node, -1 is an empty slot. Up to seven slots.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_NODES,
      min: -1,
      max: 9,
    },
  ],
  defaultInput: { nodes: FALLBACK },
  modes: ['memo', 'tabulation'],
  generateSteps(input: BinaryTreeCamerasInput, mode: Mode): Step[] {
    const tree = buildTree(normalizeNodes(input));
    return mode === 'tabulation' ? tabulationSteps(tree) : memoSteps(tree);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the default tree [0, 0, -1, 0, 0], how many cameras are needed?',
      options: ['1', '2', '3', '4'],
      answer: 0,
      why: 'One camera at node 1 covers itself, its parent root 0, and both leaves 3 and 4.',
    },
    {
      q: 'What does state 0 (NEEDS) mean?',
      options: [
        'The node is not covered yet and must be covered by its parent',
        'The node has a camera',
        'The node is a leaf',
        'The node is already covered without a camera',
      ],
      answer: 0,
      why: 'A node returns NEEDS only when it has no camera and no child camera covers it; the parent is the only remaining place that can cover it.',
    },
    {
      q: 'Why place the camera at the parent when a child returns NEEDS?',
      options: [
        'That camera also covers the parent and the child\'s sibling, so it is never worse',
        'Because parents always have larger indices',
        'Because leaves cannot be covered by children',
        'To keep the recursion balanced',
      ],
      answer: 0,
      why: 'Placing the camera one level above the uncovered child covers strictly more nodes, so the greedy choice is optimal in a tree.',
    },
    {
      q: 'What are the time and space complexities?',
      options: ['O(n) time, O(n) space', 'O(n²) time, O(n²) space', 'O(n log n) time, O(1) space', 'O(2^n) time, O(n) space'],
      answer: 0,
      why: 'Each node is classified once and stores one state; recursion or the state array uses O(n) space.',
    },
  ],
  relatedIds: ['house-robber-iii', 'max-independent-set', 'tree-diameter'],
  lessonId: 'tree-dp',
};

export default binaryTreeCamerasModule;
