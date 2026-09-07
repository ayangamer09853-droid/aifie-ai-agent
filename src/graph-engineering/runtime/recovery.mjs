// @ts-check
import { classifyError } from "../../core/errors.mjs";

/**
 * Graph Failure & Recovery Engine
 * Implements explicit Failure Graph isolation rather than naive unbounded retries.
 */
export class GraphRecoveryEngine {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxRetries=3]
   */
  constructor({ maxRetries = 3 } = {}) {
    this.maxRetries = maxRetries;
    this.retryCounters = new Map();
  }

  /**
   * Determine recovery plan when a node fails
   * @param {string} runId
   * @param {string} nodeId
   * @param {Error|any} error
   * @param {Object} [fallbackRoutes={}]
   * @returns {{ action: "RETRY"|"FALLBACK"|"HALT", fallbackNodeId?: string, delayMs?: number, reason: string }}
   */
  handleFailure(runId, nodeId, error, fallbackRoutes = {}) {
    const key = `${runId}:${nodeId}`;
    const retries = (this.retryCounters.get(key) || 0) + 1;
    this.retryCounters.set(key, retries);

    const classification = classifyError(error);

    // 1. Retryable transient errors within maxRetries limit
    if (classification.isRetryable && retries <= this.maxRetries) {
      const delayMs = Math.min(2000, 100 * Math.pow(2, retries - 1));
      return {
        action: "RETRY",
        delayMs,
        reason: `Transient failure in node ${nodeId} (${classification.type}): retrying attempt ${retries}/${this.maxRetries}`
      };
    }

    // 2. Fallback destination if defined
    if (fallbackRoutes[nodeId]) {
      return {
        action: "FALLBACK",
        fallbackNodeId: fallbackRoutes[nodeId],
        reason: `Exhausted retries or non-retryable error in node ${nodeId}: routing to safe fallback ${fallbackRoutes[nodeId]}`
      };
    }

    // 3. Fatal halt
    return {
      action: "HALT",
      reason: `Fatal unrecoverable failure in node ${nodeId}: ${classification.error}`
    };
  }

  /**
   * Reset counters for a run
   * @param {string} runId
   */
  clearRun(runId) {
    for (const key of this.retryCounters.keys()) {
      if (key.startsWith(`${runId}:`)) {
        this.retryCounters.delete(key);
      }
    }
  }
}
