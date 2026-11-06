import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PredictQuestion, PredictScore } from './PredictMode';
import { PredictMode } from './PredictMode';

const question: PredictQuestion = {
  id: 'fib-5',
  prompt: 'What value goes into fib(5)?',
  answer: '5',
  hint: 'fib(4) + fib(3)',
  explanation: 'fib(5) = 3 + 2 = 5.',
};

const score: PredictScore = { correct: 2, attempts: 3 };

describe('PredictMode', () => {
  it('accepts a keyboard answer, reports the result and shows feedback', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(<PredictMode question={question} score={score} onResult={onResult} />);

    expect(screen.getByLabelText('Score 2 out of 3 correct')).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: /your prediction/i });
    await user.type(input, ' 05 {Enter}');

    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent(/correct/i);
    expect(screen.getByText(/3 \+ 2 = 5/)).toBeInTheDocument();
    expect(input).toBeDisabled();
  });

  it('marks a wrong answer and reveals the expected value', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(<PredictMode question={question} score={score} onResult={onResult} />);

    await user.type(screen.getByRole('textbox', { name: /your prediction/i }), '8{Enter}');

    expect(onResult).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent(/not quite/i);
    expect(screen.getByRole('status')).toHaveTextContent(/expected 5/i);
  });

  it('reveals an optional hint on request', async () => {
    const user = userEvent.setup();
    render(<PredictMode question={question} score={score} onResult={() => undefined} />);

    expect(screen.queryByText(/fib\(4\) \+ fib\(3\)/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show hint/i }));

    expect(screen.getByText(/fib\(4\) \+ fib\(3\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide hint/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('resets the draft and feedback for a new question', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PredictMode question={question} score={score} onResult={() => undefined} />);

    const input = screen.getByRole('textbox', { name: /your prediction/i });
    await user.type(input, '8{Enter}');
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(
      <PredictMode
        question={{ ...question, id: 'fib-6', prompt: 'What value goes into fib(6)?', answer: '8' }}
        score={{ correct: 2, attempts: 4 }}
        onResult={() => undefined}
      />,
    );

    expect(screen.getByRole('textbox', { name: /your prediction/i })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /your prediction/i })).toBeEnabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('What value goes into fib(6)?')).toBeInTheDocument();
  });

  it('requires an answer before submitting', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(<PredictMode question={question} score={score} onResult={onResult} />);

    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(onResult).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/enter a prediction/i);
  });
});
