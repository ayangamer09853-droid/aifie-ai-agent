// src/integrations/institutional-risk-api-gateway.mjs
// Pillar 9: Institutional Pre-Trade Risk Validation & Safety Limit Gateway API
// Zero-dependency Node.js ESM built-ins only

import crypto from "node:crypto";

export class InstitutionalRiskApiGateway {
  constructor({
    maxOrderNotional = 50000,
    maxDailyLoss = 2000,
    maxLeverage = 2.0,
    maxConcentrationPct = 0.20,
    circuitBreakerActive = false
  } = {}) {
    this.limits = {
      maxOrderNotional,
      maxDailyLoss,
      maxLeverage,
      maxConcentrationPct
    };
    this.circuitBreakerActive = circuitBreakerActive;
    this.dailyRealizedLoss = 0;
    this.currentPortfolioNav = 100000;
    this.currentMarginUsed = 12500;
    this.positions = new Map(); // symbol -> { qty, avgPrice, notional }
    this.riskEvaluations = [];
    this.maxHistory = 200;
  }

  /**
   * Pre-trade real-time institutional risk validation check.
   */
  evaluatePreTradeRisk(order = {}) {
    const evalId = "risk-eval-" + crypto.randomUUID().slice(0, 8);
    const timestamp = new Date().toISOString();
    const { symbol = "AAPL", side = "BUY", qty = 10, price = 150 } = order;
    const orderNotional = Number(qty) * Number(price);

    const checks = [];
    let passed = true;

    // Check 1: Emergency Circuit Breaker
    if (this.circuitBreakerActive) {
      checks.push({ name: "CIRCUIT_BREAKER", passed: false, detail: "Global Risk Emergency Kill-Switch is ACTIVE" });
      passed = false;
    } else {
      checks.push({ name: "CIRCUIT_BREAKER", passed: true, detail: "Normal operational state" });
    }

    // Check 2: Max Order Notional
    if (orderNotional > this.limits.maxOrderNotional) {
      checks.push({
        name: "MAX_ORDER_NOTIONAL",
        passed: false,
        detail: `Order notional $${orderNotional.toFixed(2)} exceeds limit $${this.limits.maxOrderNotional}`
      });
      passed = false;
    } else {
      checks.push({
        name: "MAX_ORDER_NOTIONAL",
        passed: true,
        detail: `Notional $${orderNotional.toFixed(2)} within $${this.limits.maxOrderNotional} limit`
      });
    }

    // Check 3: Daily Realized Loss Ceiling
    if (this.dailyRealizedLoss >= this.limits.maxDailyLoss) {
      checks.push({
        name: "DAILY_LOSS_LIMIT",
        passed: false,
        detail: `Daily loss $${this.dailyRealizedLoss} reached ceiling $${this.limits.maxDailyLoss}`
      });
      passed = false;
    } else {
      checks.push({
        name: "DAILY_LOSS_LIMIT",
        passed: true,
        detail: `Daily loss $${this.dailyRealizedLoss} < ceiling $${this.limits.maxDailyLoss}`
      });
    }

    // Check 4: Portfolio Single-Asset Concentration
    const currentSymbolNotional = this.positions.get(symbol)?.notional || 0;
    const projectedSymbolNotional = currentSymbolNotional + orderNotional;
    const projectedConcentration = projectedSymbolNotional / this.currentPortfolioNav;

    if (projectedConcentration > this.limits.maxConcentrationPct) {
      checks.push({
        name: "CONCENTRATION_LIMIT",
        passed: false,
        detail: `Projected concentration ${(projectedConcentration * 100).toFixed(1)}% exceeds ${(this.limits.maxConcentrationPct * 100)}% ceiling`
      });
      passed = false;
    } else {
      checks.push({
        name: "CONCENTRATION_LIMIT",
        passed: true,
        detail: `Projected concentration ${(projectedConcentration * 100).toFixed(1)}% within limit`
      });
    }

    // Check 5: Margin Utilization & Leverage
    const projectedMargin = this.currentMarginUsed + (orderNotional * 0.5);
    const projectedLeverage = (projectedMargin * 2) / this.currentPortfolioNav;
    if (projectedLeverage > this.limits.maxLeverage) {
      checks.push({
        name: "LEVERAGE_LIMIT",
        passed: false,
        detail: `Projected leverage ${projectedLeverage.toFixed(2)}x exceeds ${this.limits.maxLeverage}x ceiling`
      });
      passed = false;
    } else {
      checks.push({
        name: "LEVERAGE_LIMIT",
        passed: true,
        detail: `Projected leverage ${projectedLeverage.toFixed(2)}x within limits`
      });
    }

    const record = {
      evalId,
      timestamp,
      order: { symbol, side, qty, price, orderNotional },
      approved: passed,
      checks,
      riskScore: passed ? 0.15 : 0.88
    };

    this.riskEvaluations.unshift(record);
    if (this.riskEvaluations.length > this.maxHistory) this.riskEvaluations.pop();

    return record;
  }

  /**
   * Toggle Global Emergency Circuit Breaker.
   */
  setKillSwitch(active = true, reason = "MANUAL_RISK_OVERRIDE") {
    this.circuitBreakerActive = Boolean(active);
    return {
      killSwitchActive: this.circuitBreakerActive,
      reason,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Update Risk Limits.
   */
  updateLimits(newLimits = {}) {
    this.limits = { ...this.limits, ...newLimits };
    return { limits: this.limits, updatedAt: new Date().toISOString() };
  }

  /**
   * Telemetry status report.
   */
  getStatus() {
    return {
      circuitBreakerActive: this.circuitBreakerActive,
      limits: this.limits,
      currentPortfolioNav: this.currentPortfolioNav,
      currentMarginUsed: this.currentMarginUsed,
      dailyRealizedLoss: this.dailyRealizedLoss,
      marginUtilizationPct: ((this.currentMarginUsed / this.currentPortfolioNav) * 100).toFixed(2),
      totalEvaluationsCount: this.riskEvaluations.length,
      rejectedCount: this.riskEvaluations.filter(e => !e.approved).length,
      recentEvaluations: this.riskEvaluations.slice(0, 10)
    };
  }
}

export const institutionalRiskApiGateway = new InstitutionalRiskApiGateway();
