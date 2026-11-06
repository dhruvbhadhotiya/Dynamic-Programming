import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import type { CodeSnippets } from '../engine/types';
import { codeTheme } from '../styles/tokens';

const LANGUAGES = [
  { id: 'python', label: 'Python', prism: 'python' },
  { id: 'javascript', label: 'JavaScript', prism: 'javascript' },
  { id: 'cpp', label: 'C++', prism: 'cpp' },
] as const;

type Language = (typeof LANGUAGES)[number]['id'];
type CopyState = 'idle' | 'copied' | 'failed';

export interface CodePanelProps {
  code: CodeSnippets;
  codeLine: number;
  hidden?: boolean;
  className?: string;
}

const cx = (...classes: Array<string | false | undefined>): string => classes.filter(Boolean).join(' ');

function splitLines(source: string): string[] {
  const lines = source.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function highlightLine(line: string, grammarName: string): string {
  const grammar = Prism.languages[grammarName];
  return grammar ? Prism.highlight(line, grammar, grammarName) : line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function CodePanel({ code, codeLine, hidden = false, className }: CodePanelProps) {
  const [language, setLanguage] = useState<Language>('python');
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const resetTimer = useRef<number | null>(null);
  const id = useId();
  const spec = LANGUAGES.find((item) => item.id === language) ?? LANGUAGES[0];
  const lines = useMemo(() => splitLines(code[language]), [code, language]);
  const activeLine = Math.min(Math.max(1, Math.trunc(codeLine) || 1), lines.length);
  // Snippets are static module data; Prism.highlight escapes the text and returns token markup for innerHTML.
  const highlighted = useMemo(() => lines.map((line) => highlightLine(line, spec.prism)), [lines, spec.prism]);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  if (hidden) {
    return (
      <p role="note" className={cx('flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-muted', className)}>
        <span aria-hidden="true">▤</span>
        Code hidden by teacher mode. Re-enable it to follow along.
      </p>
    );
  }

  function flashCopy(next: CopyState) {
    setCopyState(next);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState('idle'), 1600);
  }

  async function copyCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(code[language]);
      flashCopy('copied');
    } catch {
      flashCopy('failed');
    }
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? LANGUAGES.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + LANGUAGES.length) % LANGUAGES.length;
    const nextSpec = LANGUAGES[next] ?? LANGUAGES[0];
    setLanguage(nextSpec.id);
    tabRefs.current[next]?.focus();
  }

  const copyName = copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : `Copy ${spec.label} code`;

  return (
    <section aria-label="Code walkthrough" className={cx(codeTheme.background, codeTheme.text, 'overflow-hidden rounded-2xl border border-slate-700 shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/70 px-2 pt-2">
        <div role="tablist" aria-label="Code language" className="flex items-end gap-1">
          {LANGUAGES.map((item, index) => {
            const selected = item.id === language;
            return (
              <button key={item.id} ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab"
                id={`${id}-tab-${item.id}`} aria-selected={selected} aria-controls={`${id}-panel`} tabIndex={selected ? 0 : -1}
                onClick={() => setLanguage(item.id)} onKeyDown={(event) => handleTabKey(event, index)}
                className={cx('min-h-10 rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
                  selected ? 'border-amber-300 bg-slate-800 text-white' : 'border-transparent text-slate-300 hover:bg-slate-900 hover:text-white')}>
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <span role="status" aria-live="polite" className="sr-only">{copyState === 'copied' ? 'Code copied to clipboard.' : copyState === 'failed' ? 'Clipboard unavailable. Select the code to copy manually.' : ''}</span>
          <button type="button" onClick={copyCode} aria-label={copyName}
            className="min-h-9 rounded-lg border border-slate-600 px-3 py-1 text-xs font-bold text-slate-100 transition-colors hover:border-amber-300 hover:text-amber-200">
            {copyState === 'copied' ? '✓ Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy'}
          </button>
        </div>
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${language}`} tabIndex={0}
        className="max-h-[28rem] overflow-auto focus-visible:ring-inset">
        <ol aria-label={`${spec.label} source code`} className="min-w-max py-2 font-mono text-[13px] leading-6 sm:text-sm">
          {lines.map((_, index) => {
            const lineNumber = index + 1;
            const current = lineNumber === activeLine;
            return (
              <li key={lineNumber} aria-current={current ? 'step' : undefined}
                className={cx('flex items-start gap-2 border-l-4 pr-4', current ? 'border-amber-300 bg-amber-300/15 text-white' : 'border-transparent text-slate-200')}>
                <span aria-hidden="true" className={cx('w-4 shrink-0 text-center text-xs', current ? 'text-amber-300' : 'text-transparent')}>▶</span>
                <span aria-hidden="true" className={cx('w-8 shrink-0 select-none text-right tabular-nums', current ? 'font-bold text-amber-200' : 'text-slate-500')}>{lineNumber}</span>
                <code dangerouslySetInnerHTML={{ __html: highlighted[index] ?? '' }} />
                {current && <span className="sr-only">Current code line</span>}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
