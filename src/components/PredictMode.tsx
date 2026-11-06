import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';

export interface PredictQuestion {
  /** Changes when a new cell is being predicted. */
  id: string;
  prompt: string;
  answer: string;
  hint?: string;
  explanation?: string;
}

export interface PredictScore {
  correct: number;
  attempts: number;
}

export interface PredictModeProps {
  question: PredictQuestion;
  score: PredictScore;
  onResult: (correct: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isCorrect(draft: string, answer: string): boolean {
  const left = normalize(draft);
  const right = normalize(answer);
  if (left === right) return true;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  return left !== '' && right !== '' && Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber === rightNumber;
}

export function PredictMode({ question, score, onResult, disabled = false, className }: PredictModeProps) {
  const [draft, setDraft] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  const answered = result !== null;
  const locked = disabled || answered;

  useEffect(() => {
    setDraft('');
    setResult(null);
    setHintShown(false);
    setError('');
  }, [question.id]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    if (draft.trim() === '') {
      setError('Enter a prediction before checking.');
      return;
    }
    const correct = isCorrect(draft, question.answer);
    setError('');
    setResult(correct);
    onResult(correct);
  }

  return (
    <section aria-label="Predict the next cell" className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Predict</p>
          <h3 id={`${id}-prompt`} className="mt-1 text-base font-bold text-ink">
            {question.prompt}
          </h3>
        </div>
        <p
          aria-label={`Score ${score.correct} out of ${score.attempts} correct`}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-muted"
        >
          Score <span className="font-mono text-ink">{score.correct}</span> / {score.attempts} correct
        </p>
      </div>

      <form onSubmit={submit} noValidate className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label htmlFor={`${id}-answer`} className="label">
            Your prediction
          </label>
          <input
            id={`${id}-answer`}
            className="field font-mono"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError('');
            }}
            disabled={locked}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={locked}>
          Check answer
        </button>
        {question.hint ? (
          <button
            type="button"
            className="btn-ghost"
            aria-expanded={hintShown}
            onClick={() => setHintShown((shown) => !shown)}
          >
            {hintShown ? 'Hide hint' : 'Show hint'}
          </button>
        ) : null}
      </form>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm font-semibold text-bad">
          {error}
        </p>
      ) : null}

      {hintShown && question.hint ? (
        <p className="mt-2 rounded-lg border border-warn border-dashed bg-warn/10 px-3 py-2 text-sm text-ink">
          <span aria-hidden="true" className="mr-1">◆</span>
          Hint: {question.hint}
        </p>
      ) : null}

      {answered ? (
        <div
          role="status"
          aria-live="polite"
          className={[
            'mt-3 rounded-xl border px-3 py-2 text-sm',
            result ? 'border-good bg-good/10 text-ink' : 'border-bad bg-bad/5 text-ink',
          ].join(' ')}
        >
          <p className="font-bold">
            <span aria-hidden="true" className="mr-1">{result ? '✓' : '×'}</span>
            {result ? 'Correct' : `Not quite. Expected ${question.answer}.`}
          </p>
          {question.explanation ? <p className="mt-1 text-muted">{question.explanation}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
