// src/risk/institutional-risk-fortress.mjs
// Institutional Risk Fortress: Hard Limits, Exposure Caps, Drawdown Protection & Stale-Data Gate
// Pure Native Node.js ESM built-ins only

import { controlPlaneStatus } from "../alfie-control-plane.mjs";

export class InstitutionalRiskFortress {
  constructor({
    maxOrderNotionalUSD = 20000,
    maxConcentrationPercent = 20.0,
    maxSingleTradeRiskPercent = 1.5,
    maxGrossLeverage = 1.5,
    maxDailyLossPercent = 3.0,
    maxTrailingDrawdownPercent = 5.0,
    maxQuoteStalenessMs = 5000
  } = {}) {
    this.limits = {
      maxOrderNotionalUSD,
      maxConcentrationPercent,
      maxSingleTradeRiskPercent,
      maxGrossLeverage,
      maxDailyLossPercent,
      maxTrailingDrawdownPercent,
      maxQuoteStalenessMs
    };

    this.emergencyHalt = false;
    this.emergencyHaltReason = null;
    this.dailyStartingNav = 100000;
    this.peakNav = 100000;
    this.rejectionLog = [];
  }

  setStartingNav(nav) {
    if (Number.isFinite(nav) && nav > 0) {
      this.dailyStartingNav = nav;
      this.peakNav = Math.max(this.peakNav, nav);
    }
  }

  triggerEmergencyHalt(reason = "MANUAL_OPERATOR_HALT") {
    this.emergencyHalt = true;
    this.emergencyHaltReason = reason;
  }

  resetEmergencyHalt() {
    this.emergencyHalt = false;
    this.emergencyHaltReason = null;
  }

  /**
   * Comprehensive pre-trade risk audit before order execution.
   */
  evaluatePreTradeRisk({
    order = {},
    account = {},
    positions = {},
    marketQuote = null,
    now = Date.now()
  } = {}) {
    const symbol = (order.symbol || "AAPL").toUpperCase();
    const quantity = Number(order.quantity || order.qty || 1);
    const price = Number(order.price || marketQuote?.price || 100);
    const orderNotional = quantity * price;

    const nav = Number(account.equity || account.cash || this.dailyStartingNav);
    this.peakNav = Math.max(this.peakNav, nav);

    // 1. Check Global Control-Plane Kill Switch
    try {
      const cp = controlPlaneStatus();
      if (cp.safety?.killSwitchActive) {
        return this._reject("CONTROL_PLANE_KILL_SWITCH_ACTIVE", { symbol });
      }
    } catch (_) {}

    // 2. Check Emergency Halt
    if (this.emergencyHalt) {
      return this._reject(`EMERGENCY_HALT_TRIGGERED: ${this.emergencyHaltReason}`, { symbol });
    }

    // 3. Stale-Data & Timestamp Validity Protection
    if (marketQuote) {
      const quoteTime = marketQuote.timestamp
        ? (typeof marketQuote.timestamp === "string" ? Date.parse(marketQuote.timestamp) : Number(marketQuote.timestamp))
        : null;

      if (!quoteTime || isNaN(quoteTime)) {
        return this._reject("STALE_DATA_MISSING_TIMESTAMP", { symbol });
      }

      // Check future timestamp (> 15s)
      if (quoteTime - now > 15000) {
        return this._reject("DATA_FUTURE_TIMESTAMP_CORRUPTION", { symbol, quoteTime, now });
      }

      // Check quote staleness (> maxQuoteStalenessMs)
      const staleness = now - quoteTime;
      if (staleness > this.limits.maxQuoteStalenessMs) {
        return this._reject("STALE_DATA_REJECTION", {
          symbol,
          stalenessMs: staleness,
          thresholdMs: this.limits.maxQuoteStalenessMs
        });
      }
    }

    // 4. Intraday Daily Loss Circuit Breaker
    const dailyLossPercent = ((this.dailyStartingNav - nav) / this.dailyStartingNav) * 100;
    if (dailyLossPercent >= this.limits.maxDailyLossPercent) {
      this.triggerEmergencyHalt(`DAILY_LOSS_BREACH: -${dailyLossPercent.toFixed(2)}%`);
      return this._reject("DAILY_LOSS_CIRCUIT_BREAKER_TRIPPED", { dailyLossPercent, threshold: this.limits.maxDailyLossPercent });
    }

    // 5. Trailing Peak-to-Trough Drawdown Liquidation Guard
    const trailingDrawdownPercent = ((this.peakNav - nav) / this.peakNav) * 100;
    if (trailingDrawdownPercent >= this.limits.maxTrailingDrawdownPercent) {
      this.triggerEmergencyHalt(`TRAILING_DRAWDOWN_BREACH: -${trailingDrawdownPercent.toFixed(2)}%`);
      return this._reject("TRAILING_DRAWDOWN_LIQUIDATION_TRIGGER", { trailingDrawdownPercent, threshold: this.limits.maxTrailingDrawdownPercent });
    }

    // 6. Hard Maximum Notional Per Order
    if (orderNotional > this.limits.maxOrderNotionalUSD) {
      return this._reject("HARD_ORDER_NOTIONAL_EXCEEDED", {
        orderNotional,
        maxAllowed: this.limits.maxOrderNotionalUSD
      });
    }

    // 7. Single-Asset Concentration Limit
    const existingPositionNotional = Math.abs(Number(positions[symbol]?.quantity || 0) * price);
    const projectedConcentration = ((existingPositionNotional + orderNotional) / nav) * 100;
    if (projectedConcentration > this.limits.maxConcentrationPercent) {
      return this._reject("MAX_CONCENTRATION_EXCEEDED", {
        symbol,
        projectedConcentrationPercent: Number(projectedConcentration.toFixed(2)),
        maxAllowedPercent: this.limits.maxConcentrationPercent
      });
    }

    // 8. Gross Portfolio Leverage Limit
    const totalCurrentNotional = Object.entries(positions).reduce((acc, [s, pos]) => {
      return acc + Math.abs(Number(pos.quantity || 0) * (pos.currentPrice || price));
    }, 0);
    const projectedLeverage = (totalCurrentNotional + orderNotional) / nav;
    if (projectedLeverage > this.limits.maxGrossLeverage) {
      return this._reject("GROSS_LEVERAGE_LIMIT_EXCEEDED", {
        projectedLeverage: Number(projectedLeverage.toFixed(2)),
        maxAllowed: this.limits.maxGrossLeverage
      });
    }

    return {
      approved: true,
      symbol,
      orderNotional,
      projectedConcentration: Number(projectedConcentration.toFixed(2)),
      projectedLeverage: Number(projectedLeverage.toFixed(2)),
      timestamp: now
    };
  }

  _reject(reason, details = {}) {
    const record = { reason, details, timestamp: Date.now() };
    this.rejectionLog.unshift(record);
    if (this.rejectionLog.length > 100) this.rejectionLog.pop();
    return { approved: false, reason, details };
  }

  getTelemetry() {
    return {
      emergencyHalt: this.emergencyHalt,
      emergencyHaltReason: this.emergencyHaltReason,
      limits: { ...this.limits },
      peakNav: this.peakNav,
      dailyStartingNav: this.dailyStartingNav,
      recentRejections: this.rejectionLog.slice(0, 5)
    };
  }
}

export const institutionalRiskFortress = new InstitutionalRiskFortress();
