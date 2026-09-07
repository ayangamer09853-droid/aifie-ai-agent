// @ts-check
import { GraphEdge } from "../core/graph-edge.mjs";

/**
 * Graph Router
 * Evaluates conditional edges leaving the current node and selects the next destination.
 */
export class GraphRouter {
  /**
   * Select next edge to traverse
   * @param {string} currentNodeId
   * @param {Array<GraphEdge>} edges
   * @param {Object} state
   * @param {Object} nodeResult
   * @param {Object} [context={}]
   * @returns {{ nextNodeId: string|null, reasonCode: string, edge: GraphEdge|null }}
   */
  route(currentNodeId, edges, state, nodeResult, context = {}) {
    const candidateEdges = edges
      .filter(e => e.from === currentNodeId)
      .sort((a, b) => (a.priority || 10) - (b.priority || 10));

    for (const edge of candidateEdges) {
      const evaluation = edge.evaluate(state, nodeResult, context);
      if (evaluation.canTraverse) {
        return {
          nextNodeId: edge.to,
          reasonCode: evaluation.reasonCode,
          edge
        };
      }
    }

    return {
      nextNodeId: null,
      reasonCode: "TERMINAL_NO_OUTGOING_EDGES",
      edge: null
    };
  }
}
