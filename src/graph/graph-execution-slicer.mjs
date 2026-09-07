/**
 * AIFIE GRAPH-AWARE EXECUTION SLICER & MARKET IMPACT ENGINE
 * 
 * Slices large institutional orders across time windows and liquidity pools
 * while factoring network centrality and supply-chain / sector dependency to
 * prevent cascading downstream liquidity shocks.
 * 
 * Models:
 * - Graph-Dampened Almgren-Chriss Optimal Execution
 * - Centrality-Weighted TWAP (Time-Weighted Average Price)
 * - Volume-Profile VWAP (Volume-Weighted Average Price)
 * - Cross-Asset Cascading Slippage Predictor
 * 
 * Pure Node.js ESM - Built-in standard library only.
 */

export class GraphExecutionSlicer {
  /**
   * @param {Object} options
   * @param {Object} options.causalityGraph FinancialCausalityGraph instance
   * @param {Object} [options.topologyMetrics] Precalculated topology data
   */
  constructor(options = {}) {
    this.graph = options.causalityGraph;
    this.topology = options.topologyMetrics || null;
  }

  /**
   * Set or update precalculated topology metrics
   * @param {Object} topology
   */
  setTopology(topology) {
    this.topology = topology;
  }

  /**
   * Compute execution schedule for a large parent order
   * @param {Object} orderRequest
   * @param {string} orderRequest.symbol Asset symbol (e.g. "AAPL", "NVDA", "BTC")
   * @param {string} orderRequest.side "BUY" | "SELL"
   * @param {number} orderRequest.totalQuantity Total shares or units to execute
   * @param {number} orderRequest.currentPrice Current spot price in USD
   * @param {number} [orderRequest.durationMinutes=30] Target execution window
   * @param {number} [orderRequest.slices=6] Number of sub-orders
   * @param {string} [orderRequest.algorithm="GRAPH_ADAPTIVE_TWAP"] Execution algorithm
   * @param {number} [orderRequest.urgency=0.5] Urgency score 0.0 (passive) to 1.0 (aggressive)
   * @returns {Object} Slicing plan and downstream systemic impact assessment
   */
  createExecutionPlan(orderRequest) {
    const {
      symbol,
      side = "BUY",
      totalQuantity,
      currentPrice,
      durationMinutes = 30,
      slices = 6,
      algorithm = "GRAPH_ADAPTIVE_TWAP",
      urgency = 0.5
    } = orderRequest;

    if (!symbol || !totalQuantity || totalQuantity <= 0 || !currentPrice || currentPrice <= 0) {
      throw new Error("Invalid order parameters: symbol, totalQuantity, and currentPrice are required.");
    }

    // 1. Evaluate Network Centrality of the Asset
    let pageRank = 0.04;
    let betweenness = 0.01;
    let outDegree = 1;

    if (this.topology?.centralities) {
      pageRank = this.topology.centralities.pageRank[symbol] || 0.04;
      betweenness = this.topology.centralities.betweenness[symbol] || 0.01;
      outDegree = this.topology.centralities.degree[symbol]?.outDegree || 1;
    }

    // 2. Identify Downstream Dependent Assets in Causality Graph
    const downstreamAssets = [];
    if (this.graph) {
      const outEdges = this.graph.getOutgoingEdges(symbol) || [];
      for (const edge of outEdges) {
        downstreamAssets.push({
          target: edge.target,
          relation: edge.relation,
          weight: edge.weight,
          confidence: edge.confidence,
          estimatedSpilloverImpact: Number((edge.weight * (side === "BUY" ? 1 : -1) * (totalQuantity * currentPrice / 1_000_000) * 0.05).toFixed(4))
        });
      }
    }

    // 3. Systemic Fragility & Market Impact Multiplier
    // High PageRank/Betweenness assets cause wider market disturbance if liquidated aggressively
    const systemicCentralityMultiplier = 1.0 + (pageRank * 5.0) + (betweenness * 2.0);
    const notionalValue = totalQuantity * currentPrice;

    // Almgren-Chriss Style Base Impact
    const basePermanentImpactBps = Math.min(50, Number(((notionalValue / 500_000) * 2.5 * systemicCentralityMultiplier).toFixed(2)));
    const baseTemporaryImpactBps = Math.min(80, Number(((notionalValue / 200_000) * 4.0 * (1 + urgency)).toFixed(2)));

    // 4. Generate Time-Distributed Slices
    const numSlices = Math.max(2, Math.min(60, slices));
    const sliceIntervalMinutes = Number((durationMinutes / numSlices).toFixed(1));
    const schedule = [];
    let remainingQty = totalQuantity;

    // Weight distribution profile (U-shaped for VWAP, Front-loaded for Urgent, Flat for TWAP)
    const weights = [];
    for (let i = 0; i < numSlices; i++) {
      let w = 1.0;
      if (algorithm === "GRAPH_ADAPTIVE_VWAP") {
        // Typical U-shaped intraday liquidity curve
        const x = (i / (numSlices - 1)) * 2 - 1; // -1 to +1
        w = 1.0 + 0.5 * (x * x);
      } else if (algorithm === "GRAPH_ADAPTIVE_TWAP") {
        // Graph dampening: ease in gradually to reduce price impact on central assets
        w = 1.0 - (pageRank * (numSlices - 1 - i) / numSlices * 0.3);
      } else {
        w = 1.0;
      }
      weights.push(w);
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    for (let i = 0; i < numSlices; i++) {
      const sliceFraction = weights[i] / totalWeight;
      let sliceQty = (i === numSlices - 1) ? remainingQty : Math.round(totalQuantity * sliceFraction);
      sliceQty = Math.max(1, Math.min(remainingQty, sliceQty));
      remainingQty -= sliceQty;

      const sliceNotional = sliceQty * currentPrice;
      const expectedSliceSlippageBps = Number(((baseTemporaryImpactBps * (sliceFraction * numSlices)) / Math.sqrt(numSlices)).toFixed(2));

      schedule.push({
        sliceIndex: i + 1,
        scheduledMinuteOffset: Number((i * sliceIntervalMinutes).toFixed(1)),
        quantity: sliceQty,
        estimatedNotionalUSD: Number(sliceNotional.toFixed(2)),
        limitPriceEstimate: side === "BUY" 
          ? Number((currentPrice * (1 + expectedSliceSlippageBps / 10000)).toFixed(2))
          : Number((currentPrice * (1 - expectedSliceSlippageBps / 10000)).toFixed(2)),
        expectedSlippageBps: expectedSliceSlippageBps,
        urgency: urgency > 0.7 ? "AGGRESSIVE" : urgency < 0.3 ? "PASSIVE" : "NEUTRAL"
      });
    }

    return {
      planId: `SLICER_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      symbol,
      side,
      totalQuantity,
      currentPrice,
      totalNotionalUSD: Number(notionalValue.toFixed(2)),
      algorithm,
      durationMinutes,
      slicesCount: schedule.length,
      networkProfile: {
        pageRankCentrality: Number(pageRank.toFixed(4)),
        betweennessCentrality: Number(betweenness.toFixed(4)),
        outgoingCausalLinks: outDegree,
        systemicRiskRank: pageRank > 0.08 ? "SYSTEMIC_BELLWETHER" : pageRank > 0.04 ? "MODERATE_INFLUENCE" : "PERIPHERAL"
      },
      impactEstimates: {
        basePermanentImpactBps,
        baseTemporaryImpactBps,
        totalExpectedSlippageUSD: Number((notionalValue * ((basePermanentImpactBps + baseTemporaryImpactBps) / 20000)).toFixed(2)),
        liquidityShockWarning: pageRank > 0.08 && notionalValue > 100_000
          ? "HIGH_CENTRALITY_ALERT: Aggressive order may induce correlated sector spillover"
          : "NORMAL_LIQUIDITY"
      },
      downstreamSpilloverRisks: downstreamAssets,
      schedule
    };
  }
}
