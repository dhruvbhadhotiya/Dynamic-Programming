/** Shared contracts. Problem modules import only this file and helpers; they never import UI. */

export type CellKind = 'active' | 'dependency' | 'result' | 'base' | 'path' | 'pruned';

export interface Highlight {
  /** 1D: [i]. 2D/triangle/string: [row, col]. Tree/graph/bitmask: [node or mask index]. */
  pos: number[];
  kind: CellKind;
  label?: string;
  /** Graph renderers only: whether the index names a node, an edge, or both. Defaults to 'both'. */
  target?: 'node' | 'edge' | 'both';
}

export interface Step {
  state: unknown;
  highlights: Highlight[];
  /** 1-based line number in every code snippet. */
  codeLine: number;
  message: string;
  vars?: Record<string, string | number | boolean>;
}

export type RendererId =
  | 'table1d'
  | 'table2d'
  | 'stringAlign'
  | 'recursionTree'
  | 'dagGraph'
  | 'bitmaskGrid'
  | 'intervalTriangle'
  | 'treeDP';

export type Mode = 'bruteforce' | 'memo' | 'tabulation';

export type CategoryId =
  | '1d'
  | 'knapsack'
  | 'strings'
  | 'grid'
  | 'stocks'
  | 'intervals'
  | 'bitmask'
  | 'tree'
  | 'graphs'
  | 'counting'
  | 'advanced';

export type CellValue = string | number | boolean | null;

export interface Table1DState {
  kind: 'table1d';
  values: CellValue[];
  labels?: string[];
  indexName?: string;
  caption?: string;
}

export interface Table2DState {
  kind: 'table2d';
  /** Rectangular rows; renderers tolerate ragged data. */
  values: CellValue[][];
  rowLabels?: string[];
  colLabels?: string[];
  rowHeader?: string;
  colHeader?: string;
  caption?: string;
}

export interface StringAlignState {
  kind: 'stringAlign';
  a: string;
  b: string;
  /** (a.length + 1) x (b.length + 1) */
  values: CellValue[][];
  caption?: string;
}

export type TreeNodeKind = 'pending' | 'active' | 'base' | 'memo' | 'pruned' | 'done';

export interface TreeNode {
  id: string;
  parentId?: string;
  label: string;
  detail?: string;
  kind?: TreeNodeKind;
}

export interface RecursionTreeState {
  kind: 'recursionTree';
  nodes: TreeNode[];
  caption?: string;
  memoHits?: number;
}

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  detail?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface DagGraphState {
  kind: 'dagGraph';
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed?: boolean;
  caption?: string;
}

export interface BitmaskGridState {
  kind: 'bitmaskGrid';
  bits: number;
  /** Indexed by mask 0..2^bits-1. */
  values: CellValue[];
  labels?: string[];
  caption?: string;
}

export interface IntervalTriangleState {
  kind: 'intervalTriangle';
  /** Indexed [start][end]; only cells where start <= end are drawn. */
  values: CellValue[][];
  rowLabels?: string[];
  colLabels?: string[];
  caption?: string;
}

export interface TreeDPNode {
  id: string;
  parentId?: string;
  label: string;
  detail?: string;
  kind?: TreeNodeKind;
  values?: Record<string, CellValue>;
}

export interface TreeDPState {
  kind: 'treeDP';
  nodes: TreeDPNode[];
  caption?: string;
}

export interface RendererStateMap {
  table1d: Table1DState;
  table2d: Table2DState;
  stringAlign: StringAlignState;
  recursionTree: RecursionTreeState;
  dagGraph: DagGraphState;
  bitmaskGrid: BitmaskGridState;
  intervalTriangle: IntervalTriangleState;
  treeDP: TreeDPState;
}

export type RendererState = RendererStateMap[RendererId];

interface BaseInputField {
  name: string;
  label: string;
  help?: string;
}

export interface NumberInputField extends BaseInputField {
  type: 'number';
  min: number;
  max: number;
  step?: number;
}

export interface TextInputField extends BaseInputField {
  type: 'text';
  minLength?: number;
  maxLength: number;
  pattern?: string;
}

export interface ArrayInputField extends BaseInputField {
  type: 'array';
  itemType: 'number' | 'string';
  minItems: number;
  maxItems: number;
  min?: number;
  max?: number;
}

export interface MatrixInputField extends BaseInputField {
  type: 'matrix';
  minRows: number;
  maxRows: number;
  maxCols: number;
  min: number;
  max: number;
  numeric: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputField extends BaseInputField {
  type: 'select';
  options: SelectOption[];
}

export type InputField =
  | NumberInputField
  | TextInputField
  | ArrayInputField
  | MatrixInputField
  | SelectInputField;

export interface CodeSnippets {
  python: string;
  javascript: string;
  cpp: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export interface ProblemModule<I = unknown> {
  id: string;
  title: string;
  category: CategoryId;
  difficulty: 'easy' | 'medium' | 'hard';
  summary: string;
  stateDefinition: string;
  recurrence: string;
  complexity: { time: string; space: string };
  renderer: RendererId;
  inputSchema: InputField[];
  defaultInput: I;
  /** Omit modes that do not apply; default is all three. */
  modes?: Mode[];
  generateSteps(input: I, mode: Mode): Step[];
  code: CodeSnippets;
  quiz: QuizQuestion[];
  relatedIds?: string[];
  lessonId?: string;
}

const CELL_KINDS: readonly CellKind[] = ['active', 'dependency', 'result', 'base', 'path', 'pruned'];
const RENDERER_KINDS: readonly RendererId[] = [
  'table1d',
  'table2d',
  'stringAlign',
  'recursionTree',
  'dagGraph',
  'bitmaskGrid',
  'intervalTriangle',
  'treeDP',
];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCellKind(value: unknown): value is CellKind {
  return typeof value === 'string' && CELL_KINDS.includes(value as CellKind);
}

export function isRendererState(value: unknown): value is RendererState {
  return isRecord(value) && typeof value.kind === 'string' && RENDERER_KINDS.includes(value.kind as RendererId);
}

export function isStep(value: unknown): value is Step {
  if (!isRecord(value)) return false;
  if (typeof value.message !== 'string' || value.message.trim() === '') return false;
  if (typeof value.codeLine !== 'number' || !Number.isInteger(value.codeLine) || value.codeLine < 1) return false;
  if (value.state === null || value.state === undefined) return false;
  if (!Array.isArray(value.highlights)) return false;
  const highlightsOk = value.highlights.every(
    (h) =>
      isRecord(h) &&
      Array.isArray(h.pos) &&
      h.pos.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0) &&
      isCellKind(h.kind),
  );
  if (!highlightsOk) return false;
  if (value.vars === undefined) return true;
  return (
    isRecord(value.vars) &&
    Object.values(value.vars).every((v) => ['string', 'number', 'boolean'].includes(typeof v))
  );
}
