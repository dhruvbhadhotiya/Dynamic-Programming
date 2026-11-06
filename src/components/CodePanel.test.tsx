import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodePanel } from './CodePanel';
import type { CodeSnippets } from '../engine/types';

const code: CodeSnippets = {
  python: 'def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)',
  javascript: 'function fib(n) {\n  if (n < 2) return n;\n  return fib(n - 1) + fib(n - 2);\n}',
  cpp: 'int fib(int n) {\n  if (n < 2) return n;\n  return fib(n - 1) + fib(n - 2);\n}',
};

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('CodePanel', () => {
  it('marks the requested line with a non-color-only marker', () => {
    const { container } = render(<CodePanel code={code} codeLine={3} />);

    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    const current = container.querySelector('li[aria-current="step"]');
    expect(current).toHaveTextContent('▶');
    expect(current).toHaveTextContent('3');
    expect(current).toHaveTextContent('return n');
    expect(current?.innerHTML).toContain('token keyword');
  });

  it('switches code when another language tab is selected', async () => {
    const user = userEvent.setup();
    render(<CodePanel code={code} codeLine={3} />);

    expect(screen.getByRole('tab', { name: 'Python' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'JavaScript' }));

    expect(screen.getByRole('tab', { name: 'JavaScript' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Python' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('function fib');
  });

  it('supports arrow-key navigation between tabs', async () => {
    render(<CodePanel code={code} codeLine={1} />);

    const python = screen.getByRole('tab', { name: 'Python' });
    python.focus();
    fireEvent.keyDown(python, { key: 'ArrowRight' });

    expect(screen.getByRole('tab', { name: 'JavaScript' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'JavaScript' })).toHaveFocus();
  });

  it('copies the active snippet and shows a short confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<CodePanel code={code} codeLine={1} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy Python code' }));

    expect(writeText).toHaveBeenCalledWith(code.python);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('does not crash when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    render(<CodePanel code={code} codeLine={1} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy Python code' }));

    expect(await screen.findByRole('button', { name: 'Copy failed' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/clipboard unavailable/i);
  });

  it('explains the absence of code in teacher mode', () => {
    render(<CodePanel code={code} codeLine={1} hidden />);

    expect(screen.getByRole('note')).toHaveTextContent(/code hidden by teacher mode/i);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('clamps out-of-range highlight lines', () => {
    const { container, rerender } = render(<CodePanel code={code} codeLine={999} />);
    expect(container.querySelector('li[aria-current="step"]')).toHaveTextContent('return fib');

    rerender(<CodePanel code={code} codeLine={0} />);
    expect(container.querySelector('li[aria-current="step"]')).toHaveTextContent('def fib');
  });
});
