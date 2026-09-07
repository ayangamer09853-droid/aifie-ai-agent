// @ts-check
import { GraphNode } from "./graph-node.mjs";
import { GraphEdge } from "./graph-edge.mjs";
import { GraphState } from "./graph-state.mjs";
import { GraphRouter } from "../runtime/router.mjs";
import { GraphCheckpointManager } from "../runtime/checkpoint.mjs";
import { GraphRecoveryEngine } from "../runtime/recovery.mjs";
import { globalGraphTracer } from "../observability/graph-tracer.mjs";
import { globalEventBus } from "../../core/event-bus.mjs";

/**
 * Directed Graph Execution Engine
 * Enforces explicit topological rules rather than freeform unconstrained LLM loops.
 */
export class GraphEngine {
  /**
   * @param {Object} [options]
   * @param {string} [options.name="AifieTaskGraph"]
   * @param {number} [options.maxSteps=50]
   */
  constructor({ name = "AifieTaskGraph", maxSteps = 50 } = {}) {
    this.name = name;
    this.maxSteps = maxSteps;
    /** @type {Map<string, GraphNode>} */
    this.nodes = new Map();
    /** @type {Array<GraphEdge>} */
    this.edges = [];

    this.router = new GraphRouter();
    this.checkpointManager = new GraphCheckpointManager();
    this.recoveryEngine = new GraphRecoveryEngine();
    this.tracer = globalGraphTracer;
  }

  /**
   * Add a node to the graph
   * @param {GraphNode} node
   */
  addNode(node) {
    if (!node || !node.id) throw new Error("Invalid GraphNode");
    this.nodes.set(node.id, node);
    return this;
  }

  /**
   * Add a directed conditional edge
   * @param {GraphEdge} edge
   */
  addEdge(edge) {
    if (!edge || !edge.from || !edge.to) throw new Error("Invalid GraphEdge");
    this.edges.push(edge);
    return this;
  }

  /**
   * Execute the graph starting from an entry node
   * @param {string} startNodeId
   * @param {GraphState|Object} [initialState]
   * @param {Object} [context={}]
   * @returns {Promise<{ success: boolean, finalState: GraphState, totalSteps: number, trace: Array<Object> }>}
   */
  async run(startNodeId, initialState = {}, context = {}) {
    let state = initialState instanceof GraphState ? initialState : new GraphState(initialState);
    const runId = state.runId;

    if (!this.nodes.has(startNodeId)) {
      throw new Error(`Start node '${startNodeId}' not found in graph '${this.name}'`);
    }

    let currentNodeId = startNodeId;
    let stepCount = 0;
    let lastReasonCode = "GRAPH_START";

    globalEventBus.publish("GRAPH_RUN_STARTED", {
      graphName: this.name,
      runId,
      startNodeId
    }, { source: this.name, correlationId: runId });

    while (currentNodeId && stepCount < this.maxSteps) {
      stepCount++;
      const node = this.nodes.get(currentNodeId);
      if (!node) {
        throw new Error(`Referenced node '${currentNodeId}' does not exist in graph`);
      }

      // 1. Execute Node
      const nodeResult = await node.execute(state, context);

      // 2. State Mutation
      if (nodeResult.success && nodeResult.output && typeof nodeResult.output === "object") {
        state = state.update(nodeResult.output);
      }

      // 3. Save Checkpoint
      this.checkpointManager.saveCheckpoint(runId, stepCount, currentNodeId, state);

      // 4. Record Trace Entry
      this.tracer.recordStep(runId, {
        step: stepCount,
        nodeId: currentNodeId,
        type: node.type,
        reasonCode: lastReasonCode,
        result: nodeResult
      });

      // 5. Check Node Failure
      if (!nodeResult.success) {
        const recoveryPlan = this.recoveryEngine.handleFailure(runId, currentNodeId, nodeResult.error);
        if (recoveryPlan.action === "RETRY") {
          continue; // Re-execute same node
        } else if (recoveryPlan.action === "FALLBACK" && recoveryPlan.fallbackNodeId) {
          lastReasonCode = recoveryPlan.reason;
          currentNodeId = recoveryPlan.fallbackNodeId;
          continue;
        } else {
          // Fatal halt
          return {
            success: false,
            error: nodeResult.error,
            finalState: state,
            totalSteps: stepCount,
            trace: this.tracer.getTrace(runId)
          };
        }
      }

      // 6. Route to Next Node
      const route = this.router.route(currentNodeId, this.edges, state, nodeResult, context);
      lastReasonCode = route.reasonCode;
      currentNodeId = route.nextNodeId;
    }

    const success = stepCount < this.maxSteps;

    globalEventBus.publish("GRAPH_RUN_COMPLETED", {
      graphName: this.name,
      runId,
      totalSteps: stepCount,
      success
    }, { source: this.name, correlationId: runId });

    return {
      success,
      finalState: state,
      totalSteps: stepCount,
      trace: this.tracer.getTrace(runId)
    };
  }

  /**
   * Get graph topology and status
   */
  getStatus() {
    return {
      name: this.name,
      nodesCount: this.nodes.size,
      edgesCount: this.edges.length,
      nodes: Array.from(this.nodes.values()).map(n => ({ id: n.id, type: n.type, description: n.description })),
      edges: this.edges.map(e => ({ from: e.from, to: e.to, reasonCode: e.reasonCode, priority: e.priority }))
    };
  }
}
