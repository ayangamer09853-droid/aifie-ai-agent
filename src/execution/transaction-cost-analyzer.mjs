// src/execution/transaction-cost-analyzer.mjs
// Transaction Cost Analysis (TCA) & Slippage Decomposition Engine
// Decomposes order execution drag into: Half-Spread, Market Impact, Latency Slippage, and Broker Fees.

export class TransactionCostAnalyzer {
  /**
   * Decomposes execution costs for an individual order.
   * @param {Object} execution
   * @param {"BUY"|"SELL"} execution.side
   * @param {number} execution.quantity
   * @param {number} execution.arrivalPrice - Mid-price at alpha decision timestamp
   * @param {number} execution.submissionPrice - Mid-price at order router submission timestamp
   * @param {number} execution.bidPrice - Quoted bid at execution
   * @param {number} execution.askPrice - Quoted ask at execution
   * @param {number} execution.executedPrice - Final realized average fill price
   * @param {number} [execution.feeBps=2.0] - Broker & exchange fee in basis points
   * @returns {Object} TCA decomposition breakdown
   */
  static analyzeOrder({
    side,
    quantity,
    arrivalPrice,
    submissionPrice,
    bidPrice,
    askPrice,
    executedPrice,
    feeBps = 2.0
  }) {
    if (!side || !quantity || !arrivalPrice || !executedPrice) {
      throw new Error("[TCA] Missing mandatory execution fields for cost decomposition.");
    }

    const direction = side.toUpperCase() === "BUY" ? 1 : -1;
    const notionalArrival = arrivalPrice * quantity;
    const notionalExecuted = executedPrice * quantity;

    // 1. Latency Delay Cost (Arrival -> Submission drift)
    const subPrice = submissionPrice || arrivalPrice;
    const latencyPriceDelta = (subPrice - arrivalPrice) * direction;
    const latencyCost = Math.max(0, latencyPriceDelta * quantity);
    const latencyBps = notionalArrival > 0 ? (latencyCost / notionalArrival) * 10000 : 0;

    // 2. Half-Spread Cost
    const spread = (askPrice && bidPrice && askPrice >= bidPrice) ? (askPrice - bidPrice) : (arrivalPrice * 0.0004); // fallback 4 bps spread
    const halfSpread = spread / 2;
    const halfSpreadCost = halfSpread * quantity;
    const halfSpreadBps = notionalArrival > 0 ? (halfSpreadCost / notionalArrival) * 10000 : 0;

    // 3. Market Impact Cost (Execution price drift exceeding half-spread)
    const rawSlippageDelta = (executedPrice - subPrice) * direction;
    const impactDelta = Math.max(0, rawSlippageDelta - halfSpread);
    const impactCost = impactDelta * quantity;
    const impactBps = notionalArrival > 0 ? (impactCost / notionalArrival) * 10000 : 0;

    // 4. Broker / Exchange Fees
    const feeCost = notionalExecuted * (feeBps / 10000);

    // 5. Total Implementation Shortfall
    const totalCost = latencyCost + halfSpreadCost + impactCost + feeCost;
    const totalBps = notionalArrival > 0 ? (totalCost / notionalArrival) * 10000 : 0;

    let dragRating = "LOW_DRAG_OPTIMAL";
    if (totalBps > 30) {
      dragRating = "PROHIBITIVE_DRAG_UNPROFITABLE";
    } else if (totalBps > 15) {
      dragRating = "HIGH_DRAG_WARNING";
    } else if (totalBps > 7) {
      dragRating = "MODERATE_DRAG_ACCEPTABLE";
    }

    return Object.freeze({
      side: side.toUpperCase(),
      quantity,
      arrivalPrice,
      submissionPrice: subPrice,
      executedPrice,
      notionalArrival: Number(notionalArrival.toFixed(2)),
      notionalExecuted: Number(notionalExecuted.toFixed(2)),
      breakdown: {
        latencyCost: Number(latencyCost.toFixed(4)),
        latencyBps: Number(latencyBps.toFixed(2)),
        halfSpreadCost: Number(halfSpreadCost.toFixed(4)),
        halfSpreadBps: Number(halfSpreadBps.toFixed(2)),
        impactCost: Number(impactCost.toFixed(4)),
        impactBps: Number(impactBps.toFixed(2)),
        feeCost: Number(feeCost.toFixed(4)),
        feeBps: Number(feeBps.toFixed(2))
      },
      totalShortfallCost: Number(totalCost.toFixed(4)),
      totalShortfallBps: Number(totalBps.toFixed(2)),
      dragRating,
      isExecutionAcceptable: totalBps <= 20
    });
  }

  /**
   * Aggregates multiple order TCA records into a portfolio execution profile.
   * @param {Array<Object>} tcaReports
   * @returns {Object} Portfolio TCA summary
   */
  static aggregate(tcaReports = []) {
    if (!tcaReports || tcaReports.length === 0) {
      return { totalOrders: 0, totalShortfallCost: 0, averageShortfallBps: 0 };
    }

    let totalNotional = 0;
    let totalShortfall = 0;
    let totalLatencyCost = 0;
    let totalHalfSpreadCost = 0;
    let totalImpactCost = 0;
    let totalFees = 0;

    for (const r of tcaReports) {
      totalNotional += r.notionalArrival;
      totalShortfall += r.totalShortfallCost;
      totalLatencyCost += r.breakdown.latencyCost;
      totalHalfSpreadCost += r.breakdown.halfSpreadCost;
      totalImpactCost += r.breakdown.impactCost;
      totalFees += r.breakdown.feeCost;
    }

    const avgBps = totalNotional > 0 ? (totalShortfall / totalNotional) * 10000 : 0;

    return Object.freeze({
      totalOrders: tcaReports.length,
      totalNotional: Number(totalNotional.toFixed(2)),
      totalShortfallCost: Number(totalShortfall.toFixed(2)),
      averageShortfallBps: Number(avgBps.toFixed(2)),
      attributionPercentages: {
        latency: Number((totalShortfall > 0 ? (totalLatencyCost / totalShortfall) * 100 : 0).toFixed(1)),
        spread: Number((totalShortfall > 0 ? (totalHalfSpreadCost / totalShortfall) * 100 : 0).toFixed(1)),
        marketImpact: Number((totalShortfall > 0 ? (totalImpactCost / totalShortfall) * 100 : 0).toFixed(1)),
        fees: Number((totalShortfall > 0 ? (totalFees / totalShortfall) * 100 : 0).toFixed(1))
      }
    });
  }
}
