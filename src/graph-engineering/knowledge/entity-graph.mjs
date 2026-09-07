// @ts-check

/**
 * Knowledge Graph Entity & Relational Store
 * Maps structured relationships: Asset -> Exchange, Strategy -> Feature, Asset -> Regime.
 */
export class EntityGraphStore {
  constructor() {
    /** @type {Map<string, { id: string, type: string, properties: Object }>} */
    this.entities = new Map();
    /** @type {Array<{ from: string, to: string, relation: string, weight: number, properties: Object }>} */
    this.relations = [];

    this._initializeDefaultFinancialOntology();
  }

  _initializeDefaultFinancialOntology() {
    // Entities
    this.addEntity("BTC", "ASSET", { name: "Bitcoin", assetClass: "CRYPTO", decimals: 8 });
    this.addEntity("ETH", "ASSET", { name: "Ethereum", assetClass: "CRYPTO", decimals: 18 });
    this.addEntity("AAPL", "ASSET", { name: "Apple Inc.", assetClass: "EQUITY", exchange: "NASDAQ" });
    this.addEntity("BINANCE", "EXCHANGE", { type: "CRYPTO_SPOT_DERIVATIVES", status: "ONLINE" });
    this.addEntity("ALPACA", "EXCHANGE", { type: "EQUITIES_BROKER", status: "ONLINE" });
    this.addEntity("MOMENTUM_V3", "STRATEGY", { family: "TREND_FOLLOWING", author: "AIFIE_LAB" });
    this.addEntity("MEANREV_V2", "STRATEGY", { family: "STAT_ARB", author: "AIFIE_LAB" });
    this.addEntity("REGIME_TRENDING", "MARKET_REGIME", { volatility: "MEDIUM_HIGH", bias: "DIRECTIONAL" });
    this.addEntity("REGIME_CHOPPY", "MARKET_REGIME", { volatility: "LOW_MEDIUM", bias: "MEAN_REVERTING" });
    this.addEntity("US_CPI", "MACRO_EVENT", { impact: "HIGH", frequency: "MONTHLY" });

    // Relationships
    this.addRelation("BTC", "BINANCE", "TRADED_ON", 1.0);
    this.addRelation("ETH", "BINANCE", "TRADED_ON", 1.0);
    this.addRelation("AAPL", "ALPACA", "TRADED_ON", 1.0);
    this.addRelation("BTC", "ETH", "CORRELATED_WITH", 0.82);
    this.addRelation("BTC", "US_CPI", "AFFECTED_BY", 0.75);
    this.addRelation("MOMENTUM_V3", "REGIME_TRENDING", "PERFORMS_IN", 0.85);
    this.addRelation("MEANREV_V2", "REGIME_CHOPPY", "PERFORMS_IN", 0.88);
    this.addRelation("BTC", "MOMENTUM_V3", "TRADED_BY", 0.90);
  }

  addEntity(id, type, properties = {}) {
    const entity = { id: String(id).toUpperCase(), type: String(type).toUpperCase(), properties };
    this.entities.set(entity.id, entity);
    return entity;
  }

  addRelation(from, to, relation, weight = 1.0, properties = {}) {
    const rel = {
      from: String(from).toUpperCase(),
      to: String(to).toUpperCase(),
      relation: String(relation).toUpperCase(),
      weight: Number(weight),
      properties
    };
    this.relations.push(rel);
    return rel;
  }

  getEntity(id) {
    return this.entities.get(String(id).toUpperCase()) || null;
  }

  /**
   * Traverse immediate neighborhood for an entity (1-hop or 2-hop)
   * @param {string} id
   * @param {number} [hops=1]
   */
  getNeighborhood(id, hops = 1) {
    const targetId = String(id).toUpperCase();
    const visited = new Set([targetId]);
    const edges = [];
    let currentFrontier = [targetId];

    for (let h = 0; h < hops; h++) {
      const nextFrontier = [];
      for (const current of currentFrontier) {
        const connected = this.relations.filter(r => r.from === current || r.to === current);
        for (const rel of connected) {
          edges.push(rel);
          const neighbor = rel.from === current ? rel.to : rel.from;
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            nextFrontier.push(neighbor);
          }
        }
      }
      currentFrontier = nextFrontier;
    }

    const nodes = Array.from(visited).map(nid => this.entities.get(nid)).filter(Boolean);
    return { nodes, relations: edges };
  }

  getStatus() {
    return {
      service: "EntityGraphStore",
      totalEntities: this.entities.size,
      totalRelations: this.relations.length
    };
  }
}

export const globalEntityGraph = new EntityGraphStore();
