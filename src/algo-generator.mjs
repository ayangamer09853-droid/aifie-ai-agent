/**
 * AI Multi-Algorithm Generator & Tournament Engine for Aifie AI Agent
 * Generates, backtests, ranks, and deploys quantitative trading algorithms automatically.
 */

import { randomUUID } from "node:crypto";
import { generateTradingSignal } from "./technical-indicators.mjs";
import { configureBot, getBotStatus } from "./trading-bot.mjs";
import { createStrategyState, registerStrategy } from "./strategy-lab.mjs";

const algoState = {
  customAlgorithms: [],
  lastTournamentResult: null
};

export function getAllAlgorithms(strategyLab) {
  const lab = strategyLab || createStrategyState();
  return lab.strategies;
}

export function generateAlgorithmProposal(strategyLab, { name, strategyType = "custom", hypothesis, assumptions = [] }) {
  if (!name) throw new Error("algorithm name is required");
  const lab = strategyLab || createStrategyState();
  const proposalHypothesis = hypothesis || `AI-generated quantitative trading algorithm based on ${strategyType} indicators.`;
  
  const strategy = registerStrategy(lab, {
    name,
    hypothesis: proposalHypothesis,
    assumptions
  });

  algoState.customAlgorithms.push(strategy);
  return strategy;
}

export function runBacktestForStrategy(prices, strategyId) {
  if (!Array.isArray(prices) || prices.length < 5) {
    return { strategyId, totalTrades: 0, wins: 0, losses: 0, winRatePercent: 0, netPnl: 0, sharpeRatio: 0 };
  }

  let position = null;
  let cash = 10000;
  let wins = 0;
  let losses = 0;
  let totalTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  const returns = [];

  for (let i = 5; i < prices.length; i++) {
    const subPrices = prices.slice(0, i + 1);
    const price = prices[i];
    const signalResult = generateTradingSignal(subPrices, strategyId);

    if (signalResult.signal === "BUY" && !position) {
      position = { buyPrice: price, qty: 10 };
    } else if (signalResult.signal === "SELL" && position) {
      const pnl = (price - position.buyPrice) * position.qty;
      cash += pnl;
      totalTrades += 1;
      returns.push(pnl / (position.buyPrice * position.qty));

      if (pnl > 0) {
        wins += 1;
        grossProfit += pnl;
      } else {
        losses += 1;
        grossLoss += Math.abs(pnl);
      }
      position = null;
    }
  }

  // Force close remaining position at end
  if (position) {
    const finalPrice = prices[prices.length - 1];
    const pnl = (finalPrice - position.buyPrice) * position.qty;
    cash += pnl;
    totalTrades += 1;
    returns.push(pnl / (position.buyPrice * position.qty));
    if (pnl > 0) { wins += 1; grossProfit += pnl; }
    else { losses += 1; grossLoss += Math.abs(pnl); }
  }

  const winRatePercent = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(2)) : 0;
  const netPnl = Number((cash - 10000).toFixed(2));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99 : 0;

  // Simple Sharpe ratio calculation
  let sharpeRatio = 0;
  if (returns.length > 1) {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length);
    sharpeRatio = stdDev > 0 ? Number((avgReturn / stdDev).toFixed(2)) : 0;
  }

  return {
    strategyId,
    totalTrades,
    wins,
    losses,
    winRatePercent,
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    netPnl,
    profitFactor,
    sharpeRatio
  };
}

export function runMultiAlgoTournament(prices, strategyLab) {
  const lab = strategyLab || createStrategyState();
  const activeStrategies = lab.strategies.filter(s => s.id !== "baseline-wait-v1");
  
  // Use provided price series or generate standard 30-candle evaluation series
  const testPrices = Array.isArray(prices) && prices.length >= 10
    ? prices
    : Array.from({ length: 40 }, (_, i) => Number((100 + Math.sin(i / 2) * 12 + Math.cos(i / 3) * 5).toFixed(2)));

  const tournamentResults = activeStrategies.map(strat => {
    const backtest = runBacktestForStrategy(testPrices, strat.id);
    return {
      id: strat.id,
      name: strat.name,
      version: strat.version,
      hypothesis: strat.hypothesis,
      ...backtest
    };
  }).sort((a, b) => b.sharpeRatio - a.sharpeRatio || b.winRatePercent - a.winRatePercent || b.netPnl - a.netPnl);

  const winningAlgorithm = tournamentResults[0];

  if (winningAlgorithm) {
    // Auto-deploy the tournament winner to active trading bot
    configureBot({ activeStrategyId: winningAlgorithm.id });
  }

  const resultPayload = {
    tournamentId: `tournament-${randomUUID().slice(0, 8)}`,
    executedAt: new Date().toISOString(),
    totalAlgorithmsTested: tournamentResults.length,
    winningAlgorithm: winningAlgorithm ? { id: winningAlgorithm.id, name: winningAlgorithm.name, winRatePercent: winningAlgorithm.winRatePercent, sharpeRatio: winningAlgorithm.sharpeRatio } : null,
    currentDeployedStrategyId: getBotStatus().activeStrategyId,
    leaderboard: tournamentResults
  };

  algoState.lastTournamentResult = resultPayload;
  return resultPayload;
}
