// src/risk/risk-engine.mjs
// Central Institutional Risk Engine for Aifie Autonomous Trading Platform.
// Orchestrates pre-trade gate, position limits, portfolio exposure, correlation risk,
// drawdown control, circuit breakers, and emergency kill switches.
// STRICTLY CANNOT BE BYPASSED BY AI AGENTS OR STRATEGY ROUTINES.

import { killSwitch } from "./kill-switch.mjs";
import { preTradeGate } from "./pre-trade-gate.mjs";
import { positionLimits } from "./position-limits.mjs";
import { exposureManager } from "./exposure-manager.mjs";
import { correlationRiskManager } from "./correlation-risk.mjs";
import { drawdownController } from "./drawdown-controller.mjs";
import { circuitBreaker } from "./circuit-breaker.mjs";
import { postTradeMonitor } from "./post-trade-monitor.mjs";

export class RiskEngine {
  constructor(options = {}) {
    this.killSwitch = options.killSwitch || killSwitch;
    this.preTradeGate = options.preTradeGate || preTradeGate;
    this.positionLimits = options.positionLimits || positionLimits;
    this.exposureManager = options.exposureManager || exposureManager;
    this.correlationRisk = options.correlationRisk || correlationRiskManager;
    this.drawdownController = options.drawdownController || drawdownController;
    this.circuitBreaker = options.circuitBreaker || circuitBreaker;
    this.postTradeMonitor = options.postTradeMonitor || postTradeMonitor;

    this.rejectionLog = [];
  }

  /**
   * Primary unbypassable risk validation method for every order.
   * Order flow pipeline:
   * AI Decision -> Signal Validation -> Portfolio Validation -> RISK ENGINE -> Execution
   *
   * @param {Object} params
   * @param {string} params.symbol
   * @param {string} params.side - "BUY" | "SELL"
   * @param {number} params.quantity
   * @param {number} params.price
   * @param {Object} params.portfolio - { totalNav, cash, positions }
   * @param {Object} [params.market] - { bid, ask, last, referencePrice, volatilityZScore }
   * @param {number} [params.quoteTimestamp]
   * @returns {Promise<{ approved: boolean, reason?: string, stage?: string, details?: Object }>}
   */
  async validate(params) {
    const { symbol, side, quantity, price, portfolio, market, quoteTimestamp } = params || {};

    // STAGE 1: Emergency Kill Switch check
    if (!this.killSwitch.isSafe()) {
      return this._reject("KILL_SWITCH_ACTIVE", `Trading is halted: ${this.killSwitch.tripReason}`);
    }

    // STAGE 2: Market Circuit Breakers check
    const circuitCheck = this.circuitBreaker.validateMarketConditions({ symbol, price, market });
    if (!circuitCheck.approved) {
      return this._reject("CIRCUIT_BREAKER_TRIGGERED", circuitCheck.reason, circuitCheck);
    }

    // STAGE 3: Pre-Trade Ticket & Fat-Finger validation
    const preTradeCheck = this.preTradeGate.validateOrder({
      symbol,
      side,
      quantity,
      price,
      quoteTimestamp
    });
    if (!preTradeCheck.approved) {
      return this._reject("PRE_TRADE_VIOLATION", preTradeCheck.reason, preTradeCheck);
    }

    // STAGE 4: Portfolio Drawdown & Daily Loss Check
    const drawdownCheck = this.drawdownController.validateDrawdown({ symbol, side, portfolio });
    if (!drawdownCheck.approved) {
      return this._reject("DRAWDOWN_BREACH", drawdownCheck.reason, drawdownCheck);
    }

    // STAGE 5: Position Limits & Single Asset Concentration Check
    const positionCheck = this.positionLimits.validatePositionLimit({
      symbol,
      side,
      quantity,
      price,
      portfolio
    });
    if (!positionCheck.approved) {
      return this._reject("POSITION_LIMIT_BREACH", positionCheck.reason, positionCheck);
    }

    // STAGE 6: Portfolio Leverage & Sector Exposure Check
    const exposureCheck = this.exposureManager.validateExposure({
      symbol,
      side,
      quantity,
      price,
      portfolio
    });
    if (!exposureCheck.approved) {
      return this._reject("EXPOSURE_BREACH", exposureCheck.reason, exposureCheck);
    }

    // STAGE 7: Cross-Asset Correlation Concentration Check
    const correlationCheck = this.correlationRisk.validateCorrelationRisk({
      symbol,
      side,
      quantity,
      price,
      portfolio
    });
    if (!correlationCheck.approved) {
      return this._reject("CORRELATION_CLUSTER_BREACH", correlationCheck.reason, correlationCheck);
    }

    // All 7 independent risk checkpoints passed
    return {
      approved: true,
      timestamp: Date.now(),
      metrics: {
        orderNotional: quantity * price,
        projectedGrossLeverage: exposureCheck.projectedGrossLeverage,
        sector: exposureCheck.sector,
        drawdownPct: drawdownCheck.currentDrawdownPct
      }
    };
  }

  _reject(stage, reason, details = {}) {
    const rejection = {
      approved: false,
      stage,
      reason,
      details,
      timestamp: Date.now()
    };
    this.rejectionLog.push(rejection);
    return rejection;
  }

  getRiskState() {
    return {
      killSwitch: this.killSwitch.getStatus(),
      drawdown: this.drawdownController.getStatus(),
      activeHalts: this.circuitBreaker.getActiveHalts(),
      executionMetrics: this.postTradeMonitor.getExecutionMetrics(),
      rejectionsLogged: this.rejectionLog.length,
      latestRejections: this.rejectionLog.slice(-5)
    };
  }
}

export const riskEngine = new RiskEngine();
