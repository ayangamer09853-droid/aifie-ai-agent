// @ts-check

/**
 * Execution Graph Tracer & Lineage Auditor
 * Records exact step execution timeline and allows backward causal traversal.
 */
export class GraphTracer {
  constructor() {
    /** @type {Map<string, Array<Object>>} */
    this.runs = new Map();
  }

  /**
   * Record step entry in execution graph
   * @param {string} runId
   * @param {Object} stepRecord
   */
  recordStep(runId, stepRecord) {
    if (!this.runs.has(runId)) {
      this.runs.set(runId, []);
    }
    const trace = this.runs.get(runId);
    trace.push({
      ...stepRecord,
      timestamp: Date.now(),
      isoTimestamp: new Date().toISOString()
    });

    if (trace.length > 100) trace.shift();
  }

  /**
   * Get full trace for a run
   * @param {string} runId
   */
  getTrace(runId) {
    return this.runs.get(runId) || [];
  }

  /**
   * Traverse execution graph backwards to explain a decision
   * @param {string} runId
   */
  traceCausalLineage(runId) {
    const trace = this.runs.get(runId) || [];
    if (trace.length === 0) return { runId, found: false, explanation: "No trace found for run" };

    const lineage = [];
    // Traverse backwards from final node to start
    for (let i = trace.length - 1; i >= 0; i--) {
      const step = trace[i];
      lineage.push({
        stepIndex: i + 1,
        nodeId: step.nodeId,
        type: step.type,
        decision: step.result?.success ? "PASSED" : "FAILED",
        reasonCode: step.reasonCode || "UNSPECIFIED",
        latencyMs: step.result?.latencyMs || 0
      });
    }

    const finalStep = trace[trace.length - 1];
    const initialStep = trace[0];

    return {
      runId,
      totalSteps: trace.length,
      startedAt: initialStep?.isoTimestamp,
      completedAt: finalStep?.isoTimestamp,
      terminalOutcome: finalStep?.result?.output?.status || (finalStep?.result?.success ? "SUCCESS" : "FAILED"),
      causalLineage: lineage,
      narrative: `Run started at ${initialStep?.nodeId} and reached ${finalStep?.nodeId} in ${trace.length} deterministic steps.`
    };
  }

  getSummary() {
    return {
      totalRunsTraced: this.runs.size,
      totalTraces: this.runs.size
    };
  }
}

export const globalGraphTracer = new GraphTracer();
export const graphTracer = globalGraphTracer;
