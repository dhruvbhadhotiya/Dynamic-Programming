import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IntervalTriangleState } from '../engine/types';
import { IntervalTriangle } from './IntervalTriangle';

function triangle(size: number): IntervalTriangleState {
  return {
    kind: 'intervalTriangle',
    values: Array.from({ length: size }, (_, start) =>
      Array.from({ length: size }, (_, end) => start * 10 + end),
    ),
  };
}

const labelled: IntervalTriangleState = {
  ...triangle(3),
  rowLabels: ['s0', 's1', 's2'],
  colLabels: ['e0', 'e1', 'e2'],
  caption: 'Interval DP triangle',
};

describe('IntervalTriangle', () => {
  it('draws 10 cells for n=4 (only start <= end)', () => {
    const { container } = render(<IntervalTriangle state={triangle(4)} highlights={[]} />);

    const cells = container.querySelectorAll('[data-interval]');
    expect(cells).toHaveLength(10);
    expect(container.querySelector('[data-interval="0:3"]')).toBeInTheDocument();
    expect(container.querySelector('[data-interval="3:3"]')).toBeInTheDocument();
    expect(container.querySelector('[data-interval="1:0"]')).not.toBeInTheDocument();
  });

  it('shows row and column labels with scope headers', () => {
    render(<IntervalTriangle state={labelled} highlights={[]} />);

    expect(screen.getByRole('columnheader', { name: 'e0' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'e2' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 's0' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 's2' })).toBeInTheDocument();
    expect(screen.getByText('start \\ end')).toBeInTheDocument();
  });

  it('pairs highlight kinds with a visible symbol and text label', () => {
    render(
      <IntervalTriangle
        state={triangle(3)}
        highlights={[
          { pos: [1, 2], kind: 'active', label: 'solving now' },
          { pos: [0, 0], kind: 'result' },
          { pos: [0, 1], kind: 'pruned' },
        ]}
      />,
    );

    expect(screen.getByText('●')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('solving now')).toBeInTheDocument();
    expect(screen.getByText('★')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.getByText('×')).toBeInTheDocument();
    expect(screen.getByText('Pruned')).toBeInTheDocument();
  });

  it('shows the caption', () => {
    render(<IntervalTriangle state={labelled} highlights={[]} />);

    expect(screen.getByRole('table', { name: 'Interval DP triangle' })).toBeInTheDocument();
    expect(screen.getByText('Interval DP triangle')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /scrolls horizontally/i })).toBeInTheDocument();
  });

  it('guards against empty dimensions with a message and no table', () => {
    const { container } = render(
      <IntervalTriangle
        state={{ kind: 'intervalTriangle', values: [], caption: 'Empty intervals' }}
        highlights={[]}
      />,
    );

    expect(screen.getByText('No interval data to display.')).toBeInTheDocument();
    expect(screen.getByText('Empty intervals')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-interval]')).toHaveLength(0);
  });

  it('tolerates ragged rows and renders null and boolean values', () => {
    const state: IntervalTriangleState = {
      kind: 'intervalTriangle',
      values: [[1], [2, null, true], []],
    };
    const { container } = render(<IntervalTriangle state={state} highlights={[]} />);

    expect(container.querySelectorAll('[data-interval]')).toHaveLength(6);
    expect(screen.getAllByText('·')).toHaveLength(4);
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });
});
