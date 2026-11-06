import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StringAlign } from './StringAlign';

describe('StringAlign', () => {
  it('renders sequence headers, labels, caption and highlights', () => {
    render(
      <StringAlign
        state={{
          kind: 'stringAlign',
          a: 'AB',
          b: 'A',
          values: [
            [0, 0],
            [0, 1],
            [0, null],
          ],
          caption: 'LCS table',
        }}
        highlights={[
          { pos: [1, 1], kind: 'active', label: 'characters match' },
          { pos: [2, 1], kind: 'result' },
        ]}
      />,
    );

    expect(screen.getByRole('table', { name: /DP alignment for sequences a = AB and b = A/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'b[1] = A' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'a[2] = B' })).toBeInTheDocument();
    expect(screen.getByText('LCS table')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Result' })).toBeInTheDocument();
    expect(screen.getByTitle('Active: characters match')).toBeInTheDocument();
    expect(screen.getByText('·')).toBeInTheDocument();
  });

  it('formats booleans and empty strings clearly', () => {
    render(
      <StringAlign
        state={{
          kind: 'stringAlign',
          a: 'X',
          b: 'Y',
          values: [
            [true, false],
            ['', 0],
          ],
        }}
        highlights={[]}
        compact
      />,
    );

    expect(screen.getByLabelText('a[0], b[0]: Yes')).toBeInTheDocument();
    expect(screen.getByLabelText('a[0], b[1]: No')).toBeInTheDocument();
    expect(screen.getByLabelText('a[1], b[0]: ·')).toBeInTheDocument();
    expect(screen.getByLabelText('a[1], b[1]: 0')).toBeInTheDocument();
  });
});
