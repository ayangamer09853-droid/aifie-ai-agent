// @ts-check
import { randomUUID } from "node:crypto";
import { globalEventBus } from "../core/event-bus.mjs";

/**
 * Shadow Mode Execution Engine
 * Evaluates trade strategies against live streaming markets without placing real orders.
 */
export class ShadowModeEngine {
  /**
   * @param {Object} [options]
   * @param {number} [options.startingCapital=100000]
   * @param {number} [options.slippageRate=0.0005] // 5 bps
   * @param {number} [options.commissionRate=0.0005] // 5 bps
   */
  constructor({ startingCapital = 100000, slippageRate = 0.0005, commissionRate = 0.0005 } = {}) {
    this.startingCapital = startingCapital;
    this.cash = startingCapital;
    this.slippageRate = slippageRate;
    this.commissionRate = commissionRate;

    /** @type {Map<string, { symbol: string, side: "BUY"|"SELL", quantity: number, entryPrice: number, currentPrice: number, unrealizedPnl: number, openedAt: string }>} */
    this.positions = new Map();
    this.closedTrades = [];
    this.shadowOrders = [];
  }

  /**
   * Record a shadow counterfactual order
   * @param {Object} intent
   * @param {string} intent.symbol
   * @param {"BUY"|"SELL"} intent.side
   * @param {number} intent.quantity
   * @param {number} intent.price
   * @param {string} [intent.strategy="unspecified"]
   */
  recordShadowOrder(intent) {
    const orderId = `shd-${randomUUID().slice(0, 8)}`;
    const symbol = String(intent.symbol).toUpperCase();
    const side = String(intent.side).toUpperCase();
    const quantity = Number(intent.quantity);
    const rawPrice = Number(intent.price);

    // Apply realistic slippage
    const effectivePrice = Number((side === "BUY"
      ? rawPrice * (1 + this.slippageRate)
      : rawPrice * (1 - this.slippageRate)).toFixed(4));

    const notional = quantity * effectivePrice;
    const commission = notional * this.commissionRate;
    const timestamp = new Date().toISOString();

    const orderRecord = {
      orderId,
      symbol,
      side,
      quantity,
      requestedPrice: rawPrice,
      effectivePrice,
      notional,
      commission,
      strategy: intent.strategy || "alpha-generic",
      timestamp,
      counterfactualNarrative: `[SHADOW MODE] Would have executed ${side} ${quantity} ${symbol} @ $${effectivePrice.toFixed(2)} (Commission: $${commission.toFixed(2)})`
    };

    this.shadowOrders.push(orderRecord);
    if (this.shadowOrders.length > 200) this.shadowOrders.shift();

    // Position updates
    if (side === "BUY") {
      this.cash -= (notional + commission);
      const existing = this.positions.get(symbol);
      if (existing) {
        const totalQty = existing.quantity + quantity;
        const avgPrice = ((existing.entryPrice * existing.quantity) + (effectivePrice * quantity)) / totalQty;
        existing.quantity = totalQty;
        existing.entryPrice = avgPrice;
      } else {
        this.positions.set(symbol, {
          symbol,
          side: "BUY",
          quantity,
          entryPrice: effectivePrice,
          currentPrice: effectivePrice,
          unrealizedPnl: -commission,
          openedAt: timestamp
        });
      }
    } else if (side === "SELL") {
      const existing = this.positions.get(symbol);
      if (existing && existing.quantity >= quantity) {
        const pnl = (effectivePrice - existing.entryPrice) * quantity - commission;
        this.cash += (quantity * effectivePrice - commission);
        existing.quantity -= quantity;
        if (existing.quantity <= 0) {
          this.positions.delete(symbol);
        }
        this.closedTrades.push({
          symbol,
          quantity,
          entryPrice: existing.entryPrice,
          exitPrice: effectivePrice,
          realizedPnl: pnl,
          strategy: intent.strategy,
          closedAt: timestamp
        });
      }
    }

    globalEventBus.publish("SHADOW_ORDER_RECORDED", orderRecord, { source: "ShadowModeEngine" });
    return orderRecord;
  }

  /**
   * Update mark-to-market values on price changes
   * @param {string} symbol
   * @param {number} currentPrice
   */
  updateMarketPrice(symbol, currentPrice) {
    const sym = String(symbol).toUpperCase();
    const pos = this.positions.get(sym);
    if (pos) {
      pos.currentPrice = Number(currentPrice);
      pos.unrealizedPnl = (pos.currentPrice - pos.entryPrice) * pos.quantity;
    }
  }

  /**
   * Get complete shadow portfolio telemetry
   */
  getStatus() {
    let openPositionsValue = 0;
    let totalUnrealizedPnl = 0;

    for (const pos of this.positions.values()) {
      openPositionsValue += pos.quantity * pos.currentPrice;
      totalUnrealizedPnl += pos.unrealizedPnl;
    }

    const totalRealizedPnl = this.closedTrades.reduce((acc, t) => acc + t.realizedPnl, 0);
    const totalEquity = this.cash + openPositionsValue;
    const totalReturnPercent = ((totalEquity - this.startingCapital) / this.startingCapital) * 100;
    const winTrades = this.closedTrades.filter(t => t.realizedPnl > 0).length;
    const winRate = this.closedTrades.length > 0 ? (winTrades / this.closedTrades.length) * 100 : 0;

    return {
      service: "ShadowModeEngine",
      mode: "SHADOW_LIVE_BENCHMARK",
      startingCapital: this.startingCapital,
      cash: Number(this.cash.toFixed(2)),
      equity: Number(totalEquity.toFixed(2)),
      openPositionsValue: Number(openPositionsValue.toFixed(2)),
      totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
      totalUnrealizedPnl: Number(totalUnrealizedPnl.toFixed(2)),
      totalReturnPercent: Number(totalReturnPercent.toFixed(2)),
      totalOrdersCount: this.shadowOrders.length,
      closedTradesCount: this.closedTrades.length,
      winRatePercent: Number(winRate.toFixed(1)),
      positions: Array.from(this.positions.values()),
      recentOrders: this.shadowOrders.slice(-5)
    };
  }

  getPortfolioStatus() {
    return this.getStatus();
  }
}

export const globalShadowModeEngine = new ShadowModeEngine();
