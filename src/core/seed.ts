/**
 * Seed management for reproducible benchmarks.
 */

/** Create a seeded pseudo-random number generator (xorshift32). */
export function createRng(seed: number): () => number {
  let state = seed | 0;
  if (state === 0) state = 1;
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

/** Generate an array of seeds from a base seed. */
export function generateSeeds(baseSeed: number, count: number): number[] {
  const seeds: number[] = [];
  for (let i = 0; i < count; i++) {
    seeds.push(baseSeed + i * 1000);
  }
  return seeds;
}
