// src/core/clock.mjs
// Deterministic Multi-Clock Abstraction
// Eliminates ad-hoc Date.now() and tracks stage-by-stage trading timestamps and latency attribution.

/**
 * Stage timestamps captured during a trading event lifecycle.
 */
export class TradingClock {
  /**
   * @param {Object} [initialTimestamps={}]
   */
  constructor(initialTimestamps = {}) {
    this.marketTimestamp = initialTimestamps.marketTimestamp ?? null;
    this.receiveTimestamp = initialTimestamps.receiveTimestamp ?? null;
    this.processTimestamp = initialTimestamps.processTimestamp ?? null;
    this.decisionTimestamp = initialTimestamps.decisionTimestamp ?? null;
    this.submitTimestamp = initialTimestamps.submitTimestamp ?? null;
    this.exchangeAckTimestamp = initialTimestamps.exchangeAckTimestamp ?? null;
    this.fillTimestamp = initialTimestamps.fillTimestamp ?? null;
  }

  /**
   * Returns current high-resolution epoch milliseconds.
   * @returns {number}
   */
  static now() {
    return Date.now();
  }

  /**
   * Records arrival of market tick from exchange.
   * @param {number} exchangeTime
   * @param {number} [receiveTime]
   */
  markIngest(exchangeTime, receiveTime = TradingClock.now()) {
    this.marketTimestamp = exchangeTime;
    this.receiveTimestamp = receiveTime;
    this.processTimestamp = TradingClock.now();
    return this;
  }

  /**
   * Records decision generation by Governor.
   * @param {number} [decisionTime]
   */
  markDecision(decisionTime = TradingClock.now()) {
    this.decisionTimestamp = decisionTime;
    return this;
  }

  /**
   * Records order submission to broker gateway.
   * @param {number} [submitTime]
   */
  markSubmit(submitTime = TradingClock.now()) {
    this.submitTimestamp = submitTime;
    return this;
  }

  /**
   * Records broker ack.
   * @param {number} [ackTime]
   */
  markExchangeAck(ackTime = TradingClock.now()) {
    this.exchangeAckTimestamp = ackTime;
    return this;
  }

  /**
   * Records order fill confirmation.
   * @param {number} [fillTime]
   */
  markFill(fillTime = TradingClock.now()) {
    this.fillTimestamp = fillTime;
    return this;
  }

  /**
   * Calculates comprehensive latency attribution across all stages.
   * @returns {Object}
   */
  computeLatencies() {
    const latencies = {
      networkLatencyMs: (this.receiveTimestamp && this.marketTimestamp) ? Math.max(0, this.receiveTimestamp - this.marketTimestamp) : null,
      ingestionLatencyMs: (this.processTimestamp && this.receiveTimestamp) ? Math.max(0, this.processTimestamp - this.receiveTimestamp) : null,
      decisionLatencyMs: (this.decisionTimestamp && this.processTimestamp) ? Math.max(0, this.decisionTimestamp - this.processTimestamp) : null,
      submitLatencyMs: (this.submitTimestamp && this.decisionTimestamp) ? Math.max(0, this.submitTimestamp - this.decisionTimestamp) : null,
      exchangeAckLatencyMs: (this.exchangeAckTimestamp && this.submitTimestamp) ? Math.max(0, this.exchangeAckTimestamp - this.submitTimestamp) : null,
      executionLatencyMs: (this.fillTimestamp && this.submitTimestamp) ? Math.max(0, this.fillTimestamp - this.submitTimestamp) : null,
      totalLatencyMs: (this.fillTimestamp && this.marketTimestamp) ? Math.max(0, this.fillTimestamp - this.marketTimestamp) : null
    };

    return Object.freeze(latencies);
  }

  /**
   * Produces an immutable snapshot of all timestamps and latencies.
   * @returns {Object}
   */
  snapshot() {
    return Object.freeze({
      timestamps: {
        marketTimestamp: this.marketTimestamp,
        receiveTimestamp: this.receiveTimestamp,
        processTimestamp: this.processTimestamp,
        decisionTimestamp: this.decisionTimestamp,
        submitTimestamp: this.submitTimestamp,
        exchangeAckTimestamp: this.exchangeAckTimestamp,
        fillTimestamp: this.fillTimestamp
      },
      latencies: this.computeLatencies()
    });
  }
}
