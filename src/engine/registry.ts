import { isRecord } from './types';
import type { CategoryId, ProblemModule, RendererId } from './types';

export const CATEGORY_IDS: readonly CategoryId[] = [
  '1d',
  'knapsack',
  'strings',
  'grid',
  'stocks',
  'intervals',
  'bitmask',
  'tree',
  'graphs',
  'counting',
  'advanced',
];

export const RENDERER_IDS: readonly RendererId[] = [
  'table1d',
  'table2d',
  'stringAlign',
  'recursionTree',
  'dagGraph',
  'bitmaskGrid',
  'intervalTriangle',
  'treeDP',
];

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  '1d': {
    id: '1d',
    label: '1D DP',
    description: 'Linear recurrences over a single row or array.',
    icon: '—',
    color: '#2563eb',
  },
  knapsack: {
    id: 'knapsack',
    label: 'Knapsack',
    description: 'Pick or skip items under a capacity limit.',
    icon: '🎒',
    color: '#b45309',
  },
  strings: {
    id: 'strings',
    label: 'Strings',
    description: 'Edit, subsequence, and alignment DP on two strings.',
    icon: 'AA',
    color: '#059669',
  },
  grid: {
    id: 'grid',
    label: 'Grids',
    description: 'Paths, costs, and obstacles on a 2D grid.',
    icon: '▦',
    color: '#7c3aed',
  },
  stocks: {
    id: 'stocks',
    label: 'Stocks',
    description: 'Buy and sell with cooldowns, fees, and transactions.',
    icon: '↗',
    color: '#dc2626',
  },
  intervals: {
    id: 'intervals',
    label: 'Intervals',
    description: 'Optimal choices on subarrays and intervals.',
    icon: '[ ]',
    color: '#0891b2',
  },
  bitmask: {
    id: 'bitmask',
    label: 'Bitmask DP',
    description: 'Subset DP over bitsets for small universes.',
    icon: '01',
    color: '#db2777',
  },
  tree: {
    id: 'tree',
    label: 'Tree DP',
    description: 'Bottom-up DP on trees, from roots to leaves.',
    icon: '🌳',
    color: '#16a34a',
  },
  graphs: {
    id: 'graphs',
    label: 'Graphs & DAGs',
    description: 'Shortest paths and DP on directed acyclic graphs.',
    icon: '⬣',
    color: '#4f46e5',
  },
  counting: {
    id: 'counting',
    label: 'Counting',
    description: 'Count distinct ways with additive recurrences.',
    icon: '#',
    color: '#ca8a04',
  },
  advanced: {
    id: 'advanced',
    label: 'Advanced Patterns',
    description: 'Harder combinations: digit, profile, and multi-dim DP.',
    icon: '★',
    color: '#9333ea',
  },
};

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value);
}

export function isRendererId(value: unknown): value is RendererId {
  return typeof value === 'string' && (RENDERER_IDS as readonly string[]).includes(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function unwrap(mod: unknown): unknown {
  if (isRecord(mod) && 'default' in mod && !('id' in mod)) {
    return mod['default'];
  }
  return mod;
}

export function validateProblemModule(mod: unknown): string[] {
  const errors: string[] = [];
  const candidate = unwrap(mod);

  if (!isRecord(candidate)) {
    return ['module: expected an object with id/title/category/renderer'];
  }

  if (!isNonEmptyString(candidate['id'])) {
    errors.push('id: must be a non-empty string');
  }
  if (!isNonEmptyString(candidate['title'])) {
    errors.push('title: must be a non-empty string');
  }
  if (!isCategoryId(candidate['category'])) {
    errors.push(`category: must be one of ${CATEGORY_IDS.join(', ')}`);
  }
  if (!isRendererId(candidate['renderer'])) {
    errors.push(`renderer: must be one of ${RENDERER_IDS.join(', ')}`);
  }
  if (!Array.isArray(candidate['inputSchema'])) {
    errors.push('inputSchema: must be an array');
  }
  if (typeof candidate['generateSteps'] !== 'function') {
    errors.push('generateSteps: must be a function');
  }

  const code = candidate['code'];
  if (!isRecord(code)) {
    errors.push('code: must provide python, javascript, and cpp snippets');
  } else {
    const missing = (['python', 'javascript', 'cpp'] as const).filter(
      (lang) => !isNonEmptyString(code[lang]),
    );
    if (missing.length > 0) {
      errors.push(`code: missing or empty snippet(s): ${missing.join(', ')}`);
    }
  }

  const quiz = candidate['quiz'];
  if (!Array.isArray(quiz)) {
    errors.push('quiz: must be an array with 3 to 5 questions');
  } else {
    if (quiz.length < 3 || quiz.length > 5) {
      errors.push(`quiz: must have 3 to 5 questions, got ${quiz.length}`);
    }
    quiz.forEach((item, index) => {
      if (!isRecord(item)) {
        errors.push(`quiz[${index}]: must be a question object`);
        return;
      }
      const options = item['options'];
      const answer = item['answer'];
      if (!Array.isArray(options) || options.length === 0) {
        errors.push(`quiz[${index}]: options must be a non-empty array`);
        return;
      }
      if (typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        errors.push(`quiz[${index}]: answer index ${String(answer)} out of range for ${options.length} options`);
      }
    });
  }

  if (!('defaultInput' in candidate) || candidate['defaultInput'] === undefined) {
    errors.push('defaultInput: is required');
  }

  return errors;
}

export interface Registry {
  problems: ProblemModule[];
  warnings: string[];
  getProblem(id: string): ProblemModule | undefined;
  getProblemsByCategory(category: CategoryId): ProblemModule[];
}

function categoryRank(category: CategoryId): number {
  const rank = CATEGORY_IDS.indexOf(category);
  return rank === -1 ? CATEGORY_IDS.length : rank;
}

export function createRegistry(modules: readonly ProblemModule[]): Registry {
  const warnings: string[] = [];
  const seen = new Set<string>();
  const valid: ProblemModule[] = [];

  for (const raw of modules as unknown[]) {
    const candidate = unwrap(raw);
    const errors = validateProblemModule(candidate);
    if (errors.length > 0 || !isRecord(candidate)) {
      const label = isRecord(candidate) && typeof candidate['id'] === 'string' ? candidate['id'] : 'unknown';
      warnings.push(`Skipped invalid problem module "${label}": ${errors.join('; ')}`);
      continue;
    }
    const mod = candidate as unknown as ProblemModule;
    if (seen.has(mod.id)) {
      warnings.push(`Duplicate problem id "${mod.id}": kept the first occurrence`);
      continue;
    }
    seen.add(mod.id);
    valid.push(mod);
  }

  const problems = [...valid].sort(
    (a, b) => categoryRank(a.category) - categoryRank(b.category) || a.title.localeCompare(b.title),
  );

  const byId = new Map<string, ProblemModule>(problems.map((p) => [p.id, p]));

  return {
    problems,
    warnings,
    getProblem: (id) => byId.get(id),
    getProblemsByCategory: (category) => problems.filter((p) => p.category === category),
  };
}

const globbed = import.meta.glob<ProblemModule>('../problems/**/*.problem.ts', {
  eager: true,
  import: 'default',
});

const defaultRegistry = createRegistry(Object.values(globbed) as ProblemModule[]);

export const problems: ProblemModule[] = defaultRegistry.problems;
export const registryWarnings: string[] = defaultRegistry.warnings;

export function getProblem(id: string): ProblemModule | undefined {
  return defaultRegistry.getProblem(id);
}

export function getProblemsByCategory(category: CategoryId): ProblemModule[] {
  return defaultRegistry.getProblemsByCategory(category);
}
