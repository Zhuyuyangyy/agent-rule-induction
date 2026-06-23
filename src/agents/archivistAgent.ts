/**
 * ArchivistAgent - Records workflow state to disk.
 *
 * Writes:
 * - Audit log JSON (full action history)
 * - Candidate pool state (surviving + eliminated candidates)
 * - Observation history (all query points and values)
 *
 * The archivist is a recorder only — it does not evaluate or judge.
 */

import * as fs from "fs";
import * as path from "path";
import { BaseAgent } from "./baseAgent.js";
import type { AgentAction, Candidate, Observation, WorkflowState } from "./types.js";

// ---------------------------------------------------------------------------
// ArchivistAgent
// ---------------------------------------------------------------------------

export interface ArchivistConfig {
  /** Directory to write artifacts to. */
  outputDir: string;
}

export class ArchivistAgent extends BaseAgent {
  private config: ArchivistConfig;

  constructor(config: ArchivistConfig) {
    super("archivist");
    this.config = config;
  }

  async act(state: WorkflowState): Promise<AgentAction[]> {
    fs.mkdirSync(this.config.outputDir, { recursive: true });

    const paths: string[] = [];

    // Write audit log
    const auditLogPath = path.join(
      this.config.outputDir,
      `audit_log_round_${state.round}.json`,
    );
    fs.writeFileSync(auditLogPath, JSON.stringify(state.auditLog, null, 2));
    paths.push(auditLogPath);

    // Write candidate pool state
    const candidatePoolPath = path.join(
      this.config.outputDir,
      `candidate_pool_round_${state.round}.json`,
    );
    const candidatePool = this.buildCandidatePool(state);
    fs.writeFileSync(
      candidatePoolPath,
      JSON.stringify(candidatePool, null, 2),
    );
    paths.push(candidatePoolPath);

    // Write observation history
    const observationPath = path.join(
      this.config.outputDir,
      `observations_round_${state.round}.json`,
    );
    fs.writeFileSync(
      observationPath,
      JSON.stringify(state.observations, null, 2),
    );
    paths.push(observationPath);

    return [this.logAction("archive", { paths })];
  }

  private buildCandidatePool(state: {
    candidates: Candidate[];
    eliminatedIds: string[];
  }): {
    surviving: Candidate[];
    eliminated: Array<Candidate & { eliminatedReason?: string }>;
  } {
    const eliminatedSet = new Set(state.eliminatedIds);
    const surviving: Candidate[] = [];
    const eliminated: Array<Candidate & { eliminatedReason?: string }> = [];

    for (const candidate of state.candidates) {
      if (eliminatedSet.has(candidate.id)) {
        eliminated.push({
          ...candidate,
          eliminatedReason: "failed_verification_or_consistency",
        });
      } else {
        surviving.push(candidate);
      }
    }

    return { surviving, eliminated };
  }
}
