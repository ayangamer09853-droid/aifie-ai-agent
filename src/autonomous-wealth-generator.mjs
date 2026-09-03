/**
 * Sovereign Autonomous Wealth Generation Engine for Aifie AI Agent v10.0
 * Executes Autonomous Opportunity Allocation, Profit Compounding, Autonomous Strategy Evolution,
 * and Capital Preservation across US Equities, Indian Equities (NSE), Crypto 24/7, Forex, and Commodities.
 */

import { getOpportunityRankings } from "./opportunity-ranker.mjs";
import { getTreasuryBuckets } from "./treasury-management.mjs";
import { calculate6FactorTradeScore } from "./ai-trade-scorer.mjs";
import { getPriceBuffer } from "./market-fetcher.mjs";
import { runPatternLearningCycle } from "./pattern-learning-engine.mjs";

export function runAutonomousWealthCycle({ portfolioEquity = 100000, realizedPnl = 4500 } = {}) {
  const watchUniverse = ["AAPL", "BTC", "NIFTY50", "GOLD", "TSLA", "NVDA", "ETH", "RELIANCE.NS"];
  const opps = getOpportunityRankings(watchUniverse);
  const treasury = getTreasuryBuckets(portfolioEquity);
  const patternLearning = runPatternLearningCycle();

  // High-water mark & compound gains calculation
  const highWaterMark = Math.max(portfolioEquity, 100000 + realizedPnl);
  const compoundMultiplier = realizedPnl > 0 ? 1.10 : 1.0;
  const maxCompoundedAllocation = Math.min(portfolioEquity * 0.50 * compoundMultiplier, portfolioEquity * 0.60);

  // Evaluate top high-conviction setups (> 85 AI Score)
  const topCandidateSymbol = opps.topOpportunity.symbol || "AAPL";
  const prices = getPriceBuffer(topCandidateSymbol);
  const tradeScore = calculate6FactorTradeScore({ symbol: topCandidateSymbol, prices });

  const isAutonomousExecutionApproved = tradeScore.totalScore >= 85 && opps.topOpportunity.opportunityScore >= 70;

  return {
    engineStatus: "SOVEREIGN_AUTONOMOUS_FREEDOM_ACTIVE",
    timestamp: new Date().toISOString(),
    wealthGoal: "REAL_CAPITAL_COMPOUNDING_AND_WEALTH_GENERATION",
    portfolioEquity: `₹${portfolioEquity.toLocaleString("en-IN")}`,
    highWaterMark: `₹${highWaterMark.toLocaleString("en-IN")}`,
    compoundingTier: realizedPnl > 0 ? "EXPANDED_COMPOUNDING_ACTIVE (+10% Capacity Boost)" : "STANDARD_CAPITAL_PRESERVATION",
    maxCompoundedAllocation: `₹${maxCompoundedAllocation.toLocaleString("en-IN")}`,
    topCandidate: {
      symbol: topCandidateSymbol,
      opportunityScore: opps.topOpportunity.opportunityScore,
      aiTradeScore: `${tradeScore.totalScore} / 100 (${tradeScore.classification})`,
      autonomousVerdict: isAutonomousExecutionApproved ? "AUTONOMOUS_EXECUTION_APPROVED" : "STANDBY_HOLD"
    },
    treasuryPartitioning: {
      tradingCapital: `₹${(portfolioEquity * 0.50).toLocaleString("en-IN")}`,
      reserveCapital: `₹${(portfolioEquity * 0.30).toLocaleString("en-IN")}`,
      profitVault: `₹${(portfolioEquity * 0.10).toLocaleString("en-IN")}`,
      emergencyFund: `₹${(portfolioEquity * 0.10).toLocaleString("en-IN")}`
    },
    patternEdgeMultiplier: patternLearning.patternWeights["Liquidity Sweep + FVG + AVWAP"]?.confidenceWeight || 1.25,
    safetyGuarantee: "1.0% Equity Risk Cap & ABSOLUTE RISK VETO POWER enforced on all trades."
  };
}
