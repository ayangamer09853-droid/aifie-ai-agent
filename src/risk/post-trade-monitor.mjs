// src/risk/post-trade-monitor.mjs
// Post-Trade Analysis, Slippage Verification, and Portfolio State Auditor.
// Evaluates executed fills, slippage deviation, updates NAV, and triggers alerts on degradation.

import EventEmitter from "node:events";

export class PostTradeMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.maxPermissibleSlippageBps = config.maxPermissibleSlippageBps || 25; // Alert if slippage > 25 bps
    this.tradeLog = [];
  }

  /**
   * Record and audit an executed trade.
   * @param {Object} executionRecord
   * @param {string} executionRecord.orderId
   * @param {string} executionRecord.symbol
   * @param {string} executionRecord.side
   * @param {number} executionRecord.requestedPrice
   * @param {number} executionRecord.fillPrice
   * @param {number} executionRecord.quantity
   * @param {number} executionRecord.fee
   * @param {number} executionRecord.timestamp
   * @param {Object} [portfolio]
   */
  recordExecution(executionRecord, portfolio) {
    const { orderId, symbol, side, requestedPrice, fillPrice, quantity, fee = 0, timestamp = Date.now() } = executionRecord;

    // Calculate slippage in basis points
    let slippageBps = 0;
    if (requestedPrice && fillPrice) {
      if (side === "BUY") {
        slippageBps = ((fillPrice - requestedPrice) / requestedPrice) * 10000;
      } else {
        slippageBps = ((requestedPrice - fillPrice) / requestedPrice) * 10000;
      }
    }

    const auditEntry = {
      orderId,
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      requestedPrice,
      fillPrice,
      fee,
      slippageBps,
      timestamp,
      slippageAlert: slippageBps > this.maxPermissibleSlippageBps
    };

    this.tradeLog.push(auditEntry);

    if (auditEntry.slippageAlert) {
      this.emit("slippageAlert", {
        symbol,
        slippageBps,
        threshold: this.maxPermissibleSlippageBps,
        orderId
      });
    }

    this.emit("tradeRecorded", auditEntry);
    return auditEntry;
  }

  getRecentTrades(count = 50) {
    return this.tradeLog.slice(-count);
  }

  getExecutionMetrics() {
    if (this.tradeLog.length === 0) {
      return { totalTrades: 0, avgSlippageBps: 0, maxSlippageBps: 0, alertsCount: 0 };
    }

    const slippages = this.tradeLog.map(t => t.slippageBps);
    const avgSlippage = slippages.reduce((a, b) => a + b, 0) / slippages.length;
    const maxSlippage = Math.max(...slippages);
    const alertsCount = this.tradeLog.filter(t => t.slippageAlert).length;

    return {
      totalTrades: this.tradeLog.length,
      avgSlippageBps: Number(avgSlippage.toFixed(2)),
      maxSlippageBps: Number(maxSlippage.toFixed(2)),
      alertsCount
    };
  }
}

export const postTradeMonitor = new PostTradeMonitor();
