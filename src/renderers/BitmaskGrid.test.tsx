import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BitmaskGrid } from './BitmaskGrid';

afterEach(cleanup);

function stateFor(bits = 3) {
  const total = 2 ** bits;
  return {
    kind: 'bitmaskGrid' as const,
    bits,
    values: Array.from({ length: total }, (_, mask) => mask * 10),
    labels: Array.from({ length: total }, (_, mask) => `label-${mask}`),
  };
}

describe('BitmaskGrid', () => {
  it('renders 2^bits cells for bits=3', () => {
    const { container } = render(<BitmaskGrid state={stateFor(3)} highlights={[]} />);
    expect(container.querySelectorAll('[data-mask]')).toHaveLength(8);
  });

  it('shows the correct binary string for mask 5', () => {
    const { container } = render(<BitmaskGrid state={stateFor(3)} highlights={[]} />);
    const row = container.querySelector('[data-mask="5"]');
    expect(row?.querySelector('th')).toHaveTextContent('101');
    expect(row).toHaveTextContent('5');
    expect(row).toHaveTextContent('50');
    expect(screen.getByText('101')).toBeInTheDocument();
  });

  it('shows a bit-position legend, left to right', () => {
    render(<BitmaskGrid state={stateFor(3)} highlights={[]} />);
    expect(screen.getByRole('list', { name: /bit positions/i })).toBeInTheDocument();
    expect(screen.getByText('bit 2 = 4')).toBeInTheDocument();
    expect(screen.getByText('bit 1 = 2')).toBeInTheDocument();
    expect(screen.getByText('bit 0 = 1')).toBeInTheDocument();
  });

  it('pairs highlight kinds with a visible symbol and label, not colour alone', () => {
    const { container } = render(
      <BitmaskGrid
        state={stateFor(3)}
        highlights={[
          { pos: [5], kind: 'result' },
          { pos: [2], kind: 'active', label: 'solving now' },
        ]}
      />,
    );
    expect(screen.getByText('★')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.getByText('●')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('solving now')).toBeInTheDocument();
    expect(container.querySelector('[data-mask="5"]')).toHaveAttribute('data-highlight', 'result');
    expect(container.querySelector('[data-mask="2"]')).toHaveAttribute('data-highlight', 'active');
  });

  it('lets the last highlight for a mask win', () => {
    render(
      <BitmaskGrid
        state={stateFor(3)}
        highlights={[
          { pos: [0], kind: 'dependency' },
          { pos: [0], kind: 'result' },
        ]}
      />,
    );
    expect(screen.getByText('★')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.queryByText('◌')).not.toBeInTheDocument();
  });

  it('shows the caption and per-mask labels', () => {
    render(
      <BitmaskGrid
        state={{ ...stateFor(3), caption: 'Travelling-salesman DP states' }}
        highlights={[]}
      />,
    );
    expect(screen.getByText('Travelling-salesman DP states')).toBeInTheDocument();
    expect(screen.getByText('label-5')).toBeInTheDocument();
    expect(screen.getByText('label-0')).toBeInTheDocument();
  });

  it('renders accessible table headers', () => {
    render(<BitmaskGrid state={stateFor(3)} highlights={[]} />);
    expect(screen.getByRole('columnheader', { name: 'Mask (binary)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Decimal' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    // Row headers are the binary strings.
    expect(screen.getByRole('rowheader', { name: '101' })).toBeInTheDocument();
  });

  it('guards against bits < 1 with an explanatory message and no rows', () => {
    const { container } = render(
      <BitmaskGrid state={{ kind: 'bitmaskGrid', bits: 0, values: [] }} highlights={[]} />,
    );
    expect(screen.getByText(/at least 1 bit/i)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-mask]')).toHaveLength(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('keeps bits>=5 compact in a scrollable region', () => {
    const { container } = render(<BitmaskGrid state={stateFor(5)} highlights={[]} />);
    expect(container.querySelectorAll('[data-mask]')).toHaveLength(32);
    expect(screen.getByRole('region', { name: /scrollable bitmask table/i })).toBeInTheDocument();
  });
});
