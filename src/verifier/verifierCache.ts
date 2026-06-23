/**
 * VerifierCache - Simple in-memory cache for verifier results.
 *
 * Caches results keyed by the JSON-serialized request to avoid
 * redundant Python subprocess calls for identical requests.
 */

import type { VerifierResult } from "./verifierTypes.js";

export class VerifierCache {
  private cache: Map<string, VerifierResult>;
  private maxSize: number;
  private hits: number;
  private misses: number;

  constructor(maxSize: number = 256) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }

  /** Get a cached result. Returns undefined if not cached. */
  get(requestJson: string): VerifierResult | undefined {
    const result = this.cache.get(requestJson);
    if (result !== undefined) {
      this.hits++;
      return result;
    }
    this.misses++;
    return undefined;
  }

  /** Store a result in the cache. Evicts oldest entry if at capacity. */
  set(requestJson: string, result: VerifierResult): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry (first key)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(requestJson, result);
  }

  /** Clear the cache. */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /** Get cache statistics. */
  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}
