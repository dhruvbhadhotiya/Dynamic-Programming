import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CellValue, Mode, ProblemModule, Step, Table1DState } from '../engine/types';
import { usePlayer } from '../engine/usePlayer';
import { ProblemPage } from './ProblemPage';

const { fakeProblem } = vi.hoisted(() => {
  function buildSteps(mode: Mode): Step[] {
    const prefix =
      mode === 'memo' ? 'Memoization' : mode === 'tabulation' ? 'Tabulation' : 'Brute force';
    const table = (values: CellValue[]): Table1DState => ({
      kind: 'table1d',
      values,
      caption: 'Fake Fibonacci walkthrough',
      indexName: 'i',
    });
    return [
      {
        state: table([0, 1, null, null]),
        highlights: [{ pos: [1], kind: 'base' }],
        codeLine: 1,
        message: `${prefix}: start`,
        vars: { i: 1 },
      },
      {
        state: table([0, 1, 1, null]),
        highlights: [
          { pos: [2], kind: 'active' },
          { pos: [0], kind: 'dependency' },
          { pos: [1], kind: 'dependency' },
        ],
        codeLine: 2,
        message: `${prefix}: fill dp[2] = 1`,
        vars: { i: 2, ans: 1 },
      },
      {
        state: table([0, 1, 1, 2]),
        highlights: [{ pos: [3], kind: 'result' }],
        codeLine: 3,
        message: `${prefix}: answer is 2`,
        vars: { i: 3, ans: 2 },
      },
    ];
  }

  const fake: ProblemModule<Record<string, unknown>> = {
    id: 'fake-problem',
    title: 'Fake Fibonacci',
    category: '1d',
    difficulty: 'easy',
    summary: 'A tiny stand-in problem for integration tests.',
    stateDefinition: 'dp[i] is the i-th Fibonacci number.',
    recurrence: 'dp[i] = dp[i-1] + dp[i-2]',
    complexity: { time: 'O(n)', space: 'O(n)' },
    renderer: 'table1d',
    inputSchema: [{ name: 'n', label: 'n', type: 'number', min: 2, max: 6 }],
    defaultInput: { n: 3 },
    modes: ['bruteforce', 'memo', 'tabulation'],
    generateSteps: (_input, mode) => buildSteps(mode),
    code: {
      python: 'def solve(n):\n    dp = [0] * (n + 1)\n    return dp[n]',
      javascript: 'function solve(n) {\n  const dp = [0] * (n + 1);\n  return dp[n];\n}',
      cpp: 'int solve(int n) {\n  vector<int> dp(n + 1);\n  return dp[n];\n}',
    },
    quiz: [
      { q: 'Quiz one: dp[2] is?', options: ['1', '2'], answer: 0, why: 'dp[2] = 1.' },
      { q: 'Quiz two: dp[3] is?', options: ['1', '2'], answer: 1, why: 'dp[3] = 2.' },
      { q: 'Quiz three: dp[0] is?', options: ['0', '1'], answer: 0, why: 'dp[0] = 0.' },
    ],
  };
  return { fakeProblem: fake };
});

vi.mock('../engine/registry', () => ({
  CATEGORIES: {
    '1d': { id: '1d', label: '1D DP', description: 'Linear recurrences.', icon: '—', color: '#2563eb' },
  },
  getProblem: (id: string) => (id === fakeProblem.id ? fakeProblem : undefined),
}));

function renderProblem(entry = '/problem/fake-problem') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/problem/:id" element={<ProblemPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  usePlayer.setState({ steps: [], index: 0, playing: false, speed: 1 });
  window.localStorage.clear();
});

describe('ProblemPage', () => {
  it('renders the header, complexity callouts and quiz from the problem module', () => {
    renderProblem();

    expect(screen.getByRole('heading', { level: 1, name: 'Fake Fibonacci' })).toBeInTheDocument();
    expect(screen.getByText('Difficulty: easy')).toBeInTheDocument();
    expect(screen.getByText('Category: 1d')).toBeInTheDocument();
    expect(screen.getByText('dp[i] is the i-th Fibonacci number.')).toBeInTheDocument();
    expect(screen.getByText('dp[i] = dp[i-1] + dp[i-2]')).toBeInTheDocument();
    expect(screen.getAllByText('O(n)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Quiz one: dp\[2\] is\?/)).toBeInTheDocument();
  });

  it('renders the renderer state for the current step', () => {
    renderProblem();

    expect(screen.getByText('Fake Fibonacci walkthrough')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Fake Fibonacci walkthrough — scrollable table' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('updates the explanation and step counter when stepping forward', async () => {
    const user = userEvent.setup();
    renderProblem();

    expect(screen.getByText('Brute force: start')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText('Brute force: fill dp[2] = 1')).toBeInTheDocument();
    expect(screen.queryByText('Brute force: start')).not.toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Step scrubber' })).toHaveValue('1');
  });

  it('switches walkthrough steps when the solution mode changes', async () => {
    const user = userEvent.setup();
    renderProblem();

    expect(screen.getByText('Brute force: start')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /memoization/i }));
    expect(screen.getByText('Memoization: start')).toBeInTheDocument();
    expect(screen.queryByText('Brute force: start')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tabulation/i }));
    expect(screen.getByText('Tabulation: start')).toBeInTheDocument();
  });

  it('shows a not-found page for an unknown problem id', () => {
    renderProblem('/problem/nope');

    expect(screen.getByText('Problem not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to the roadmap/i })).toHaveAttribute('href', '/');
  });
});
