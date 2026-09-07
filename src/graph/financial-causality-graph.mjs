// src/graph/financial-causality-graph.mjs
// Multi-Relational Financial Knowledge & Causality Property Graph Engine
// Connects Macro Factors, Central Bank Policies, Commodities, Sectors, Supply Chains, and Asset Prices
// Pure Node.js ESM built-ins only

import { EventEmitter } from "node:events";

export class FinancialCausalityGraph extends EventEmitter {
  constructor() {
    super();
    this.nodes = new Map(); // id -> { id, label, category, properties, createdAt }
    this.edges = new Map(); // id -> { id, from, to, type, weight, lagHours, confidence, properties }
    this.adjacency = new Map(); // fromId -> Set(edgeId)
    this.inverseAdjacency = new Map(); // toId -> Set(edgeId)

    this._seedInstitutionalKnowledge();
  }

  /**
   * Add a node to the property graph.
   */
  addNode({ id, label, category = "ASSET", properties = {} }) {
    if (!id || typeof id !== "string") {
      throw new Error("Node ID must be a non-empty string");
    }
    const cleanId = id.trim().toUpperCase();
    const node = {
      id: cleanId,
      label: label || cleanId,
      category: category.toUpperCase(),
      properties: { ...properties },
      updatedAt: new Date().toISOString()
    };
    if (!this.nodes.has(cleanId)) {
      node.createdAt = new Date().toISOString();
      this.adjacency.set(cleanId, new Set());
      this.inverseAdjacency.set(cleanId, new Set());
    }
    this.nodes.set(cleanId, node);
    this.emit("nodeAdded", node);
    return node;
  }

  /**
   * Add a typed, weighted directed edge to the graph.
   */
  addEdge({ from, to, type = "CAUSES", weight = 1.0, lagHours = 0, confidence = 0.85, properties = {} }) {
    const cleanFrom = (from || "").trim().toUpperCase();
    const cleanTo = (to || "").trim().toUpperCase();

    if (!cleanFrom || !cleanTo) {
      throw new Error("Edge must have valid 'from' and 'to' node IDs");
    }

    // Auto-create nodes if missing
    if (!this.nodes.has(cleanFrom)) {
      this.addNode({ id: cleanFrom, label: cleanFrom, category: "CONCEPT" });
    }
    if (!this.nodes.has(cleanTo)) {
      this.addNode({ id: cleanTo, label: cleanTo, category: "CONCEPT" });
    }

    const edgeId = `${cleanFrom}_->[${type}]->_${cleanTo}`;
    const edge = {
      id: edgeId,
      from: cleanFrom,
      to: cleanTo,
      type: type.toUpperCase(),
      weight: Number(weight), // Positive = direct correlation/boost, Negative = inverse/dampen
      lagHours: Math.max(0, Number(lagHours) || 0),
      confidence: Math.max(0, Math.min(1.0, Number(confidence) || 0.85)),
      properties: { ...properties },
      updatedAt: new Date().toISOString()
    };

    this.edges.set(edgeId, edge);
    this.adjacency.get(cleanFrom).add(edgeId);
    this.inverseAdjacency.get(cleanTo).add(edgeId);

    this.emit("edgeAdded", edge);
    return edge;
  }

  getNode(id) {
    if (!id) return null;
    return this.nodes.get(id.trim().toUpperCase()) || null;
  }

  getEdge(edgeId) {
    return this.edges.get(edgeId) || null;
  }

  getOutboundEdges(nodeId) {
    const cleanId = (nodeId || "").trim().toUpperCase();
    const edgeIds = this.adjacency.get(cleanId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map(id => this.edges.get(id)).filter(Boolean);
  }

  getInboundEdges(nodeId) {
    const cleanId = (nodeId || "").trim().toUpperCase();
    const edgeIds = this.inverseAdjacency.get(cleanId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map(id => this.edges.get(id)).filter(Boolean);
  }

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  getAllEdges() {
    return Array.from(this.edges.values());
  }

  getOutgoingEdges(nodeId) {
    return this.getOutboundEdges(nodeId);
  }

  getIncomingEdges(nodeId) {
    return this.getInboundEdges(nodeId);
  }

  /**
   * Dynamically apply a market event to mutate graph edge weights and node attributes
   * @param {Object} event
   * @param {string} event.type Event type (e.g. "VOLATILITY_SHOCK", "RATE_DECISION", "SUPPLY_CHAIN_DISRUPTION")
   * @param {string} [event.targetNode] Target entity or factor
   * @param {number} [event.deltaWeight=0.1] Magnitude of edge weight change
   * @param {string} [event.source] Event emitter identifier
   * @returns {Object} Mutation report
   */
  applyMarketEvent(event = {}) {
    const { type = "GENERAL_EVENT", targetNode, deltaWeight = 0.1, source = "MARKET_STREAM" } = event;
    const cleanTarget = targetNode ? targetNode.trim().toUpperCase() : null;
    const mutatedEdges = [];

    if (cleanTarget && this.nodes.has(cleanTarget)) {
      // Mutate outgoing edges from the affected node
      const outEdges = this.getOutboundEdges(cleanTarget);
      for (const edge of outEdges) {
        const oldWeight = edge.weight;
        // Directional delta
        edge.weight = Number((edge.weight + (edge.weight >= 0 ? deltaWeight : -deltaWeight)).toFixed(4));
        edge.weight = Math.max(-1.0, Math.min(1.0, edge.weight));
        edge.updatedAt = new Date().toISOString();
        mutatedEdges.push({ edgeId: edge.id, from: edge.from, to: edge.to, oldWeight, newWeight: edge.weight });
      }
    }

    const eventRecord = {
      eventId: `EVT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      targetNode: cleanTarget,
      deltaWeight,
      source,
      mutatedEdgesCount: mutatedEdges.length,
      mutatedEdges,
      timestamp: new Date().toISOString()
    };

    this.emit("marketEventApplied", eventRecord);
    return eventRecord;
  }

  /**
   * Export full state for persistence or snapshotting
   */
  exportState() {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import graph state
   */
  importState(state = {}) {
    if (state.nodes && Array.isArray(state.nodes)) {
      this.nodes.clear();
      this.edges.clear();
      this.adjacency.clear();
      this.inverseAdjacency.clear();
      for (const n of state.nodes) {
        this.addNode(n);
      }
    }
    if (state.edges && Array.isArray(state.edges)) {
      for (const e of state.edges) {
        this.addEdge(e);
      }
    }
    return this.getGraphSummary();
  }

  /**
   * Find multi-hop causal paths from a source node to a target node.
   * Uses Breadth-First Search (BFS) / Depth-Bounded Path Finding.
   */
  findCausalPaths(sourceId, targetId, maxHops = 4) {
    const src = (sourceId || "").trim().toUpperCase();
    const tgt = (targetId || "").trim().toUpperCase();

    if (!this.nodes.has(src) || !this.nodes.has(tgt)) {
      return [];
    }

    const paths = [];
    const queue = [[{ nodeId: src, edge: null, cumulativeImpact: 1.0, totalLagHours: 0 }]];

    while (queue.length > 0) {
      const currentPath = queue.shift();
      const lastStep = currentPath[currentPath.length - 1];

      if (currentPath.length - 1 > maxHops) continue;

      if (lastStep.nodeId === tgt && currentPath.length > 1) {
        // Calculate path composite score
        const pathEdges = currentPath.slice(1).map(step => step.edge);
        const compositeImpact = currentPath.reduce((acc, step) => acc * (step.edge ? step.edge.weight : 1.0), 1.0);
        const compositeConfidence = currentPath.reduce((acc, step) => acc * (step.edge ? step.edge.confidence : 1.0), 1.0);
        const totalLagHours = currentPath.reduce((acc, step) => acc + (step.edge ? step.edge.lagHours : 0), 0);

        paths.push({
          source: src,
          target: tgt,
          hops: currentPath.length - 1,
          nodes: currentPath.map(step => step.nodeId),
          edges: pathEdges,
          compositeImpact: Number(compositeImpact.toFixed(4)),
          compositeConfidence: Number(compositeConfidence.toFixed(4)),
          totalLagHours,
          direction: compositeImpact > 0 ? "BULLISH_POSITIVE" : compositeImpact < 0 ? "BEARISH_NEGATIVE" : "NEUTRAL",
          narrative: this._synthesizeNarrative(currentPath)
        });
        continue;
      }

      // Traverse outbound neighbors
      const outEdges = this.getOutboundEdges(lastStep.nodeId);
      for (const edge of outEdges) {
        const nextNodeId = edge.to;
        // Prevent cycles within the same traversal path
        if (!currentPath.some(step => step.nodeId === nextNodeId)) {
          queue.push([
            ...currentPath,
            {
              nodeId: nextNodeId,
              edge,
              cumulativeImpact: lastStep.cumulativeImpact * edge.weight,
              totalLagHours: lastStep.totalLagHours + edge.lagHours
            }
          ]);
        }
      }
    }

    return paths.sort((a, b) => Math.abs(b.compositeImpact * b.compositeConfidence) - Math.abs(a.compositeImpact * a.compositeConfidence));
  }

  /**
   * Simulate a macroeconomic or localized shock cascading across the graph.
   * Propagates shockwave with attenuation (dampingFactor = 0.75).
   */
  simulateShockCascade({ sourceNode, initialMagnitude = 1.0, maxHops = 3, dampingFactor = 0.75 } = {}) {
    const src = (sourceNode || "").trim().toUpperCase();
    if (!this.nodes.has(src)) {
      throw new Error(`Source node '${sourceNode}' not found in causality graph`);
    }

    const shockState = new Map(); // nodeId -> { impactScore, confidence, lagHours, pathTaken }
    shockState.set(src, {
      impactScore: Number(initialMagnitude),
      confidence: 1.0,
      lagHours: 0,
      path: [src]
    });

    const queue = [{ nodeId: src, currentImpact: Number(initialMagnitude), currentConfidence: 1.0, currentLag: 0, hop: 0, path: [src] }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.hop >= maxHops) continue;

      const outEdges = this.getOutboundEdges(current.nodeId);
      for (const edge of outEdges) {
        const nextNode = edge.to;
        const propagatedImpact = current.currentImpact * edge.weight * dampingFactor;
        const propagatedConfidence = current.currentConfidence * edge.confidence;
        const propagatedLag = current.currentLag + edge.lagHours;
        const nextPath = [...current.path, nextNode];

        if (Math.abs(propagatedImpact) < 0.01) continue; // Prune negligible impacts

        const existing = shockState.get(nextNode);
        if (!existing || Math.abs(propagatedImpact) > Math.abs(existing.impactScore)) {
          shockState.set(nextNode, {
            impactScore: Number(propagatedImpact.toFixed(4)),
            confidence: Number(propagatedConfidence.toFixed(4)),
            lagHours: propagatedLag,
            path: nextPath
          });

          queue.push({
            nodeId: nextNode,
            currentImpact: propagatedImpact,
            currentConfidence: propagatedConfidence,
            currentLag: propagatedLag,
            hop: current.hop + 1,
            path: nextPath
          });
        }
      }
    }

    const impactedNodes = [];
    for (const [nodeId, state] of shockState.entries()) {
      if (nodeId === src) continue;
      const nodeData = this.nodes.get(nodeId);
      impactedNodes.push({
        nodeId,
        label: nodeData?.label || nodeId,
        category: nodeData?.category || "UNKNOWN",
        impactScore: state.impactScore,
        direction: state.impactScore > 0 ? "POSITIVE_IMPACT" : "NEGATIVE_IMPACT",
        severity: Math.abs(state.impactScore) >= 0.5 ? "HIGH" : Math.abs(state.impactScore) >= 0.2 ? "MEDIUM" : "LOW",
        confidence: state.confidence,
        estimatedLagHours: state.lagHours,
        causalPath: state.path.join(" ➔ ")
      });
    }

    // Sort by absolute impact magnitude descending
    impactedNodes.sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore));

    return {
      simulationId: `SIM_SHOCK_${Date.now()}`,
      sourceNode: src,
      sourceLabel: this.nodes.get(src)?.label || src,
      initialMagnitude,
      totalImpactedNodes: impactedNodes.length,
      dampingFactor,
      maxHops,
      impactedNodes,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Return ego-network subgraph around a focal node.
   */
  getSubgraph(focalNodeId, radius = 1) {
    const focal = (focalNodeId || "").trim().toUpperCase();
    if (!this.nodes.has(focal)) return { nodes: [], edges: [] };

    const visitedNodes = new Set([focal]);
    const includedEdges = new Set();
    let currentLevel = [focal];

    for (let r = 0; r < radius; r++) {
      const nextLevel = [];
      for (const nid of currentLevel) {
        const outEdges = this.getOutboundEdges(nid);
        const inEdges = this.getInboundEdges(nid);

        for (const e of [...outEdges, ...inEdges]) {
          includedEdges.add(e.id);
          const neighbor = e.from === nid ? e.to : e.from;
          if (!visitedNodes.has(neighbor)) {
            visitedNodes.add(neighbor);
            nextLevel.push(neighbor);
          }
        }
      }
      currentLevel = nextLevel;
    }

    return {
      focalNode: focal,
      radius,
      nodes: Array.from(visitedNodes).map(id => this.nodes.get(id)).filter(Boolean),
      edges: Array.from(includedEdges).map(id => this.edges.get(id)).filter(Boolean)
    };
  }

  getGraphSummary() {
    const categoryCounts = {};
    for (const node of this.nodes.values()) {
      categoryCounts[node.category] = (categoryCounts[node.category] || 0) + 1;
    }

    const edgeTypeCounts = {};
    for (const edge of this.edges.values()) {
      edgeTypeCounts[edge.type] = (edgeTypeCounts[edge.type] || 0) + 1;
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      density: this.nodes.size > 1 ? Number((this.edges.size / (this.nodes.size * (this.nodes.size - 1))).toFixed(4)) : 0,
      categoryCounts,
      edgeTypeCounts,
      timestamp: new Date().toISOString()
    };
  }

  _synthesizeNarrative(pathSteps) {
    if (pathSteps.length < 2) return "";
    const segments = [];
    for (let i = 1; i < pathSteps.length; i++) {
      const prev = pathSteps[i - 1].nodeId;
      const curr = pathSteps[i].nodeId;
      const edge = pathSteps[i].edge;
      const direction = edge.weight > 0 ? "boosts" : "dampens/compresses";
      segments.push(`${prev} [${edge.type}] ${direction} ${curr} (${edge.weight > 0 ? "+" : ""}${edge.weight})`);
    }
    return segments.join(" ➔ ");
  }

  /**
   * Pre-seed 50+ institutional macro, cross-asset, supply chain, and policy links.
   */
  _seedInstitutionalKnowledge() {
    // Macro Factors & Central Banks
    this.addNode({ id: "FED_RATE_HIKE", label: "Fed Interest Rate Hike", category: "CENTRAL_BANK" });
    this.addNode({ id: "FED_RATE_CUT", label: "Fed Interest Rate Cut / Easing", category: "CENTRAL_BANK" });
    this.addNode({ id: "US10Y_YIELD_UP", label: "US 10-Year Treasury Yield Surge", category: "MACRO_FACTOR" });
    this.addNode({ id: "US10Y_YIELD_DOWN", label: "US 10-Year Treasury Yield Decline", category: "MACRO_FACTOR" });
    this.addNode({ id: "DXY_USD_STRENGTH", label: "US Dollar Index (DXY) Strength", category: "CURRENCY" });
    this.addNode({ id: "DXY_USD_WEAKNESS", label: "US Dollar Index (DXY) Weakness", category: "CURRENCY" });
    this.addNode({ id: "INFLATION_CPI_SURGE", label: "CPI Inflation Surge", category: "MACRO_FACTOR" });
    this.addNode({ id: "VIX_VOLATILITY_SPIKE", label: "CBOE VIX Panic Spike", category: "VOLATILITY" });
    this.addNode({ id: "CRUDE_OIL_SPIKE", label: "WTI Crude Oil Price Spike", category: "COMMODITY" });
    this.addNode({ id: "GOLD_XAU_RALLY", label: "Gold (XAU) Safe-Haven Rally", category: "COMMODITY" });
    this.addNode({ id: "COPPER_HG_DEMAND", label: "Doctor Copper Industrial Demand", category: "COMMODITY" });

    // Sectors
    this.addNode({ id: "TECH_GROWTH_SECTOR", label: "Technology & High-Beta Growth Equities", category: "SECTOR" });
    this.addNode({ id: "SEMICONDUCTORS_SECTOR", label: "Semiconductor Hardware & Foundries", category: "SECTOR" });
    this.addNode({ id: "ENERGY_OIL_GAS_SECTOR", label: "Energy, Oil & Gas Producers", category: "SECTOR" });
    this.addNode({ id: "FINANCIALS_BANKING_SECTOR", label: "Commercial & Investment Banking", category: "SECTOR" });
    this.addNode({ id: "AIRLINES_TRANSPORT_SECTOR", label: "Airlines & Logistics Transporters", category: "SECTOR" });
    this.addNode({ id: "CRYPTO_ASSET_CLASS", label: "Digital Assets & Web3 Capital", category: "SECTOR" });
    this.addNode({ id: "EMERGING_MARKETS_EQUITIES", label: "Emerging Market Equities", category: "SECTOR" });
    this.addNode({ id: "REAL_ESTATE_REIT_SECTOR", label: "Real Estate Investment Trusts (REITs)", category: "SECTOR" });

    // Individual Key Assets & Supply Chains
    this.addNode({ id: "AAPL", label: "Apple Inc. (AAPL)", category: "ASSET_EQUITY" });
    this.addNode({ id: "NVDA", label: "NVIDIA Corporation (NVDA)", category: "ASSET_EQUITY" });
    this.addNode({ id: "TSMC_TSM", label: "Taiwan Semiconductor (TSMC)", category: "SUPPLY_CHAIN" });
    this.addNode({ id: "ASML", label: "ASML Holding (EUV Lithography)", category: "SUPPLY_CHAIN" });
    this.addNode({ id: "MSFT", label: "Microsoft Corporation (MSFT)", category: "ASSET_EQUITY" });
    this.addNode({ id: "GOOGL", label: "Alphabet Inc. (GOOGL)", category: "ASSET_EQUITY" });
    this.addNode({ id: "AMZN", label: "Amazon.com Inc. (AMZN)", category: "ASSET_EQUITY" });
    this.addNode({ id: "TSLA", label: "Tesla Inc. (TSLA)", category: "ASSET_EQUITY" });
    this.addNode({ id: "XOM", label: "ExxonMobil Corp. (XOM)", category: "ASSET_EQUITY" });
    this.addNode({ id: "JPM", label: "JPMorgan Chase & Co. (JPM)", category: "ASSET_EQUITY" });
    this.addNode({ id: "DAL", label: "Delta Air Lines (DAL)", category: "ASSET_EQUITY" });
    this.addNode({ id: "BTC", label: "Bitcoin (BTC/USD)", category: "ASSET_CRYPTO" });
    this.addNode({ id: "ETH", label: "Ethereum (ETH/USD)", category: "ASSET_CRYPTO" });
    this.addNode({ id: "SOL", label: "Solana (SOL/USD)", category: "ASSET_CRYPTO" });

    // Seed Causality Edges (Macro -> Sector -> Asset)
    this.addEdge({ from: "FED_RATE_HIKE", to: "US10Y_YIELD_UP", type: "CAUSES", weight: 0.88, lagHours: 2, confidence: 0.95 });
    this.addEdge({ from: "FED_RATE_HIKE", to: "DXY_USD_STRENGTH", type: "CAUSES", weight: 0.80, lagHours: 1, confidence: 0.92 });
    this.addEdge({ from: "FED_RATE_HIKE", to: "REAL_ESTATE_REIT_SECTOR", type: "DAMPENS", weight: -0.75, lagHours: 24, confidence: 0.90 });

    this.addEdge({ from: "FED_RATE_CUT", to: "US10Y_YIELD_DOWN", type: "CAUSES", weight: 0.85, lagHours: 2, confidence: 0.94 });
    this.addEdge({ from: "FED_RATE_CUT", to: "TECH_GROWTH_SECTOR", type: "BOOSTS", weight: 0.82, lagHours: 4, confidence: 0.91 });
    this.addEdge({ from: "FED_RATE_CUT", to: "CRYPTO_ASSET_CLASS", type: "BOOSTS", weight: 0.86, lagHours: 2, confidence: 0.90 });

    this.addEdge({ from: "US10Y_YIELD_UP", to: "TECH_GROWTH_SECTOR", type: "COMPRESSES_VALUATION", weight: -0.76, lagHours: 4, confidence: 0.92 });
    this.addEdge({ from: "US10Y_YIELD_UP", to: "FINANCIALS_BANKING_SECTOR", type: "EXPANDS_NIM", weight: 0.65, lagHours: 6, confidence: 0.85 });
    this.addEdge({ from: "US10Y_YIELD_UP", to: "GOLD_XAU_RALLY", type: "DAMPENS", weight: -0.58, lagHours: 2, confidence: 0.82 });

    this.addEdge({ from: "DXY_USD_STRENGTH", to: "EMERGING_MARKETS_EQUITIES", type: "OUTFLOW", weight: -0.70, lagHours: 8, confidence: 0.88 });
    this.addEdge({ from: "DXY_USD_STRENGTH", to: "GOLD_XAU_RALLY", type: "DAMPENS", weight: -0.62, lagHours: 2, confidence: 0.89 });
    this.addEdge({ from: "DXY_USD_STRENGTH", to: "CRYPTO_ASSET_CLASS", type: "DAMPENS", weight: -0.55, lagHours: 4, confidence: 0.84 });

    this.addEdge({ from: "CRUDE_OIL_SPIKE", to: "ENERGY_OIL_GAS_SECTOR", type: "BOOSTS_MARGINS", weight: 0.85, lagHours: 1, confidence: 0.95 });
    this.addEdge({ from: "CRUDE_OIL_SPIKE", to: "AIRLINES_TRANSPORT_SECTOR", type: "INCREASES_COSTS", weight: -0.84, lagHours: 4, confidence: 0.96 });
    this.addEdge({ from: "CRUDE_OIL_SPIKE", to: "INFLATION_CPI_SURGE", type: "CAUSES", weight: 0.72, lagHours: 48, confidence: 0.88 });

    this.addEdge({ from: "VIX_VOLATILITY_SPIKE", to: "GOLD_XAU_RALLY", type: "SAFE_HAVEN_BID", weight: 0.75, lagHours: 1, confidence: 0.90 });
    this.addEdge({ from: "VIX_VOLATILITY_SPIKE", to: "TECH_GROWTH_SECTOR", type: "DELEVERAGING", weight: -0.78, lagHours: 1, confidence: 0.93 });
    this.addEdge({ from: "VIX_VOLATILITY_SPIKE", to: "CRYPTO_ASSET_CLASS", type: "LIQUIDATION_CASCADE", weight: -0.70, lagHours: 1, confidence: 0.88 });

    // Sector to Asset mappings
    this.addEdge({ from: "TECH_GROWTH_SECTOR", to: "AAPL", type: "SECTOR_BETA", weight: 0.92, lagHours: 0, confidence: 0.98 });
    this.addEdge({ from: "TECH_GROWTH_SECTOR", to: "MSFT", type: "SECTOR_BETA", weight: 0.90, lagHours: 0, confidence: 0.97 });
    this.addEdge({ from: "TECH_GROWTH_SECTOR", to: "NVDA", type: "SECTOR_BETA", weight: 0.96, lagHours: 0, confidence: 0.99 });
    this.addEdge({ from: "TECH_GROWTH_SECTOR", to: "GOOGL", type: "SECTOR_BETA", weight: 0.88, lagHours: 0, confidence: 0.96 });
    this.addEdge({ from: "TECH_GROWTH_SECTOR", to: "TSLA", type: "SECTOR_BETA", weight: 0.85, lagHours: 0, confidence: 0.90 });

    this.addEdge({ from: "SEMICONDUCTORS_SECTOR", to: "NVDA", type: "SUB_SECTOR_CORE", weight: 0.98, lagHours: 0, confidence: 0.99 });
    this.addEdge({ from: "ENERGY_OIL_GAS_SECTOR", to: "XOM", type: "SECTOR_BETA", weight: 0.94, lagHours: 0, confidence: 0.98 });
    this.addEdge({ from: "FINANCIALS_BANKING_SECTOR", to: "JPM", type: "SECTOR_BETA", weight: 0.92, lagHours: 0, confidence: 0.97 });
    this.addEdge({ from: "AIRLINES_TRANSPORT_SECTOR", to: "DAL", type: "SECTOR_BETA", weight: 0.91, lagHours: 0, confidence: 0.96 });

    this.addEdge({ from: "CRYPTO_ASSET_CLASS", to: "BTC", type: "MARKET_DOMINANCE", weight: 0.95, lagHours: 0, confidence: 0.99 });
    this.addEdge({ from: "BTC", to: "ETH", type: "CRYPTO_BETA", weight: 0.88, lagHours: 1, confidence: 0.94 });
    this.addEdge({ from: "BTC", to: "SOL", type: "CRYPTO_BETA", weight: 0.82, lagHours: 1, confidence: 0.90 });

    // Supply Chain dependencies
    this.addEdge({ from: "ASML", to: "TSMC_TSM", type: "SUPPLIES_EUV_LITHO", weight: 0.85, lagHours: 720, confidence: 0.96 });
    this.addEdge({ from: "TSMC_TSM", to: "NVDA", type: "MANUFACTURES_CHIPS", weight: 0.92, lagHours: 168, confidence: 0.98 });
    this.addEdge({ from: "TSMC_TSM", to: "AAPL", type: "MANUFACTURES_SOCS", weight: 0.90, lagHours: 168, confidence: 0.98 });
    this.addEdge({ from: "NVDA", to: "MSFT", type: "SUPPLIES_AI_GPU_CLUSTER", weight: 0.78, lagHours: 48, confidence: 0.92 });
    this.addEdge({ from: "NVDA", to: "AMZN", type: "SUPPLIES_AI_GPU_CLUSTER", weight: 0.75, lagHours: 48, confidence: 0.90 });
  }
}

export const financialCausalityGraph = new FinancialCausalityGraph();
