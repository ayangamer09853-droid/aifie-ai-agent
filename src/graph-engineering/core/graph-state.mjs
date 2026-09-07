// @ts-check
import { randomUUID } from "node:crypto";

/**
 * Typed Shared Graph State
 * Ensures explicit state transitions without hidden context.
 */
export class GraphState {
  /**
   * @param {Object} [initial={}]
   */
  constructor(initial = {}) {
    this.runId = initial.runId || `run-${randomUUID().slice(0, 8)}`;
    this.goal = initial.goal || "EVALUATE_TRADING_CYCLE";
    this.marketState = initial.marketState || { status: "SAFE", quote: null, regime: "NEUTRAL" };
    this.portfolioState = initial.portfolioState || { equity: 100000, cash: 100000, positions: {} };
    this.activeAgents = initial.activeAgents || [];
    this.taskState = initial.taskState || {};
    this.evidence = initial.evidence || [];
    this.decisions = initial.decisions || [];
    this.riskState = initial.riskState || { approved: false, checks: {} };
    this.executionState = initial.executionState || { executed: false, order: null };
    this.learningState = initial.learningState || { recorded: false };
    this.graphVersion = initial.graphVersion || "1.0.0";
    this.createdAt = Date.now();
    this.updatedAt = this.createdAt;
  }

  /**
   * Produce an updated state with partial mutations
   * @param {Partial<GraphState>} updates
   * @returns {GraphState}
   */
  update(updates = {}) {
    return new GraphState({
      runId: this.runId,
      goal: updates.goal !== undefined ? updates.goal : this.goal,
      marketState: updates.marketState !== undefined ? { ...this.marketState, ...updates.marketState } : this.marketState,
      portfolioState: updates.portfolioState !== undefined ? { ...this.portfolioState, ...updates.portfolioState } : this.portfolioState,
      activeAgents: updates.activeAgents !== undefined ? [...updates.activeAgents] : this.activeAgents,
      taskState: updates.taskState !== undefined ? { ...this.taskState, ...updates.taskState } : this.taskState,
      evidence: updates.evidence !== undefined ? [...this.evidence, ...updates.evidence] : this.evidence,
      decisions: updates.decisions !== undefined ? [...this.decisions, ...updates.decisions] : this.decisions,
      riskState: updates.riskState !== undefined ? { ...this.riskState, ...updates.riskState } : this.riskState,
      executionState: updates.executionState !== undefined ? { ...this.executionState, ...updates.executionState } : this.executionState,
      learningState: updates.learningState !== undefined ? { ...this.learningState, ...updates.learningState } : this.learningState,
      graphVersion: updates.graphVersion !== undefined ? updates.graphVersion : this.graphVersion
    });
  }

  /**
   * Return a plain JSON snapshot of the state
   */
  snapshot() {
    return JSON.parse(JSON.stringify(this));
  }
}
