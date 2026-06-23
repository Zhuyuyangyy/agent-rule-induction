/**
 * BaseAgent - Abstract base class for all workflow agents.
 *
 * Every agent has a role and produces actions that are recorded in the audit log.
 * Agents are proposal mechanisms only — they never serve as final judges.
 */

import type { AgentRole, AgentAction, WorkflowState } from "./types.js";

export abstract class BaseAgent {
  readonly role: AgentRole;

  constructor(role: AgentRole) {
    this.role = role;
  }

  /**
   * Execute the agent's logic given the current workflow state.
   * Returns one or more actions to be recorded in the audit log.
   */
  abstract act(state: WorkflowState): Promise<AgentAction[]>;

  /**
   * Helper: create a timestamped AgentAction with this agent's role.
   */
  protected logAction(action: string, payload: unknown): AgentAction {
    return {
      role: this.role,
      action,
      payload,
      timestamp: Date.now(),
    };
  }
}
