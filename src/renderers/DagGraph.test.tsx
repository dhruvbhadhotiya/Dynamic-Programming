import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DagGraphState } from '../engine/types';
import { DagGraph } from './DagGraph';

const graph: DagGraphState = {
  kind: 'dagGraph',
  directed: true,
  caption: 'Shortest-path DAG',
  nodes: [
    { id: 'a', label: 'Start', x: 0.15, y: 0.5, detail: 'dist 0' },
    { id: 'b', label: 'Middle', x: 0.5, y: 0.5, detail: 'dist 4' },
    { id: 'c', label: 'Goal', x: 0.85, y: 0.5, detail: 'dist 9' },
  ],
  edges: [
    { from: 'a', to: 'b', label: 'cost 4' },
    { from: 'b', to: 'c', label: 'cost 5', dashed: true },
  ],
};

describe('DagGraph', () => {
  it('renders node labels and the caption', () => {
    render(<DagGraph state={graph} highlights={[]} />);

    expect(screen.getByText('Shortest-path DAG', { selector: 'figcaption' })).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Middle')).toBeInTheDocument();
    expect(screen.getByText('Goal')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Shortest-path DAG' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Start, dist 0' })).toBeInTheDocument();
  });

  it('shows node detail text', () => {
    render(<DagGraph state={graph} highlights={[]} />);

    expect(screen.getByText('dist 0')).toBeInTheDocument();
    expect(screen.getByText('dist 4')).toBeInTheDocument();
    expect(screen.getByText('dist 9')).toBeInTheDocument();
  });

  it('renders edge labels with dashed styling preserved', () => {
    render(<DagGraph state={graph} highlights={[]} />);

    expect(screen.getByText('cost 4')).toBeInTheDocument();
    expect(screen.getByText('cost 5')).toBeInTheDocument();
    const dashed = document.querySelector('[data-edge-index="1"] line');
    expect(dashed).toHaveAttribute('data-edge-dashed', 'true');
    expect(dashed).toHaveAttribute('stroke-dasharray', '5 4');
    expect(dashed).toHaveAttribute('marker-end', 'url(#dag-arrow-default)');
  });

  it('distinguishes a path-highlighted edge from a plain edge', () => {
    render(
      <DagGraph
        state={graph}
        highlights={[
          { pos: [0], kind: 'path' },
          { pos: [1], kind: 'dependency' },
        ]}
      />,
    );

    const pathEdge = document.querySelector('[data-edge-index="0"]');
    const depEdge = document.querySelector('[data-edge-index="1"]');
    expect(pathEdge).toHaveAttribute('data-edge-highlight', 'path');
    expect(depEdge).toHaveAttribute('data-edge-highlight', 'dependency');

    const pathLine = pathEdge?.querySelector('line');
    const depLine = depEdge?.querySelector('line');
    expect(pathLine).toHaveAttribute('marker-end', 'url(#dag-arrow-path)');
    expect(depLine).toHaveAttribute('marker-end', 'url(#dag-arrow-dependency)');
    expect(pathLine).toHaveAttribute('stroke-width', '3.5');
    expect(depLine).toHaveAttribute('stroke-width', '2.5');
    expect(depLine).toHaveAttribute('stroke-dasharray', '7 4');
    expect(pathLine?.getAttribute('stroke')).not.toBe(depLine?.getAttribute('stroke'));
    expect(screen.getByText('↗ Chosen path')).toBeInTheDocument();
  });

  it('marks highlighted nodes with a symbol and text label, not colour alone', () => {
    render(
      <DagGraph
        state={graph}
        highlights={[
          { pos: [2], kind: 'pruned', label: 'skip this branch' },
          { pos: [0], kind: 'result' },
        ]}
      />,
    );

    expect(screen.getByText('★ Result')).toBeInTheDocument();
    expect(screen.getByText('× Pruned')).toBeInTheDocument();
    expect(screen.getByText('skip this branch')).toBeInTheDocument();
    const prunedNode = document.querySelector('[data-node-index="2"]');
    expect(prunedNode).toHaveAttribute('data-node-highlight', 'pruned');
    expect(screen.getByRole('group', { name: /Goal.*Pruned/ })).toBeInTheDocument();
  });

  it('does not crash for an empty graph or edges to unknown nodes', () => {
    const { unmount } = render(<DagGraph state={{ kind: 'dagGraph', nodes: [], edges: [] }} highlights={[]} />);
    expect(screen.getByText('The graph is empty.')).toBeInTheDocument();
    unmount();

    render(
      <DagGraph
        state={{
          kind: 'dagGraph',
          nodes: graph.nodes,
          edges: [{ from: 'a', to: 'ghost', label: 'broken' }],
        }}
        highlights={[]}
      />,
    );
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.queryByText('broken')).not.toBeInTheDocument();
  });
});
