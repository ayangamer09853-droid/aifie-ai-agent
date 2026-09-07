// @ts-check
import { AifieAgent } from "../agent/agent-runtime.mjs";
import { globalEventBus } from "../core/event-bus.mjs";

/**
 * Standard Strategy Agent Interface
 * Proposes directional alpha signals without calculating position sizing.
 */
export class StrategyAgent extends AifieAgent {
  /**
   * @param {Object} options
   * @param {string} options.strategyName - e.g. "momentum-v3"
   * @param {string} [options.version="1.0.0"]
   */
  constructor({ strategyName, version = "1.0.0", ...rest }) {
    super({
      id: rest.id || `strat-${strategyName}-${version}`,
      role: "STRATEGY",
      ...rest
    });
    this.strategyName = strategyName;
    this.version = version;
    this.signalsGeneratedCount = 0;
  }

  /**
   * Generate standardized alpha signal
   * @param {Object} context
   * @param {string} context.symbol - Asset symbol
   * @param {number} context.price - Current market price
   * @param {Array<number>} [context.candles=[]] - Price history
   * @param {Object} [context.features={}] - Precomputed technical/orderflow features
   */
  async generateSignal(context = {}) {
    const symbol = String(context.symbol || "BTCUSDT").toUpperCase();
    const price = Number(context.price || 50000);
    const features = context.features || {};

    // Example deterministic indicator heuristic (e.g. RSI or EMA spread)
    const rsi = Number(features.rsi || 50);
    let direction = "HOLD";
    let confidence = 0.50;
    const reasonCodes = [];

    if (rsi < 35) {
      direction = "BUY";
      confidence = 0.72;
      reasonCodes.push("OVERSOLD_RSI", "MEAN_REVERSION_PROBABILITY");
    } else if (rsi > 65) {
      direction = "SELL";
      confidence = 0.70;
      reasonCodes.push("OVERBOUGHT_RSI", "PROFIT_TAKING_FLOW");
    } else {
      direction = "BUY";
      confidence = 0.62;
      reasonCodes.push("TREND_CONTINUATION_EMA");
    }

    this.signalsGeneratedCount++;

    const signalProposal = Object.freeze({
      strategy: this.strategyName,
      version: this.version,
      symbol,
      price,
      direction,
      confidence,
      expectedReturn: 0.015, // 150 bps
      expectedRisk: 0.0075,   // 75 bps
      holdingPeriod: "30m",
      reasonCodes,
      timestamp: Date.now()
    });

    globalEventBus.publish("SIGNAL_GENERATED", signalProposal, {
      source: this.id,
      correlationId: context.correlationId
    });

    return signalProposal;
  }

  /**
   * Explain reasoning behind a signal
   * @param {Object} signal
   */
  async explain(signal) {
    return {
      strategy: this.strategyName,
      summary: `Strategy ${this.strategyName} v${this.version} proposed ${signal.direction} on ${signal.symbol} with ${(signal.confidence * 100).toFixed(1)}% confidence.`,
      primaryDriver: signal.reasonCodes?.[0] || "TECHNICAL_CONFLUENCE",
      allReasonCodes: signal.reasonCodes
    };
  }

  /**
   * Strategy health telemetry
   */
  async health() {
    return {
      status: "HEALTHY",
      signalsGeneratedCount: this.signalsGeneratedCount,
      version: this.version
    };
  }
}
