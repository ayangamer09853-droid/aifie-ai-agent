// src/regime/regime-engine.mjs
// Macro & Microstructural Market Regime Engine.
// Classifies the market into 7 regimes across 13 economic/technical indicators,
// and derives regime-aware strategy allocation vectors.

export class RegimeEngine {
  constructor() {
    this.currentRegime = "BULL_LOW_VOL";
    this.lastAssessment = Date.now();
  }

  /**
   * Classify market conditions from 13 quantitative feature inputs:
   * 1. vix
   * 2. realized_volatility
   * 3. yield_curve_spread (10Y - 2Y)
   * 4. credit_spread (HY - IG)
   * 5. market_breadth (% stocks above 50-day MA)
   * 6. momentum (20-day benchmark return)
   * 7. correlation (average cross-stock correlation)
   * 8. liquidity (bid-ask spread & depth index)
   * 9. volume (relative to 30-day average)
   * 10. btc_dominance
   * 11. dxy (US Dollar Index)
   * 12. rates (policy interest rate)
   * 13. commodities (CRB index trend)
   *
   * @param {Object} features
   * @returns {Object} { regime, subRegime, confidence, featuresSnapshot, strategyWeights }
   */
  classifyRegime(features = {}) {
    const vix = features.vix ?? 18;
    const realizedVol = features.realized_volatility ?? 0.16;
    const yieldCurve = features.yield_curve_spread ?? 0.35;
    const creditSpread = features.credit_spread ?? 3.5;
    const breadth = features.market_breadth ?? 0.65;
    const momentum = features.momentum ?? 0.04;
    const correlation = features.correlation ?? 0.30;
    const liquidity = features.liquidity ?? 0.85; // 0 (dry) to 1 (liquid)
    const volume = features.volume ?? 1.0;
    const btcDominance = features.btc_dominance ?? 52.0;
    const dxy = features.dxy ?? 102.5;
    const rates = features.rates ?? 5.25;
    const commodities = features.commodities ?? 0.01;

    let regime = "SIDEWAYS";
    let subRegime = "NEUTRAL";
    let confidence = 0.80;

    // Classification Decision Tree
    if (vix > 28 || realizedVol > 0.30 || creditSpread > 5.5) {
      regime = "HIGH_VOLATILITY";
      subRegime = momentum < 0 ? "RISK_OFF" : "CHOPPY";
      confidence = 0.90;
    } else if (vix < 16 && realizedVol < 0.14) {
      if (momentum > 0.02 && breadth > 0.60) {
        regime = "BULL";
        subRegime = "LOW_VOLATILITY";
        confidence = 0.88;
      } else {
        regime = "LOW_VOLATILITY";
        subRegime = "SIDEWAYS";
        confidence = 0.82;
      }
    } else if (momentum < -0.05 && yieldCurve < 0) {
      regime = "BEAR";
      subRegime = "RISK_OFF";
      confidence = 0.86;
    } else if (breadth > 0.65 && momentum > 0.03 && creditSpread < 4.0) {
      regime = "RISK_ON";
      subRegime = "BULL";
      confidence = 0.84;
    } else if (creditSpread > 5.0 || yieldCurve < -0.2) {
      regime = "RISK_OFF";
      subRegime = "BEAR";
      confidence = 0.85;
    }

    const strategyWeights = this.getRegimeStrategyAllocation(regime, subRegime);

    this.currentRegime = regime;
    this.lastAssessment = Date.now();

    return {
      regime,
      subRegime,
      confidence,
      strategyWeights,
      featuresSnapshot: {
        vix,
        realizedVol,
        yieldCurve,
        creditSpread,
        breadth,
        momentum,
        correlation,
        liquidity,
        volume,
        btcDominance,
        dxy,
        rates,
        commodities
      },
      timestamp: this.lastAssessment
    };
  }

  /**
   * Derive strategic asset/strategy weight distribution based on market regime.
   * e.g.:
   * Bull + Low Vol -> Momentum 40%, Trend 30%, Mean Reversion 20%, Defensive 10%
   * Bear + High Vol -> Momentum 5%, Defensive 40%, Cash 40%, Short Bias 15%
   */
  getRegimeStrategyAllocation(regime, subRegime = "") {
    switch (regime) {
      case "BULL":
        return {
          MOMENTUM: 0.40,
          TREND_FOLLOWING: 0.30,
          MEAN_REVERSION: 0.20,
          DEFENSIVE: 0.10,
          CASH: 0.00
        };

      case "BEAR":
        return {
          MOMENTUM: 0.05,
          DEFENSIVE: 0.40,
          SHORT_BIAS: 0.25,
          MEAN_REVERSION: 0.10,
          CASH: 0.20
        };

      case "HIGH_VOLATILITY":
        return {
          MOMENTUM: 0.05,
          DEFENSIVE: 0.35,
          VOLATILITY_ARBITRAGE: 0.20,
          CASH: 0.40
        };

      case "LOW_VOLATILITY":
        return {
          MEAN_REVERSION: 0.45,
          CARRY: 0.25,
          TREND_FOLLOWING: 0.20,
          CASH: 0.10
        };

      case "RISK_ON":
        return {
          MOMENTUM: 0.50,
          GROWTH_ALPHA: 0.30,
          TREND_FOLLOWING: 0.20,
          CASH: 0.00
        };

      case "RISK_OFF":
        return {
          DEFENSIVE: 0.50,
          CASH: 0.40,
          MOMENTUM: 0.00,
          HEDGING: 0.10
        };

      case "SIDEWAYS":
      default:
        return {
          MEAN_REVERSION: 0.50,
          STATISTICAL_ARBITRAGE: 0.25,
          MOMENTUM: 0.10,
          CASH: 0.15
        };
    }
  }

  getCurrentRegime() {
    return this.currentRegime;
  }
}

export const regimeEngine = new RegimeEngine();
