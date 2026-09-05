// src/risk/drawdown-controller.mjs
// Real-time Peak-to-Trough Drawdown and Daily Loss Controller.
// Enforces hard limits for daily loss % and maximum portfolio drawdown from High Water Mark (HWM).

export class DrawdownController {
  constructor(config = {}) {
    this.maxDailyLossPct = config.maxDailyLossPct || 0.03; // 3.0% maximum daily loss limit
    this.maxTotalDrawdownPct = config.maxTotalDrawdownPct || 0.05; // 5.0% trailing peak-to-trough liquidation trigger
    
    // State tracking
    this.highWaterMark = config.initialNav || 100000;
    this.dayStartNav = config.initialNav || 100000;
    this.currentNav = config.initialNav || 100000;
    this.currentDrawdownPct = 0;
    this.currentDailyLossPct = 0;
    this.circuitTripped = false;
    this.tripReason = null;
  }

  /**
   * Update NAV and recalculate drawdown metrics.
   * @param {number} nav - Current net asset value
   */
  updateNav(nav) {
    if (typeof nav !== "number" || nav <= 0) return;

    this.currentNav = nav;
    if (nav > this.highWaterMark) {
      this.highWaterMark = nav;
    }

    // Trailing peak-to-trough drawdown
    this.currentDrawdownPct = (this.highWaterMark - nav) / this.highWaterMark;

    // Daily loss from day start
    this.currentDailyLossPct = (this.dayStartNav - nav) / this.dayStartNav;

    // Evaluate triggers
    if (this.currentDailyLossPct >= this.maxDailyLossPct) {
      this.circuitTripped = true;
      this.tripReason = `DAILY_LOSS_LIMIT_REACHED: Daily loss ${(this.currentDailyLossPct * 100).toFixed(2)}% breached max allowed ${(this.maxDailyLossPct * 100).toFixed(2)}%`;
    } else if (this.currentDrawdownPct >= this.maxTotalDrawdownPct) {
      this.circuitTripped = true;
      this.tripReason = `MAX_DRAWDOWN_LIMIT_REACHED: Peak-to-trough drawdown ${(this.currentDrawdownPct * 100).toFixed(2)}% breached max allowed ${(this.maxTotalDrawdownPct * 100).toFixed(2)}%`;
    }
  }

  resetDay(newDayNav) {
    if (typeof newDayNav === "number" && newDayNav > 0) {
      this.dayStartNav = newDayNav;
      this.currentNav = newDayNav;
      if (newDayNav > this.highWaterMark) {
        this.highWaterMark = newDayNav;
      }
      this.currentDailyLossPct = 0;
      this.circuitTripped = false;
      this.tripReason = null;
    }
  }

  /**
   * Validate if an order is permissible given drawdown limits.
   * Only position-reducing orders (closing trades) may be permitted when drawdown circuit is tripped.
   * @param {Object} params
   * @param {string} params.symbol
   * @param {string} params.side
   * @param {Object} params.portfolio
   */
  validateDrawdown({ symbol, side, portfolio }) {
    if (portfolio && typeof portfolio.totalNav === "number") {
      this.updateNav(portfolio.totalNav);
    }

    if (this.circuitTripped) {
      // Check if order reduces exposure
      const currentPos = (portfolio && portfolio.positions && portfolio.positions[symbol]) || { quantity: 0 };
      const isReducing = (currentPos.quantity > 0 && side === "SELL") || (currentPos.quantity < 0 && side === "BUY");

      if (!isReducing) {
        return {
          approved: false,
          reason: `DRAWDOWN_CONTROLLER_HALT: ${this.tripReason}. New risk-increasing orders are strictly forbidden.`,
          currentDrawdownPct: this.currentDrawdownPct,
          currentDailyLossPct: this.currentDailyLossPct,
          highWaterMark: this.highWaterMark
        };
      }
    }

    return {
      approved: true,
      currentDrawdownPct: this.currentDrawdownPct,
      currentDailyLossPct: this.currentDailyLossPct,
      highWaterMark: this.highWaterMark
    };
  }

  getStatus() {
    return {
      currentNav: this.currentNav,
      highWaterMark: this.highWaterMark,
      dayStartNav: this.dayStartNav,
      drawdownPct: this.currentDrawdownPct,
      dailyLossPct: this.currentDailyLossPct,
      circuitTripped: this.circuitTripped,
      tripReason: this.tripReason
    };
  }
}

export const drawdownController = new DrawdownController();
