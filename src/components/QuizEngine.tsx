import { useEffect, useState } from 'react';
import type { QuizQuestion } from '../engine/types';

export interface QuizEngineProps {
  questions: QuizQuestion[];
  problemId: string;
  scoreKey?: string | undefined;
  onFinish?: ((correct: number, total: number) => void) | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

export interface QuizScore {
  correct: number;
  attempts: number;
}

function storageKeyFor(problemId: string, scoreKey: string | undefined): string {
  return `dp-quiz:${scoreKey ?? problemId}`;
}

function loadScore(key: string): QuizScore {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { correct: 0, attempts: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { correct: 0, attempts: 0 };
    const record = parsed as Record<string, unknown>;
    const correct = typeof record.correct === 'number' && Number.isInteger(record.correct) && record.correct >= 0
      ? record.correct
      : 0;
    const attempts = typeof record.attempts === 'number' && Number.isInteger(record.attempts) && record.attempts >= 0
      ? record.attempts
      : 0;
    return { correct, attempts };
  } catch {
    return { correct: 0, attempts: 0 };
  }
}

function saveScore(key: string, score: QuizScore): void {
  try {
    localStorage.setItem(key, JSON.stringify(score));
  } catch {
    // storage may be unavailable (privacy mode / SSR); the quiz still works in-memory.
  }
}

function clearScore(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function QuizEngine({
  questions,
  problemId,
  scoreKey,
  onFinish,
  disabled = false,
  className,
}: QuizEngineProps) {
  const storageKey = storageKeyFor(problemId, scoreKey);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [storedScore, setStoredScore] = useState<QuizScore>(() => loadScore(storageKey));

  // Reload the stored score when the storage key changes.
  useEffect(() => {
    setStoredScore(loadScore(storageKey));
  }, [storageKey]);

  // Reset progress when a different question set is passed in.
  useEffect(() => {
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setDone(false);
    setSessionCorrect(0);
  }, [questions, storageKey]);

  if (questions.length === 0) {
    return (
      <section aria-label="Quiz" className={className}>
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
          No quiz questions available for this problem yet. Please check back soon!
        </p>
        <p className="mt-2 text-sm text-muted" aria-label={`Score ${storedScore.correct} out of ${storedScore.attempts} correct`}>
          Score: {storedScore.correct} correct out of {storedScore.attempts} attempts
        </p>
      </section>
    );
  }

  const question = questions[Math.min(index, questions.length - 1)];
  const total = questions.length;
  if (!question) {
    return (
      <section aria-label="Quiz" className={className}>
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
          No quiz questions available for this problem yet. Please check back soon!
        </p>
      </section>
    );
  }
  const isLast = index >= total - 1;
  const wasCorrect = answered && selected !== null && selected === question.answer;

  function answer(optionIndex: number): void {
    if (disabled || answered || done) return;
    const current = questions[Math.min(index, questions.length - 1)];
    if (!current) return;
    if (optionIndex < 0 || optionIndex >= current.options.length) return;
    const correct = optionIndex === current.answer;
    setSelected(optionIndex);
    setAnswered(true);
    if (correct) setSessionCorrect((count) => count + 1);
    const nextScore: QuizScore = {
      correct: storedScore.correct + (correct ? 1 : 0),
      attempts: storedScore.attempts + 1,
    };
    setStoredScore(nextScore);
    saveScore(storageKey, nextScore);
  }

  function next(): void {
    if (!answered || disabled || done) return;
    if (isLast) {
      setDone(true);
      onFinish?.(sessionCorrect, total);
    } else {
      setIndex((current) => current + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  function restart(): void {
    clearScore(storageKey);
    setStoredScore({ correct: 0, attempts: 0 });
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setSessionCorrect(0);
    setDone(false);
  }

  function resetScore(): void {
    clearScore(storageKey);
    setStoredScore({ correct: 0, attempts: 0 });
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setSessionCorrect(0);
    setDone(false);
  }

  if (done) {
    return (
      <section aria-label="Quiz" className={className}>
        <h3 className="text-base font-bold text-ink">Quiz complete</h3>
        <p role="status" aria-live="polite" className="mt-2 text-sm text-ink">
          <span aria-hidden="true" className="mr-1">✓</span>
          You scored {sessionCorrect} out of {total} correct.
        </p>
        <p className="mt-1 text-sm text-muted" aria-label={`Score ${storedScore.correct} out of ${storedScore.attempts} correct`}>
          Total score: {storedScore.correct} correct out of {storedScore.attempts} attempts.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={restart}>
            Restart
          </button>
          <button type="button" className="btn-ghost" onClick={resetScore}>
            Reset score
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Quiz" className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">Quiz</p>
        <p className="text-sm text-muted">Question {index + 1} of {total}</p>
      </div>

      <p className="mt-1 text-sm text-muted" aria-label={`Score ${storedScore.correct} out of ${storedScore.attempts} correct`}>
        Score: {storedScore.correct} correct out of {storedScore.attempts} attempts
      </p>

      <h3 className="mt-3 text-base font-bold text-ink">{question.q}</h3>

      <div role="group" aria-label="Answer options" className="mt-3 flex flex-col gap-2">
        {question.options.map((option, optionIndex) => {
          const isSelected = selected === optionIndex;
          const isAnswer = answered && optionIndex === question.answer;
          const isWrongPick = answered && isSelected && !isAnswer;
          const label = isAnswer ? `${option} — Correct` : isWrongPick ? `${option} — Incorrect` : option;
          return (
            <button
              key={optionIndex}
              type="button"
              disabled={disabled || answered}
              aria-pressed={isSelected}
              aria-label={label}
              onClick={() => answer(optionIndex)}
              className={[
                'w-full rounded-xl border px-3 py-2 text-left text-sm font-medium',
                isAnswer
                  ? 'border-good bg-good/10 text-ink'
                  : isWrongPick
                    ? 'border-bad bg-bad/5 text-ink'
                    : isSelected
                      ? 'border-brand bg-brand/10 text-ink'
                      : 'border-line bg-surface text-ink hover:border-brand',
                disabled ? 'opacity-60' : '',
              ].join(' ')}
            >
              <span aria-hidden="true" className="mr-2 font-mono text-muted">
                {String.fromCharCode(65 + optionIndex)}.
              </span>
              {option}
              {isAnswer ? (
                <span className="ml-2 font-bold">
                  <span aria-hidden="true" className="mr-1">✓</span>Correct
                </span>
              ) : null}
              {isWrongPick ? (
                <span className="ml-2 font-bold">
                  <span aria-hidden="true" className="mr-1">×</span>Incorrect
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div
          role="status"
          aria-live="polite"
          className={[
            'mt-3 rounded-xl border px-3 py-2 text-sm',
            wasCorrect ? 'border-good bg-good/10 text-ink' : 'border-bad bg-bad/5 text-ink',
          ].join(' ')}
        >
          <p className="font-bold">
            <span aria-hidden="true" className="mr-1">{wasCorrect ? '✓' : '×'}</span>
            {wasCorrect ? 'Correct!' : `Incorrect. The correct answer is ${question.options[question.answer]}.`}
          </p>
          <p className="mt-1 text-muted">{question.why}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {answered ? (
          <button type="button" className="btn-primary" onClick={next} disabled={disabled}>
            Next
          </button>
        ) : null}
        <button type="button" className="btn-ghost" onClick={resetScore}>
          Reset score
        </button>
      </div>
    </section>
  );
}
