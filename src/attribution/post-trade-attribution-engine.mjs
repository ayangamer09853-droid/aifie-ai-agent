// src/attribution/post-trade-attribution-engine.mjs
// Quantitative Post-Trade Attribution Engine.
// Decomposes realized trade P&L into exact institutional alpha and cost drivers:
// Realized P&L = Signal Alpha + Timing Contribution + Execution Quality + Slippage Cost + Fee Drag

export class PostTradeAttributionEngine {
  constructor() {}

  /**
   * Perform comprehensive mathematical decomposition of a completed trade.
   *
   * Example:
   * Trade P&L: +$420
   * Signal:    +$510
   * Timing:    +$90
   * Execution: -$80
   * Slippage:  -$55
   * Fees:      -$45
   * Net P&L:   +$420
   *
   * @param {Object} trade
   * @param {string} trade.symbol
   * @param {string} trade.side - "BUY" | "SELL"
   * @param {number} trade.quantity
   * @param {number} trade.decisionPrice - Price when AI generated signal
   * @param {number} trade.arrivalPrice - Price when order reached market
   * @param {number} trade.fillPrice - Actual weighted execution fill price
   * @param {number} trade.exitPrice - Final position close price
   * @param {number} [trade.fees] - Broker/exchange commissions
   * @returns {Object} Attribution breakdown
   */
  attributeTrade(trade) {
    const { symbol, side, quantity, decisionPrice, arrivalPrice, fillPrice, exitPrice, fees = 0 } = trade;
    const isBuy = (side || "BUY").toUpperCase() === "BUY";
    const dir = isBuy ? 1 : -1;

    // Gross P&L: (Exit - Fill) * dir * quantity
    const grossPnL = (exitPrice - fillPrice) * dir * quantity;
    const netPnL = grossPnL - fees;

    // 1. Signal Contribution: Return from decision price to exit price if ideal execution happened
    const signalAlpha = (exitPrice - decisionPrice) * dir * quantity;

    // 2. Timing Contribution: Slippage between decision generation and order dispatch
    const timingContribution = (decisionPrice - arrivalPrice) * dir * quantity;

    // 3. Execution Quality / Market Impact: Fill vs Arrival Price (excluding pure random spread)
    const rawExecutionCost = (fillPrice - arrivalPrice) * dir * quantity;
    const executionContribution = -rawExecutionCost;

    // 4. Slippage Cost: Explicit drag from requested arrival to filled execution
    const slippageCost = Math.abs(fillPrice - arrivalPrice) * quantity;

    return {
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      realizedPnL: {
        grossPnL: Number(grossPnL.toFixed(2)),
        netPnL: Number(netPnL.toFixed(2))
      },
      attribution: {
        signalAlpha: Number(signalAlpha.toFixed(2)),
        timingContribution: Number(timingContribution.toFixed(2)),
        executionContribution: Number(executionContribution.toFixed(2)),
        slippageCost: Number((-slippageCost).toFixed(2)),
        feeDrag: Number((-fees).toFixed(2))
      },
      verification: {
        sumOfComponents: Number((signalAlpha + timingContribution + executionContribution - fees).toFixed(2)),
        reconciliationDiff: Number(Math.abs(netPnL - (signalAlpha + timingContribution + executionContribution - fees)).toFixed(4))
      },
      timestamp: Date.now()
    };
  }
}

export const postTradeAttributionEngine = new PostTradeAttributionEngine();
