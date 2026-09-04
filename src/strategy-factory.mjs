/**
 * Quantitative Strategy Factory
 * Generates parameter permutations across SMA Crossovers, Momentum, and Mean Reversion archetypes.
 */

export class StrategyFactory {
  static createMovingAverageCrossover(fastPeriod, slowPeriod) {
    return {
      name: `SMA_${fastPeriod}_${slowPeriod}`,
      type: "SMA_CROSSOVER",
      fastPeriod,
      slowPeriod,
      evaluate(candles) {
        const list = Array.isArray(candles) ? candles : [candles];
        if (list.length < slowPeriod) return "HOLD";

        const fast = list.slice(-fastPeriod).map(c => (c && typeof c.close === "number" ? c.close : Number(c)));
        const slow = list.slice(-slowPeriod).map(c => (c && typeof c.close === "number" ? c.close : Number(c)));

        const fastMA = fast.reduce((a, b) => a + b, 0) / fast.length;
        const slowMA = slow.reduce((a, b) => a + b, 0) / slow.length;

        if (fastMA > slowMA) return "BUY";
        if (fastMA < slowMA) return "SELL";
        return "HOLD";
      }
    };
  }

  static createMomentum(period, threshold) {
    return {
      name: `MOMENTUM_${period}_${threshold}`,
      type: "MOMENTUM",
      period,
      threshold,
      evaluate(candles) {
        const list = Array.isArray(candles) ? candles : [candles];
        if (list.length < period + 1) return "HOLD";

        const recent = list[list.length - 1] && typeof list[list.length - 1].close === "number"
          ? list[list.length - 1].close
          : Number(list[list.length - 1]);
        const past = list[list.length - 1 - period] && typeof list[list.length - 1 - period].close === "number"
          ? list[list.length - 1 - period].close
          : Number(list[list.length - 1 - period]);

        if (past <= 0) return "HOLD";
        const momentum = ((recent - past) / past) * 100;

        if (momentum > threshold) return "BUY";
        if (momentum < -threshold) return "SELL";
        return "HOLD";
      }
    };
  }

  static createMeanReversion(period, stddevMultiplier) {
    return {
      name: `MEAN_REVERSION_${period}_${stddevMultiplier}`,
      type: "MEAN_REVERSION",
      period,
      stddevMultiplier,
      evaluate(candles) {
        const list = Array.isArray(candles) ? candles : [candles];
        if (list.length < period) return "HOLD";

        const recent = list.slice(-period).map(c => (c && typeof c.close === "number" ? c.close : Number(c)));
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const variance = recent.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recent.length;
        const stddev = Math.sqrt(variance);

        if (stddev === 0) return "HOLD";

        const lastPrice = list[list.length - 1] && typeof list[list.length - 1].close === "number"
          ? list[list.length - 1].close
          : Number(list[list.length - 1]);
        const zScore = (lastPrice - mean) / stddev;

        if (zScore < -stddevMultiplier) return "BUY"; // Oversold
        if (zScore > stddevMultiplier) return "SELL"; // Overbought
        return "HOLD";
      }
    };
  }

  static generateMegafactoryCatalog(limit = null) {
    const strategies = [];

    // 1. SMA Crossovers (fast 2..50 step 2, slow fast+5..200 step 5)
    for (let fast = 2; fast <= 50; fast += 2) {
      for (let slow = fast + 5; slow <= 200; slow += 5) {
        strategies.push(StrategyFactory.createMovingAverageCrossover(fast, slow));
      }
    }

    // 2. Momentum (period 2..100 step 2, threshold 0.5..5.0 step 0.5)
    for (let period = 2; period <= 100; period += 2) {
      for (let threshold = 0.5; threshold <= 5.0; threshold += 0.5) {
        strategies.push(StrategyFactory.createMomentum(period, Number(threshold.toFixed(1))));
      }
    }

    // 3. Mean Reversion (period 5..60 step 2, mult 1.0..3.0 step 0.25)
    for (let period = 5; period <= 60; period += 2) {
      for (let mult = 1.0; mult <= 3.0; mult += 0.25) {
        strategies.push(StrategyFactory.createMeanReversion(period, Number(mult.toFixed(2))));
      }
    }

    return limit && limit > 0 ? strategies.slice(0, limit) : strategies;
  }
}
