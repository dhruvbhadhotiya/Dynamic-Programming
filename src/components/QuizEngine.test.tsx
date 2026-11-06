import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuizQuestion } from '../engine/types';
import { QuizEngine } from './QuizEngine';

const questions: QuizQuestion[] = [
  {
    q: 'What is the base case of fib(n)?',
    options: ['fib(0) = 0', 'fib(1) = 1', 'Both', 'Neither'],
    answer: 2,
    why: 'Both fib(0) and fib(1) are base cases.',
  },
  {
    q: 'What does dp[i] mean in a 1D climb-stairs table?',
    options: ['Ways to reach stair i', 'Cost of stair i', 'Number of stairs', 'Height of stair i'],
    answer: 0,
    why: 'dp[i] counts the ways to reach stair i.',
  },
  {
    q: 'Which improves fib with memoization?',
    options: ['O(n^2)', 'O(n)', 'O(2^n)', 'O(n!)'],
    answer: 1,
    why: 'Each subproblem is solved once, giving O(n).',
  },
];

const problemId = 'climbing-stairs';
const storageKey = `dp-quiz:${problemId}`;

function storedScore(): { correct: number; attempts: number } | null {
  const raw = localStorage.getItem(storageKey);
  return raw ? (JSON.parse(raw) as { correct: number; attempts: number }) : null;
}

beforeEach(() => {
  localStorage.clear();
});

describe('QuizEngine', () => {
  it('shows the explanation and increments storage for a correct answer', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<QuizEngine questions={questions} problemId={problemId} onFinish={onFinish} />);

    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Both/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/correct/i);
    expect(screen.getByRole('status')).toHaveTextContent(/Both fib\(0\) and fib\(1\) are base cases/i);
    expect(storedScore()).toEqual({ correct: 1, attempts: 1 });
    expect(screen.getByRole('button', { name: /^Next$/i })).toBeInTheDocument();
  });

  it('records an attempt without incrementing correct for a wrong answer', async () => {
    const user = userEvent.setup();
    render(<QuizEngine questions={questions} problemId={problemId} />);

    await user.click(screen.getByRole('button', { name: /fib\(0\) = 0/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/incorrect/i);
    expect(screen.getByRole('status')).toHaveTextContent(/The correct answer is Both/i);
    expect(screen.getByRole('status')).toHaveTextContent(/Both fib\(0\) and fib\(1\) are base cases/i);
    expect(storedScore()).toEqual({ correct: 0, attempts: 1 });
  });

  it('shows a completion summary after the last question and calls onFinish', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<QuizEngine questions={questions} problemId={problemId} onFinish={onFinish} />);

    await user.click(screen.getByRole('button', { name: /Both/i }));
    await user.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ways to reach stair i/i }));
    await user.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /O\(n\)/i }));
    await user.click(screen.getByRole('button', { name: /^Next$/i }));

    expect(screen.getByText(/Quiz complete/i)).toBeInTheDocument();
    expect(screen.getByText(/You scored 3 out of 3 correct/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Restart/i })).toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledWith(3, 3);
  });

  it('restores a score from pre-seeded localStorage', () => {
    localStorage.setItem(storageKey, JSON.stringify({ correct: 2, attempts: 4 }));
    render(<QuizEngine questions={questions} problemId={problemId} />);

    expect(screen.getByLabelText('Score 2 out of 4 correct')).toBeInTheDocument();
    expect(screen.getByText(/2 correct out of 4 attempts/i)).toBeInTheDocument();
  });

  it('uses scoreKey for the storage key when provided', () => {
    render(<QuizEngine questions={questions} problemId={problemId} scoreKey="custom" />);
    expect(screen.getByText(/0 correct out of 0 attempts/i)).toBeInTheDocument();
    expect(localStorage.getItem('dp-quiz:custom')).toBeNull();
  });

  it('restart clears storage and returns to the first question', async () => {
    const user = userEvent.setup();
    render(<QuizEngine questions={questions} problemId={problemId} />);

    await user.click(screen.getByRole('button', { name: /Both/i }));
    await user.click(screen.getByRole('button', { name: /^Next$/i }));
    await user.click(screen.getByRole('button', { name: /Ways to reach stair i/i }));
    await user.click(screen.getByRole('button', { name: /^Next$/i }));
    await user.click(screen.getByRole('button', { name: /O\(n\)/i }));
    await user.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(screen.getByText(/Quiz complete/i)).toBeInTheDocument();
    expect(storedScore()).toEqual({ correct: 3, attempts: 3 });

    await user.click(screen.getByRole('button', { name: /Restart/i }));

    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    expect(screen.getByText(/0 correct out of 0 attempts/i)).toBeInTheDocument();
  });

  it('answers via keyboard Enter on a focused option', async () => {
    const user = userEvent.setup();
    render(<QuizEngine questions={questions} problemId={problemId} />);

    const correctButton = screen.getByRole('button', { name: /Both/i });
    correctButton.focus();
    expect(correctButton).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('status')).toHaveTextContent(/correct/i);
    expect(storedScore()).toEqual({ correct: 1, attempts: 1 });
  });

  it('answers via keyboard Space on a focused option', async () => {
    const user = userEvent.setup();
    render(<QuizEngine questions={questions} problemId={problemId} />);

    const correctButton = screen.getByRole('button', { name: /Both/i });
    correctButton.focus();
    await user.keyboard(' ');

    expect(screen.getByRole('status')).toHaveTextContent(/correct/i);
    expect(storedScore()).toEqual({ correct: 1, attempts: 1 });
  });

  it('disables options while disabled and renders a note for empty questions', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<QuizEngine questions={questions} problemId={problemId} disabled />);
    expect(screen.getByRole('button', { name: /Both/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Both/i }));
    expect(storedScore()).toBeNull();
    unmount();

    render(<QuizEngine questions={[]} problemId={problemId} />);
    expect(screen.getByText(/No quiz questions available/i)).toBeInTheDocument();
  });
});
