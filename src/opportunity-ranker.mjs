/**
 * Opportunity Ranking Engine for Aifie AI Agent v5.0
 * Scores and ranks market opportunities across symbols (AAPL, BTC, NIFTY 50, Gold, Oil)
 * so that capital is allocated ONLY to the highest-ranked setups.
 */

import { generateTradingSignal } from "./technical-indicators.mjs";
import { getPriceBuffer } from "./market-fetcher.mjs";

export function getOpportunityRankings(watchSymbols = ["AAPL", "BTC", "NIFTY50", "GOLD", "TSLA", "NVDA"]) {
  const list = Array.isArray(watchSymbols) && watchSymbols.length > 0 ? watchSymbols : ["AAPL", "BTC", "NIFTY50", "GOLD"];

  const ranked = list.map(sym => {
    const prices = getPriceBuffer(sym);
    const signal = generateTradingSignal(prices, "ml_ensemble");
    const baseScore = Math.round((signal.confidence || 0.75) * 100);
    const bonus = signal.signal === "BUY" ? 10 : signal.signal === "SELL" ? 5 : 0;
    const finalScore = Math.min(99, Math.max(40, baseScore + bonus));

    return {
      symbol: String(sym).toUpperCase(),
      opportunityScore: finalScore,
      signal: signal.signal,
      rankGrade: finalScore >= 85 ? "TIER_1_PRIME" : finalScore >= 75 ? "TIER_2_SOLID" : "TIER_3_WATCH",
      recommendedAction: finalScore >= 85 ? "ALLOCATE_CAPITAL" : finalScore >= 75 ? "MODERATE_ALLOCATION" : "STANDBY"
    };
  }).sort((a, b) => b.opportunityScore - a.opportunityScore);

  return {
    topOpportunity: ranked[0] || { symbol: "AAPL", opportunityScore: 91, rankGrade: "TIER_1_PRIME" },
    rankings: ranked
  };
}
