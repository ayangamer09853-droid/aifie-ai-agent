/**
 * Performance Analytics Evaluator for Aifie AI Agent
 * Computes Win Rate %, Profit Factor, Net PnL, and Strategy Rankings.
 */

export function calculateTradePerformance(orders = []) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRatePercent: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      netPnl: 0,
      avgWin: 0,
      avgLoss: 0
    };
  }

  let grossProfit = 0;
  let grossLoss = 0;
  let winningTrades = 0;
  let losingTrades = 0;

  // Track trade PnLs from filled orders
  for (const order of orders) {
    const commission = order.commission || 0;
    const isSell = order.side === "sell";
    
    // Estimate pnl if audit contains trade pnl, or calculate sell fill delta
    let pnl = 0;
    if (typeof order.pnl === "number") {
      pnl = order.pnl;
    } else if (isSell && order.fillPrice && order.quotedPrice) {
      pnl = (order.fillPrice - order.quotedPrice) * order.quantity - commission;
    }

    if (pnl > 0) {
      grossProfit += pnl;
      winningTrades += 1;
    } else if (pnl < 0) {
      grossLoss += Math.abs(pnl);
      losingTrades += 1;
    }
  }

  const totalTrades = winningTrades + losingTrades;
  const winRatePercent = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(2)) : 0;
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99 : 0;
  const netPnl = Number((grossProfit - grossLoss).toFixed(2));
  const avgWin = winningTrades > 0 ? Number((grossProfit / winningTrades).toFixed(2)) : 0;
  const avgLoss = losingTrades > 0 ? Number((grossLoss / losingTrades).toFixed(2)) : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRatePercent,
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    profitFactor,
    netPnl,
    avgWin,
    avgLoss
  };
}

export function evaluateStrategyRankings(orders = [], strategies = []) {
  const strategyStats = {};

  for (const strat of strategies) {
    strategyStats[strat.id] = { id: strat.id, name: strat.name, trades: 0, wins: 0, pnl: 0 };
  }

  for (const order of orders) {
    const stratId = order.strategyId || "sma_crossover";
    if (!strategyStats[stratId]) {
      strategyStats[stratId] = { id: stratId, name: stratId, trades: 0, wins: 0, pnl: 0 };
    }
    const stat = strategyStats[stratId];
    stat.trades += 1;
    if (order.fillPrice && order.quotedPrice) {
      const pnl = (order.fillPrice - order.quotedPrice) * order.quantity - (order.commission || 0);
      stat.pnl += pnl;
      if (pnl > 0) stat.wins += 1;
    }
  }

  return Object.values(strategyStats).map(s => ({
    ...s,
    winRatePercent: s.trades > 0 ? Number(((s.wins / s.trades) * 100).toFixed(2)) : 0,
    netPnl: Number(s.pnl.toFixed(2))
  })).sort((a, b) => b.winRatePercent - a.winRatePercent || b.netPnl - a.netPnl);
}
