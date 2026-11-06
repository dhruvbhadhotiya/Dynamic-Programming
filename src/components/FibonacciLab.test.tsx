import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FibonacciLab } from './FibonacciLab';

function Harness({ initialN = 0, max = 15 }: { initialN?: number; max?: number }) {
  const [n, setN] = useState(initialN);
  return <FibonacciLab n={n} onNChange={setN} max={max} />;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

describe('FibonacciLab', () => {
  it('slider change calls onNChange and shows number readout', () => {
    const onNChange = vi.fn();
    render(<FibonacciLab n={5} onNChange={onNChange} />);

    expect(screen.getByText('n = 5')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'n' })).toHaveValue('5');

    fireEvent.change(screen.getByRole('slider', { name: 'n' }), { target: { value: '7' } });
    expect(onNChange).toHaveBeenCalledWith(7);
  });

  it('comparison numbers are correct for n = 10', () => {
    render(<FibonacciLab n={10} onNChange={() => {}} />);

    expect(screen.getByText(/fib\(10\) = 55/)).toBeInTheDocument();
    expect(screen.getByText('177 calls')).toBeInTheDocument();
    expect(screen.getAllByText('11 computations')).toHaveLength(2);
    expect(screen.getByLabelText('fewer calls factor')).toHaveTextContent(/16\.1 times fewer calls/);
    expect(screen.getByText('Brute force')).toBeInTheDocument();
    expect(screen.getByText('Memoization')).toBeInTheDocument();
    expect(screen.getByText('Tabulation')).toBeInTheDocument();
  });

  it('fib(n) value display updates with n', () => {
    const { rerender } = render(<FibonacciLab n={0} onNChange={() => {}} />);
    expect(screen.getByText(/fib\(0\) = 0/)).toBeInTheDocument();
    expect(screen.getByText('1 calls')).toBeInTheDocument();

    rerender(<FibonacciLab n={15} onNChange={() => {}} />);
    expect(screen.getByText(/fib\(15\) = 610/)).toBeInTheDocument();
    expect(screen.getByText('1973 calls')).toBeInTheDocument();
  });

  it('auto-play advances n on an interval', () => {
    vi.useFakeTimers();
    render(<Harness initialN={0} />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole('slider', { name: 'n' })).toHaveValue('1');

    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole('slider', { name: 'n' })).toHaveValue('2');
  });

  it('pause stops auto-play', () => {
    vi.useFakeTimers();
    render(<Harness initialN={0} />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole('slider', { name: 'n' })).toHaveValue('1');

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByRole('slider', { name: 'n' })).toHaveValue('1');
  });

  it('stops at max', () => {
    vi.useFakeTimers();
    render(<Harness initialN={14} max={15} />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole('slider', { name: 'n' })).toHaveValue('15');
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByRole('slider', { name: 'n' })).toHaveValue('15');
  });

  it('reduced motion: play does a single step and does not autoplay', () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn().mockReturnValue(false),
    });

    render(<Harness initialN={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(screen.getByRole('slider', { name: 'n' })).toHaveValue('1');
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByRole('slider', { name: 'n' })).toHaveValue('1');
  });
});
