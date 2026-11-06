import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Table1D } from './Table1D';

afterEach(cleanup);

describe('Table1D', () => {
  it('renders values with 0-based index labels', () => {
    render(<Table1D state={{ kind: 'table1d', values: [3, 'x', 12] }} highlights={[]} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('x')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('pairs a highlight state with its visible label, symbol, and accessible name', () => {
    render(
      <Table1D state={{ kind: 'table1d', values: [4, 9] }} highlights={[{ pos: [1], kind: 'result' }]} />,
    );

    expect(screen.getByText('★')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /index 1: 9, result/i })).toBeInTheDocument();
  });

  it('shows optional labels, index name, and caption', () => {
    render(
      <Table1D
        state={{
          kind: 'table1d',
          values: [1, 2],
          labels: ['start', 'end'],
          indexName: 'i',
          caption: 'Filled table',
        }}
        highlights={[]}
      />,
    );

    expect(screen.getByText('i')).toBeInTheDocument();
    expect(screen.getByText('start')).toBeInTheDocument();
    expect(screen.getByText('end')).toBeInTheDocument();
    expect(screen.getByText('Filled table')).toBeInTheDocument();
  });

  it('renders null as a muted empty marker and booleans as Yes/No', () => {
    render(<Table1D state={{ kind: 'table1d', values: [null, true, false] }} highlights={[]} />);

    expect(screen.getByLabelText('empty')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('lets the last highlight for a cell win', () => {
    render(
      <Table1D
        state={{ kind: 'table1d', values: [5, 6] }}
        highlights={[
          { pos: [0], kind: 'dependency', label: 'reads dp[0]' },
          { pos: [0], kind: 'result' },
          { pos: [1], kind: 'base' },
        ]}
      />,
    );

    expect(screen.getByText('★')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.queryByText('◌')).not.toBeInTheDocument();
    expect(screen.queryByText('Dependency')).not.toBeInTheDocument();
    expect(screen.getByText('▣')).toBeInTheDocument();
    expect(screen.getByText('Base case')).toBeInTheDocument();
  });
});
