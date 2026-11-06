import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CodePanel } from '../components/CodePanel';
import { ExplanationBar, StepCounter, VariableWatch } from '../components/InfoPanels';
import { InputForm } from '../components/InputForm';
import { ModeToggle } from '../components/ModeToggle';
import { PlayerControls } from '../components/PlayerControls';
import { PredictMode } from '../components/PredictMode';
import type { PredictQuestion, PredictScore } from '../components/PredictMode';
import { QuizEngine } from '../components/QuizEngine';
import { CATEGORIES, getProblem } from '../engine/registry';
import { isRecord, isRendererState } from '../engine/types';
import type {
  CellValue,
  Mode,
  ProblemModule,
  RendererState,
  Step,
} from '../engine/types';
import { usePlayer, usePlayerKeyboard } from '../engine/usePlayer';
import type { InputValues } from '../engine/inputValidation';
import { DagGraph } from '../renderers/DagGraph';
import { RecursionTree } from '../renderers/RecursionTree';
import { StringAlign } from '../renderers/StringAlign';
import { Table1D } from '../renderers/Table1D';
import { Table2D } from '../renderers/Table2D';

const ALL_MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];
const MAX_MESSAGE_ANSWER = 80;

function modesFor(problem: ProblemModule | undefined): Mode[] {
  if (!problem || !problem.modes || problem.modes.length === 0) return [...ALL_MODES];
  return ALL_MODES.filter((mode) => problem.modes?.includes(mode));
}

function defaultModeFor(problem: ProblemModule | undefined): Mode {
  const modes = modesFor(problem);
  return modes[0] ?? 'tabulation';
}

function toInputValues(value: unknown): InputValues {
  if (!isRecord(value)) return {};
  const out: InputValues = {};
  for (const [name, item] of Object.entries(value)) out[name] = item;
  return out;
}

function cellValueAt(state: RendererState, pos: number[]): CellValue | undefined {
  const [first, second] = pos;
  if (first === undefined || first < 0) return undefined;
  switch (state.kind) {
    case 'table1d':
    case 'bitmaskGrid':
      return state.values[first];
    case 'table2d':
    case 'stringAlign':
    case 'intervalTriangle': {
      if (second === undefined || second < 0) return undefined;
      const row: CellValue[] | undefined = state.values[first];
      return row?.[second];
    }
    case 'recursionTree':
      return state.nodes[first]?.label;
    case 'dagGraph':
      return state.nodes[first]?.label;
    case 'treeDP':
      return state.nodes[first]?.label;
    default:
      return undefined;
  }
}

function truncateMessage(message: string): string {
  const trimmed = message.trim();
  return trimmed.length <= MAX_MESSAGE_ANSWER ? trimmed : `${trimmed.slice(0, MAX_MESSAGE_ANSWER - 1)}…`;
}

function derivePredictQuestion(problemId: string, index: number, next: Step | undefined): PredictQuestion {
  const base = { id: `${problemId}-predict-${index + 1}` };
  if (!next) {
    return { ...base, prompt: 'What happens next?', answer: 'The walkthrough is finished.' };
  }
  if (isRendererState(next.state)) {
    const candidate =
      next.highlights.find((item) => item.kind === 'active') ??
      next.highlights.find((item) => item.kind === 'result') ??
      next.highlights[0];
    if (candidate) {
      const value = cellValueAt(next.state, candidate.pos);
      if (value !== undefined && value !== null && value !== '') {
        return {
          ...base,
          prompt: 'What value goes into the highlighted cell?',
          answer: String(value),
          explanation: next.message,
        };
      }
    }
  }
  const vars = next.vars ? Object.entries(next.vars) : [];
  const firstVar = vars[0];
  if (firstVar) {
    return {
      ...base,
      prompt: `What is ${firstVar[0]} after this step?`,
      answer: String(firstVar[1]),
      explanation: next.message,
    };
  }
  return { ...base, prompt: 'What happens next?', answer: truncateMessage(next.message) };
}

function RendererView({ problem, step }: { problem: ProblemModule; step: Step }) {
  const state = step.state;
  if (!isRendererState(state)) {
    return (
      <p role="note" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        No visualization is available for this step.
      </p>
    );
  }
  switch (problem.renderer) {
    case 'table1d':
      return state.kind === 'table1d' ? (
        <Table1D state={state} highlights={step.highlights} />
      ) : (
        <RendererFallback renderer={problem.renderer} />
      );
    case 'table2d':
      return state.kind === 'table2d' ? (
        <Table2D state={state} highlights={step.highlights} />
      ) : (
        <RendererFallback renderer={problem.renderer} />
      );
    case 'stringAlign':
      return state.kind === 'stringAlign' ? (
        <StringAlign state={state} highlights={step.highlights} />
      ) : (
        <RendererFallback renderer={problem.renderer} />
      );
    case 'recursionTree':
      return state.kind === 'recursionTree' ? (
        <RecursionTree state={state} highlights={step.highlights} />
      ) : (
        <RendererFallback renderer={problem.renderer} />
      );
    case 'dagGraph':
      return state.kind === 'dagGraph' ? (
        <DagGraph state={state} highlights={step.highlights} />
      ) : (
        <RendererFallback renderer={problem.renderer} />
      );
    default:
      return <RendererFallback renderer={problem.renderer} step={step} />;
  }
}

function RendererFallback({ renderer, step }: { renderer: string; step?: Step }) {
  return (
    <div role="note" className="rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center">
      <p className="text-base font-bold text-ink">No visualization for renderer “{renderer}” yet</p>
      <p className="mt-2 text-sm text-muted">
        This renderer is not implemented yet — follow the explanation below instead.
      </p>
      {step ? <p className="mt-3 text-sm font-medium text-ink">{step.message}</p> : null}
    </div>
  );
}

export function ProblemPage() {
  const { id } = useParams();
  const problem: ProblemModule | undefined = id ? getProblem(id) : undefined;
  const problemId = problem?.id;

  const [input, setInput] = useState<InputValues>(() => toInputValues(problem?.defaultInput));
  const [mode, setMode] = useState<Mode>(() => defaultModeFor(problem));
  const [score, setScore] = useState<PredictScore>({ correct: 0, attempts: 0 });

  const lastProblemId = useRef<string | undefined>(problemId);
  useEffect(() => {
    if (lastProblemId.current !== problemId) {
      lastProblemId.current = problemId;
      if (problem) {
        setInput(toInputValues(problem.defaultInput));
        setMode(defaultModeFor(problem));
        setScore({ correct: 0, attempts: 0 });
      }
    }
  }, [problem, problemId]);

  const modes = useMemo(() => modesFor(problem), [problem]);
  const effectiveMode: Mode = problem && modes.includes(mode) ? mode : defaultModeFor(problem);

  const steps = useMemo<Step[]>(() => {
    if (!problem) return [];
    try {
      return problem.generateSteps(input, effectiveMode);
    } catch {
      return [];
    }
  }, [problem, input, effectiveMode]);

  const load = usePlayer((state) => state.load);
  const index = usePlayer((state) => state.index);
  usePlayerKeyboard();
  useEffect(() => {
    load(steps);
  }, [steps, load]);

  const current: Step | undefined = steps[index] ?? steps[steps.length - 1];
  const next: Step | undefined = steps[index + 1];
  const operations = steps.length === 0 ? 0 : index + 1;

  const predictQuestion = useMemo<PredictQuestion>(
    () => derivePredictQuestion(problemId ?? 'unknown', index, next),
    [problemId, index, next],
  );

  function handlePredictResult(correct: boolean) {
    setScore((currentScore) => ({
      correct: currentScore.correct + (correct ? 1 : 0),
      attempts: currentScore.attempts + 1,
    }));
  }

  function handleApplyInput(value: InputValues) {
    setInput(value);
  }

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode);
  }

  if (!problem) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">DP Playground</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Problem not found</h1>
        <p className="mt-4 text-lg text-muted">
          {id ? `We could not find a problem with id “${id}”.` : 'No problem id was given.'} Check the
          roadmap for a valid problem.
        </p>
        <Link className="mt-8 inline-block rounded-lg bg-brand px-5 py-3 font-semibold text-white" to="/">
          Back to the roadmap
        </Link>
      </section>
    );
  }

  const categoryLabel = CATEGORIES?.[problem.category]?.label ?? problem.category;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-labelledby="problem-title">
      <Link to="/" className="text-sm font-bold text-brand underline underline-offset-4">
        ← All problems
      </Link>

      <header className="mt-4">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">{categoryLabel}</p>
        <h1 id="problem-title" className="mt-2 text-4xl font-extrabold tracking-tight">
          {problem.title}
        </h1>
        <p className="mt-3 max-w-prose text-lg text-muted">{problem.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Problem metadata">
          <span className="chip">Difficulty: {problem.difficulty}</span>
          <span className="chip">Category: {problem.category}</span>
          <span className="chip">Renderer: {problem.renderer}</span>
          <span className="chip">Time: {problem.complexity.time}</span>
          <span className="chip">Space: {problem.complexity.space}</span>
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="State, recurrence and complexity">
        <div className="card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand">State</h2>
          <p className="mt-2 text-sm leading-6">{problem.stateDefinition}</p>
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand">Recurrence</h2>
          <p className="mt-2 font-mono text-sm leading-6">{problem.recurrence}</p>
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand">Complexity</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Time</dt>
              <dd className="font-mono font-semibold">{problem.complexity.time}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Space</dt>
              <dd className="font-mono font-semibold">{problem.complexity.space}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-6 card p-4 sm:p-5" aria-label="Controls">
        <div className="grid gap-6 lg:grid-cols-2">
          <InputForm schema={problem.inputSchema} value={input} onApply={handleApplyInput} />
          <div className="flex flex-col gap-4">
            <ModeToggle modes={modes} mode={effectiveMode} onChange={handleModeChange} operations={operations} />
            <PlayerControls />
          </div>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <section className="card p-4 sm:p-5" aria-label="Visualization">
          {current ? (
            <RendererView problem={problem} step={current} />
          ) : (
            <p role="note" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
              No steps to show for this input. Try applying a valid input.
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-4" aria-label="Explanation, code and practice">
          {current ? (
            <>
              <ExplanationBar message={current.message} codeLine={current.codeLine} />
              <section className="card p-4" aria-label="Step details">
                <StepCounter index={index} total={steps.length} />
                <div className="mt-3">
                  <VariableWatch vars={current.vars ?? {}} />
                </div>
              </section>
              <CodePanel code={problem.code} codeLine={current.codeLine} />
            </>
          ) : null}
          <PredictMode question={predictQuestion} score={score} onResult={handlePredictResult} />
          <QuizEngine questions={problem.quiz} problemId={problem.id} />
        </aside>
      </div>
    </article>
  );
}

export default ProblemPage;
