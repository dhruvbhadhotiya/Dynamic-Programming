import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModeToggle } from './ModeToggle';

describe('ModeToggle', () => {
  it('shows only available modes and reports the selected one', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModeToggle modes={['bruteforce', 'memo']} mode="memo" onChange={onChange} operations={12} />);

    expect(screen.queryByRole('button', { name: /tabulation/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /memoization/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /brute force/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/reuses overlapping subproblems/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /brute force/i }));
    expect(onChange).toHaveBeenCalledWith('bruteforce');
  });

  it('moves between modes with arrow keys and Home or End', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ModeToggle
        modes={['bruteforce', 'memo', 'tabulation']}
        mode="memo"
        onChange={onChange}
        operations={0}
      />,
    );

    const memo = screen.getByRole('button', { name: /memoization/i });
    memo.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('tabulation');
    expect(screen.getByRole('button', { name: /tabulation/i })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('bruteforce');
    expect(screen.getByRole('button', { name: /brute force/i })).toHaveFocus();

    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('tabulation');
  });

  it('announces a formatted live operation count', () => {
    render(<ModeToggle modes={['memo']} mode="memo" onChange={() => undefined} operations={1234} />);

    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toHaveAttribute('aria-live', 'polite');
  });

  it('does not change mode while disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ModeToggle
        modes={['bruteforce', 'memo']}
        mode="bruteforce"
        onChange={onChange}
        operations={3}
        disabled
      />,
    );

    const memo = screen.getByRole('button', { name: /memoization/i });
    await user.click(memo);
    memo.focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).not.toHaveBeenCalled();
    expect(memo).toBeDisabled();
  });
});
