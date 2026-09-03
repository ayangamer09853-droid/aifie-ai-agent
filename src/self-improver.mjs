/**
 * Self-Improving Feedback Loop Engine for Aifie AI Agent
 * Analyzes trade results, auto-tunes risk & indicator parameters,
 * and promotes top-performing strategies.
 */

import { randomUUID } from "node:crypto";
import { calculateTradePerformance, evaluateStrategyRankings } from "./performance-evaluator.mjs";
import { configureBot, getBotStatus } from "./trading-bot.mjs";

const selfImproverState = {
  autoTuningEnabled: true,
  lastOptimizationTime: null,
  totalOptimizationsCount: 0,
  optimizationHistory: []
};

export function getSelfImprovementStatus(orders = [], strategies = []) {
  const performance = calculateTradePerformance(orders);
  const rankings = evaluateStrategyRankings(orders, strategies);
  const botStatus = getBotStatus();

  return {
    autoTuningEnabled: selfImproverState.autoTuningEnabled,
    lastOptimizationTime: selfImproverState.lastOptimizationTime,
    totalOptimizationsCount: selfImproverState.totalOptimizationsCount,
    performance,
    rankings,
    currentConfig: {
      activeStrategyId: botStatus.activeStrategyId,
      stopLossPercent: botStatus.stopLossPercent,
      takeProfitPercent: botStatus.takeProfitPercent
    },
    recentHistory: selfImproverState.optimizationHistory.slice(0, 15)
  };
}

export function runSelfOptimization({ orders = [], strategies = [] } = {}) {
  const performance = calculateTradePerformance(orders);
  const rankings = evaluateStrategyRankings(orders, strategies);
  const currentBot = getBotStatus();

  let nextStopLoss = currentBot.stopLossPercent;
  let nextTakeProfit = currentBot.takeProfitPercent;
  let nextStrategyId = currentBot.activeStrategyId;

  const tuningChanges = [];

  // 1. Auto-select best strategy if ranking evidence is available
  const topRanked = rankings.find(r => r.trades >= 2 && r.winRatePercent >= 50);
  if (topRanked && topRanked.id !== nextStrategyId) {
    nextStrategyId = topRanked.id;
    tuningChanges.push(`Promoted top strategy '${topRanked.name}' (Win Rate: ${topRanked.winRatePercent}%)`);
  }

  // 2. Auto-tune Stop Loss % based on Win Rate & Loss metrics
  if (performance.totalTrades >= 3) {
    if (performance.winRatePercent < 40) {
      // Tighten stop loss to protect capital
      const newSl = Math.max(1.5, Number((currentBot.stopLossPercent * 0.85).toFixed(1)));
      if (newSl !== currentBot.stopLossPercent) {
        nextStopLoss = newSl;
        tuningChanges.push(`Tightened Stop-Loss from ${currentBot.stopLossPercent}% to ${newSl}% (low win rate ${performance.winRatePercent}%)`);
      }
    } else if (performance.winRatePercent > 70) {
      // Slightly widen stop loss to give winning trades room to breathe
      const newSl = Math.min(5.0, Number((currentBot.stopLossPercent * 1.1).toFixed(1)));
      if (newSl !== currentBot.stopLossPercent) {
        nextStopLoss = newSl;
        tuningChanges.push(`Optimized Stop-Loss from ${currentBot.stopLossPercent}% to ${newSl}% (strong win rate ${performance.winRatePercent}%)`);
      }
    }
  }

  // 3. Auto-tune Take Profit % based on Profit Factor
  if (performance.profitFactor > 1.5 && performance.totalTrades >= 3) {
    const newTp = Math.min(10.0, Number((currentBot.takeProfitPercent * 1.15).toFixed(1)));
    if (newTp !== currentBot.takeProfitPercent) {
      nextTakeProfit = newTp;
      tuningChanges.push(`Expanded Take-Profit target from ${currentBot.takeProfitPercent}% to ${newTp}% (high profit factor ${performance.profitFactor})`);
    }
  }

  if (tuningChanges.length === 0) {
    tuningChanges.push("Current parameters are optimal. No adjustments required.");
  } else {
    // Apply tuned configuration to bot engine
    configureBot({
      activeStrategyId: nextStrategyId,
      stopLossPercent: nextStopLoss,
      takeProfitPercent: nextTakeProfit
    });
  }

  selfImproverState.lastOptimizationTime = new Date().toISOString();
  selfImproverState.totalOptimizationsCount += 1;

  const logEntry = {
    id: randomUUID(),
    timestamp: selfImproverState.lastOptimizationTime,
    changes: tuningChanges,
    winRatePercent: performance.winRatePercent,
    profitFactor: performance.profitFactor,
    appliedConfig: { activeStrategyId: nextStrategyId, stopLossPercent: nextStopLoss, takeProfitPercent: nextTakeProfit }
  };

  selfImproverState.optimizationHistory.unshift(logEntry);
  if (selfImproverState.optimizationHistory.length > 50) selfImproverState.optimizationHistory.pop();

  return {
    status: "success",
    optimization: logEntry
  };
}
