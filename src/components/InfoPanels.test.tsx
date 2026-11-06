import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExplanationBar, StepCounter, VariableWatch } from './InfoPanels';

describe('ExplanationBar', () => {
  it('announces the current message and shows the code line chip only when provided', () => {
    const { rerender } = render(<ExplanationBar message="Fill row 1 from the base case." codeLine={7} />);

    const message = screen.getByText('Fill row 1 from the base case.');
    expect(message).toHaveAttribute('aria-live', 'polite');
    expect(message).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByText('Line 7')).toBeInTheDocument();

    rerender(<ExplanationBar message="Fill row 1 from the base case." />);
    expect(screen.queryByText(/^Line \d+$/)).not.toBeInTheDocument();
  });
});

describe('StepCounter', () => {
  it('renders a 1-based step count and accessible progress values', () => {
    const { rerender } = render(<StepCounter index={0} total={4} />);

    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '4');
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(progress).toHaveAttribute('aria-valuetext', 'Step 1 of 4');

    rerender(<StepCounter index={3} total={4} />);
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  });

  it('is empty-safe when there are no steps', () => {
    render(<StepCounter index={0} total={0} />);

    expect(screen.getByText('Step 0 of 0')).toBeInTheDocument();
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '0');
    expect(progress).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

describe('VariableWatch', () => {
  it('shows a semantic key/value list and distinguishes booleans without color alone', () => {
    render(<VariableWatch vars={{ i: 3, name: 'dp', done: true, stale: false }} />);

    const list = screen.getByLabelText('Variables');
    expect(list.tagName).toBe('DL');
    expect(list.querySelectorAll('dt')).toHaveLength(4);
    expect(list.querySelectorAll('dd')).toHaveLength(4);

    expect(screen.getByText('i')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('dp')).toBeInTheDocument();

    const yes = screen.getByText('true');
    expect(yes.closest('div')).toHaveClass('border-dashed');
    expect(yes.closest('div')).toHaveTextContent('✓');

    const no = screen.getByText('false');
    expect(no.closest('div')).toHaveClass('border-dashed');
    expect(no.closest('div')).toHaveTextContent('✗');
  });

  it('shows a quiet message when there are no variables', () => {
    render(<VariableWatch vars={{}} />);

    expect(screen.getByText('No variables to watch yet.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Variables')).not.toBeInTheDocument();
  });
});
