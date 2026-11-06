import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RecursionTreeState } from '../engine/types';
import { RecursionTree } from './RecursionTree';

const tree: RecursionTreeState = {
  kind: 'recursionTree',
  caption: 'Fibonacci call tree',
  memoHits: 2,
  nodes: [
    { id: 'root', label: 'fib(3)', kind: 'done' },
    { id: 'memo', parentId: 'root', label: 'fib(2)', detail: 'cached = 1', kind: 'memo' },
    { id: 'cut', parentId: 'root', label: 'fib(1)', kind: 'pruned' },
    { id: 'leaf', parentId: 'memo', label: 'fib(0)', kind: 'base' },
  ],
};

describe('RecursionTree', () => {
  it('renders the tree, caption and memo/pruned distinctions', () => {
    render(<RecursionTree state={tree} highlights={[]} />);

    expect(screen.getByRole('tree', { name: 'Fibonacci call tree' })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem')).toHaveLength(4);
    expect(screen.getByText('Fibonacci call tree')).toBeInTheDocument();
    expect(screen.getByText('2 memo hits')).toBeInTheDocument();
    expect(screen.getByText('Memo hit')).toBeInTheDocument();
    expect(screen.getAllByText('↺').length).toBeGreaterThan(0);
    expect(screen.getByText('Pruned')).toBeInTheDocument();
    expect(screen.getByText('×')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /fib\(0\).*Base case.*level 3/i })).toBeInTheDocument();
  });

  it('marks the active node and dims branches outside its focus path', () => {
    render(
      <RecursionTree
        state={tree}
        highlights={[
          { pos: [3], kind: 'active', label: 'reuse this memo' },
          { pos: [1], kind: 'result' },
        ]}
      />,
    );

    const leaf = screen.getByRole('treeitem', { name: /fib\(0\)/ });
    expect(leaf).toHaveAttribute('data-focus-path', 'true');
    expect(leaf).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('treeitem', { name: /fib\(3\)/ })).toHaveAttribute('data-focus-path', 'true');
    expect(screen.getByRole('treeitem', { name: /fib\(1\)/ })).toHaveAttribute('data-focus-path', 'false');
    expect(screen.getByText('reuse this memo')).toBeInTheDocument();
  });

  it('handles an empty tree', () => {
    render(<RecursionTree state={{ kind: 'recursionTree', nodes: [] }} highlights={[]} />);
    expect(screen.getByText('The recursion tree is empty.')).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });
});
