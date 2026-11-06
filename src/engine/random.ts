/**
 * Deterministic seeded pseudo-random helpers (mulberry32).
 * Pure and dependency-free so tests can reproduce identical inputs.
 */

/** A function returning the next value in [0, 1). */
export type Rng = () => number;

/**
 * Create a seeded RNG using the mulberry32 algorithm.
 * The same seed always produces the same sequence.
 */
export function createRng(seed: number): Rng {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Return an integer in [min, max], both ends inclusive.
 * Float bounds are tightened (ceil/floor); throws if the range is empty.
 */
export function rngInt(rng: Rng, min: number, max: number): number {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  if (low > high) {
    throw new RangeError(`rngInt requires min <= max, got ${min} > ${max}`);
  }
  const span = high - low + 1;
  return Math.min(high, low + Math.floor(rng() * span));
}

/**
 * Return a uniformly random element of `items`. Throws on an empty array.
 */
export function rngPick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) {
    throw new RangeError('rngPick requires a non-empty array');
  }
  return items[rngInt(rng, 0, items.length - 1)]!;
}

/**
 * Return a shuffled copy of `arr` (Fisher-Yates). The input is not mutated.
 */
export function rngShuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = rngInt(rng, 0, i);
    const held = result[i]!;
    result[i] = result[j]!;
    result[j] = held;
  }
  return result;
}
