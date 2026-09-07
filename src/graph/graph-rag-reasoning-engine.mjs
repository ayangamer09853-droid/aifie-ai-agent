// src/graph/graph-rag-reasoning-engine.mjs
// Graph-Augmented Generation (GraphRAG) & Multi-Hop Reasoning Engine
// Extracts Financial Subgraphs, Linearizes Causal Links into Agent Prompt Context, and Learns New Edge Weights
// Pure Node.js ESM built-ins only

import { financialCausalityGraph } from "./financial-causality-graph.mjs";
import { GraphNetworkTopology } from "./graph-network-topology.mjs";

export class GraphRAGReasoningEngine {
  constructor(graph = financialCausalityGraph) {
    this.graph = graph;
    this.topology = new GraphNetworkTopology(graph);
    this.entityIndex = new Map();
    this._buildEntityIndex();
  }

  /**
   * Index all aliases, symbols, and concepts for fast entity linking.
   */
  _buildEntityIndex() {
    this.entityIndex.clear();
    for (const [id, node] of this.graph.nodes.entries()) {
      this.entityIndex.set(id.toUpperCase(), id);
      if (node.label) {
        this.entityIndex.set(node.label.toUpperCase(), id);
      }
    }

    // Common synonyms and keywords
    const synonyms = {
      "RATE HIKE": "FED_RATE_HIKE",
      "INTEREST RATES": "FED_RATE_HIKE",
      "RATE CUT": "FED_RATE_CUT",
      "YIELDS": "US10Y_YIELD_UP",
      "10Y YIELD": "US10Y_YIELD_UP",
      "DOLLAR": "DXY_USD_STRENGTH",
      "USD": "DXY_USD_STRENGTH",
      "OIL": "CRUDE_OIL_SPIKE",
      "CRUDE": "CRUDE_OIL_SPIKE",
      "GOLD": "GOLD_XAU_RALLY",
      "XAU": "GOLD_XAU_RALLY",
      "VIX": "VIX_VOLATILITY_SPIKE",
      "PANIC": "VIX_VOLATILITY_SPIKE",
      "TECH": "TECH_GROWTH_SECTOR",
      "SEMIS": "SEMICONDUCTORS_SECTOR",
      "CHIPS": "SEMICONDUCTORS_SECTOR",
      "CRYPTO": "CRYPTO_ASSET_CLASS",
      "BITCOIN": "BTC",
      "ETHEREUM": "ETH",
      "SOLANA": "SOL",
      "APPLE": "AAPL",
      "NVIDIA": "NVDA",
      "MICROSOFT": "MSFT",
      "GOOGLE": "GOOGL",
      "AMAZON": "AMZN",
      "TESLA": "TSLA"
    };

    for (const [syn, targetId] of Object.entries(synonyms)) {
      this.entityIndex.set(syn, targetId);
    }
  }

  /**
   * Extract financial entities from a text prompt or market observation.
   */
  extractEntities(text) {
    if (!text || typeof text !== "string") return [];
    const upper = text.toUpperCase();
    const matched = new Set();

    // Check direct matching in entity index
    for (const [keyword, nodeId] of this.entityIndex.entries()) {
      if (upper.includes(keyword)) {
        matched.add(nodeId);
      }
    }

    // Check regex word boundary matching for symbols (e.g. AAPL, NVDA, BTC)
    const words = upper.match(/[A-Z0-9_]{2,10}/g) || [];
    for (const word of words) {
      if (this.graph.nodes.has(word)) {
        matched.add(word);
      }
    }

    return Array.from(matched).map(id => this.graph.nodes.get(id)).filter(Boolean);
  }

  /**
   * Generate structured GraphRAG Context block for a target symbol and current market state.
   */
  generateReasoningContext({ symbol = "AAPL", macroEvents = [], queryText = "" } = {}) {
    const cleanSym = symbol.trim().toUpperCase();
    const targetNode = this.graph.nodes.get(cleanSym);

    // Extract any additional entities from text
    const textEntities = queryText ? this.extractEntities(queryText) : [];
    const eventEntities = macroEvents.map(e => this.entityIndex.get(e.toUpperCase()) || e.toUpperCase()).filter(id => this.graph.nodes.has(id));

    // Combine focal nodes
    const focalIds = new Set([cleanSym, ...textEntities.map(e => e.id), ...eventEntities]);

    // Gather upstream causal paths to the target symbol
    const causalChains = [];
    const macroSourceNodes = ["FED_RATE_HIKE", "FED_RATE_CUT", "CRUDE_OIL_SPIKE", "US10Y_YIELD_UP", "DXY_USD_STRENGTH", "VIX_VOLATILITY_SPIKE"];

    for (const macroSrc of macroSourceNodes) {
      const paths = this.graph.findCausalPaths(macroSrc, cleanSym, 3);
      if (paths.length > 0) {
        causalChains.push(...paths.slice(0, 2));
      }
    }

    // Inbound sector & supply chain dependencies
    const inboundEdges = this.graph.getInboundEdges(cleanSym);
    const outboundEdges = this.graph.getOutboundEdges(cleanSym);

    // Subgraph 1-hop neighborhood
    const neighborhood = this.graph.getSubgraph(cleanSym, 1);

    // Centrality telemetry
    const pageRank = this.topology.computePageRank();
    const targetCentrality = pageRank[cleanSym] || 0;

    // Linearize into Markdown Context for AI Agent Prompt
    const linearizedContext = this._linearizeToPrompt({
      targetNode: targetNode || { id: cleanSym, label: cleanSym, category: "ASSET_EQUITY" },
      causalChains,
      inboundEdges,
      outboundEdges,
      neighborhood,
      targetCentrality,
      focalIds: Array.from(focalIds)
    });

    return {
      symbol: cleanSym,
      focalEntitiesCount: focalIds.size,
      identifiedCausalPathsCount: causalChains.length,
      pageRankCentrality: targetCentrality,
      causalChains,
      linearizedContext,
      timestamp: new Date().toISOString()
    };
  }

  _linearizeToPrompt({ targetNode, causalChains, inboundEdges, outboundEdges, neighborhood, targetCentrality }) {
    const lines = [];

    lines.push(`### 🕸️ FINANCIAL KNOWLEDGE & CAUSALITY GRAPH CONTEXT (${targetNode.id})`);
    lines.push(`- **Entity Classification**: ${targetNode.label} [${targetNode.category}]`);
    lines.push(`- **Network PageRank Centrality**: ${(targetCentrality * 100).toFixed(2)}%`);
    lines.push(``);

    if (causalChains.length > 0) {
      lines.push(`#### ⚡ Multi-Hop Macroeconomic Causal Impact Paths:`);
      for (const chain of causalChains) {
        const sign = chain.compositeImpact > 0 ? "🟢 BULLISH" : chain.compositeImpact < 0 ? "🔴 BEARISH" : "⚪ NEUTRAL";
        lines.push(`- [${sign}] ${chain.narrative} (Net Impact: ${chain.compositeImpact > 0 ? "+" : ""}${chain.compositeImpact}, Confidence: ${(chain.compositeConfidence * 100).toFixed(0)}%, Est. Lag: ${chain.totalLagHours}h)`);
      }
      lines.push(``);
    }

    if (inboundEdges.length > 0) {
      lines.push(`#### 📥 Direct Upstream Drivers & Dependencies:`);
      for (const edge of inboundEdges) {
        lines.push(`- ${edge.from} ➔ [${edge.type}] ➔ ${targetNode.id} (Weight: ${edge.weight > 0 ? "+" : ""}${edge.weight}, Conf: ${(edge.confidence * 100).toFixed(0)}%)`);
      }
      lines.push(``);
    }

    if (outboundEdges.length > 0) {
      lines.push(`#### 📤 Downstream Spillover Exposures:`);
      for (const edge of outboundEdges) {
        lines.push(`- ${targetNode.id} ➔ [${edge.type}] ➔ ${edge.to} (Weight: ${edge.weight > 0 ? "+" : ""}${edge.weight})`);
      }
      lines.push(``);
    }

    lines.push(`*Graph reasoning context synthesized via Aifie Graph Engineering Engine.*`);
    return lines.join("\n");
  }
}

export const graphRAGReasoningEngine = new GraphRAGReasoningEngine();
