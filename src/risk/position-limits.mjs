// src/risk/position-limits.mjs
// Position & Concentration Limits for Aifie Trading Engine.
// Enforces single-asset notional caps, maximum shares, and portfolio concentration % limits.

export class PositionLimitsManager {
  constructor(config = {}) {
    this.maxSingleAssetWeight = config.maxSingleAssetWeight || 0.20; // Max 20% of NAV in one asset
    this.maxNotionalPerPosition = config.maxNotionalPerPosition || 25000; // $25,000 hard ceiling
    this.maxSharesPerPosition = config.maxSharesPerPosition || 1000; // 1,000 units max
  }

  /**
   * Validate position sizing for an intended order.
   * @param {Object} params
   * @param {string} params.symbol
   * @param {string} params.side - "BUY" or "SELL"
   * @param {number} params.quantity
   * @param {number} params.price
   * @param {Object} params.portfolio - { cash, totalNav, positions: { [symbol]: { quantity, avgPrice, currentPrice } } }
   * @returns {{ approved: boolean, reason?: string, currentExposure?: number, projectedExposure?: number, maxAllowed?: number }}
   */
  validatePositionLimit({ symbol, side, quantity, price, portfolio }) {
    if (!portfolio || typeof portfolio.totalNav !== "number" || portfolio.totalNav <= 0) {
      return { approved: false, reason: "INVALID_PORTFOLIO_NAV: Valid portfolio with positive NAV required" };
    }

    const currentPos = (portfolio.positions && portfolio.positions[symbol]) || { quantity: 0, currentPrice: price };
    const orderNotional = quantity * price;

    let projectedQuantity = currentPos.quantity;
    if (side === "BUY") {
      projectedQuantity += quantity;
    } else if (side === "SELL") {
      projectedQuantity -= quantity;
    }

    const projectedNotional = Math.abs(projectedQuantity) * price;
    const projectedWeight = projectedNotional / portfolio.totalNav;

    // 1. Max shares limit check
    if (Math.abs(projectedQuantity) > this.maxSharesPerPosition) {
      return {
        approved: false,
        reason: `MAX_SHARES_EXCEEDED: Projected quantity ${Math.abs(projectedQuantity)} exceeds limit of ${this.maxSharesPerPosition}`,
        currentExposure: currentPos.quantity,
        projectedExposure: projectedQuantity,
        maxAllowed: this.maxSharesPerPosition
      };
    }

    // 2. Max absolute notional limit check
    if (projectedNotional > this.maxNotionalPerPosition) {
      return {
        approved: false,
        reason: `MAX_NOTIONAL_EXCEEDED: Projected notional $${projectedNotional.toFixed(2)} exceeds cap of $${this.maxNotionalPerPosition}`,
        currentExposure: Math.abs(currentPos.quantity) * (currentPos.currentPrice || price),
        projectedExposure: projectedNotional,
        maxAllowed: this.maxNotionalPerPosition
      };
    }

    // 3. Max concentration weight (% of NAV) check
    if (projectedWeight > this.maxSingleAssetWeight) {
      return {
        approved: false,
        reason: `CONCENTRATION_EXCEEDED: Projected concentration ${(projectedWeight * 100).toFixed(2)}% exceeds limit of ${(this.maxSingleAssetWeight * 100).toFixed(2)}% of NAV`,
        currentExposure: ((Math.abs(currentPos.quantity) * price) / portfolio.totalNav),
        projectedExposure: projectedWeight,
        maxAllowed: this.maxSingleAssetWeight
      };
    }

    return {
      approved: true,
      currentExposure: Math.abs(currentPos.quantity) * price,
      projectedExposure: projectedNotional,
      projectedWeight
    };
  }
}

export const positionLimits = new PositionLimitsManager();
