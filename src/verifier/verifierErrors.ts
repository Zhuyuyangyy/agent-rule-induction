/**
 * VerifierErrors - Error types for the verifier client.
 */

/** Base error for verifier operations. */
export class VerifierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerifierError";
  }
}

/** Thrown when the verifier subprocess times out. */
export class VerifierTimeoutError extends VerifierError {
  constructor(timeoutMs: number) {
    super(`Verifier timed out after ${timeoutMs}ms`);
    this.name = "VerifierTimeoutError";
  }
}

/** Thrown when the verifier subprocess fails to spawn. */
export class VerifierSpawnError extends VerifierError {
  constructor(cause: string) {
    super(`Failed to spawn verifier: ${cause}`);
    this.name = "VerifierSpawnError";
  }
}

/** Thrown when the verifier returns unparseable output. */
export class VerifierParseError extends VerifierError {
  public readonly rawOutput: string;

  constructor(rawOutput: string, cause: string) {
    super(`Failed to parse verifier output: ${cause}`);
    this.name = "VerifierParseError";
    this.rawOutput = rawOutput;
  }
}

/** Thrown when the verifier subprocess exits with a non-zero code. */
export class VerifierExitError extends VerifierError {
  public readonly exitCode: number;
  public readonly stderr: string;

  constructor(exitCode: number, stderr: string) {
    super(`Verifier exited with code ${exitCode}`);
    this.name = "VerifierExitError";
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/** Thrown when a request fails schema validation. */
export class VerifierSchemaError extends VerifierError {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`Request validation failed: ${errors.join("; ")}`);
    this.name = "VerifierSchemaError";
    this.errors = errors;
  }
}
