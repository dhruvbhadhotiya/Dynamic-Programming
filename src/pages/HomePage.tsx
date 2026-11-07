import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, getProblemsByCategory, problems } from '../engine/registry';
import { useTeacherMode } from '../engine/teacherMode';
import type { CategoryId, ProblemModule } from '../engine/types';

type Difficulty = ProblemModule['difficulty'];
type CategoryFilter = CategoryId | 'all';
type DifficultyFilter = Difficulty | 'all';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_ICONS: Record<Difficulty, string> = {
  easy: '●',
  medium: '◐',
  hard: '▲',
};

interface SavedProgress {
  correct: number;
  attempts: number;
  quizzes: number;
}

function readIntField(record: Record<string, unknown>, names: readonly string[]): number {
  for (const name of names) {
    const value = record[name];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
      return value;
    }
  }
  return 0;
}

function parseStoredScore(raw: string): { correct: number; attempts: number } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const correct = readIntField(record, ['correct', 'score']);
      const attempts = readIntField(record, ['attempts', 'attempted', 'total', 'answered', 'count']);
      return { correct, attempts };
    }
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'boolean')) {
      const attempts = parsed.length;
      const correct = parsed.filter((item) => item === true).length;
      return { correct, attempts };
    }
    return null;
  } catch {
    return null;
  }
}

function readSavedProgress(): SavedProgress {
  const empty: SavedProgress = { correct: 0, attempts: 0, quizzes: 0 };
  try {
    if (typeof localStorage === 'undefined') return empty;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null && (key.startsWith('dp-quiz:') || key.startsWith('dp-predict:'))) {
        keys.push(key);
      }
    }
    let correct = 0;
    let attempts = 0;
    let quizzes = 0;
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      const score = parseStoredScore(raw);
      if (score === null) continue;
      correct += score.correct;
      attempts += score.attempts;
      quizzes += 1;
    }
    return { correct, attempts, quizzes };
  } catch {
    return empty;
  }
}

export function HomePage() {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [savedProgress] = useState<SavedProgress>(readSavedProgress);
  const setTeacherEnabled = useTeacherMode((state) => state.setEnabled);

  function enterTeacherMode(event: MouseEvent<HTMLAnchorElement>) {
    // The href stays an anchor for semantics, but hash routing would treat
    // "#teacher" as a route, so enable teacher mode and focus the toolbar.
    event.preventDefault();
    setTeacherEnabled(true);
    requestAnimationFrame(() => document.getElementById('teacher')?.focus());
  }

  const categoryOptions = useMemo(() => Object.values(CATEGORIES), []);

  const baseProblems = useMemo(
    () => (categoryFilter === 'all' ? problems : getProblemsByCategory(categoryFilter)),
    [categoryFilter],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return baseProblems.filter((problem) => {
      if (difficultyFilter !== 'all' && problem.difficulty !== difficultyFilter) return false;
      if (needle.length === 0) return true;
      return (
        problem.title.toLowerCase().includes(needle) ||
        problem.summary.toLowerCase().includes(needle)
      );
    });
  }, [baseProblems, difficultyFilter, query]);

  const hasScores = savedProgress.attempts > 0 || savedProgress.correct > 0;
  const quizPlural = savedProgress.quizzes === 1 ? 'quiz' : 'quizzes';

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <header className="mx-auto w-full max-w-7xl pt-12">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">DP Playground</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Learn dynamic programming, one visualization at a time
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Browse interactive problems by category and difficulty. Search by title or summary to find
          the next pattern to master.
        </p>
      </header>

      <section
        aria-label="Saved progress"
        className="mt-8 rounded-2xl border border-line bg-surface p-5"
      >
        <h2 className="text-lg font-bold text-ink">Your progress</h2>
        {hasScores ? (
          <p className="mt-2 text-sm text-ink">
            {`${savedProgress.correct} correct out of ${savedProgress.attempts} attempts${
              savedProgress.quizzes > 0
                ? ` across ${savedProgress.quizzes} ${quizPlural}`
                : ''
            }.`}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No quiz scores saved yet. Finish a quiz on any problem to see your progress here.
          </p>
        )}
      </section>

      <section aria-label="Filter problems" className="mt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-md">
            <label htmlFor="problem-search" className="text-sm font-bold text-ink">
              Search problems
            </label>
            <input
              id="problem-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title or summary"
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            />
          </div>
          <div>
            <label htmlFor="difficulty-filter" className="text-sm font-bold text-ink">
              Difficulty
            </label>
            <select
              id="difficulty-filter"
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value as DifficultyFilter)}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:w-auto"
            >
              <option value="all">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div role="group" aria-label="Filter by category" className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
            className={
              categoryFilter === 'all'
                ? 'min-h-11 rounded-full border border-brand bg-brand px-3 py-1.5 text-sm font-semibold text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                : 'min-h-11 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
            }
          >
            All categories
          </button>
          {categoryOptions.map((category) => {
            const isActive = categoryFilter === category.id;
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setCategoryFilter(category.id)}
                className={
                  isActive
                    ? 'min-h-11 rounded-full border border-brand bg-brand px-3 py-1.5 text-sm font-semibold text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                    : 'min-h-11 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                }
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <p role="status" aria-live="polite" className="mt-3 text-sm text-muted">
          Showing {filtered.length} of {problems.length} problems
        </p>
      </section>

      {filtered.length === 0 ? (
        <div
          role="status"
          className="mt-8 rounded-2xl border border-line bg-surface p-6 text-center"
        >
          <p className="text-lg font-bold text-ink">No problems found.</p>
          <p className="mt-2 text-sm text-muted">
            Try adjusting your search, category, or difficulty filters. New problems are added
            regularly.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((problem) => (
            <li key={problem.id}>
              <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    role="img"
                    aria-label={`Difficulty: ${DIFFICULTY_LABELS[problem.difficulty]}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-bold text-ink"
                  >
                    <span aria-hidden="true">{DIFFICULTY_ICONS[problem.difficulty]}</span>
                    {DIFFICULTY_LABELS[problem.difficulty]}
                  </span>
                  <span className="text-xs font-semibold text-muted">
                    {CATEGORIES[problem.category].label}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold text-ink">
                  <Link
                    to={`/problem/${problem.id}`}
                    className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    {problem.title}
                  </Link>
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted">{problem.summary}</p>
                <p className="mt-4 text-xs text-muted">
                  <span className="font-bold text-ink">Complexity:</span> Time {problem.complexity.time}
                  {' · '}Space {problem.complexity.space}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}

      <section
        aria-label="Teacher mode"
        className="mt-12 rounded-2xl border border-brand/30 bg-brand/5 p-5"
      >
        <h2 className="text-lg font-bold text-ink">Teaching a class?</h2>
        <p className="mt-2 text-sm text-muted">
          Teacher mode enlarges text, can hide code, and provides fullscreen classroom controls so
          every seat can follow along.
        </p>
        <a
          href="/#teacher"
          onClick={enterTeacherMode}
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-canvas hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Enter teacher mode
        </a>
      </section>
    </div>
  );
}
