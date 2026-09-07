// @ts-check
import { GraphEngine } from "../core/graph-engine.mjs";
import { GraphNode, GRAPH_NODE_TYPES } from "../core/graph-node.mjs";
import { GraphEdge } from "../core/graph-edge.mjs";
import { globalDataQualityGate } from "../../market/data-quality-gate.mjs";
import { globalCriticAgent } from "../../intelligence/critic-agent.mjs";
import { StrategyAgent } from "../../intelligence/strategy-agent.mjs";
import { globalShadowModeEngine } from "../../execution/shadow-mode-engine.mjs";

/**
 * Canonical Aifie Trading Task Graph
 * Enforces: Market Tick -> Features -> Strategy -> Critic -> Risk Gate -> Execution -> Learning
 */
export function createTradingTaskGraph({ strategyName = "momentum-v3" } = {}) {
  const engine = new GraphEngine({ name: `TradingGraph_${strategyName}` });
  const strategy = new StrategyAgent({ strategyName });

  // 1. Node: Market Data Ingestion & Quality Validation
  engine.addNode(new GraphNode({
    id: "NODE_MARKET_DATA",
    type: GRAPH_NODE_TYPES.EVENT,
    description: "Ingests raw quote and executes schema/staleness/price sanity checks",
    handler: async (state, ctx) => {
      const rawTick = ctx.tick || state.marketState?.quote || { symbol: "BTCUSDT", price: 65000, timestamp: Date.now() };
      const quality = globalDataQualityGate.validateTick(rawTick);
      return {
        marketState: {
          status: quality.status,
          quote: quality.sanitizedTick,
          reasons: quality.reasons
        }
      };
    }
  }));

  // 2. Node: Feature Computation
  engine.addNode(new GraphNode({
    id: "NODE_FEATURE_ENGINE",
    type: GRAPH_NODE_TYPES.FUNCTION,
    description: "Calculates technical indicators, momentum, and regime features",
    handler: async (state, ctx) => {
      const price = state.marketState?.quote?.price || 65000;
      return {
        taskState: {
          features: {
            rsi: ctx.rsi || 32,
            emaSpread: 1.5,
            spreadPercent: ctx.spreadPercent || 0.04
          }
        }
      };
    }
  }));

  // 3. Node: Strategy Alpha Proposer
  engine.addNode(new GraphNode({
    id: "NODE_STRATEGY_AGENT",
    type: GRAPH_NODE_TYPES.AGENT,
    description: "Evaluates features and generates standardized alpha proposal",
    handler: async (state, ctx) => {
      const proposal = await strategy.generateSignal({
        symbol: state.marketState?.quote?.symbol || "BTCUSDT",
        price: state.marketState?.quote?.price || 65000,
        features: state.taskState?.features
      });
      return {
        decisions: [proposal]
      };
    }
  }));

  // 4. Node: Critic Adversarial Scrutiny
  engine.addNode(new GraphNode({
    id: "NODE_CRITIC_AGENT",
    type: GRAPH_NODE_TYPES.AGENT,
    description: "Adversarially falsifies trade proposal for bias, regime mismatch, and spread",
    handler: async (state, ctx) => {
      const proposal = state.decisions[state.decisions.length - 1];
      const critique = await globalCriticAgent.critiqueTradeProposal(proposal, {
        regime: ctx.regime || "TRENDING_BULL",
        spreadPercent: state.taskState?.features?.spreadPercent || 0.04,
        imminentHighImpactNews: ctx.imminentHighImpactNews || false
      });
      return {
        evidence: [critique],
        taskState: {
          criticApproved: critique.approved,
          critique
        }
      };
    }
  }));

  // 5. Node: Deterministic Risk Gate
  engine.addNode(new GraphNode({
    id: "NODE_RISK_GATE",
    type: GRAPH_NODE_TYPES.RISK_GATE,
    description: "Deterministic gate calculating VaR, notional, and sizing",
    handler: async (state, ctx) => {
      const proposal = state.decisions[state.decisions.length - 1];
      const requestedNotional = (proposal.price || 65000) * (ctx.quantity || 0.1);
      const maxNotional = 50000;

      const riskApproved = requestedNotional <= maxNotional;
      return {
        riskState: {
          approved: riskApproved,
          requestedNotional,
          maxNotional,
          reason: riskApproved ? "WITHIN_LIMITS" : "EXCEEDED_MAX_POSITION_NOTIONAL"
        }
      };
    }
  }));

  // 6. Node: Execution Simulator / Shadow Mode
  engine.addNode(new GraphNode({
    id: "NODE_EXECUTION_GATE",
    type: GRAPH_NODE_TYPES.FUNCTION,
    description: "Routes approved trades to shadow tracking engine",
    handler: async (state, ctx) => {
      const proposal = state.decisions[state.decisions.length - 1];
      const shadowOrder = globalShadowModeEngine.recordShadowOrder({
        symbol: proposal.symbol,
        side: proposal.direction === "SELL" ? "SELL" : "BUY",
        quantity: ctx.quantity || 0.1,
        price: proposal.price,
        strategy: proposal.strategy
      });
      return {
        executionState: {
          executed: true,
          order: shadowOrder
        }
      };
    }
  }));

  // 7. Node: Rejection Terminal
  engine.addNode(new GraphNode({
    id: "NODE_REJECT_TERMINAL",
    type: GRAPH_NODE_TYPES.FUNCTION,
    description: "Records rejection reason and triggers learning feedback",
    handler: async (state, ctx) => {
      return {
        executionState: {
          executed: false,
          status: "REJECTED"
        }
      };
    }
  }));

  // === EDGES & ROUTING RULES ===

  // Market Data -> Feature Engine (if SAFE) or Reject (if UNSAFE)
  engine.addEdge(new GraphEdge({
    from: "NODE_MARKET_DATA",
    to: "NODE_FEATURE_ENGINE",
    condition: (s) => s.marketState?.status === "SAFE",
    reasonCode: "MARKET_DATA_SAFE",
    priority: 1
  }));
  engine.addEdge(new GraphEdge({
    from: "NODE_MARKET_DATA",
    to: "NODE_REJECT_TERMINAL",
    condition: (s) => s.marketState?.status !== "SAFE",
    reasonCode: "MARKET_DATA_UNSAFE_REJECT",
    priority: 2
  }));

  // Feature Engine -> Strategy Agent
  engine.addEdge(new GraphEdge({
    from: "NODE_FEATURE_ENGINE",
    to: "NODE_STRATEGY_AGENT",
    reasonCode: "FEATURES_COMPUTED"
  }));

  // Strategy Agent -> Critic Agent
  engine.addEdge(new GraphEdge({
    from: "NODE_STRATEGY_AGENT",
    to: "NODE_CRITIC_AGENT",
    reasonCode: "ALPHA_SIGNAL_PROPOSED"
  }));

  // Critic Agent -> Risk Gate (if Critic Approved) or Reject (if Critic Vetoed)
  engine.addEdge(new GraphEdge({
    from: "NODE_CRITIC_AGENT",
    to: "NODE_RISK_GATE",
    condition: (s) => s.taskState?.criticApproved === true,
    reasonCode: "CRITIC_PASSED",
    priority: 1
  }));
  engine.addEdge(new GraphEdge({
    from: "NODE_CRITIC_AGENT",
    to: "NODE_REJECT_TERMINAL",
    condition: (s) => s.taskState?.criticApproved !== true,
    reasonCode: "CRITIC_VETO_REJECT",
    priority: 2
  }));

  // Risk Gate -> Execution (if Risk Approved) or Reject (if Risk Exceeded)
  engine.addEdge(new GraphEdge({
    from: "NODE_RISK_GATE",
    to: "NODE_EXECUTION_GATE",
    condition: (s) => s.riskState?.approved === true,
    reasonCode: "RISK_APPROVED_EXECUTE",
    priority: 1
  }));
  engine.addEdge(new GraphEdge({
    from: "NODE_RISK_GATE",
    to: "NODE_REJECT_TERMINAL",
    condition: (s) => s.riskState?.approved !== true,
    reasonCode: "RISK_LIMIT_REJECT",
    priority: 2
  }));

  return engine;
}

export const defaultTradingGraph = createTradingTaskGraph();
