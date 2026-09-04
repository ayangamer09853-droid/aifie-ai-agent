/**
 * End-of-Day Trend Strength & Daily PnL Report Generator for Aifie AI Agent
 * Computes trend strength (ADX/Momentum) and complete Daily PnL audit reports.
 */

import { calculateTradePerformance } from "./performance-evaluator.mjs";
import { getPriceBuffer } from "./market-fetcher.mjs";
import { accountSnapshot } from "./paper-engine.mjs";
import { autonomousSelfLearningEngine } from "./autonomous-self-learning-engine.mjs";

export function calculateTrendStrength(prices) {
  if (!Array.isArray(prices) || prices.length < 5) {
    return { score: 50, direction: "SIDEWAYS", adx: 15, strength: "WEAK" };
  }

  const first = prices[0];
  const last = prices[prices.length - 1];
  const changePercent = ((last - first) / first) * 100;
  
  let score = 50 + Math.min(45, Math.max(-45, changePercent * 5));
  score = Number(score.toFixed(1));

  let direction = "SIDEWAYS";
  if (changePercent > 1.0) direction = "BULLISH";
  else if (changePercent < -1.0) direction = "BEARISH";

  let strength = "WEAK";
  if (Math.abs(changePercent) > 3.0) strength = "STRONG";
  else if (Math.abs(changePercent) > 1.5) strength = "MODERATE";

  return {
    score,
    direction,
    adx: Number((15 + Math.abs(changePercent) * 4).toFixed(1)),
    strength,
    changePercent: Number(changePercent.toFixed(2))
  };
}

export function generateDailyReport(orders = [], paper = {}) {
  const perf = calculateTradePerformance(orders);
  const account = paper.account ? accountSnapshot(paper) : { cash: paper.cash || 100000, equity: paper.equity || 100000, startingCash: paper.startingCash || 100000 };

  const startingEquity = account.startingCash || 100000;
  const endingEquity = account.equity || account.cash || 100000;
  const dailyPnl = Number((endingEquity - startingEquity).toFixed(2));
  const dailyPnlPercent = Number(((dailyPnl / startingEquity) * 100).toFixed(2));

  // Determine Best and Worst trade
  let bestTrade = null;
  let worstTrade = null;

  for (const order of orders) {
    if (order.fillPrice && order.quotedPrice && order.side === "sell") {
      const pnl = (order.fillPrice - order.quotedPrice) * order.quantity - (order.commission || 0);
      const tradeInfo = { symbol: order.symbol, pnl: Number(pnl.toFixed(2)), price: order.fillPrice, qty: order.quantity };
      if (!bestTrade || pnl > bestTrade.pnl) bestTrade = tradeInfo;
      if (!worstTrade || pnl < worstTrade.pnl) worstTrade = tradeInfo;
    }
  }

  // Trend strength index for core symbols
  const watchSymbols = ["AAPL", "TSLA", "BTC", "ETH", "NVDA"];
  const trendStrengths = {};
  for (const sym of watchSymbols) {
    const prices = getPriceBuffer(sym);
    trendStrengths[sym] = calculateTrendStrength(prices);
  }

  return {
    reportDate: new Date().toISOString().split("T")[0],
    generatedAt: new Date().toISOString(),
    summary: {
      startingEquity,
      endingEquity,
      dailyPnl,
      dailyPnlPercent,
      totalTrades: perf.totalTrades,
      winningTrades: perf.winningTrades,
      losingTrades: perf.losingTrades,
      winRatePercent: perf.winRatePercent,
      profitFactor: perf.profitFactor,
      grossProfit: perf.grossProfit,
      grossLoss: perf.grossLoss,
      maxDrawdownPercent: paper.drawdownPercent || 0,
      bestTrade,
      worstTrade
    },
    trendStrengths,
    learningDashboard: autonomousSelfLearningEngine.getDailyLearningReportDashboard(),
    executiveSummary: autonomousSelfLearningEngine.getDailyLearningReportDashboard().executiveSummary,
    executiveBriefing: autonomousSelfLearningEngine.getDailyLearningReportDashboard().executiveSummary,
    modulesHealthMatrix: autonomousSelfLearningEngine.getModulesStatusMatrix()
  };
}
