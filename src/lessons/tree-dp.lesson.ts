import { StepRecorder } from '../engine/dpHelpers';
import type { Lesson } from '../engine/lessonTypes';
import type { Step, TreeDPNode, TreeDPState } from '../engine/types';

interface RobPair {
  rob: number;
  skip: number;
}

function buildDiagramSteps(): Step[] {
  const nodes: TreeDPNode[] = [
    { id: 'n0', label: 'node 0: $3', detail: 'root', kind: 'pending' },
    { id: 'n1', parentId: 'n0', label: 'node 1: $2', detail: 'parent 0', kind: 'pending' },
    { id: 'n2', parentId: 'n0', label: 'node 2: $3', detail: 'parent 0', kind: 'pending' },
    { id: 'n3', parentId: 'n1', label: 'node 3: $4', detail: 'parent 1', kind: 'pending' },
    { id: 'n4', parentId: 'n1', label: 'node 4: $3', detail: 'parent 1', kind: 'pending' },
    { id: 'n5', parentId: 'n2', label: 'node 5: $1', detail: 'parent 2', kind: 'pending' },
    { id: 'n6', parentId: 'n2', label: 'node 6: $1', detail: 'parent 2', kind: 'pending' },
  ];

  const rec = new StepRecorder<TreeDPState>(
    {
      kind: 'treeDP',
      nodes,
      caption:
        'House Robber walkthrough: every node returns (rob, skip) for its own subtree; values are shown after each post-order return',
    },
    { codeLine: 1 },
  );

  rec.at(1).record(
    'Tree DP walkthrough on a complete 7-node tree with values 3, 2, 3, 4, 3, 1, 1. Each node returns a small summary pair (rob, skip) for the subtree rooted there. The parent can only be solved after both children report, so the order is post-order: leaves first, root last.',
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active', label: 'root will wait for children' }],
      vars: { nodes: 7, answer: 0 },
    },
  );

  const order: Array<{ index: number; pair: RobPair }> = [
    { index: 3, pair: { rob: 4, skip: 0 } },
    { index: 4, pair: { rob: 3, skip: 0 } },
    { index: 1, pair: { rob: 2, skip: 7 } },
    { index: 5, pair: { rob: 1, skip: 0 } },
    { index: 6, pair: { rob: 1, skip: 0 } },
    { index: 2, pair: { rob: 3, skip: 2 } },
    { index: 0, pair: { rob: 12, skip: 10 } },
  ];

  for (const { index, pair } of order) {
    const label = index === 0 ? 'root pair' : 'subtree pair';
    rec.at(3).update(
      (draft) => {
        const node = draft.nodes[index];
        if (node) {
          node.kind = 'done';
          node.values = { rob: pair.rob, skip: pair.skip };
        }
      },
      `Node ${index} returns rob = ${pair.rob}, skip = ${pair.skip}. ${
        index === 3 || index === 4 || index === 5 || index === 6
          ? 'A leaf has no children, so rob is just its own value and skip is 0.'
          : index === 1
            ? 'Children 3 and 4 must be skipped when node 1 is robbed; otherwise each child contributes its better pair.'
            : index === 2
              ? 'Children 5 and 6 are identical leaves, so robbing node 2 beats both child pairs.'
              : 'The root combines the two child subtrees: rob the root plus skipped children, or skip it and take the better child pair on each side.'
      }`,
      {
        codeLine: 3,
        highlights: [{ pos: [index], kind: 'result', label }],
        vars: { node: index, rob: pair.rob, skip: pair.skip },
      },
    );
  }

  rec.at(4).record(
    'The answer is 12 = max(rob 12, skip 10). Robbing root 0 together with grandchildren 3, 4, 5 and 6 gives 3 + 4 + 3 + 1 + 1 = 12. Notice that the root never needed to know the shape of the whole tree — only the two numbers each child reported.',
    {
      codeLine: 4,
      highlights: [{ pos: [0], kind: 'result', label: 'answer 12' }],
      vars: { answer: 12, robRoot: 12, skipRoot: 10 },
    },
  );

  return [...rec.steps];
}

const lesson: Lesson = {
  id: 'tree-dp',
  title: 'Tree DP: Solve Subtrees, Then Combine',
  category: 'tree',
  summary:
    'Tree DP turns a recursive tree walk into a dynamic program: each node returns a small summary of its subtree, and the parent combines its children\'s summaries. The traversal is post-order, so every child is final before the parent. Extra dimensions or a second rerooting pass handle problems where the answer needs more context.',
  sections: [
    {
      heading: 'Post-order is the natural order',
      body: 'A tree has no loops, so a DFS that returns after visiting its children is already a topological order of subproblems. For a node u, solve every child v first, then combine their summaries to produce the summary for u. The root finishes last. This is exactly what the diagram does: leaves 3, 4, 5 and 6 report first, then nodes 1 and 2, then the root.\n\nUse recursion for clarity or reverse level order for tabulation. In a parent array, parents come before children, so scanning indices from last to first is a valid post-order. In a level-order binary tree, children always have larger node-array indices than their parent, so the same reverse scan works. Either way, never compute a parent before its children.',
      bullets: [
        'DFS post-order: solve left, solve right, combine at the node.',
        'Parent array: reverse index order visits children first.',
        'Level-order tree: children have larger indices, so reverse order works.',
        'The root is the last subproblem, not the first.',
      ],
      callout: 'If you find yourself needing a parent value before a child value, you are probably in the rerooting pattern, which needs a second pass.',
    },
    {
      heading: 'The state is a summary of one subtree',
      body: 'Define dp[u] as a complete sentence about the subtree rooted at u, never about the whole tree unless you say so. A leaf has a base case, and a parent extends its children\'s answers. The summary must contain exactly what the parent needs and nothing more.\n\nCommon summaries: height (diameter), subtree size plus downward distance sum (rerooting), (rob, skip) pairs (House Robber III), (take, skip) weights (maximum independent set), and three coverage states (Binary Tree Cameras). The diagram shows a (rob, skip) pair. Node 1 returns (2, 7): rob it for 2, or skip it and collect 4 + 3 from its children. The parent only needs those two numbers, not the children\'s full histories.',
      bullets: [
        'Write the state definition before the recurrence.',
        'A subtree state may not depend on ancestors.',
        'Return a tuple when the parent needs more than one scenario.',
        'Leaves and missing children need explicit base values.',
      ],
      callout: 'If two different histories produce the same summary, they are interchangeable for the parent — that is the DP compression.',
    },
    {
      heading: 'Combine children with a rule',
      body: 'The transition is a fold over children. For a diameter, each node tests leftHeight + rightHeight and returns 1 + max(leftHeight, rightHeight) upward. For a maximum-weight independent set, skip[u] = sum max(skip[v], take[v]) and take[u] = weight[u] + sum skip[v]. For House Robber III the rule is the same pair, just renamed. For cameras, a child that still needs coverage forces a camera at u; otherwise a child camera covers u; otherwise u reports that it needs coverage.\n\nIn every case the global answer is either the root summary or a best value accumulated while combining. Diameter keeps a running maximum through any node. House Robber takes max(rob[root], skip[root]). Cameras add one final camera if the root still reports NEEDS. Be explicit about which value is global and which is local.',
      bullets: [
        'Combine child summaries with a fold over the child list.',
        'Keep a global best when the answer may bend at any node.',
        'Take max/min at the root when the state already contains the answer.',
        'Cameras: handle the uncovered root after the DFS.',
      ],
      callout: 'A correct local summary plus a forgotten global maximum is the most common tree-DP bug.',
    },
    {
      heading: 'Rerooting: answers for every node',
      body: 'Some problems ask for a value at every node, not just the root. Recomputing a full DFS from each node costs O(n²). Rerooting reuses the first post-order pass. Compute subtree sizes and a downward aggregate, then walk top-down: when the root moves from p to child c, the size[c] nodes below c become one step closer and the other n - size[c] nodes become one step farther.\n\nFor total distance sums, total[c] = total[p] + n - 2 * size[c]. One forward pass gives every node\'s answer in O(1) per edge. The same idea works for maximum subtree sums, second-best diameters, and any value that can be updated from a parent aggregate. The first pass is post-order; the second pass is pre-order. Two directions, still O(n).',
      bullets: [
        'Pass 1 (post-order): subtree size and downward aggregate.',
        'Pass 2 (pre-order): reroot formula from parent to child.',
        'Distance sums: total[c] = total[p] + n - 2 * size[c].',
        'Avoid O(n²) by never recomputing a whole DFS per root.',
      ],
      callout: 'Rerooting needs an aggregate that can be reversed. If removing a child is hard, store prefix/suffix aggregates or the best two child values.',
    },
    {
      heading: 'Pitfalls',
      body: 'Missing children are not the same as zero-valued children. Decide explicitly what a null child returns: height 0, pair (0, 0), camera state COVERED, or size 0. Mixing those conventions produces plausible but wrong answers. Also check the root: a single-node tree still needs its base case, and a root left in the NEEDS state needs one extra camera.\n\nWatch recursion depth on deep chains and use an explicit reverse-order loop when the input is large. Keep the distinction between subtree answers and whole-tree answers clear. Finally, test a one-node tree, a two-node tree, a chain, and a balanced tree by hand. Those four shapes expose most null-child and root-finalisation mistakes.',
      bullets: [
        'Define the null-child return value once and reuse it.',
        'Single node, two nodes, chain, balanced tree: test all four.',
        'Handle a root that is still uncovered or unselected.',
        'Prefer reverse-order tabulation for very deep trees.',
        'Do not confuse subtree totals with whole-tree totals.',
      ],
      callout: 'If the answer is wrong only on chains, suspect root finalisation or a missing-child base case.',
    },
  ],
  diagram: {
    rendererId: 'treeDP',
    steps: buildDiagramSteps(),
  },
};

export default lesson;
