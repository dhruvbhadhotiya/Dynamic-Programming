import { describe, expect, it } from 'vitest';
import type { CategoryId, ProblemModule } from './types';
import {
  CATEGORIES,
  CATEGORY_IDS,
  createRegistry,
  getProblem,
  getProblemsByCategory,
  problems,
  registryWarnings,
  validateProblemModule,
} from './registry';

function makeQuiz(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    q: `Question ${i}?`,
    options: ['A', 'B'],
    answer: 0,
    why: 'Because.',
  }));
}

function makeProblem(overrides: Partial<ProblemModule> = {}): ProblemModule {
  return {
    id: 'test-problem',
    title: 'Test Problem',
    category: '1d',
    difficulty: 'easy',
    summary: 'Summary.',
    stateDefinition: 'dp[i]',
    recurrence: 'dp[i] = dp[i-1] + dp[i-2]',
    complexity: { time: 'O(n)', space: 'O(n)' },
    renderer: 'table1d',
    inputSchema: [{ name: 'n', label: 'n', type: 'number', min: 0, max: 10 }],
    defaultInput: { n: 5 },
    generateSteps: () => [],
    code: { python: 'x = 1', javascript: 'let x = 1', cpp: 'int x = 1;' },
    quiz: makeQuiz(),
    ...overrides,
  } as ProblemModule;
}

describe('validateProblemModule', () => {
  it('accepts a valid module', () => {
    expect(validateProblemModule(makeProblem())).toEqual([]);
  });

  it('accepts the glob { default } shape', () => {
    expect(validateProblemModule({ default: makeProblem() })).toEqual([]);
  });

  it('reports missing fields', () => {
    const errors = validateProblemModule({});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.startsWith('id:'))).toBe(true);
    expect(errors.some((e) => e.startsWith('title:'))).toBe(true);
    expect(errors.some((e) => e.startsWith('generateSteps:'))).toBe(true);
    expect(errors.some((e) => e.startsWith('code:'))).toBe(true);
    expect(validateProblemModule(null)).not.toEqual([]);
    expect(validateProblemModule(42)).not.toEqual([]);
  });

  it('rejects a bad category and bad renderer', () => {
    const badCategory = makeProblem({ category: 'nope' as CategoryId });
    const catErrors = validateProblemModule(badCategory);
    expect(catErrors.some((e) => e.startsWith('category:'))).toBe(true);

    const badRenderer = makeProblem({ renderer: 'unknown' as never });
    const rendererErrors = validateProblemModule(badRenderer);
    expect(rendererErrors.some((e) => e.startsWith('renderer:'))).toBe(true);
  });

  it('rejects missing code language and missing inputSchema / defaultInput', () => {
    const moduleWithoutCpp = makeProblem({
      code: { python: 'x = 1', javascript: 'let x = 1', cpp: '' },
    });
    expect(validateProblemModule(moduleWithoutCpp).some((e) => e.includes('cpp'))).toBe(true);

    const noSchema = makeProblem({ inputSchema: undefined as never });
    expect(validateProblemModule(noSchema).some((e) => e.startsWith('inputSchema:'))).toBe(true);

    const noDefault = makeProblem({ defaultInput: undefined as never });
    expect(validateProblemModule(noDefault).some((e) => e.startsWith('defaultInput:'))).toBe(true);
  });

  it('rejects out-of-range quiz lengths', () => {
    expect(validateProblemModule(makeProblem({ quiz: makeQuiz(2) })).some((e) => e.startsWith('quiz:'))).toBe(
      true,
    );
    expect(validateProblemModule(makeProblem({ quiz: makeQuiz(6) })).some((e) => e.startsWith('quiz:'))).toBe(
      true,
    );
  });

  it('rejects invalid quiz answer indexes', () => {
    const badAnswer = makeProblem({
      quiz: [
        { q: 'Q?', options: ['A', 'B'], answer: 5, why: 'W.' },
        ...makeQuiz(2),
      ],
    });
    const errors = validateProblemModule(badAnswer);
    expect(errors.some((e) => e.startsWith('quiz[0]:'))).toBe(true);

    const negative = makeProblem({
      quiz: [{ q: 'Q?', options: ['A', 'B'], answer: -1, why: 'W.' }, ...makeQuiz(2)],
    });
    expect(validateProblemModule(negative).some((e) => e.startsWith('quiz[0]:'))).toBe(true);
  });
});

describe('createRegistry', () => {
  it('finds problems by id', () => {
    const a = makeProblem({ id: 'a', title: 'A' });
    const b = makeProblem({ id: 'b', title: 'B' });
    const registry = createRegistry([a, b]);
    expect(registry.getProblem('a')).toBe(a);
    expect(registry.getProblem('missing')).toBeUndefined();
    expect(registry.warnings).toEqual([]);
  });

  it('filters by category and sorts by category then title', () => {
    const b = makeProblem({ id: 'b', title: 'Beta', category: 'strings' });
    const a = makeProblem({ id: 'a', title: 'Alpha', category: '1d' });
    const c = makeProblem({ id: 'c', title: 'Aardvark', category: '1d' });
    const registry = createRegistry([b, a, c]);
    expect(registry.problems.map((p) => p.id)).toEqual(['c', 'a', 'b']);
    expect(registry.getProblemsByCategory('1d').map((p) => p.id)).toEqual(['c', 'a']);
    expect(registry.getProblemsByCategory('strings').map((p) => p.id)).toEqual(['b']);
    expect(registry.getProblemsByCategory('grid')).toEqual([]);
  });

  it('keeps the first duplicate id and records a warning', () => {
    const first = makeProblem({ id: 'dup', title: 'First' });
    const second = makeProblem({ id: 'dup', title: 'Second' });
    const registry = createRegistry([first, second]);
    expect(registry.problems).toHaveLength(1);
    expect(registry.getProblem('dup')?.title).toBe('First');
    expect(registry.warnings.some((w) => w.includes('dup'))).toBe(true);
  });

  it('skips invalid modules and records a warning', () => {
    const good = makeProblem({ id: 'good' });
    const bad = { id: 'bad' } as unknown as ProblemModule;
    const registry = createRegistry([good, bad]);
    expect(registry.problems.map((p) => p.id)).toEqual(['good']);
    expect(registry.warnings.length).toBeGreaterThan(0);
  });
});

describe('category metadata', () => {
  it('covers every CategoryId', () => {
    expect(Object.keys(CATEGORIES).sort()).toEqual([...CATEGORY_IDS].sort());
    for (const id of CATEGORY_IDS) {
      expect(CATEGORIES[id].id).toBe(id);
      expect(CATEGORIES[id].label.length).toBeGreaterThan(0);
      expect(CATEGORIES[id].description.length).toBeGreaterThan(0);
    }
  });
});

describe('real registry', () => {
  it('loads without throwing', () => {
    expect(Array.isArray(problems)).toBe(true);
    expect(Array.isArray(registryWarnings)).toBe(true);
    expect(getProblem('does-not-exist')).toBeUndefined();
    expect(getProblemsByCategory('1d')).toEqual(
      problems.filter((p) => p.category === '1d'),
    );
  });
});
