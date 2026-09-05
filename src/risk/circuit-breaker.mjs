// src/risk/circuit-breaker.mjs
// Real-time Market Circuit Breaker & Abnormal Price Movement Detector.
// Automatically trips trading halts upon detecting abnormal spreads, volatility spikes, or price shocks.

export class CircuitBreaker {
  constructor(config = {}) {
    this.maxSpreadBps = config.maxSpreadBps || 50; // 50 bps max bid-ask spread
    this.maxSlippageBps = config.maxSlippageBps || 40; // 40 bps max tolerable slippage
    this.maxAbnormalMovePct = config.maxAbnormalMovePct || 0.05; // 5.0% sudden move vs reference price
    this.volatilityZScoreThreshold = config.volatilityZScoreThreshold || 3.5; // 3.5-sigma vol spike
    this.coolingOffPeriodMs = config.coolingOffPeriodMs || 60000; // 60-second default cooling off

    this.activeHalts = new Map(); // symbol -> { reason, haltedAt, resumeAt }
  }

  /**
   * Check if a symbol or the overall market is halted.
   * @param {string} symbol
   */
  isHalted(symbol) {
    const sym = symbol ? symbol.toUpperCase() : "MARKET";
    const halt = this.activeHalts.get(sym);
    if (!halt) return false;

    if (Date.now() >= halt.resumeAt) {
      this.activeHalts.delete(sym);
      return false;
    }
    return true;
  }

  haltSymbol(symbol, reason, durationMs = this.coolingOffPeriodMs) {
    const sym = symbol ? symbol.toUpperCase() : "MARKET";
    const haltedAt = Date.now();
    const resumeAt = haltedAt + durationMs;
    const haltInfo = { symbol: sym, reason, haltedAt, resumeAt, durationMs };
    this.activeHalts.set(sym, haltInfo);
    return haltInfo;
  }

  clearHalt(symbol) {
    const sym = symbol ? symbol.toUpperCase() : "MARKET";
    this.activeHalts.delete(sym);
  }

  clearAllHalts() {
    this.activeHalts.clear();
  }

  /**
   * Validate market microstructure conditions for order submission.
   * @param {Object} params
   * @param {string} params.symbol
   * @param {number} params.price
   * @param {Object} params.market - { bid, ask, last, referencePrice, volatilityZScore, stale }
   */
  validateMarketConditions({ symbol, price, market }) {
    const sym = symbol.toUpperCase();

    // 1. Check existing symbol or global market halt
    if (this.isHalted("MARKET")) {
      const halt = this.activeHalts.get("MARKET");
      return { approved: false, reason: `CIRCUIT_BREAKER_GLOBAL_HALT: Market trading is halted: ${halt.reason}` };
    }
    if (this.isHalted(sym)) {
      const halt = this.activeHalts.get(sym);
      return { approved: false, reason: `CIRCUIT_BREAKER_SYMBOL_HALT: Trading for ${sym} is halted: ${halt.reason}` };
    }

    if (!market) {
      return { approved: true }; // Proceed to quote validation if market tick object is separate
    }

    // 2. Spread blowout check
    if (typeof market.bid === "number" && typeof market.ask === "number" && market.bid > 0) {
      const mid = (market.bid + market.ask) / 2;
      const spreadBps = ((market.ask - market.bid) / mid) * 10000;
      if (spreadBps > this.maxSpreadBps) {
        this.haltSymbol(sym, `Spread blowout: ${spreadBps.toFixed(1)} bps > ${this.maxSpreadBps} bps`, 30000);
        return {
          approved: false,
          reason: `SPREAD_BLOWOUT: Bid-ask spread ${spreadBps.toFixed(1)} bps exceeds threshold ${this.maxSpreadBps} bps`,
          spreadBps
        };
      }
    }

    // 3. Abnormal price movement check vs reference price
    const refPrice = market.referencePrice || market.lastPrice || market.last;
    if (typeof refPrice === "number" && refPrice > 0 && typeof price === "number" && price > 0) {
      const priceMovePct = Math.abs(price - refPrice) / refPrice;
      if (priceMovePct > this.maxAbnormalMovePct) {
        this.haltSymbol(sym, `Abnormal price move: ${(priceMovePct * 100).toFixed(2)}% > ${(this.maxAbnormalMovePct * 100).toFixed(2)}%`, 45000);
        return {
          approved: false,
          reason: `ABNORMAL_PRICE_MOVEMENT: Order price $${price} deviates ${(priceMovePct * 100).toFixed(2)}% from reference $${refPrice}`,
          priceMovePct
        };
      }
    }

    // 4. Volatility spike check (Z-Score)
    if (typeof market.volatilityZScore === "number" && market.volatilityZScore > this.volatilityZScoreThreshold) {
      this.haltSymbol(sym, `Volatility spike Z=${market.volatilityZScore.toFixed(2)} > ${this.volatilityZScoreThreshold}`, 60000);
      return {
        approved: false,
        reason: `VOLATILITY_SPIKE: Volatility Z-score ${market.volatilityZScore.toFixed(2)} exceeds critical limit ${this.volatilityZScoreThreshold}`,
        volatilityZScore: market.volatilityZScore
      };
    }

    return { approved: true };
  }

  getActiveHalts() {
    return Array.from(this.activeHalts.values());
  }
}

export const circuitBreaker = new CircuitBreaker();
