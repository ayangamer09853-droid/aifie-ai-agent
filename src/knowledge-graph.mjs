/**
 * Knowledge Graph Reasoning Engine for Aifie AI Agent v5.0
 * Connects macro events, interest rates, commodities, sectors, supply chains, and asset price impacts.
 */

export function getKnowledgeGraphData() {
  return {
    nodes: [
      { id: "FED_RATES", label: "Fed Interest Rate Pause", category: "MACRO_EVENT" },
      { id: "TECH_SECTOR", label: "Tech Equities (AAPL/NVDA)", category: "ASSET_SECTOR" },
      { id: "OIL_PRICES", label: "Crude Oil Surge", category: "COMMODITY" },
      { id: "AIRLINES", label: "Airlines & Travel Stocks", category: "SECTOR_IMPACT" },
      { id: "CRYPTO_MARKET", label: "Crypto Assets (BTC/ETH)", category: "ASSET_CLASS" }
    ],
    impactChains: [
      { from: "FED_RATES", to: "TECH_SECTOR", effect: "POSITIVE", multiplier: "+1.25", description: "Lower discount rates boost tech valuations." },
      { from: "OIL_PRICES", to: "AIRLINES", effect: "NEGATIVE", multiplier: "-1.40", description: "High fuel costs squeeze airline profit margins." },
      { from: "FED_RATES", to: "CRYPTO_MARKET", effect: "POSITIVE", multiplier: "+1.15", description: "Liquidity easing drives crypto risk-on appetite." }
    ]
  };
}

export function evaluateKnowledgeGraphImpact(macroEvent = "FED_RATES", symbol = "AAPL") {
  const kg = getKnowledgeGraphData();
  const impact = kg.impactChains.find(chain => chain.from === macroEvent);
  
  if (!impact) {
    return {
      macroEvent,
      targetSymbol: symbol,
      impactEffect: "NEUTRAL",
      confidenceBoost: 0,
      description: "No direct macro chain impact detected."
    };
  }

  return {
    macroEvent,
    targetSymbol: symbol,
    impactEffect: impact.effect,
    multiplier: impact.multiplier,
    confidenceBoost: impact.effect === "POSITIVE" ? 10 : -10,
    description: impact.description
  };
}
