// src/risk/pre-trade-gate.mjs
// Pre-Trade Validation Gate (FIA-Compliant Safeguards).
// Inspects fat-finger order sizes, stale market data, price bounds, and basic order formatting.

export class PreTradeGate {
  constructor(config = {}) {
    this.maxOrderNotional = config.maxOrderNotional || 20000; // $20,000 fat finger limit per order
    this.maxOrderQuantity = config.maxOrderQuantity || 500; // 500 shares max per single order
    this.maxQuoteAgeMs = config.maxQuoteAgeMs || 5000; // 5000 ms stale quote threshold
    this.allowedSides = new Set(["BUY", "SELL"]);
    this.allowedTypes = new Set(["LIMIT", "MARKET", "PAPER_MKT"]);
  }

  /**
   * Validate order formatting, freshness, and single-ticket boundaries.
   * @param {Object} order
   * @param {string} order.symbol
   * @param {string} order.side
   * @param {number} order.quantity
   * @param {number} order.price
   * @param {string} [order.type]
   * @param {number} [order.quoteTimestamp]
   */
  validateOrder(order) {
    if (!order || typeof order !== "object") {
      return { approved: false, reason: "INVALID_ORDER_OBJECT: Order must be a valid non-null object" };
    }

    const { symbol, side, quantity, price, type = "LIMIT", quoteTimestamp } = order;

    // 1. Symbol check
    if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0) {
      return { approved: false, reason: "INVALID_SYMBOL: Non-empty string symbol required" };
    }

    // 2. Side check
    const sideUpper = (side || "").toUpperCase();
    if (!this.allowedSides.has(sideUpper)) {
      return { approved: false, reason: `INVALID_SIDE: Order side must be BUY or SELL, got '${side}'` };
    }

    // 3. Numeric checks: quantity and price
    if (typeof quantity !== "number" || isNaN(quantity) || quantity <= 0) {
      return { approved: false, reason: `INVALID_QUANTITY: Positive number required, got ${quantity}` };
    }
    if (typeof price !== "number" || isNaN(price) || price <= 0) {
      return { approved: false, reason: `INVALID_PRICE: Positive number required, got ${price}` };
    }

    // 4. Fat-finger order quantity limit
    if (quantity > this.maxOrderQuantity) {
      return {
        approved: false,
        reason: `FAT_FINGER_QUANTITY: Order quantity ${quantity} exceeds single-order limit of ${this.maxOrderQuantity}`,
        quantity,
        limit: this.maxOrderQuantity
      };
    }

    // 5. Fat-finger order notional limit
    const orderNotional = quantity * price;
    if (orderNotional > this.maxOrderNotional) {
      return {
        approved: false,
        reason: `FAT_FINGER_NOTIONAL: Order notional $${orderNotional.toFixed(2)} exceeds single-order ceiling $${this.maxOrderNotional}`,
        orderNotional,
        limit: this.maxOrderNotional
      };
    }

    // 6. Stale quote / timestamp check
    if (quoteTimestamp) {
      const now = Date.now();
      const ageMs = now - quoteTimestamp;
      if (ageMs > this.maxQuoteAgeMs) {
        return {
          approved: false,
          reason: `STALE_MARKET_DATA: Quote age ${ageMs}ms exceeds max permissible age ${this.maxQuoteAgeMs}ms`,
          quoteAgeMs: ageMs,
          maxAllowedMs: this.maxQuoteAgeMs
        };
      }
      if (ageMs < -2000) {
        return {
          approved: false,
          reason: `CLOCK_DESYNC_DETECTED: Quote timestamp is ${Math.abs(ageMs)}ms in the future`,
          skewMs: ageMs
        };
      }
    }

    return {
      approved: true,
      orderNotional,
      symbol: symbol.toUpperCase(),
      side: sideUpper,
      quantity,
      price
    };
  }
}

export const preTradeGate = new PreTradeGate();
