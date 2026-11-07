import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExplanationBar, StepCounter } from '../components/InfoPanels';
import { PlayerControls } from '../components/PlayerControls';
import { CATEGORIES } from '../engine/registry';
import { getLesson } from '../engine/lessonTypes';
import type { LessonDiagram } from '../engine/lessonTypes';
import { isRendererState } from '../engine/types';
import type { Step } from '../engine/types';
import { usePlayer, usePlayerKeyboard } from '../engine/usePlayer';
import { DagGraph } from '../renderers/DagGraph';
import { RecursionTree } from '../renderers/RecursionTree';
import { StringAlign } from '../renderers/StringAlign';
import { Table1D } from '../renderers/Table1D';
import { Table2D } from '../renderers/Table2D';

function splitParagraphs(body: string): string[] {
  return body
    .split(/\r?\n\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function RendererFallback({ rendererId, step }: { rendererId: string; step?: Step }) {
  return (
    <div role="note" className="rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center">
      <p className="text-base font-bold text-ink">No visualization for renderer “{rendererId}” yet</p>
      <p className="mt-2 text-sm text-muted">
        This renderer is not implemented yet — follow the explanation below instead.
      </p>
      {step ? <p className="mt-3 text-sm font-medium text-ink">{step.message}</p> : null}
    </div>
  );
}

function DiagramView({ diagram, step }: { diagram: LessonDiagram; step: Step }) {
  const state = step.state;
  if (!isRendererState(state)) return <RendererFallback rendererId={diagram.rendererId} step={step} />;
  switch (diagram.rendererId) {
    case 'table1d':
      return state.kind === 'table1d' ? (
        <Table1D state={state} highlights={step.highlights} />
      ) : (
        <RendererFallback rendererId={diagram.rendererId} step={step} />
      );
    case 'table2d':
      return state.kind === 'table2d' ? (
        <Table2D state={state} highlights={step.highlights} />
      ) : (
        <RendererFallback rendererId={diagram.rendererId} step={step} />
      );
    case 'stringAlign':
      return state.kind === 'stringAlign' ? (
        <StringAlign state={state} highlights={step.highlights} />
      ) : (
        <RendererFallback rendererId={diagram.rendererId} step={step} />
      );
    case 'recursionTree':
      return state.kind === 'recursionTree' ? (
        <RecursionTree state={state} highlights={step.highlights} />
      ) : (
        <RendererFallback rendererId={diagram.rendererId} step={step} />
      );
    case 'dagGraph':
      return state.kind === 'dagGraph' ? (
        <DagGraph state={state} highlights={step.highlights} />
      ) : (
        <RendererFallback rendererId={diagram.rendererId} step={step} />
      );
    default:
      return <RendererFallback rendererId={diagram.rendererId} step={step} />;
  }
}

export function LessonPage() {
  const { id } = useParams();
  const lesson = id ? getLesson(id) : undefined;
  const diagram = lesson?.diagram;

  const steps = useMemo<Step[]>(() => (diagram ? [...diagram.steps] : []), [diagram]);
  const load = usePlayer((state) => state.load);
  const index = usePlayer((state) => state.index);
  usePlayerKeyboard(Boolean(diagram));
  useEffect(() => {
    load(steps);
  }, [steps, load]);

  const current: Step | undefined = steps[index] ?? steps[steps.length - 1];

  if (!lesson) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">DP Playground</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Lesson not found</h1>
        <p className="mt-4 text-lg text-muted">
          {id ? `We could not find a lesson with id “${id}”.` : 'No lesson id was given.'} Check the roadmap
          for a valid lesson.
        </p>
        <Link
          className="mt-8 inline-block rounded-lg bg-brand px-5 py-3 font-semibold text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          to="/"
        >
          Back to the roadmap
        </Link>
      </section>
    );
  }

  const categoryLabel = CATEGORIES?.[lesson.category]?.label ?? lesson.category;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6" aria-labelledby="lesson-title">
      <Link
        to="/"
        className="text-sm font-bold text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        ← All lessons
      </Link>

      <header className="mt-4">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">{categoryLabel}</p>
        <h1 id="lesson-title" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {lesson.title}
        </h1>
        <p className="mt-3 max-w-prose text-lg text-muted">{lesson.summary}</p>
      </header>

      {diagram ? (
        <section className="mt-8 flex flex-col gap-4" aria-label="Animated diagram">
          <h2 className="text-xl font-extrabold tracking-tight">Diagram</h2>
          {current ? (
            <>
              <section className="card p-4 sm:p-5" aria-label="Visualization">
                <div className="overflow-x-auto">
                  <DiagramView diagram={diagram} step={current} />
                </div>
              </section>
              <ExplanationBar message={current.message} codeLine={current.codeLine} />
              <StepCounter index={index} total={steps.length} />
            </>
          ) : (
            <p role="note" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
              No diagram steps to show yet.
            </p>
          )}
          <PlayerControls />
        </section>
      ) : null}

      <div className="mt-8 flex flex-col gap-6">
        {lesson.sections.length === 0 ? (
          <p role="note" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
            No sections yet.
          </p>
        ) : (
          lesson.sections.map((section, sectionIndex) => (
            <section key={`${section.heading}-${sectionIndex}`} aria-labelledby={`section-${sectionIndex}`}>
              <h2 id={`section-${sectionIndex}`} className="text-xl font-extrabold tracking-tight">
                {section.heading}
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {splitParagraphs(section.body).map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="max-w-prose leading-7 text-ink">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-4 list-disc space-y-1 ps-5 leading-7">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              {section.callout ? (
                <p role="note" className="mt-4 rounded-xl border-l-4 border-l-brand bg-surface px-4 py-3 text-sm leading-6">
                  {section.callout}
                </p>
              ) : null}
            </section>
          ))
        )}
      </div>
    </article>
  );
}

export default LessonPage;
