// @ts-check
import { globalEntityGraph } from "./entity-graph.mjs";

/**
 * GraphRAG Retrieval & Reasoning Engine
 * Augments query context with structured multi-hop entity relationships and evidence.
 */
export class GraphRagEngine {
  /**
   * @param {Object} [options]
   * @param {Object} [options.graph]
   */
  constructor({ graph = globalEntityGraph } = {}) {
    this.graph = graph;
  }

  /**
   * Retrieve relational context for an asset or concept
   * @param {string} queryEntity - e.g. "BTC", "MOMENTUM_V3"
   * @param {number} [hops=2]
   */
  retrieveContext(queryEntity, hops = 2) {
    const neighborhood = this.graph.getNeighborhood(queryEntity, hops);
    const target = this.graph.getEntity(queryEntity);

    if (!target) {
      return {
        found: false,
        query: queryEntity,
        contextText: `No knowledge graph node found for '${queryEntity}'`,
        relations: []
      };
    }

    const relationsNarratives = neighborhood.relations.map(r => {
      if (r.from === target.id) {
        return `${r.from} --[${r.relation} (weight: ${r.weight})]--> ${r.to}`;
      } else {
        return `${r.to} <--[${r.relation} (weight: ${r.weight})]-- ${r.from}`;
      }
    });

    const contextText = [
      `Entity: ${target.id} (${target.type})`,
      `Properties: ${JSON.stringify(target.properties)}`,
      `Connected Relationships (${relationsNarratives.length}):`,
      ...relationsNarratives.map(line => ` - ${line}`)
    ].join("\n");

    return {
      found: true,
      query: queryEntity,
      entity: target,
      neighborhoodNodesCount: neighborhood.nodes.length,
      relationsCount: neighborhood.relations.length,
      contextText,
      relations: neighborhood.relations
    };
  }
}

export const globalGraphRag = new GraphRagEngine();
