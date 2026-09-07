// @ts-check
import { createHash } from "node:crypto";

/**
 * Graph Version & Topology Governance
 */
export class GraphVersionManager {
  /**
   * @param {string} [version="1.0.0"]
   */
  constructor(version = "1.0.0") {
    this.currentVersion = version;
    this.approvedVersions = new Set([version]);
    this.versionHistory = [];
  }

  /**
   * Compute deterministic checksum of graph topology (nodes + edges)
   * @param {Array<Object>} nodes
   * @param {Array<Object>} edges
   */
  computeTopologyChecksum(nodes = [], edges = []) {
    const nodeIds = nodes.map(n => `${n.id}:${n.type}`).sort().join("|");
    const edgeStrings = edges.map(e => `${e.from}->${e.to}[${e.reasonCode || ""}]`).sort().join("|");
    return createHash("sha256").update(`${nodeIds}::${edgeStrings}`).digest("hex").slice(0, 16);
  }

  /**
   * Validate proposed graph version
   * @param {Object} proposal
   * @param {string} proposal.version
   * @param {Array<Object>} proposal.nodes
   * @param {Array<Object>} proposal.edges
   */
  validateTopology(proposal) {
    const errors = [];
    if (!proposal.version) errors.push("Missing version string");
    if (!Array.isArray(proposal.nodes) || proposal.nodes.length === 0) errors.push("Nodes must be a non-empty array");
    if (!Array.isArray(proposal.edges)) errors.push("Edges must be an array");

    const nodeIds = new Set(proposal.nodes?.map(n => n.id));

    // Edge referential integrity check
    for (const edge of (proposal.edges || [])) {
      if (!nodeIds.has(edge.from)) errors.push(`Edge references non-existent source node: ${edge.from}`);
      if (!nodeIds.has(edge.to)) errors.push(`Edge references non-existent target node: ${edge.to}`);
    }

    return {
      valid: errors.length === 0,
      checksum: errors.length === 0 ? this.computeTopologyChecksum(proposal.nodes, proposal.edges) : null,
      errors
    };
  }

  /**
   * Register and activate approved graph version
   * @param {string} version
   * @param {string} checksum
   */
  promoteVersion(version, checksum) {
    this.currentVersion = version;
    this.approvedVersions.add(version);
    this.versionHistory.push({
      version,
      checksum,
      promotedAt: new Date().toISOString()
    });
    return { success: true, activeVersion: version };
  }
}

export const globalGraphVersionManager = new GraphVersionManager();
