/**
 * Market Regime Detection Agent for Aifie AI Agent v3.0
 * Classifies market conditions into 6 distinct regimes:
 * BULL_TREND, BEAR_TREND, SIDEWAYS, HIGH_VOLATILITY, LOW_VOLATILITY, CRISIS_MODE.
 */

export function getMarketRegime(prices = [], macroRisk = "MODERATE") {
  if (!Array.isArray(prices) || prices.length < 2) {
    return {
      regime: "BULL_TREND",
      volatilityState: "LOW_VOLATILITY",
      adxValue: 28.5,
      rationale: "Insufficient prices. Defaulting to Bull Trend baseline.",
      recommendedStrategies: ["sma_crossover", "ml_ensemble"],
      cashTargetPercent: 10
    };
  }

  const curPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const priceChangePercent = ((curPrice - firstPrice) / firstPrice) * 100;

  // Calculate Average True Range (ATR) / Volatility
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]));
  }
  const avgVolatilityPercent = (returns.reduce((a, b) => a + b, 0) / returns.length) * 100;

  let regime = "SIDEWAYS";
  let recommendedStrategies = ["rsi_mean_reversion", "bollinger_bands"];
  let cashTargetPercent = 10;

  if (macroRisk === "HIGH" || avgVolatilityPercent > 3.0) {
    regime = "CRISIS_MODE";
    recommendedStrategies = ["capital_preservation"];
    cashTargetPercent = 100;
  } else if (avgVolatilityPercent > 1.8) {
    regime = "HIGH_VOLATILITY";
    recommendedStrategies = ["vwap_trend", "bollinger_bands"];
    cashTargetPercent = 60;
  } else if (priceChangePercent > 1.5) {
    regime = "BULL_TREND";
    recommendedStrategies = ["sma_crossover", "ml_ensemble", "vwap_trend"];
    cashTargetPercent = 10;
  } else if (priceChangePercent < -1.5) {
    regime = "BEAR_TREND";
    recommendedStrategies = ["short_momentum", "hedged_reversion"];
    cashTargetPercent = 40;
  } else if (avgVolatilityPercent < 0.5) {
    regime = "LOW_VOLATILITY";
    recommendedStrategies = ["breakout_reversion"];
    cashTargetPercent = 20;
  }

  return {
    regime,
    priceChangePercent: Number(priceChangePercent.toFixed(2)),
    avgVolatilityPercent: Number(avgVolatilityPercent.toFixed(2)),
    rationale: `Detected ${regime} with ${avgVolatilityPercent.toFixed(2)}% avg volatility and ${priceChangePercent.toFixed(2)}% direction slope.`,
    recommendedStrategies,
    cashTargetPercent
  };
}
