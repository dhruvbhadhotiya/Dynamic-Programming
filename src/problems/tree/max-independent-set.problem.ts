import { StepRecorder, clamp } from '../../engine/dpHelpers';
import type { Mode, ProblemModule, Step, TreeDPNode, TreeDPState } from '../../engine/types';

export interface MaxIndependentSetInput {
  parents: number[];
  values: number[];
}

const MAX_NODES = 7;
const FALLBACK = {
  parents: [-1, 0, 0, 2, 2],
  values: [3, 2, 3, 2, 1],
};

const pythonCode = [
  'def tree_mwis(weight, children, roots):',
  '    def dfs(node):',
  '        skip, take = 0, weight[node]',
  '        for child in children[node]:',
  '            child_skip, child_take = dfs(child)',
  '            skip += max(child_skip, child_take)',
  '            take += child_skip',
  '        return skip, take',
  '    answer = 0',
  '    for root in roots: answer += max(dfs(root))',
  '    return answer',
].join('\n');

const javascriptCode = [
  'function treeMwis(weight, children, roots) {',
  '  function dfs(node) {',
  '    let skip = 0, take = weight[node];',
  '    for (const child of children[node]) {',
  '      const [childSkip, childTake] = dfs(child);',
  '      skip += Math.max(childSkip, childTake);',
  '      take += childSkip; }',
  '    return [skip, take];',
  '  }',
  '  const answer = roots.reduce((total, root) => total + Math.max(...dfs(root)), 0);',
  '  return answer;',
  '}',
].join('\n');

const cppCode = [
  'int treeMwis(vector<int>& weight, vector<vector<int>>& children, vector<int>& roots) {',
  '  function<pair<int,int>(int)> dfs = [&](int node) {',
  '    int skip = 0, take = weight[node];',
  '    for (int child : children[node]) {',
  '      auto [childSkip, childTake] = dfs(child);',
  '      skip += max(childSkip, childTake);',
  '      take += childSkip; }',
  '    return make_pair(skip, take);',
  '  };',
  '  int answer = 0; for (int root : roots) { auto [s, t] = dfs(root); answer += max(s, t); }',
  '  return answer;',
  '}',
].join('\n');

interface BuiltTree {
  values: number[];
  children: number[][];
  roots: number[];
  nodes: TreeDPNode[];
}

function normalizeInput(input: MaxIndependentSetInput): { parents: number[]; values: number[] } {
  const rawParents = Array.isArray(input.parents) ? input.parents.slice(0, MAX_NODES) : [];
  const baseParents = rawParents.length > 0 ? rawParents : [...FALLBACK.parents];

  const parents = baseParents.map((value, index) => {
    if (index === 0) return -1;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return -1;
    return clamp(Math.trunc(value), 0, index - 1);
  });

  const rawValues = Array.isArray(input.values) ? input.values : [];
  const values = parents.map((_parent, index) => {
    const value = rawValues[index];
    return typeof value === 'number' && Number.isFinite(value) ? clamp(Math.trunc(value), 1, 9) : 1;
  });

  return { parents, values };
}

function buildTree(parents: number[], values: number[]): BuiltTree {
  const children: number[][] = Array.from({ length: parents.length }, () => []);
  const roots: number[] = [];
  const nodes: TreeDPNode[] = parents.map((parent, index) => {
    const node: TreeDPNode = {
      id: `n${index}`,
      label: `node ${index}: weight ${values[index] ?? 1}`,
      detail: parent < 0 ? 'root' : `parent ${parent}`,
      kind: 'pending',
    };
    if (parent >= 0) {
      children[parent]?.push(index);
      node.parentId = `n${parent}`;
    } else {
      roots.push(index);
    }
    return node;
  });

  return { values, children, roots, nodes };
}

function makeRecorder(tree: BuiltTree): StepRecorder<TreeDPState> {
  return new StepRecorder<TreeDPState>(
    {
      kind: 'treeDP',
      nodes: tree.nodes,
      caption:
        'Maximum weight independent set: skip = best without this node, take = weight + children skipped',
    },
    { codeLine: 1 },
  );
}

function childHighlights(tree: BuiltTree, node: number) {
  return (tree.children[node] ?? []).map((child) => ({
    pos: [child],
    kind: 'dependency' as const,
    label: 'child solved',
  }));
}

function memoSteps(tree: BuiltTree): Step[] {
  const rec = makeRecorder(tree);
  let visits = 0;

  rec.at(1).record(
    'Memoized post-order: node state is a pair (skip, take). skip means this node is not chosen, so each child may be chosen or skipped; take means this node is chosen, so every child must be skipped. Children are solved before the parent.',
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'root' }],
      vars: { nodes: tree.values.length, visits: 0 },
    },
  );

  const solve = (node: number): { skip: number; take: number } => {
    visits += 1;
    rec.at(4).record(
      `Visit node ${node} (weight ${tree.values[node] ?? 1}) and solve all ${tree.children[node]?.length ?? 0} child${tree.children[node]?.length === 1 ? '' : 'ren'} first.`,
      {
        codeLine: 4,
        highlights: [{ pos: [node], kind: 'active', label: 'visiting' }],
        vars: { node, visits },
      },
    );

    let skip = 0;
    let take = tree.values[node] ?? 1;
    for (const child of tree.children[node] ?? []) {
      const result = solve(child);
      skip += Math.max(result.skip, result.take);
      take += result.skip;
    }

    rec.at(8).update(
      (draft) => {
        const draftNode = draft.nodes[node];
        if (draftNode) {
          draftNode.kind = 'done';
          draftNode.values = { skip, take };
        }
      },
      `Node ${node}: skip = ${skip} (children are free to be chosen); take = ${tree.values[node] ?? 1} + ${take - (tree.values[node] ?? 1)} = ${take} (children must be skipped). Best here = ${Math.max(skip, take)}.`,
      {
        codeLine: 8,
        highlights: [
          { pos: [node], kind: 'result', label: 'pair computed' },
          ...childHighlights(tree, node),
        ],
        vars: { node, skip, take, visits },
      },
    );

    return { skip, take };
  };

  let answer = 0;
  const rootResults = tree.roots.map((root) => {
    const result = solve(root);
    answer += Math.max(result.skip, result.take);
    return { root, ...result };
  });

  rec.at(11).record(
    `The answer is ${answer} — sum the better of skip/take over every root (${tree.roots.join(', ')}), so no two chosen nodes share an edge.`,
    {
      codeLine: 11,
      highlights: tree.roots.map((root) => ({
        pos: [root],
        kind: 'result' as const,
        label: 'root contribution',
      })),
      vars: { answer, roots: tree.roots.join(', '), rootResults: JSON.stringify(rootResults) },
    },
  );

  return [...rec.steps];
}

function tabulationSteps(tree: BuiltTree): Step[] {
  const rec = makeRecorder(tree);
  const count = tree.values.length;
  const skip = new Array<number>(count).fill(0);
  const take = new Array<number>(count).fill(0);

  rec.at(1).record(
    'Bottom-up tabulation: parents always come before their children in the input, so scanning node indices from last to first solves every child before its parent. Each node stores skip and take.',
    {
      codeLine: 1,
      highlights: [{ pos: [count - 1], kind: 'active', label: 'start at the last node' }],
      vars: { nodes: count },
    },
  );

  for (let node = count - 1; node >= 0; node -= 1) {
    let skipValue = 0;
    let takeValue = tree.values[node] ?? 1;

    for (const child of tree.children[node] ?? []) {
      skipValue += Math.max(skip[child] ?? 0, take[child] ?? 0);
      takeValue += skip[child] ?? 0;
    }

    skip[node] = skipValue;
    take[node] = takeValue;

    rec.at(6).update(
      (draft) => {
        const draftNode = draft.nodes[node];
        if (draftNode) {
          draftNode.kind = 'done';
          draftNode.values = { skip: skipValue, take: takeValue };
        }
      },
      `Node ${node}: skip = ${skipValue}; take = weight ${tree.values[node] ?? 1} plus skipped children = ${takeValue}. Both child states were already final because children have larger indices.`,
      {
        codeLine: 6,
        highlights: [
          { pos: [node], kind: 'result', label: 'computed bottom-up' },
          ...childHighlights(tree, node),
        ],
        vars: { node, skip: skipValue, take: takeValue },
      },
    );
  }

  let answer = 0;
  for (const root of tree.roots) answer += Math.max(skip[root] ?? 0, take[root] ?? 0);

  rec.at(11).record(
    `The answer is ${answer} — the best independent set is the sum of max(skip, take) over the roots (${tree.roots.join(', ')}).`,
    {
      codeLine: 11,
      highlights: tree.roots.map((root) => ({
        pos: [root],
        kind: 'result' as const,
        label: `max(${skip[root] ?? 0}, ${take[root] ?? 0})`,
      })),
      vars: { answer, roots: tree.roots.join(', ') },
    },
  );

  return [...rec.steps];
}

const maxIndependentSetModule: ProblemModule<MaxIndependentSetInput> = {
  id: 'max-independent-set',
  title: 'Maximum Independent Set on Tree',
  category: 'tree',
  difficulty: 'medium',
  summary:
    'Choose nodes with no edge between two chosen nodes while maximising total weight. Each node carries two values: the best total when it is skipped and the best total when it is taken. A chosen node forces every child to be skipped.',
  stateDefinition:
    'skip[node] = best total weight in the subtree when node is not chosen; take[node] = weight[node] + sum of skip[child] over all children. Answer = sum over roots of max(skip[root], take[root]).',
  recurrence:
    'skip[node] = sum over children c of max(skip[c], take[c]); take[node] = weight[node] + sum over children c of skip[c].',
  complexity: { time: 'O(n)', space: 'O(n)' },
  renderer: 'treeDP',
  inputSchema: [
    {
      name: 'parents',
      label: 'parent array',
      help: 'Parent index for each node; -1 marks a root. A parent must appear before its children. Up to seven nodes.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_NODES,
      min: -1,
      max: MAX_NODES - 1,
    },
    {
      name: 'values',
      label: 'node weights',
      help: 'Positive weight for each node, in the same order as the parent array.',
      type: 'array',
      itemType: 'number',
      minItems: 1,
      maxItems: MAX_NODES,
      min: 1,
      max: 9,
    },
  ],
  defaultInput: FALLBACK,
  modes: ['memo', 'tabulation'],
  generateSteps(input: MaxIndependentSetInput, mode: Mode): Step[] {
    const { parents, values } = normalizeInput(input);
    const tree = buildTree(parents, values);
    return mode === 'tabulation' ? tabulationSteps(tree) : memoSteps(tree);
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the default tree, what is the maximum independent-set weight?',
      options: ['6', '5', '7', '4'],
      answer: 0,
      why: 'Choose node 0 with grandchildren 3 and 4 (weight 3 + 2 + 1 = 6); node 0 is not adjacent to a grandchild. Choosing nodes 1 and 2 gives only 5.',
    },
    {
      q: 'What does take[node] equal?',
      options: [
        'weight[node] + sum of skip[child] over every child',
        'weight[node] + sum of take[child] over every child',
        'The maximum of skip and take in the subtree',
        'The number of children of node',
      ],
      answer: 0,
      why: 'Taking a node forbids every child, so each child must contribute its skip value.',
    },
    {
      q: 'What does skip[node] equal?',
      options: [
        'Sum over children of max(skip[child], take[child])',
        'Sum over children of take[child] only',
        'The weight of the lightest child',
        'Zero whenever the node has children',
      ],
      answer: 0,
      why: 'If node is skipped, each child is independent and may be either taken or skipped, so we take the better option per child.',
    },
    {
      q: 'Why does bottom-up tabulation scan nodes from last to first?',
      options: [
        'Every parent index is smaller than its children, so children are computed first',
        'Weights are sorted descending',
        'It finds the heaviest node first',
        'The renderer draws trees right to left',
      ],
      answer: 0,
      why: 'A child only reads its own children, which have larger indices. Reverse index order is therefore a valid post-order.',
    },
  ],
  relatedIds: ['tree-diameter', 'house-robber-iii', 'binary-tree-cameras'],
  lessonId: 'tree-dp',
};

export default maxIndependentSetModule;
