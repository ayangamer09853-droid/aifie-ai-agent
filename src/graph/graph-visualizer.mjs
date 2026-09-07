// src/graph/graph-visualizer.mjs
// Headless SVG & Network Graph Data Visualizer for Aifie AI Agent
// Generates responsive SVG vectors and JSON force-directed graph datasets
// Pure Node.js ESM built-ins only

import { financialCausalityGraph } from "./financial-causality-graph.mjs";
import { GraphNetworkTopology } from "./graph-network-topology.mjs";

const CATEGORY_COLORS = {
  CENTRAL_BANK: "#8b5cf6", // Purple
  MACRO_FACTOR: "#f59e0b", // Amber
  COMMODITY: "#d97706", // Dark Amber / Gold
  CURRENCY: "#10b981", // Emerald Green
  SECTOR: "#06b6d4", // Cyan
  ASSET_EQUITY: "#3b82f6", // Blue
  ASSET_CRYPTO: "#ec4899", // Pink
  SUPPLY_CHAIN: "#6366f1", // Indigo
  VOLATILITY: "#ef4444", // Red
  CONCEPT: "#64748b" // Slate
};

export class GraphVisualizer {
  constructor(graph = financialCausalityGraph) {
    this.graph = graph;
    this.topology = new GraphNetworkTopology(graph);
  }

  /**
   * Export complete force-directed network graph dataset for web rendering.
   */
  exportNetworkData() {
    const pageRank = this.topology.computePageRank();
    const betweenness = this.topology.computeBetweennessCentrality();
    const degrees = this.topology.computeDegreeCentrality();

    const nodes = Array.from(this.graph.nodes.values()).map(n => {
      const pr = pageRank[n.id] || 0.01;
      const deg = degrees[n.id]?.totalDegree || 1;
      return {
        id: n.id,
        label: n.label,
        category: n.category,
        color: CATEGORY_COLORS[n.category] || "#64748b",
        radius: Math.max(8, Math.min(28, Math.round(pr * 400 + deg * 2))),
        pageRank: pr,
        betweenness: betweenness[n.id] || 0,
        degree: deg
      };
    });

    const links = Array.from(this.graph.edges.values()).map(e => ({
      id: e.id,
      source: e.from,
      target: e.to,
      type: e.type,
      weight: e.weight,
      color: e.weight > 0 ? "#10b981" : "#ef4444",
      strokeWidth: Math.max(1, Math.min(4, Math.abs(e.weight) * 2.5)),
      lagHours: e.lagHours,
      confidence: e.confidence
    }));

    return {
      nodes,
      links,
      summary: this.graph.getGraphSummary(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Render headless responsive SVG network diagram.
   */
  renderSvg({ width = 1000, height = 650, highlightedNodeId = null } = {}) {
    const data = this.exportNetworkData();
    const centerX = width / 2;
    const centerY = height / 2;

    // Arrange nodes in category concentric orbits / circles
    const nodePositions = new Map();
    const nodes = data.nodes;
    const totalNodes = nodes.length;

    // Group by category
    const categories = Array.from(new Set(nodes.map(n => n.category)));
    const catAngleStep = (2 * Math.PI) / categories.length;

    categories.forEach((cat, catIdx) => {
      const catNodes = nodes.filter(n => n.category === cat);
      const baseAngle = catIdx * catAngleStep;
      const radius = cat === "CENTRAL_BANK" || cat === "MACRO_FACTOR" ? 140 : cat === "SECTOR" ? 220 : 280;

      catNodes.forEach((node, idx) => {
        const offsetAngle = ((idx - (catNodes.length - 1) / 2) * 0.25);
        const angle = baseAngle + offsetAngle;
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));
        nodePositions.set(node.id, { x, y });
      });
    });

    const svgParts = [];
    svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#070b14; font-family:'Inter',system-ui,sans-serif;">`);
    
    // SVG Defs (Arrows & Glow Filters & Pulse Animations)
    svgParts.push(`
      <defs>
        <marker id="arrow-green" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981"/>
        </marker>
        <marker id="arrow-red" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444"/>
        </marker>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <style>
          @keyframes pulse-ring {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.2); opacity: 0.3; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
          .pulse-anim { animation: pulse-ring 2s infinite ease-in-out; transform-origin: center; }
          .node-hover:hover circle { stroke: #38bdf8; stroke-width: 3; cursor: pointer; }
        </style>
      </defs>
    `);

    // Title Header
    svgParts.push(`
      <text x="24" y="36" fill="#f8fafc" font-size="16" font-weight="700" letter-spacing="0.5">AIFIE FINANCIAL KNOWLEDGE & CAUSALITY GRAPH</text>
      <text x="24" y="56" fill="#64748b" font-size="12">Topology: ${data.nodes.length} Nodes · ${data.links.length} Causal Edges · Realtime Multi-Hop Propagation</text>
    `);

    // Render Links
    svgParts.push(`<g id="graph-links" opacity="0.6">`);
    for (const link of data.links) {
      const srcPos = nodePositions.get(link.source) || { x: centerX, y: centerY };
      const tgtPos = nodePositions.get(link.target) || { x: centerX, y: centerY };
      const isGreen = link.weight > 0;
      const marker = isGreen ? "url(#arrow-green)" : "url(#arrow-red)";
      svgParts.push(`
        <line x1="${srcPos.x}" y1="${srcPos.y}" x2="${tgtPos.x}" y2="${tgtPos.y}" 
              stroke="${link.color}" stroke-width="${link.strokeWidth}" stroke-dasharray="${link.weight < 0 ? '4,3' : 'none'}"
              marker-end="${marker}" opacity="0.75" />
      `);
    }
    svgParts.push(`</g>`);

    // Render Nodes
    svgParts.push(`<g id="graph-nodes">`);
    for (const node of data.nodes) {
      const pos = nodePositions.get(node.id) || { x: centerX, y: centerY };
      const isHighlighted = highlightedNodeId && (node.id === highlightedNodeId.toUpperCase());
      const r = isHighlighted ? node.radius + 6 : node.radius;

      svgParts.push(`
        <g class="graph-node node-hover" data-id="${node.id}" transform="translate(${pos.x}, ${pos.y})">
          <circle r="${r}" fill="${node.color}" fill-opacity="0.85" stroke="${isHighlighted ? '#ffffff' : '#0f172a'}" stroke-width="${isHighlighted ? 3 : 1.5}" filter="${isHighlighted ? 'url(#glow)' : 'none'}" />
          <text y="${r + 14}" fill="#e2e8f0" font-size="10" font-weight="600" text-anchor="middle">${node.id}</text>
        </g>
      `);
    }
    svgParts.push(`</g>`);

    svgParts.push(`</svg>`);
    return svgParts.join("\n");
  }

  /**
   * Render dynamic SVG with simulated shockwave impact overlays
   * @param {Object} options
   * @param {Object} options.shockResult Result from simulateShockCascade
   * @param {number} [options.width=1000]
   * @param {number} [options.height=650]
   * @returns {string} SVG string
   */
  renderShockwaveSvg({ shockResult, width = 1000, height = 650 } = {}) {
    if (!shockResult || !shockResult.sourceNode) {
      return this.renderSvg({ width, height });
    }

    const impactMap = new Map();
    for (const imp of (shockResult.impactedNodes || [])) {
      impactMap.set(imp.nodeId, imp);
    }

    const data = this.exportNetworkData();
    const centerX = width / 2;
    const centerY = height / 2;
    const nodePositions = new Map();

    const categories = Array.from(new Set(data.nodes.map(n => n.category)));
    const catAngleStep = (2 * Math.PI) / categories.length;

    categories.forEach((cat, catIdx) => {
      const catNodes = data.nodes.filter(n => n.category === cat);
      const baseAngle = catIdx * catAngleStep;
      const radius = cat === "CENTRAL_BANK" || cat === "MACRO_FACTOR" ? 140 : cat === "SECTOR" ? 220 : 280;

      catNodes.forEach((node, idx) => {
        const offsetAngle = ((idx - (catNodes.length - 1) / 2) * 0.25);
        const angle = baseAngle + offsetAngle;
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));
        nodePositions.set(node.id, { x, y });
      });
    });

    const svgParts = [];
    svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#070b14; font-family:'Inter',system-ui,sans-serif;">`);
    
    svgParts.push(`
      <defs>
        <marker id="arrow-green" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981"/>
        </marker>
        <marker id="arrow-red" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444"/>
        </marker>
        <filter id="shock-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    `);

    // Title Header
    svgParts.push(`
      <text x="24" y="36" fill="#f8fafc" font-size="16" font-weight="700">⚡ SHOCKWAVE SIMULATION: ${shockResult.sourceNode}</text>
      <text x="24" y="56" fill="#94a3b8" font-size="12">Impacted Assets: ${shockResult.totalImpactedNodes} · Initial Magnitude: ${shockResult.initialMagnitude} · Cascade Damping: ${shockResult.dampingFactor}</text>
    `);

    // Render Links
    svgParts.push(`<g id="graph-links" opacity="0.4">`);
    for (const link of data.links) {
      const srcPos = nodePositions.get(link.source) || { x: centerX, y: centerY };
      const tgtPos = nodePositions.get(link.target) || { x: centerX, y: centerY };
      const isGreen = link.weight > 0;
      const marker = isGreen ? "url(#arrow-green)" : "url(#arrow-red)";
      svgParts.push(`
        <line x1="${srcPos.x}" y1="${srcPos.y}" x2="${tgtPos.x}" y2="${tgtPos.y}" 
              stroke="${link.color}" stroke-width="${link.strokeWidth}" stroke-dasharray="${link.weight < 0 ? '4,3' : 'none'}"
              marker-end="${marker}" />
      `);
    }
    svgParts.push(`</g>`);

    // Render Nodes with Shock Highlight
    svgParts.push(`<g id="graph-nodes">`);
    for (const node of data.nodes) {
      const pos = nodePositions.get(node.id) || { x: centerX, y: centerY };
      const isEpicenter = node.id === shockResult.sourceNode;
      const impact = impactMap.get(node.id);
      
      let fillColor = node.color;
      let strokeColor = "#0f172a";
      let strokeWidth = 1.5;
      let filter = "none";
      let r = node.radius;

      if (isEpicenter) {
        strokeColor = "#fbbf24";
        strokeWidth = 4;
        filter = "url(#shock-glow)";
        r += 8;
      } else if (impact) {
        fillColor = impact.impactScore > 0 ? "#10b981" : "#ef4444";
        strokeColor = "#ffffff";
        strokeWidth = 2.5;
        filter = "url(#shock-glow)";
        r = Math.max(12, Math.min(32, Math.round(node.radius + Math.abs(impact.impactScore) * 12)));
      }

      svgParts.push(`
        <g class="graph-node" data-id="${node.id}" transform="translate(${pos.x}, ${pos.y})">
          <circle r="${r}" fill="${fillColor}" fill-opacity="${impact || isEpicenter ? 0.95 : 0.4}" stroke="${strokeColor}" stroke-width="${strokeWidth}" filter="${filter}" />
          <text y="${r + 14}" fill="${impact || isEpicenter ? '#ffffff' : '#64748b'}" font-size="10" font-weight="700" text-anchor="middle">${node.id}</text>
          ${impact ? `<text y="${-(r + 4)}" fill="${impact.impactScore > 0 ? '#34d399' : '#f87171'}" font-size="9" font-weight="700" text-anchor="middle">${impact.impactScore > 0 ? '+' : ''}${impact.impactScore}</text>` : ''}
        </g>
      `);
    }
    svgParts.push(`</g>`);

    svgParts.push(`</svg>`);
    return svgParts.join("\n");
  }
}

export const graphVisualizer = new GraphVisualizer();

