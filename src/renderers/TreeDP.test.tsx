import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TreeDPState } from '../engine/types';
import { TreeDP } from './TreeDP';

const tree: TreeDPState = {
  kind: 'treeDP',
  caption: 'House robber tree DP',
  nodes: [
    {
      id: 'root',
      label: 'Node 1',
      detail: 'value 3',
      kind: 'active',
      values: { dp: 5, best: 10 },
    },
    {
      id: 'left',
      parentId: 'root',
      label: 'Node 2',
      detail: 'value 2',
      kind: 'done',
      values: { dp: 2, taken: true },
    },
    {
      id: 'right',
      parentId: 'root',
      label: 'Node 3',
      detail: 'value 4',
      kind: 'base',
      values: { dp: 'leaf', skip: null },
    },
    {
      id: 'memo',
      parentId: 'left',
      label: 'Node 4',
      detail: 'cached',
      kind: 'memo',
      values: { dp: 7 },
    },
    {
      id: 'pruned',
      parentId: 'right',
      label: 'Node 5',
      detail: 'skipped',
      kind: 'pruned',
    },
    {
      id: 'waiting',
      parentId: 'left',
      label: 'Node 6',
      detail: 'not visited',
      kind: 'pending',
    },
  ],
};

describe('TreeDP', () => {
  it('renders nodes, labels, details and the caption', () => {
    render(<TreeDP state={tree} highlights={[]} />);

    expect(screen.getByText('House robber tree DP', { selector: 'figcaption' })).toBeInTheDocument();
    expect(screen.getByRole('tree', { name: 'House robber tree DP' })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem')).toHaveLength(6);
    expect(screen.getByText('Node 1')).toBeInTheDocument();
    expect(screen.getByText('Node 4')).toBeInTheDocument();
    expect(screen.getByText('value 3')).toBeInTheDocument();
    expect(screen.getByText('cached')).toBeInTheDocument();
    expect(screen.getByText('Nodes 6')).toBeInTheDocument();
    expect(screen.getByText('4 with state')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Node 1.*level 1/i })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Node 4.*level 3/i })).toBeInTheDocument();
  });

  it('renders per-node state values as key:value chips', () => {
    render(<TreeDP state={tree} highlights={[]} />);

    expect(screen.getByText('dp: 5')).toBeInTheDocument();
    expect(screen.getByText('best: 10')).toBeInTheDocument();
    expect(screen.getByText('dp: 2')).toBeInTheDocument();
    expect(screen.getByText('taken: true')).toBeInTheDocument();
    expect(screen.getByText('dp: leaf')).toBeInTheDocument();
    expect(screen.getByText('skip: null')).toBeInTheDocument();
    expect(screen.getByText('dp: 7')).toBeInTheDocument();
    // Node 5 has no values record, so it renders no chips.
    const pruned = screen.getByRole('treeitem', { name: /Node 5/ });
    expect(pruned).not.toHaveTextContent('dp:');
  });

  it('shows kind badges with a symbol and text label, not colour alone', () => {
    render(<TreeDP state={tree} highlights={[]} />);

    expect(screen.getByText('●')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('▣')).toBeInTheDocument();
    expect(screen.getByText('Base case')).toBeInTheDocument();
    expect(screen.getByText('↺')).toBeInTheDocument();
    expect(screen.getByText('Memo hit')).toBeInTheDocument();
    expect(screen.getByText('×')).toBeInTheDocument();
    expect(screen.getByText('Pruned')).toBeInTheDocument();
    expect(screen.getByText('…')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Node 3/ })).toHaveAttribute('data-node-kind', 'base');
  });

  it('applies a highlight by node index with a symbol, label and aria-current', () => {
    render(
      <TreeDP
        state={tree}
        highlights={[
          { pos: [0], kind: 'active', label: 'solving now' },
          { pos: [2], kind: 'result' },
        ]}
      />,
    );

    const root = screen.getByRole('treeitem', { name: /Node 1/ });
    expect(root).toHaveAttribute('data-node-highlight', 'active');
    expect(root).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('solving now')).toBeInTheDocument();
    expect(screen.getByText('★ Result')).toBeInTheDocument();
    const leaf = screen.getByRole('treeitem', { name: /Node 3/ });
    expect(leaf).toHaveAttribute('data-node-highlight', 'result');
    // Unhighlighted nodes stay unmarked and the kind badge is preserved.
    expect(screen.getByRole('treeitem', { name: /Node 2/ })).toHaveAttribute('data-node-highlight', 'none');
    expect(root).toHaveTextContent('Active');
  });

  it('ignores out-of-range and multi-position highlights', () => {
    render(
      <TreeDP
        state={tree}
        highlights={[
          { pos: [99], kind: 'result' },
          { pos: [1, 2], kind: 'path' },
        ]}
      />,
    );

    expect(screen.queryAllByRole('treeitem').every((item) => item.getAttribute('data-node-highlight') === 'none')).toBe(
      true,
    );
    expect(screen.queryByText('★ Result')).not.toBeInTheDocument();
  });

  it('provides an accessible list fallback describing each node and its state', () => {
    render(<TreeDP state={tree} highlights={[]} />);

    const list = screen.getByRole('list', { name: '6 tree DP nodes' });
    expect(list).toBeInTheDocument();
    expect(list).toHaveTextContent('Node 1, value 3, Active, dp: 5, best: 10');
    expect(list).toHaveTextContent('Node 3, value 4, Base case, dp: leaf, skip: null');
  });

  it('handles an empty tree', () => {
    render(<TreeDP state={{ kind: 'treeDP', nodes: [] }} highlights={[]} />);
    expect(screen.getByText('The tree DP visualization is empty.')).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(screen.getByText('Nodes 0')).toBeInTheDocument();
  });

  it('tolerates orphan nodes whose parent is missing', () => {
    render(
      <TreeDP
        state={{
          kind: 'treeDP',
          caption: 'Orphan tree',
          nodes: [
            { id: 'orphan', parentId: 'ghost', label: 'Orphan', kind: 'done', values: { dp: 1 } },
            { id: 'child', parentId: 'orphan', label: 'Child', kind: 'base' },
          ],
        }}
        highlights={[]}
      />,
    );

    expect(screen.getAllByRole('treeitem')).toHaveLength(2);
    expect(screen.getByText('Orphan')).toBeInTheDocument();
    expect(screen.getByText('dp: 1')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Orphan.*level 1/i })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Child.*level 2/i })).toBeInTheDocument();
  });
});
