// @ts-check

/**
 * Graph Edge Definition with Conditional Logic
 */
export class GraphEdge {
  /**
   * @param {Object} options
   * @param {string} options.from - Source node ID
   * @param {string} options.to - Destination node ID
   * @param {(state: Object, result: Object, context: Object) => boolean} [options.condition] - Edge traversal condition
   * @param {string} [options.reasonCode="UNCONDITIONAL"] - Causal explanation code
   * @param {number} [options.priority=10] - Lower number = higher evaluation priority
   */
  constructor({
    from,
    to,
    condition = null,
    reasonCode = "UNCONDITIONAL",
    priority = 10
  }) {
    if (!from || !to) {
      throw new Error("GraphEdge requires 'from' and 'to' node IDs");
    }
    this.from = from;
    this.to = to;
    this.condition = condition || (() => true);
    this.reasonCode = reasonCode;
    this.priority = priority;
  }

  /**
   * Evaluate whether this edge should be traversed
   * @param {Object} state
   * @param {Object} result
   * @param {Object} [context={}]
   * @returns {{ canTraverse: boolean, reasonCode: string }}
   */
  evaluate(state, result, context = {}) {
    try {
      const canTraverse = Boolean(this.condition(state, result, context));
      return {
        canTraverse,
        reasonCode: this.reasonCode
      };
    } catch {
      return {
        canTraverse: false,
        reasonCode: `EVALUATION_ERROR_${this.reasonCode}`
      };
    }
  }
}
