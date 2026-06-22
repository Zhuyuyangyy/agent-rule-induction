/**
 * VerifierClient - TypeScript adapter for the SymPy verifier sidecar.
 *
 * Spawns the Python verifier as a subprocess, sends JSON requests via stdin,
 * and returns structured results. Does not modify any P0/P1 benchmark code.
 */

import { spawn } from "child_process";
import * as path from "path";

/** Result returned by the SymPy verifier. */
export interface VerifierResult {
  valid: boolean;
  canonical_expr: string | null;
  violations: string[];
}

/** Options for the verifier client. */
export interface VerifierClientOptions {
  /** Path to the Python verifier script. Defaults to tools/sympy_verifier/verify_expr.py */
  verifierPath?: string;
  /** Timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number;
  /** Path to the Python interpreter. Defaults to "python". */
  pythonPath?: string;
}

/** Equivalence check request. */
export interface EquivalenceCheckRequest {
  task: "equivalence_check";
  expr: string;
  target_expr: string;
  variables?: Record<string, string>;
  options?: { simplify?: boolean; tolerance?: number };
}

/** Dimension check request. */
export interface DimensionCheckRequest {
  task: "dimension_check";
  expr: string;
  variables: Record<string, string>;
  expected_dimension?: string;
}

/** Canonicalize request. */
export interface CanonicalizeRequest {
  task: "canonicalize";
  expr: string;
}

export type VerifierRequest =
  | EquivalenceCheckRequest
  | DimensionCheckRequest
  | CanonicalizeRequest;

export class VerifierClient {
  private verifierPath: string;
  private timeoutMs: number;
  private pythonPath: string;

  constructor(options: VerifierClientOptions = {}) {
    const projectRoot = path.resolve(import.meta.dirname, "../..");
    this.verifierPath = options.verifierPath
      ?? path.join(projectRoot, "tools/sympy_verifier/verify_expr.py");
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.pythonPath = options.pythonPath ?? "python";
  }

  /**
   * Send a verification request to the Python sidecar.
   * The request is piped via stdin; the response is parsed from stdout.
   */
  async verify(request: VerifierRequest): Promise<VerifierResult> {
    const requestJson = JSON.stringify(request);

    return new Promise<VerifierResult>((resolve, reject) => {
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
    });
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
    });
  }

  /** Convenience: canonicalize an expression. */
  async canonicalize(expr: string): Promise<VerifierResult> {
    return this.verify({ task: "canonicalize", expr });
  }
}
