/**
 * Performance Attribution & Strategy Analytics Engine for Aifie AI Agent
 * Tracks trade attribution breakdown, PnL per strategy, PnL per asset class,
 * and agent consensus weights (Quant 35%, Research 25%, News 20%, Risk 20%).
 */

export function getPerformanceAttribution(orders = []) {
  const pnlByStrategy = {
    sma_crossover: 0,
    rsi_mean_reversion: 0,
    macd_trend: 0,
    bollinger_bands: 0,
    vwap_trend: 0,
    ml_ensemble: 0
  };

  const pnlByAssetClass = {
    STOCKS: 0,
    CRYPTO: 0,
    FOREX: 0,
    COMMODITIES: 0
  };

  let totalRealizedPnl = 0;
  let winningAttributedTrades = 0;

  for (const order of orders) {
    if (order.side === "sell" && order.fillPrice && order.quotedPrice) {
      const grossPnl = (order.fillPrice - order.quotedPrice) * order.quantity;
      const commission = order.commission || 1.0;
      const slippage = (order.quotedPrice * 0.0005) * order.quantity; // 5bps slippage
      const netPnl = grossPnl - commission - slippage;

      totalRealizedPnl += netPnl;
      if (netPnl > 0) winningAttributedTrades++;

      // Attribute to Strategy
      const strat = order.audit?.activeStrategyId || "ml_ensemble";
      if (pnlByStrategy[strat] !== undefined) {
        pnlByStrategy[strat] += netPnl;
      } else {
        pnlByStrategy.ml_ensemble += netPnl;
      }

      // Attribute to Asset Class
      const sym = (order.symbol || "AAPL").toUpperCase();
      if (["BTC", "ETH", "SOL", "BTCUSDT", "ETHUSDT"].includes(sym)) {
        pnlByAssetClass.CRYPTO += netPnl;
      } else if (["EUR/USD", "GBP/USD", "USD/JPY"].includes(sym)) {
        pnlByAssetClass.FOREX += netPnl;
      } else if (["GOLD", "OIL", "SILVER", "XAUUSD"].includes(sym)) {
        pnlByAssetClass.COMMODITIES += netPnl;
      } else {
        pnlByAssetClass.STOCKS += netPnl;
      }
    }
  }

  return {
    totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
    totalFilledOrders: orders.length,
    winningAttributedTrades,
    consensusWeights: {
      quantStrategyWeight: "35%",
      marketResearchWeight: "25%",
      newsAnalysisWeight: "20%",
      riskManagementWeight: "20%",
      executionThreshold: "75% Minimum Consensus Confidence"
    },
    pnlByStrategy: Object.fromEntries(Object.entries(pnlByStrategy).map(([k, v]) => [k, Number(v.toFixed(2))])),
    pnlByAssetClass: Object.fromEntries(Object.entries(pnlByAssetClass).map(([k, v]) => [k, Number(v.toFixed(2))]))
  };
}
