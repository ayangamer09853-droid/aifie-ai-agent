// src/graph/agent-state-graph.mjs
// Stateful Computational Agent Workflow Graph Engine (DAG & Cyclic Multi-Agent Execution)
// Features: State Channels, Conditional Branch Routers, Reflection Loops, Recursion Guard, Checkpointing
// Pure Node.js ESM built-ins only

export class AgentStateGraph {
  constructor(options = {}) {
    this.name = options.name || "AifieAgentStateGraph";
    this.nodes = new Map(); // nodeName -> async (state) => Partial<State>
    this.edges = new Map(); // fromNode -> toNode
    this.conditionalEdges = new Map(); // fromNode -> { routerFn, pathMap }
    this.entryNode = null;
    this.finishNodes = new Set();
    this.maxRecursion = options.maxRecursion || 25;
    this.checkpoints = [];
  }

  /**
   * Register a processing node function in the state graph.
   */
  addNode(name, handlerFn) {
    if (!name || typeof handlerFn !== "function") {
      throw new Error(`Invalid node registration for '${name}'. Must supply valid name and function.`);
    }
    this.nodes.set(name, handlerFn);
    return this;
  }

  /**
   * Set the starting entry point node of the graph.
   */
  setEntryPoint(nodeName) {
    if (!this.nodes.has(nodeName)) {
      throw new Error(`Entry node '${nodeName}' not found in registered nodes.`);
    }
    this.entryNode = nodeName;
    return this;
  }

  /**
   * Add a terminal finish node where execution successfully halts.
   */
  addFinishNode(nodeName) {
    this.finishNodes.add(nodeName);
    return this;
  }

  /**
   * Add a static directed edge from one node to another.
   */
  addEdge(fromNode, toNode) {
    if (!this.nodes.has(fromNode)) {
      throw new Error(`Source node '${fromNode}' not registered`);
    }
    if (toNode !== "END" && !this.nodes.has(toNode)) {
      throw new Error(`Destination node '${toNode}' not registered`);
    }
    this.edges.set(fromNode, toNode);
    return this;
  }

  /**
   * Add a conditional branch routing function.
   * @param {string} fromNode - Origin node
   * @param {Function} routerFn - (state) => routeKey
   * @param {Object} pathMap - { [routeKey]: destinationNode }
   */
  addConditionalEdges(fromNode, routerFn, pathMap) {
    if (!this.nodes.has(fromNode)) {
      throw new Error(`Source node '${fromNode}' not registered`);
    }
    if (typeof routerFn !== "function") {
      throw new Error(`routerFn for '${fromNode}' must be a function`);
    }
    this.conditionalEdges.set(fromNode, { routerFn, pathMap: { ...pathMap } });
    return this;
  }

  /**
   * Execute the workflow graph from entry node until END or terminal finish node.
   */
  async invoke(initialState = {}) {
    if (!this.entryNode) {
      throw new Error("Cannot invoke state graph: Entry point not set.");
    }

    let state = {
      ...initialState,
      __executionLogs: [],
      __stepCount: 0,
      __visitedNodes: []
    };

    let currentNode = this.entryNode;
    let iteration = 0;
    const runId = `RUN_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();

    while (currentNode && currentNode !== "END" && !this.finishNodes.has(currentNode)) {
      iteration += 1;
      if (iteration > this.maxRecursion) {
        state.__executionLogs.push({
          step: iteration,
          level: "WARN",
          message: `Max recursion depth (${this.maxRecursion}) reached. Force terminating execution.`
        });
        break;
      }

      const handler = this.nodes.get(currentNode);
      if (!handler) {
        throw new Error(`Node '${currentNode}' handler not found during execution.`);
      }

      state.__stepCount = iteration;
      state.__visitedNodes.push(currentNode);

      const stepStart = Date.now();
      let nodeOutput = {};

      try {
        nodeOutput = (await handler(state)) || {};
      } catch (err) {
        state.__executionLogs.push({
          step: iteration,
          node: currentNode,
          level: "ERROR",
          error: err.message,
          timestamp: new Date().toISOString()
        });
        state.__error = err.message;
        break;
      }

      const stepDuration = Date.now() - stepStart;

      // Merge updated state (State Reducer)
      state = {
        ...state,
        ...nodeOutput,
        __lastNode: currentNode,
        __lastStepDurationMs: stepDuration
      };

      // Checkpoint state
      this.checkpoints.push({
        runId,
        iteration,
        node: currentNode,
        stateSnapshot: JSON.parse(JSON.stringify(state)),
        timestamp: new Date().toISOString()
      });

      // Determine next node: Check conditional edges first, then static edges
      if (this.conditionalEdges.has(currentNode)) {
        const { routerFn, pathMap } = this.conditionalEdges.get(currentNode);
        const routeKey = await routerFn(state);
        const nextNode = pathMap[routeKey] || "END";
        state.__executionLogs.push({
          step: iteration,
          node: currentNode,
          routeKey,
          nextNode,
          durationMs: stepDuration,
          timestamp: new Date().toISOString()
        });
        currentNode = nextNode;
      } else if (this.edges.has(currentNode)) {
        const nextNode = this.edges.get(currentNode);
        state.__executionLogs.push({
          step: iteration,
          node: currentNode,
          nextNode,
          durationMs: stepDuration,
          timestamp: new Date().toISOString()
        });
        currentNode = nextNode;
      } else {
        // No outgoing edges defined -> Reach END
        state.__executionLogs.push({
          step: iteration,
          node: currentNode,
          nextNode: "END",
          durationMs: stepDuration,
          timestamp: new Date().toISOString()
        });
        currentNode = "END";
      }
    }

    // Execute finish node handler if current reached terminal finish node
    if (this.finishNodes.has(currentNode)) {
      const handler = this.nodes.get(currentNode);
      if (handler) {
        const finalOutput = (await handler(state)) || {};
        state = { ...state, ...finalOutput, __lastNode: currentNode };
      }
    }

    const totalDurationMs = Date.now() - startTime;

    return {
      runId,
      graphName: this.name,
      finalState: state,
      totalSteps: iteration,
      visitedNodes: state.__visitedNodes,
      isCompleted: !state.__error,
      totalDurationMs,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export workflow structure as ASCII / Graphviz DOT diagram.
   */
  toDot() {
    const lines = [`digraph "${this.name}" {`, "  rankdir=LR;", "  node [shape=box, style=rounded];"];

    if (this.entryNode) {
      lines.push(`  __start__ [shape=circle, label="START"];`);
      lines.push(`  __start__ -> "${this.entryNode}";`);
    }

    for (const [from, to] of this.edges.entries()) {
      lines.push(`  "${from}" -> "${to}";`);
    }

    for (const [from, { pathMap }] of this.conditionalEdges.entries()) {
      for (const [condition, to] of Object.entries(pathMap)) {
        lines.push(`  "${from}" -> "${to}" [label="${condition}", style=dashed];`);
      }
    }

    for (const finish of this.finishNodes) {
      lines.push(`  "${finish}" [shape=doublecircle];`);
    }

    lines.push("}");
    return lines.join("\n");
  }
}

/**
 * Pre-configured Institutional Multi-Agent Trading & Risk StateGraph
 */
export function createAutonomousTradingWorkflow() {
  const workflow = new AgentStateGraph({ name: "InstitutionalTradingPipelineGraph", maxRecursion: 15 });

  // 1. Market Data Ingestion Node
  workflow.addNode("ingest_market_context", async (state) => {
    const symbol = (state.symbol || "AAPL").toUpperCase();
    return {
      symbol,
      price: state.price || 230.50,
      regime: state.regime || "TRENDING_BULLISH",
      ingestedAt: new Date().toISOString()
    };
  });

  // 2. Technical & Quantitative Strategy Signal Node
  workflow.addNode("evaluate_technical_signals", async (state) => {
    const rsi = state.rsi || 58.4;
    const macdHist = state.macdHist || 0.45;
    const signal = rsi < 70 && macdHist > 0 ? "BUY" : rsi > 70 ? "SELL" : "HOLD";
    const conviction = signal === "BUY" ? 0.85 : 0.40;
    return {
      rawSignal: signal,
      technicalConviction: conviction,
      indicators: { rsi, macdHist }
    };
  });

  // 3. Causality & Macro Graph RAG Node
  workflow.addNode("evaluate_macro_causality", async (state) => {
    const macroShock = state.macroShock || "NEUTRAL";
    const macroMultiplier = macroShock === "FED_RATE_CUT" ? 1.2 : macroShock === "VIX_SPIKE" ? 0.6 : 1.0;
    return {
      macroShock,
      macroMultiplier,
      graphCausalityConfidence: 0.92
    };
  });

  // 4. Bull / Bear AI Debate Node
  workflow.addNode("ai_bull_bear_debate", async (state) => {
    const debateScore = (state.technicalConviction || 0.5) * (state.macroMultiplier || 1.0);
    const debateConsensus = debateScore >= 0.70 ? "APPROVED_BULLISH" : debateScore <= 0.35 ? "REJECTED_BEARISH" : "NEEDS_REFLECTION";
    return {
      debateScore: Number(debateScore.toFixed(3)),
      debateConsensus,
      debateRounds: (state.debateRounds || 0) + 1
    };
  });

  // 5. Reflection & Re-evaluation Loop Node (Cycle)
  workflow.addNode("agent_reflection_cycle", async (state) => {
    return {
      technicalConviction: (state.technicalConviction || 0.5) * 1.15, // Refine thesis
      reflected: true
    };
  });

  // 6. Institutional Independent Risk Gate Node
  workflow.addNode("institutional_risk_gate", async (state) => {
    const passedRisk = state.debateScore >= 0.65;
    return {
      riskStatus: passedRisk ? "PASS" : "VETO_VIOLATION",
      riskMetrics: {
        maxDrawdownGate: "CLEAR",
        dailyLossLimit: "CLEAR",
        positionLimitUSD: 10000
      }
    };
  });

  // 7. Execution & Smart Order Router Node
  workflow.addNode("dispatch_execution", async (state) => {
    return {
      orderResult: {
        symbol: state.symbol,
        action: state.rawSignal,
        status: "SIMULATED_FILLED",
        quantity: 10,
        fillPrice: state.price,
        orderId: `ORD_${Date.now()}`
      }
    };
  });

  // 8. Order Rejected / Terminal Node
  workflow.addNode("order_rejected", async (state) => {
    return {
      orderResult: {
        symbol: state.symbol,
        status: "REJECTED",
        reason: state.riskStatus === "VETO_VIOLATION" ? "Risk Veto" : "Low Debate Consensus"
      }
    };
  });

  // Define Graph Edges & Routers
  workflow.setEntryPoint("ingest_market_context");
  workflow.addEdge("ingest_market_context", "evaluate_technical_signals");
  workflow.addEdge("evaluate_technical_signals", "evaluate_macro_causality");
  workflow.addEdge("evaluate_macro_causality", "ai_bull_bear_debate");

  // Conditional Edge after AI Debate: Approve -> Risk Gate, Needs Reflection -> Cycle, Reject -> Reject
  workflow.addConditionalEdges("ai_bull_bear_debate", (state) => {
    if (state.debateConsensus === "APPROVED_BULLISH") return "RISK_GATE";
    if (state.debateConsensus === "NEEDS_REFLECTION" && (state.debateRounds || 0) < 2) return "REFLECT";
    return "REJECT";
  }, {
    RISK_GATE: "institutional_risk_gate",
    REFLECT: "agent_reflection_cycle",
    REJECT: "order_rejected"
  });

  // Cyclic edge back from reflection to debate
  workflow.addEdge("agent_reflection_cycle", "ai_bull_bear_debate");

  // Conditional Edge after Risk Gate
  workflow.addConditionalEdges("institutional_risk_gate", (state) => {
    return state.riskStatus === "PASS" ? "EXECUTE" : "REJECT";
  }, {
    EXECUTE: "dispatch_execution",
    REJECT: "order_rejected"
  });

  // Finish Nodes
  workflow.addFinishNode("dispatch_execution");
  workflow.addFinishNode("order_rejected");

  return workflow;
}
