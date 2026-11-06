/** Visual language. Every state pairs color with a symbol and a text label. */
export const cellTokens = {
  active: {
    label: 'Active',
    symbol: '●',
    classes: 'border-brand bg-brand/15 text-ink',
    ring: 'ring-2 ring-brand/40',
    hint: 'The cell being solved right now',
  },
  dependency: {
    label: 'Dependency',
    symbol: '◌',
    classes: 'border-warn border-dashed bg-warn/10 text-ink',
    ring: 'ring-2 ring-warn/30',
    hint: 'A previously solved cell this answer reads',
  },
  result: {
    label: 'Result',
    symbol: '★',
    classes: 'border-good bg-good/15 text-ink',
    ring: 'ring-2 ring-good/40',
    hint: 'A completed answer or final answer',
  },
  base: {
    label: 'Base case',
    symbol: '▣',
    classes: 'border-ink/20 bg-line/40 text-ink',
    ring: 'ring-2 ring-ink/15',
    hint: 'A value known without a recurrence',
  },
  path: {
    label: 'Chosen path',
    symbol: '↗',
    classes: 'border-accent bg-accent/10 text-ink',
    ring: 'ring-2 ring-accent/40',
    hint: 'Part of the reconstructed optimal solution',
  },
  pruned: {
    label: 'Pruned',
    symbol: '×',
    classes: 'border-bad border-dashed bg-bad/5 text-muted line-through',
    ring: 'ring-2 ring-bad/30',
    hint: 'A branch that cannot improve the answer',
  },
} as const;

export type CellTokenKind = keyof typeof cellTokens;

export const motionTokens = {
  fast: 0.16,
  base: 0.24,
  slow: 0.4,
  spring: { type: 'spring', stiffness: 260, damping: 26 },
} as const;

export const layoutTokens = {
  page: 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
  reading: 'mx-auto w-full max-w-3xl',
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
} as const;

export const codeTheme = {
  background: 'bg-slate-950',
  text: 'text-slate-100',
  comment: 'text-slate-400',
  keyword: 'text-fuchsia-300',
  string: 'text-emerald-300',
  number: 'text-amber-300',
  function: 'text-sky-300',
  operator: 'text-rose-300',
} as const;
