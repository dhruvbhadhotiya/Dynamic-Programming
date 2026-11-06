import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Highlight, Table2DState } from '../engine/types';
import { Table2D } from './Table2D';

const grid: Table2DState = {
  kind: 'table2d',
  values: [
    [1, 2],
    [3, 4],
  ],
};

const labelled: Table2DState = {
  ...grid,
  rowLabels: ['r0', 'r1'],
  colLabels: ['c0', 'c1'],
  rowHeader: 'item i',
  colHeader: 'capacity j',
  caption: 'DP table',
};

describe('Table2D', () => {
  it('renders values, caption, headers, and labels', () => {
    render(<Table2D state={labelled} highlights={[]} />);

    expect(screen.getByRole('table', { name: 'DP table' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /scrolls horizontally/i })).toBeInTheDocument();
    expect(screen.getByText('item i')).toBeInTheDocument();
    expect(screen.getByText('capacity j')).toBeInTheDocument();
    for (const text of ['r0', 'r1', 'c0', 'c1', '1', '2', '3', '4']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('shows active and dependency states with arrows aimed at the active cell', () => {
    const highlights: Highlight[] = [
      { pos: [1, 1], kind: 'active' },
      { pos: [0, 1], kind: 'dependency' },
      { pos: [1, 0], kind: 'dependency' },
      { pos: [0, 0], kind: 'dependency' },
    ];
    render(<Table2D state={grid} highlights={highlights} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getAllByText('Dependency')).toHaveLength(3);
    const arrows = screen.getAllByRole('img', { name: /points toward the active cell/i });
    expect(arrows).toHaveLength(3);
    expect(arrows.map((arrow) => arrow.textContent)).toEqual(expect.arrayContaining(['↓', '→', '↘']));
    expect(screen.getAllByLabelText(/depends on this cell/i)).toHaveLength(3);
  });

  it('does not draw dependency arrows without an active cell', () => {
    render(<Table2D state={grid} highlights={[{ pos: [0, 0], kind: 'dependency' }]} />);

    expect(screen.getByText('Dependency')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /points toward the active cell/i })).not.toBeInTheDocument();
  });

  it('renders null as a muted dot and booleans as Yes/No', () => {
    render(<Table2D state={{ kind: 'table2d', values: [[null, true, false]] }} highlights={[]} />);

    expect(screen.getByText('·')).toBeInTheDocument();
    expect(screen.getByText('empty value')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('supports multiple highlights, custom labels, and symbols', () => {
    const highlights: Highlight[] = [
      { pos: [0, 0], kind: 'result', label: 'final 42' },
      { pos: [0, 1], kind: 'base' },
      { pos: [0, 2], kind: 'path' },
      { pos: [1, 0], kind: 'pruned', label: 'out of range' },
      { pos: [1, 1], kind: 'active' },
      { pos: [1, 2], kind: 'dependency' },
    ];
    render(<Table2D state={{ kind: 'table2d', values: [[1, 2, 3], [4, 5, 6]] }} highlights={highlights} />);

    for (const text of ['final 42', 'Base case', 'Chosen path', 'out of range', 'Active', 'Dependency']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const symbol of ['★', '▣', '↗', '×', '●', '◌']) {
      expect(screen.getByText(symbol)).toBeInTheDocument();
    }
  });

  it('uses smaller cells in compact mode', () => {
    const { container } = render(<Table2D state={grid} highlights={[]} compact />);

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(container.querySelector('td')).toHaveClass('px-1.5', 'py-1', 'text-xs');
  });
});
