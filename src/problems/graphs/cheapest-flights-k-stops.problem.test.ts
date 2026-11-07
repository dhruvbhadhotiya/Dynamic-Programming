import { describe, expect, it } from 'vitest';
import { finalAnswer } from '../../engine/dpHelpers';
import { validateInput } from '../../engine/inputValidation';
import { rngInt } from '../../engine/random';
import { runModuleChecks } from '../../engine/testUtils';
import type { Table2DState } from '../../engine/types';
import cheapestFlightsModule from './cheapest-flights-k-stops.problem';
import type { CheapestFlightsKStopsInput } from './cheapest-flights-k-stops.problem';

const INF = Number.POSITIVE_INFINITY;
const MODES = ['tabulation'] as const;

interface Flight {
  from: number;
  to: number;
  price: number;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Independent copy of the module's documented normalisation rules. */
function normalize(input: CheapestFlightsKStopsInput): {
  flights: Flight[];
  source: number;
  dst: number;
  k: number;
} {
  const n = clampInt(input.n, 2, 6);
  const source = clampInt(input.source, 0, n - 1);
  const dst = clampInt(input.dst, 0, n - 1);
  const k = clampInt(input.k, 0, 4);
  const flights: Flight[] = [];

  for (const row of input.flights.slice(0, 8)) {
    if (!Array.isArray(row)) continue;
    const [fromRaw, toRaw, priceRaw] = row;
    if (!isFiniteNumber(fromRaw) || !isFiniteNumber(toRaw) || !isFiniteNumber(priceRaw)) continue;
    const from = clampInt(fromRaw, 0, n - 1);
    const to = clampInt(toRaw, 0, n - 1);
    if (from === to) continue;
    flights.push({ from, to, price: clampInt(priceRaw, 1, 9) });
  }

  return { flights, source, dst, k };
}

/**
 * Independent reference: enumerate every path with at most k + 1 flights by
 * DFS and keep the cheapest one that reaches dst. Positive prices bound the
 * walk by its depth, so cycles cannot run forever.
 */
function reference(input: CheapestFlightsKStopsInput): number {
  const { flights, source, dst, k } = normalize(input);
  const maxFlights = k + 1;
  let best = INF;

  const walk = (city: number, used: number, cost: number): void => {
    if (cost >= best) return;
    if (city === dst) {
      best = cost;
      return;
    }
    if (used >= maxFlights) return;
    for (const flight of flights) {
      if (flight.from !== city) continue;
      walk(flight.to, used + 1, cost + flight.price);
    }
  };

  walk(source, 0, 0);
  return best === INF ? -1 : best;
}

function answerOf(input: CheapestFlightsKStopsInput): unknown {
  return finalAnswer(cheapestFlightsModule.generateSteps(input, 'tabulation'));
}

describe('cheapest-flights-k-stops module', () => {
  it('matches the DFS path-enumeration reference on 20 seeded cases', () => {
    runModuleChecks(cheapestFlightsModule, reference, {
      cases: 20,
      seed: 37,
      inputGenerator: (rng) => {
        const n = rngInt(rng, 2, 6);
        const source = rngInt(rng, 0, n - 1);
        const dst = rngInt(rng, 0, n - 1);
        const k = rngInt(rng, 0, 4);
        const rows = rngInt(rng, 1, 8);
        const flights = Array.from({ length: rows }, () => [
          rngInt(rng, 0, n - 1),
          rngInt(rng, 0, n - 1),
          rngInt(rng, 1, 9),
        ]);
        return { n, flights, source, dst, k };
      },
    });
  });

  it('returns known answers including unreachable, k=0, source=dst and exactly-k routes', () => {
    expect(answerOf(cheapestFlightsModule.defaultInput)).toBe(7);
    expect(answerOf({ n: 3, flights: [[0, 1, 5], [1, 0, 5]], source: 0, dst: 2, k: 4 })).toBe(-1);
    expect(answerOf({ n: 2, flights: [[0, 1, 9]], source: 0, dst: 1, k: 0 })).toBe(9);
    expect(answerOf({ n: 3, flights: [[0, 1, 1], [1, 2, 1]], source: 0, dst: 2, k: 0 })).toBe(-1);
    expect(answerOf({ n: 3, flights: [[0, 1, 1], [1, 0, 1]], source: 1, dst: 1, k: 0 })).toBe(0);
    expect(
      answerOf({ n: 3, flights: [[0, 2, 9], [0, 1, 2], [1, 2, 3]], source: 0, dst: 2, k: 1 }),
    ).toBe(5);
    expect(
      answerOf({
        n: 4,
        flights: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 3, 8]],
        source: 0,
        dst: 3,
        k: 1,
      }),
    ).toBe(8);
    expect(
      answerOf({
        n: 4,
        flights: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 3, 8]],
        source: 0,
        dst: 3,
        k: 2,
      }),
    ).toBe(3);
    expect(
      answerOf({
        n: 4,
        flights: [[0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 3], [2, 3, 8]],
        source: 0,
        dst: 3,
        k: 2,
      }),
    ).toBe(7);
  });

  it('ends on the answer cell of a (k+1) x n stop-layer table', () => {
    const steps = cheapestFlightsModule.generateSteps(
      cheapestFlightsModule.defaultInput,
      'tabulation',
    );
    const last = steps.at(-1);

    expect(last?.vars?.answer).toBe(7);
    expect(last?.message.toLowerCase()).toContain('answer');
    expect(last?.highlights).toContainEqual(
      expect.objectContaining({ pos: [2, 3], kind: 'result' }),
    );
    const state = last?.state as Table2DState;
    expect(state.kind).toBe('table2d');
    expect(state.values).toHaveLength(3);
    expect(state.values[2]).toHaveLength(4);
    expect(state.values[2]?.[3]).toBe(7);
  });

  it('marks the active cell and the previous-layer dependency during a relaxation', () => {
    const steps = cheapestFlightsModule.generateSteps(
      cheapestFlightsModule.defaultInput,
      'tabulation',
    );
    const relaxation = steps.find(
      (step) => step.vars?.from === 'c1' && step.vars?.to === 'c3',
    );

    expect(relaxation).toBeDefined();
    expect(relaxation?.vars?.candidate).toBe(7);
    expect(relaxation?.highlights).toContainEqual(
      expect.objectContaining({ pos: [1, 3], kind: 'active' }),
    );
    expect(relaxation?.highlights).toContainEqual(
      expect.objectContaining({ pos: [0, 1], kind: 'dependency' }),
    );
  });

  it('normalises out-of-range and malformed fields without throwing', () => {
    const messy = {
      n: 99,
      flights: [[9, 9, 0], [0, 1, 0], [1, 2, 99], [2, 'x', 1], [3]],
      source: 99,
      dst: -4,
      k: 99,
    } as unknown as CheapestFlightsKStopsInput;

    const steps = cheapestFlightsModule.generateSteps(messy, 'tabulation');
    const last = steps.at(-1);
    expect(last?.vars?.answer).toBe(-1);
    expect(last?.message.toLowerCase()).toContain('answer');
  });

  it('has metadata, a valid default input and the required schema ranges', () => {
    expect(cheapestFlightsModule.id).toBe('cheapest-flights-k-stops');
    expect(cheapestFlightsModule.title).toBe('Cheapest Flights Within K Stops');
    expect(cheapestFlightsModule.category).toBe('graphs');
    expect(cheapestFlightsModule.renderer).toBe('table2d');
    expect(cheapestFlightsModule.modes).toEqual(['tabulation']);
    expect(cheapestFlightsModule.defaultInput).toEqual({
      n: 4,
      flights: [[0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 3], [2, 3, 8]],
      source: 0,
      dst: 3,
      k: 2,
    });

    const values: Record<string, unknown> = { ...cheapestFlightsModule.defaultInput };
    expect(validateInput(cheapestFlightsModule.inputSchema, values)).toEqual({});

    expect(cheapestFlightsModule.inputSchema).toHaveLength(5);
    expect(cheapestFlightsModule.inputSchema[0]).toMatchObject({
      name: 'n',
      type: 'number',
      min: 2,
      max: 6,
    });
    expect(cheapestFlightsModule.inputSchema[1]).toMatchObject({
      name: 'flights',
      type: 'matrix',
      minRows: 1,
      maxRows: 8,
      maxCols: 3,
      min: 0,
      max: 9,
      numeric: true,
    });
    expect(cheapestFlightsModule.inputSchema[2]).toMatchObject({
      name: 'source',
      type: 'number',
      min: 0,
      max: 5,
    });
    expect(cheapestFlightsModule.inputSchema[3]).toMatchObject({
      name: 'dst',
      type: 'number',
      min: 0,
      max: 5,
    });
    expect(cheapestFlightsModule.inputSchema[4]).toMatchObject({
      name: 'k',
      type: 'number',
      min: 0,
      max: 4,
    });
  });

  it('has 4 quiz questions with valid answer indexes', () => {
    expect(cheapestFlightsModule.quiz).toHaveLength(4);
    for (const question of cheapestFlightsModule.quiz) {
      expect(question.q.trim()).not.toBe('');
      expect(question.why.trim()).not.toBe('');
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
    }
  });

  it('keeps every step codeLine valid in all three snippets', () => {
    const snippets = [
      cheapestFlightsModule.code.python,
      cheapestFlightsModule.code.javascript,
      cheapestFlightsModule.code.cpp,
    ];
    const minLines = Math.min(...snippets.map((snippet) => snippet.split('\n').length));
    expect(minLines).toBeGreaterThanOrEqual(15);

    for (const snippet of snippets) {
      expect(snippet).toContain('dp');
      expect(snippet).toContain('answer');
      expect(snippet).toContain('return');
    }

    for (const mode of MODES) {
      const maxCodeLine = Math.max(
        ...cheapestFlightsModule
          .generateSteps(cheapestFlightsModule.defaultInput, mode)
          .map((step) => step.codeLine),
      );
      expect(maxCodeLine).toBeLessThanOrEqual(minLines);
    }
  });
});
