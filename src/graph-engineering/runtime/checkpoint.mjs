// @ts-check

/**
 * Graph Checkpoint Manager
 * Stores point-in-time state snapshots for rollbacks, auditing, and recovery.
 */
export class GraphCheckpointManager {
  constructor() {
    /** @type {Map<string, Array<{ step: number, nodeId: string, state: Object, timestamp: number }>>} */
    this.checkpoints = new Map();
  }

  /**
   * Save a checkpoint
   * @param {string} runId
   * @param {number} step
   * @param {string} nodeId
   * @param {Object} state
   */
  saveCheckpoint(runId, step, nodeId, state) {
    if (!this.checkpoints.has(runId)) {
      this.checkpoints.set(runId, []);
    }
    const runHistory = this.checkpoints.get(runId);
    runHistory.push({
      step,
      nodeId,
      state: JSON.parse(JSON.stringify(state)),
      timestamp: Date.now()
    });

    if (runHistory.length > 50) runHistory.shift();
  }

  /**
   * Get latest checkpoint for a run
   * @param {string} runId
   */
  getLatest(runId) {
    const list = this.checkpoints.get(runId);
    return list && list.length > 0 ? list[list.length - 1] : null;
  }

  /**
   * Clear checkpoints for run
   * @param {string} runId
   */
  clear(runId) {
    this.checkpoints.delete(runId);
  }
}
