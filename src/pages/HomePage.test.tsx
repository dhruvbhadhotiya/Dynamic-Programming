import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CategoryId, ProblemModule } from '../engine/types';
import { HomePage } from './HomePage';

const mockState = vi.hoisted(() => ({ problems: [] as ProblemModule[] }));

vi.mock('../engine/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../engine/registry')>();
  return {
    ...actual,
    problems: mockState.problems,
    getProblemsByCategory: (category: CategoryId) =>
      mockState.problems.filter((p) => p.category === category),
  };
});

function makeQuiz(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    q: `Question ${i}?`,
    options: ['A', 'B'],
    answer: 0,
    why: 'Because.',
  }));
}

function makeProblem(overrides: Partial<ProblemModule> = {}): ProblemModule {
  return {
    id: 'test-problem',
    title: 'Test Problem',
    category: '1d',
    difficulty: 'easy',
    summary: 'Summary.',
    stateDefinition: 'dp[i]',
    recurrence: 'dp[i] = dp[i-1] + dp[i-2]',
    complexity: { time: 'O(n)', space: 'O(n)' },
    renderer: 'table1d',
    inputSchema: [{ name: 'n', label: 'n', type: 'number', min: 0, max: 10 }],
    defaultInput: { n: 5 },
    generateSteps: () => [],
    code: { python: 'x = 1', javascript: 'let x = 1', cpp: 'int x = 1;' },
    quiz: makeQuiz(),
    ...overrides,
  } as ProblemModule;
}

const CLIMBING_STAIRS = makeProblem({
  id: 'climbing-stairs',
  title: 'Climbing Stairs',
  category: '1d',
  difficulty: 'easy',
  summary: 'Climb the stairs by counting the ways.',
});

const HOUSE_ROBBER = makeProblem({
  id: 'house-robber',
  title: 'House Robber',
  category: '1d',
  difficulty: 'medium',
  summary: 'Rob houses without stealing from adjacent homes.',
});

const COIN_CHANGE = makeProblem({
  id: 'coin-change',
  title: 'Coin Change',
  category: 'counting',
  difficulty: 'medium',
  summary: 'Find the fewest coins for a given amount.',
});

const EDIT_DISTANCE = makeProblem({
  id: 'edit-distance',
  title: 'Edit Distance',
  category: 'strings',
  difficulty: 'hard',
  summary: 'Transform one string into another with edits.',
});

const ALL_PROBLEMS = [CLIMBING_STAIRS, HOUSE_ROBBER, COIN_CHANGE, EDIT_DISTANCE];

function setProblems(list: ProblemModule[]): void {
  mockState.problems.splice(0, mockState.problems.length, ...list);
}

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  setProblems([]);
});

describe('HomePage', () => {
  it('shows the empty state when the registry is empty', () => {
    setProblems([]);
    renderHome();

    expect(screen.getByText('No problems found.')).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting your search/i)).toBeInTheDocument();
    expect(screen.getByText('Showing 0 of 0 problems')).toBeInTheDocument();
  });

  it('renders problem cards with links, difficulty, and complexity', () => {
    setProblems(ALL_PROBLEMS);
    renderHome();

    const climbingLink = screen.getByRole('link', { name: 'Climbing Stairs' });
    expect(climbingLink).toBeInTheDocument();
    expect(climbingLink).toHaveAttribute('href', '/problem/climbing-stairs');
    expect(screen.getByText('Climb the stairs by counting the ways.')).toBeInTheDocument();
    expect(screen.getByLabelText('Difficulty: Easy')).toBeInTheDocument();
    expect(screen.getAllByText(/Complexity:/).length).toBeGreaterThan(0);
    expect(screen.getByText('Showing 4 of 4 problems')).toBeInTheDocument();
  });

  it('filters by search text across titles and summaries', async () => {
    const user = userEvent.setup();
    setProblems(ALL_PROBLEMS);
    renderHome();

    const search = screen.getByLabelText('Search problems');
    await user.type(search, 'robber');

    expect(screen.getByRole('link', { name: 'House Robber' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Climbing Stairs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Coin Change' })).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 4 problems')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'Transform one string');

    expect(screen.getByRole('link', { name: 'Edit Distance' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'House Robber' })).not.toBeInTheDocument();
  });

  it('filters by category and hides the others', async () => {
    const user = userEvent.setup();
    setProblems(ALL_PROBLEMS);
    renderHome();

    await user.click(screen.getByRole('button', { name: 'Strings' }));

    expect(screen.getByRole('link', { name: 'Edit Distance' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Climbing Stairs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'House Robber' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Coin Change' })).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 4 problems')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All categories' }));
    expect(screen.getByRole('link', { name: 'Climbing Stairs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Distance' })).toBeInTheDocument();
  });

  it('filters by difficulty', async () => {
    const user = userEvent.setup();
    setProblems(ALL_PROBLEMS);
    renderHome();

    const select = screen.getByLabelText('Difficulty');
    await user.selectOptions(select, 'hard');

    expect(screen.getByRole('link', { name: 'Edit Distance' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Climbing Stairs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'House Robber' })).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 4 problems')).toBeInTheDocument();
  });

  it('shows saved quiz totals from localStorage and the no-scores message otherwise', () => {
    localStorage.setItem('dp-quiz:climbing-stairs', JSON.stringify({ correct: 2, attempts: 3 }));
    localStorage.setItem('dp-quiz:house-robber', JSON.stringify({ correct: 1, attempts: 2 }));
    setProblems(ALL_PROBLEMS);
    const { unmount } = renderHome();

    expect(screen.getByText(/3 correct out of 5 attempts/)).toBeInTheDocument();
    expect(screen.getByText(/across 2 quizzes/)).toBeInTheDocument();
    unmount();

    localStorage.clear();
    renderHome();
    expect(screen.getByText(/No quiz scores saved yet/i)).toBeInTheDocument();
  });

  it('links to teacher mode', () => {
    setProblems(ALL_PROBLEMS);
    renderHome();

    const teacherLink = screen.getByRole('link', { name: /Enter teacher mode/i });
    expect(teacherLink).toHaveAttribute('href', '/#teacher');
  });
});
