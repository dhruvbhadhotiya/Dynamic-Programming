import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProblemModule } from '../engine/types';
import { CheatSheetPage } from './CheatSheetPage';

const mocked = vi.hoisted(() => ({ problems: [] as ProblemModule[] }));

vi.mock('../engine/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../engine/registry')>();
  return {
    ...actual,
    get problems() {
      return mocked.problems;
    },
  };
});

function makeProblem(overrides: Partial<ProblemModule> = {}): ProblemModule {
  return {
    id: 'climbing-stairs',
    title: 'Climbing Stairs',
    category: '1d',
    difficulty: 'easy',
    summary: 'Count distinct ways to reach the top.',
    stateDefinition: 'dp[i] = ways to reach step i',
    recurrence: 'dp[i] = dp[i-1] + dp[i-2]',
    complexity: { time: 'O(n)', space: 'O(n)' },
    renderer: 'table1d',
    inputSchema: [],
    defaultInput: undefined,
    generateSteps: () => [],
    code: { python: 'pass', javascript: 'pass', cpp: 'pass' },
    quiz: [
      { q: 'q1?', options: ['a', 'b'], answer: 0, why: 'w' },
      { q: 'q2?', options: ['a', 'b'], answer: 1, why: 'w' },
      { q: 'q3?', options: ['a', 'b'], answer: 0, why: 'w' },
    ],
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  mocked.problems = [];
  vi.restoreAllMocks();
});

describe('CheatSheetPage', () => {
  it('renders category headings for each category with problems', () => {
    mocked.problems = [
      makeProblem(),
      makeProblem({
        id: 'house-robber',
        title: 'House Robber',
        recurrence: 'dp[i] = max(dp[i-1], dp[i-2] + nums[i])',
      }),
      makeProblem({
        id: 'knapsack-01',
        title: '0/1 Knapsack',
        category: 'knapsack',
        renderer: 'table2d',
      }),
    ];

    render(<CheatSheetPage />);

    expect(screen.getByRole('heading', { name: /1D DP/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Knapsack/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Strings/i })).not.toBeInTheDocument();
  });

  it('renders recurrence, state definition, complexity, and renderer per problem', () => {
    mocked.problems = [makeProblem({ complexity: { time: 'O(n)', space: 'O(1)' } })];

    render(<CheatSheetPage />);

    expect(screen.getByText('Climbing Stairs')).toBeInTheDocument();
    expect(screen.getByText('dp[i] = dp[i-1] + dp[i-2]')).toBeInTheDocument();
    expect(screen.getByText('dp[i] = ways to reach step i')).toBeInTheDocument();
    expect(screen.getByText('O(n)')).toBeInTheDocument();
    expect(screen.getByText('O(1)')).toBeInTheDocument();
    expect(screen.getByText('table1d')).toBeInTheDocument();

    const problemHeader = screen.getByRole('rowheader', { name: /Climbing Stairs/i });
    expect(problemHeader).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Recurrence' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'State definition' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Time' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Space' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Renderer' })).toBeInTheDocument();
  });

  it('triggers window.print when the print button is clicked', () => {
    mocked.problems = [makeProblem()];
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    render(<CheatSheetPage />);

    fireEvent.click(screen.getByRole('button', { name: /print cheat sheet/i }));

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when the registry has no problems', () => {
    mocked.problems = [];

    render(<CheatSheetPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/No problems to show yet/i);
    expect(screen.queryAllByRole('table')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /print cheat sheet/i })).toBeInTheDocument();
  });
});
