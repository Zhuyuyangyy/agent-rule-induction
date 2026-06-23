/**
 * VerifierClient - TypeScript adapter for the SymPy verifier sidecar.
 *
 * Spawns the Python verifier as a subprocess, sends JSON requests via stdin,
 * and returns structured results. Supports caching for repeated requests.
 * Does not modify any P0/P1 benchmark code.
 */

import { spawn } from "child_process";
import * as path from "path";
import type {
  VerifierResult,
  VerifierClientOptions,
  VerifierRequest,
  EquivalenceCheckRequest,
  DimensionCheckRequest,
  CanonicalizeRequest,
  LimitCheckRequest,
  InvariantCheckRequest,
  ComplexityCheckRequest,
} from "./verifierTypes.js";
import { VerifierCache } from "./verifierCache.js";

export type {
  VerifierResult,
  VerifierRequest,
  EquivalenceCheckRequest,
  DimensionCheckRequest,
  CanonicalizeRequest,
  LimitCheckRequest,
  InvariantCheckRequest,
  ComplexityCheckRequest,
};

export class VerifierClient {
  private verifierPath: string;
  private timeoutMs: number;
  private pythonPath: string;
  private cache: VerifierCache | null;

  constructor(options: VerifierClientOptions = {}) {
    const projectRoot = path.resolve(import.meta.dirname, "../..");
    this.verifierPath = options.verifierPath
      ?? path.join(projectRoot, "tools/sympy_verifier/verify_expr.py");
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.pythonPath = options.pythonPath ?? "python";
    this.cache = options.enableCache
      ? new VerifierCache(options.maxCacheSize ?? 256)
      : null;
  }

  /**
   * Send a verification request to the Python sidecar.
   * The request is piped via stdin; the response is parsed from stdout.
   * Results are cached if caching is enabled.
   */
  async verify(request: VerifierRequest): Promise<VerifierResult> {
    const requestJson = JSON.stringify(request);

    // Check cache
    if (this.cache) {
      const cached = this.cache.get(requestJson);
      if (cached !== undefined) {
        return cached;
      }
    }

    const result = await this._spawnVerifier(requestJson);

    // Store in cache
    if (this.cache) {
      this.cache.set(requestJson, result);
    }

    return result;
  }

  /** Internal: spawn the Python verifier subprocess. */
  private _spawnVerifier(requestJson: string): Promise<VerifierResult> {
    return new Promise<VerifierResult>((resolve) => {
      const proc = spawn(this.pythonPath, [this.verifierPath, "-"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        resolve({
          valid: false,
          canonical_expr: null,
          violations: [`Verifier timed out after ${this.timeoutMs}ms`],
        });
      }, this.timeoutMs);

      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0 && !stdout) {
          resolve({
            valid: false,
            canonical_expr: null,
            violations: [
              `Verifier exited with code ${code}`,
              ...(stderr.trim() ? [stderr.trim()] : []),
            ],
          });
          return;
        }

        try {
          const result: VerifierResult = JSON.parse(stdout.trim());
          resolve(result);
        } catch (e: any) {
          resolve({
            valid: false,
            canonical_expr: null,
            violations: [
              `Failed to parse verifier output: ${e.message}`,
              `Raw stdout: ${stdout.slice(0, 500)}`,
            ],
          });
        }
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          valid: false,
          canonical_expr: null,
          violations: [`Failed to spawn verifier: ${err.message}`],
        });
      });

      // Send request via stdin
      proc.stdin.write(requestJson);
      proc.stdin.end();
    });
  }

  /** Convenience: check symbolic equivalence. */
  async checkEquivalence(
    expr: string,
    targetExpr: string,
    options?: { simplify?: boolean; tolerance?: number },
  ): Promise<VerifierResult> {
    return this.verify({
      task: "equivalence_check",
      expr,
      target_expr: targetExpr,
      options,
    } as EquivalenceCheckRequest);
  }

  /** Convenience: check dimensional homogeneity. */
  async checkDimension(
    expr: string,
    variables: Record<string, string>,
    expectedDimension?: string,
  ): Promise<VerifierResult> {
    return this.verify({
      task: "dimension_check",
      expr,
      variables,
      expected_dimension: expectedDimension,
    } as DimensionCheckRequest);
  }

  /** Convenience: canonicalize an expression. */
  async canonicalize(expr: string): Promise<VerifierResult> {
    return this.verify({ task: "canonicalize", expr } as CanonicalizeRequest);
  }

  /** Convenience: check limit behavior. */
  async checkLimit(
    expr: string,
    testPoint: Record<string, string | number>,
    expectedLimit?: string,
    direction?: "+" | "-",
  ): Promise<VerifierResult> {
    return this.verify({
      task: "limit_check",
      expr,
      test_point: testPoint,
      expected_limit: expectedLimit,
      direction,
    } as LimitCheckRequest);
  }

  /** Convenience: check invariants. */
  async checkInvariants(
    expr: string,
    invariants: Array<{
      type: "conservation" | "symmetry" | "positivity";
      variables: string[];
    }>,
  ): Promise<VerifierResult> {
    return this.verify({
      task: "invariant_check",
      expr,
      invariants,
    } as InvariantCheckRequest);
  }

  /** Convenience: check complexity. */
  async checkComplexity(
    expr: string,
    maxComplexity?: number,
  ): Promise<VerifierResult> {
    return this.verify({
      task: "complexity_check",
      expr,
      max_complexity: maxComplexity,
    } as ComplexityCheckRequest);
  }

  /** Get cache statistics (if caching is enabled). */
  getCacheStats(): { size: number; hits: number; misses: number; hitRate: number } | null {
    return this.cache?.getStats() ?? null;
  }

  /** Clear the result cache. */
  clearCache(): void {
    this.cache?.clear();
  }
}
