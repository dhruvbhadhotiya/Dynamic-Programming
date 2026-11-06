import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CodePanel } from '../components/CodePanel';
import { ExplanationBar, StepCounter, VariableWatch } from '../components/InfoPanels';
import { ModeToggle } from '../components/ModeToggle';
import { PlayerControls } from '../components/PlayerControls';
import { QuizEngine } from '../components/QuizEngine';
import { isRendererState } from '../engine/types';
import type { Mode, RecursionTreeState, Step, Table1DState, TreeNode } from '../engine/types';
import { usePlayer, usePlayerKeyboard } from '../engine/usePlayer';
import fibonacciModule from '../problems/1d/fibonacci.problem';
import { RecursionTree } from '../renderers/RecursionTree';
import { Table1D } from '../renderers/Table1D';

const COMPARISON_NS: readonly number[] = [5, 6, 7, 8, 9, 10, 11, 12];
const TREE_MAX_N = 8;

function fibValue(n: number): number {
  const normalized = Math.max(0, Math.trunc(n));
  let a = 0;
  let b = 1;
  for (let i = 0; i < normalized; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return a;
}

/** Total calls made by naive fib(n) = fib(n-1) + fib(n-2). Equals 2*fib(n+1) - 1. */
function bruteCallCount(n: number): number {
  const normalized = Math.max(0, Math.trunc(n));
  return 2 * fibValue(normalized + 1) - 1;
}

/** Distinct fib(k) values computed once with memoization / tabulation. */
function memoComputedCount(n: number): number {
  return Math.max(0, Math.trunc(n)) + 1;
}

function buildCallTree(treeN: number, memo: boolean): RecursionTreeState {
  const nodes: TreeNode[] = [];
  const cache = new Set<number>();
  let memoHits = 0;
  let nextId = 0;

  function pushNode(id: string, parentId: string | undefined, label: string, detail: string, kind: 'memo' | 'base' | 'done'): void {
    if (parentId === undefined) {
      nodes.push({ id, label, detail, kind });
    } else {
      nodes.push({ id, parentId, label, detail, kind });
    }
  }

  const visit = (k: number, parentId?: string): void => {
    const id = `call-${nextId}`;
    nextId += 1;
    if (memo && cache.has(k)) {
      memoHits += 1;
      pushNode(id, parentId, `fib(${k})`, `cached = ${fibValue(k)}`, 'memo');
      return;
    }
    if (k <= 1) {
      pushNode(id, parentId, `fib(${k})`, `= ${k}`, 'base');
      cache.add(k);
      return;
    }
    pushNode(id, parentId, `fib(${k})`, `= ${fibValue(k)}`, 'done');
    visit(k - 1, id);
    visit(k - 2, id);
    cache.add(k);
  };

  visit(treeN);
  return {
    kind: 'recursionTree',
    nodes,
    caption: `Call tree for fib(${treeN})${memo ? ' with memoization' : ''}`,
    memoHits,
  };
}

export function FibonacciPage() {
  const [n, setN] = useState(fibonacciModule.defaultInput.n);
  const [mode, setMode] = useState<Mode>('bruteforce');

  const steps = useMemo<Step[]>(() => fibonacciModule.generateSteps({ n }, mode), [n, mode]);
  const load = usePlayer((state) => state.load);
  const index = usePlayer((state) => state.index);
  usePlayerKeyboard();
  useEffect(() => {
    load(steps);
  }, [steps, load]);

  const current: Step | undefined = steps[index] ?? steps[steps.length - 1];
  const operations = steps.length === 0 ? 0 : index + 1;
  const answer = fibValue(n);
  const bruteCalls = bruteCallCount(n);
  const memoCount = memoComputedCount(n);
  const speedup = bruteCalls / memoCount;
  const treeN = Math.min(n, TREE_MAX_N);
  const treeState = useMemo(() => buildCallTree(treeN, mode === 'memo'), [treeN, mode]);

  function handleNChange(next: number): void {
    setN(Math.max(0, Math.min(12, Math.trunc(next))));
  }

  const tableState: Table1DState | undefined =
    current && isRendererState(current.state) && current.state.kind === 'table1d'
      ? current.state
      : undefined;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-labelledby="fibonacci-title">
      <Link to="/" className="text-sm font-bold text-brand underline underline-offset-4">
        ← All problems
      </Link>

      <header className="mt-4">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">Flagship story · 1D DP</p>
        <h1 id="fibonacci-title" className="mt-2 text-4xl font-extrabold tracking-tight">
          Fibonacci Numbers
        </h1>
        <p className="mt-3 max-w-prose text-lg text-muted">
          Naively, <code className="font-mono">fib(n) = fib(n-1) + fib(n-2)</code> looks harmless — but the call
          tree doubles at every level. The same subproblems are recomputed over and over, so the work grows
          exponentially. Memoization and tabulation collapse that tree into a single linear table: each{' '}
          <code className="font-mono">fib(k)</code> is computed once, then reused.
        </p>
        <p className="mt-2 max-w-prose text-base text-muted">
          Recurrence: <code className="font-mono">{fibonacciModule.recurrence}</code> State:{' '}
          <code className="font-mono">{fibonacciModule.stateDefinition}</code> Time:{' '}
          <code className="font-mono">{fibonacciModule.complexity.time}</code> with memoization or tabulation,
          versus <code className="font-mono">O(2^n)</code> for brute force.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Fibonacci metadata">
          <span className="chip">Difficulty: {fibonacciModule.difficulty}</span>
          <span className="chip">Category: {fibonacciModule.category}</span>
          <span className="chip">Renderer: {fibonacciModule.renderer}</span>
          <span className="chip">Time: {fibonacciModule.complexity.time}</span>
          <span className="chip">Space: {fibonacciModule.complexity.space}</span>
        </div>
      </header>

      <section className="card mt-6 p-4 sm:p-5" aria-label="Live operation comparison">
        <h2 className="text-base font-bold text-ink">Live operation comparison</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Call counts for brute force versus distinct values computed with memoization or tabulation. Brute force
          grows exponentially; memoization stays linear.
        </p>
        <p aria-live="polite" className="mt-3 flex flex-wrap gap-2">
          <span className="chip">{`fib(${n}) = ${answer}`}</span>
          <span className="chip">{`Brute force: ${bruteCalls} calls`}</span>
          <span className="chip">{`Memo / tabulation: ${memoCount} computed values`}</span>
          <span className="chip">{`${speedup.toFixed(1)}× fewer computations`}</span>
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <caption className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              Calls per n, from 5 to 12
            </caption>
            <thead>
              <tr className="border-b border-line bg-canvas">
                <th scope="col" className="px-3 py-2 font-bold">n</th>
                <th scope="col" className="px-3 py-2 font-bold">fib(n)</th>
                <th scope="col" className="px-3 py-2 font-bold">Brute-force calls</th>
                <th scope="col" className="px-3 py-2 font-bold">Memo / tabulation computes</th>
                <th scope="col" className="px-3 py-2 font-bold">Speedup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {COMPARISON_NS.map((k) => {
                const brute = bruteCallCount(k);
                const memo = memoComputedCount(k);
                const isCurrent = k === n;
                return (
                  <tr key={k} aria-current={isCurrent ? 'true' : undefined} className={isCurrent ? 'bg-brand/10' : ''}>
                    <th scope="row" className="px-3 py-1.5 font-mono font-bold">{k}{isCurrent ? ' ← current' : ''}</th>
                    <td className="px-3 py-1.5 font-mono">{fibValue(k)}</td>
                    <td className="px-3 py-1.5 font-mono">{brute}</td>
                    <td className="px-3 py-1.5 font-mono">{memo}</td>
                    <td className="px-3 py-1.5 font-mono">{(brute / memo).toFixed(1)}×</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-6 p-4 sm:p-5" aria-label="Controls">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="fibonacci-n" className="text-sm font-bold text-ink">
              n
            </label>
            <p id="fibonacci-n-help" className="text-xs text-muted">
              Choose n from 0 to 12. The tree is capped at n = 8 so it stays readable.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                id="fibonacci-n"
                type="range"
                min={0}
                max={12}
                step={1}
                value={n}
                onChange={(event) => handleNChange(Number(event.target.value))}
                aria-label="n"
                aria-describedby="fibonacci-n-help"
                className="h-2 w-full max-w-md cursor-pointer accent-[rgb(var(--brand))]"
              />
              <output className="chip font-mono" aria-label="Current Fibonacci answer">
                {`fib(${n}) = ${answer}`}
              </output>
            </div>
          </div>
          <ModeToggle
            modes={fibonacciModule.modes ?? ['bruteforce', 'memo', 'tabulation']}
            mode={mode}
            onChange={setMode}
            operations={operations}
          />
          <PlayerControls />
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <div className="flex flex-col gap-6">
          <section className="card p-4 sm:p-5" aria-label="Table walkthrough">
            <h2 className="text-base font-bold text-ink">Table walkthrough</h2>
            {current ? <ExplanationBar message={current.message} codeLine={current.codeLine} /> : null}
            <div className="mt-4">
              {tableState ? (
                <div role="region" aria-label="Fibonacci table">
                  <StepCounter index={index} total={steps.length} />
                  <div className="mt-3">
                    <Table1D state={tableState} highlights={current?.highlights ?? []} />
                  </div>
                  <div className="mt-3">
                    <VariableWatch vars={current?.vars ?? {}} />
                  </div>
                </div>
              ) : (
                <p role="note" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
                  No table to show for this step.
                </p>
              )}
            </div>
          </section>

          <section className="card p-4 sm:p-5" aria-label="Call tree">
            <h2 className="text-base font-bold text-ink">Brute-force call tree</h2>
            <p className="mt-1 text-sm text-muted">
              {mode === 'memo'
                ? 'In memoization mode, repeated calls become memo hits (↺) instead of expanding again — the exponential tree collapses.'
                : 'The full brute-force tree recomputes overlapping subproblems. Switch to Memoization to see memo hits collapse it.'}
              {n > TREE_MAX_N ? ` Showing the tree for n = ${TREE_MAX_N} (the cap).` : ''}
            </p>
            <div className="mt-3">
              <RecursionTree state={treeState} highlights={[]} />
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4" aria-label="Code and quiz">
          {current ? <CodePanel code={fibonacciModule.code} codeLine={current.codeLine} /> : null}
          <section className="card p-4" aria-label="Quiz">
            <QuizEngine questions={fibonacciModule.quiz} problemId={fibonacciModule.id} />
          </section>
        </aside>
      </div>
    </article>
  );
}

export default FibonacciPage;
