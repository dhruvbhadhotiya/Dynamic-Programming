import type {
  CellValue,
  Highlight,
  RendererState,
  Step,
} from './types';

export interface SceneOptions {
  codeLine?: number;
}

export interface RecordOptions {
  codeLine?: number;
  highlights?: Highlight[];
  vars?: Record<string, string | number | boolean>;
}

export interface FillOptions extends RecordOptions {
  kind?: Highlight['kind'];
  label?: string;
}

/** Accumulates immutable renderer snapshots while a problem runs. */
export class StepRecorder<S extends RendererState> {
  private state: S;
  private readonly log: Step[] = [];
  private line: number;

  constructor(initial: S, options: SceneOptions = {}) {
    this.state = structuredClone(initial);
    this.line = options.codeLine ?? 1;
  }

  get steps(): readonly Step[] {
    return this.log;
  }

  get count(): number {
    return this.log.length;
  }

  /** Read-only copy, safe to inspect between fills. */
  read(): S {
    return structuredClone(this.state);
  }

  at(codeLine: number): this {
    this.line = codeLine;
    return this;
  }

  record(message: string, options: RecordOptions = {}): this {
    const highlights = options.highlights ?? [];
    const step: Step = {
      state: structuredClone(this.state),
      highlights: structuredClone(highlights),
      codeLine: options.codeLine ?? this.line,
      message,
    };
    if (options.vars !== undefined) step.vars = { ...options.vars };
    this.log.push(step);
    return this;
  }

  update(mutator: (draft: S) => void, message: string, options: RecordOptions = {}): this {
    const draft = structuredClone(this.state);
    mutator(draft);
    this.state = draft;
    return this.record(message, options);
  }

  replace(state: S, message: string, options: RecordOptions = {}): this {
    this.state = structuredClone(state);
    return this.record(message, options);
  }

  /** Updates the current cell and highlights it; extra highlights document dependencies. */
  fill(pos: number[], value: CellValue, message: string, options: FillOptions = {}): this {
    const highlight: Highlight = { pos: [...pos], kind: options.kind ?? 'active' };
    if (options.label !== undefined) highlight.label = options.label;
    const highlights = [highlight, ...(options.highlights ?? [])];
    const next: RecordOptions = { highlights };
    if (options.codeLine !== undefined) next.codeLine = options.codeLine;
    if (options.vars !== undefined) next.vars = options.vars;
    return this.update((draft) => writeCell(draft, pos, value), message, next);
  }

  valueAt(pos: number[]): CellValue {
    return readCell(this.state, pos);
  }
}

function writeCell(state: RendererState, pos: number[], value: CellValue): void {
  const [first = 0, second = 0] = pos;
  switch (state.kind) {
    case 'table1d':
      assertRange(state.values, first, 'row');
      state.values[first] = value;
      return;
    case 'table2d':
    case 'stringAlign':
    case 'intervalTriangle': {
      const row = state.values[first];
      assertRange(row ?? [], second, 'column');
      if (row === undefined) throw new Error(`Missing row ${first}`);
      row[second] = value;
      return;
    }
    case 'bitmaskGrid':
      assertRange(state.values, first, 'mask');
      state.values[first] = value;
      return;
    default:
      throw new Error(`StepRecorder.fill does not support renderer "${state.kind}"`);
  }
}

function readCell(state: RendererState, pos: number[]): CellValue {
  const [first = 0, second = 0] = pos;
  switch (state.kind) {
    case 'table1d':
    case 'bitmaskGrid':
      return state.values[first] ?? null;
    case 'table2d':
    case 'stringAlign':
    case 'intervalTriangle':
      return state.values[first]?.[second] ?? null;
    case 'recursionTree':
    case 'treeDP':
      return state.nodes[first]?.label ?? null;
    case 'dagGraph':
      return state.nodes[first]?.label ?? null;
  }
}

function assertRange(values: unknown[], index: number, name: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= values.length) {
    throw new Error(`${name} index ${index} is outside 0..${values.length - 1}`);
  }
}

export function create1D<T>(length: number, fill: (index: number) => T): T[] {
  return Array.from({ length }, (_, index) => fill(index));
}

export function create2D<T>(rows: number, cols: number, fill: (row: number, col: number) => T): T[][] {
  return create1D(rows, (row) => create1D(cols, (col) => fill(row, col)));
}

export function range(length: number): number[] {
  return create1D(length, (index) => index);
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function finalAnswer(steps: readonly Step[]): string | number | boolean {
  const answer = steps.at(-1)?.vars?.answer;
  if (answer === undefined) throw new Error('Final step must expose vars.answer');
  return answer;
}
