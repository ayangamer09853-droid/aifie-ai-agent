// @ts-check

export const GRAPH_NODE_TYPES = Object.freeze({
  EVENT: "EVENT",
  FUNCTION: "FUNCTION",
  AGENT: "AGENT",
  TOOL: "TOOL",
  DATABASE: "DATABASE",
  RETRIEVAL: "RETRIEVAL",
  VALIDATOR: "VALIDATOR",
  RISK_GATE: "RISK_GATE",
  HUMAN_GATE: "HUMAN_GATE",
  CHECKPOINT: "CHECKPOINT",
  SUBGRAPH: "SUBGRAPH"
});

/**
 * Graph Node Definition
 */
export class GraphNode {
  /**
   * @param {Object} options
   * @param {string} options.id
   * @param {string} options.type - One of GRAPH_NODE_TYPES
   * @param {(state: Object, context: Object) => Promise<Object>|Object} options.handler
   * @param {string} [options.description]
   * @param {number} [options.timeoutMs=10000]
   */
  constructor({ id, type, handler, description = "", timeoutMs = 10000 }) {
    if (!id || !type || typeof handler !== "function") {
      throw new Error("GraphNode requires valid id, type, and handler function");
    }
    this.id = id;
    this.type = String(type).toUpperCase();
    this.handler = handler;
    this.description = description;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Execute this node
   * @param {Object} state
   * @param {Object} [context={}]
   */
  async execute(state, context = {}) {
    const startedAt = Date.now();
    try {
      const output = await this.handler(state, context);
      const latencyMs = Date.now() - startedAt;
      return {
        nodeId: this.id,
        type: this.type,
        success: true,
        output,
        latencyMs
      };
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      return {
        nodeId: this.id,
        type: this.type,
        success: false,
        error: err.message || String(err),
        latencyMs
      };
    }
  }
}
