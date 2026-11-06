import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePlayer } from '../engine/usePlayer';
import { FibonacciPage } from './FibonacciPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <FibonacciPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  usePlayer.setState({ steps: [], index: 0, playing: false, speed: 1 });
  window.localStorage.clear();
});

describe('FibonacciPage', () => {
  it('renders the hero and the live operation comparison', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Fibonacci Numbers' })).toBeInTheDocument();
    expect(screen.getAllByText(/exponentially/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('heading', { name: 'Live operation comparison' })).toBeInTheDocument();
    // Default n = 8: fib(8) = 21, brute = 67 calls, memo = 9 computed values.
    expect(screen.getAllByText('fib(8) = 21').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Brute force: 67 calls')).toBeInTheDocument();
    expect(screen.getByText('Memo / tabulation: 9 computed values')).toBeInTheDocument();
    // Table covers n = 5..12 (brute for 5 is 15, for 12 is 465).
    const table = screen.getByRole('table');
    expect(within(table).getByText('15')).toBeInTheDocument();
    expect(within(table).getByText('465')).toBeInTheDocument();
  });

  it('switches walkthrough steps when the mode changes', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText(/Brute force: call fib\(8\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /memoization/i }));
    expect(screen.getByText(/Memoization: cache each fib/)).toBeInTheDocument();
    expect(screen.queryByText(/Brute force: call fib\(8\)/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tabulation/i }));
    expect(screen.getByText(/Tabulation: build the table/)).toBeInTheDocument();
  });

  it('changes the answer when the n slider moves', () => {
    renderPage();

    expect(screen.getAllByText('fib(8) = 21').length).toBeGreaterThanOrEqual(1);
    const slider = screen.getByRole('slider', { name: 'n' });
    expect(slider).toHaveValue('8');

    fireEvent.change(slider, { target: { value: '5' } });
    expect(screen.getAllByText('fib(5) = 5').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Brute force: 15 calls')).toBeInTheDocument();
    expect(screen.getByText(/Brute force: call fib\(5\)/)).toBeInTheDocument();
    expect(slider).toHaveValue('5');
  });

  it('renders the code panel and quiz from the module', () => {
    renderPage();

    expect(screen.getByRole('tab', { name: 'Python' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Python source code' })).toBeInTheDocument();
    expect(screen.getByText('Current code line')).toBeInTheDocument();
    expect(screen.getByText('What is fib(0)?')).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 4')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Answer options' })).toBeInTheDocument();
  });

  it('shows the call tree and collapses it with memo hits in memo mode', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { name: 'Brute-force call tree' })).toBeInTheDocument();
    expect(screen.getByRole('tree', { name: /Call tree for fib\(8\)/ })).toBeInTheDocument();
    expect(screen.queryByText(/\d+\s+memo hits/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /memoization/i }));
    expect(screen.getByRole('tree', { name: /with memoization/ })).toBeInTheDocument();
    expect(screen.getAllByText('Memo hit').length).toBeGreaterThan(0);
    expect(screen.getByText(/\d+\s+memo hits/)).toBeInTheDocument();
  });
});
