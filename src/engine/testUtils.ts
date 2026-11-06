/**
 * Test infrastructure: run a problem module against a reference implementation.
 * Generates seeded inputs from the module schema, drives generateSteps in every
 * relevant mode, and asserts structural invariants plus answer correctness.
 */
import { expect } from 'vitest';
import { finalAnswer } from './dpHelpers';
import { createRng, rngInt, rngPick } from './random';
import type { Rng } from './random';
import { validateInput } from './inputValidation';
import type { InputValues } from './inputValidation';
import { isRecord, isStep } from './types';
import type { Mode, ProblemModule } from './types';

const ALL_MODES: readonly Mode[] = ['bruteforce', 'memo', 'tabulation'];
const DEFAULT_CASES = 20;
const DEFAULT_SEED = 1;

export interface RunModuleChecksOptions<I> {
  /** Number of seeded inputs to generate. Defaults to 20. */
  cases?: number;
  /** Seed for the RNG stream. Defaults to 1. */
  seed?: number;
  /** Override input generation; receives the seeded RNG and the case index. */
  inputGenerator?: (rng: Rng, index: number) => I;
}

function lineCount(snippet: string): number {
  return snippet.split('\n').length;
}

function randomWord(rng: Rng, minLength: number, maxLength: number): string {
  const low = Math.max(1, minLength);
  const length = rngInt(rng, low, Math.max(low, maxLength));
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  return Array.from({ length }, () => rngPick(rng, letters)).join('');
}

/**
 * Generate one seeded, schema-valid input from `base`.
 * Mirrors randomizeInput (see inputValidation.ts) but drives it with the
 * seeded RNG so runs are reproducible. Falls back to a clone of `base`
 * if the candidate fails validation (e.g. patterned text fields).
 */
function seededInput(schema: ProblemModule<unknown>['inputSchema'], base: InputValues, rng: Rng): InputValues {
  const candidate: InputValues = structuredClone(base);
  for (const field of schema) {
    switch (field.type) {
      case 'number':
        candidate[field.name] = rngInt(rng, field.min, field.max);
        break;
      case 'text':
        candidate[field.name] = field.pattern
          ? base[field.name]
          : randomWord(rng, field.minLength ?? 1, field.maxLength);
        break;
      case 'array':
        candidate[field.name] = Array.from(
          { length: rngInt(rng, field.minItems, Math.min(field.maxItems, field.minItems + 5)) },
          () =>
            field.itemType === 'number'
              ? rngInt(rng, field.min ?? 0, field.max ?? 20)
              : String.fromCharCode(rngInt(rng, 65, 70)),
        );
        break;
      case 'matrix': {
        const rows = rngInt(rng, field.minRows, Math.min(field.maxRows, field.minRows + 2));
        const cols = rngInt(rng, 1, Math.min(field.maxCols, 6));
        candidate[field.name] = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () =>
            field.numeric ? rngInt(rng, field.min, field.max) : rngPick(rng, ['.', '#', 'S', 'E']),
          ),
        );
        break;
      }
      case 'select':
        candidate[field.name] = rngPick(rng, field.options).value;
        break;
    }
  }
  return Object.keys(validateInput(schema, candidate)).length === 0 ? candidate : structuredClone(base);
}

/**
 * Assert that `module` produces valid steps whose final answers match
 * `reference(input)`. Throws (via vitest expect) on the first failure.
 * `reference` should return a JSON value; finalAnswer values are compared
 * with vitest's `toEqual` (recursive deep equality).
 */
export function runModuleChecks<I>(
  module: ProblemModule<I>,
  reference: (input: I) => unknown,
  options?: RunModuleChecksOptions<I>,
): void {
  const totalCases = options?.cases ?? DEFAULT_CASES;
  if (totalCases <= 0) {
    throw new RangeError(`runModuleChecks requires cases > 0, got ${totalCases}`);
  }
  const rng = createRng(options?.seed ?? DEFAULT_SEED);
  const modes = module.modes && module.modes.length > 0 ? module.modes : ALL_MODES;
  const maxLine = Math.min(
    lineCount(module.code.python),
    lineCount(module.code.javascript),
    lineCount(module.code.cpp),
  );
  const baseRecord: InputValues | null = isRecord(module.defaultInput) ? module.defaultInput : null;

  for (let caseIndex = 0; caseIndex < totalCases; caseIndex += 1) {
    let input: I;
    if (options?.inputGenerator) {
      input = options.inputGenerator(rng, caseIndex);
    } else if (baseRecord) {
      input = seededInput(module.inputSchema, baseRecord, rng) as unknown as I;
    } else {
      input = structuredClone(module.defaultInput);
    }

    for (const mode of modes) {
      const ctx = `${module.id} case ${caseIndex} (${JSON.stringify(input)}) mode ${mode}`;
      const steps = module.generateSteps(input, mode);
      expect(steps.length, ctx).toBeGreaterThan(0);

      steps.forEach((step, stepIndex) => {
        const stepCtx = `${ctx} step ${stepIndex}`;
        expect(isStep(step), stepCtx).toBe(true);
        expect(step.codeLine, stepCtx).toBeGreaterThanOrEqual(1);
        expect(step.codeLine, stepCtx).toBeLessThanOrEqual(maxLine);
      });

      const last = steps.at(-1);
      expect(last !== undefined, ctx).toBe(true);
      expect(last?.message.toLowerCase() ?? '', ctx).toContain('answer');

      const actual = finalAnswer(steps);
      const expected = reference(input);
      expect(actual, ctx).toEqual(expected);
    }
  }
}
