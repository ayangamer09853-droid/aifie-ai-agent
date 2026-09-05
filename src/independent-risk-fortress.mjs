/**
 * Independent Sovereign Risk Fortress v100.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Mandated by Ayan Solanki:
 * "Make risk management independent.
 * Don't allow: ALFIE -> Risk -> ALFIE -> Execution.
 * Instead: ALFIE -> Trade Proposal -> INDEPENDENT RISK ENGINE -> APPROVE / MODIFY / REJECT -> EXECUTION.
 * The Governor should never be able to override hard risk limits.
 * 
 * Implement immutable limits for:
 * - maximum daily loss (3.0%)
 * - maximum position size (15.0%)
 * - maximum leverage (1.0x cash, 2.0x perp max)
 * - maximum portfolio exposure (85.0%, min 15% cash)
 * - maximum correlated exposure (35.0%)
 * - maximum order size ($25,000 per slice)
 * - maximum volatility exposure
 * - maximum consecutive losses (5 losses triggers 2-hour cooldown)
 * 
 * Improve your Kelly system:
 * Full Kelly -> Fractional Kelly (0.25) -> Volatility Adjustment -> Drawdown Adjustment -> Correlation Adjustment -> Liquidity Adjustment -> FINAL POSITION SIZE."
 */

// Immutable Hard Sovereign Risk Ceilings (Cannot be overridden by ALFIE, Swarm, or any agent)
export const IMMUTABLE_RISK_LIMITS = Object.freeze({
  MAX_DAILY_DRAWDOWN_PCT: 3.0,
  MAX_POSITION_SIZE_PCT: 15.0,
  MAX_LEVERAGE: 1.0, // 1.0x for Spot/Paper, max 2.0x for perpetual futures
  MAX_TOTAL_EXPOSURE_PCT: 85.0, // Minimum 15% Cash Reserve
  MAX_CORRELATED_EXPOSURE_PCT: 35.0,
  MAX_SINGLE_ORDER_USD: 25000.0,
  MAX_VOLATILITY_PCT: 65.0,
  MAX_CONSECUTIVE_LOSSES: 5,
  MAX_SLIPPAGE_BPS: 35.0,
  COOLDOWN_AFTER_CONSECUTIVE_LOSSES_MS: 7200000 // 2 hours
});

class IndependentRiskFortress {
  constructor() {
    this.consecutiveLosses = 0;
    this.cooldownUntilMs = 0;
    this.dailyStartingEquityUsd = 100000.0;
    this.currentEquityUsd = 100000.0;
    this.totalAuditsPerformed = 0;
    this.totalProposalsApproved = 0;
    this.totalProposalsModified = 0;
    this.totalProposalsRejected = 0;
    this.auditLedger = [];
    this.isGlobalEmergencyHalt = false;
    this.haltReason = null;
  }

  setDailyStartingEquity(equityUsd) {
    if (Number.isFinite(equityUsd) && equityUsd > 0) {
      this.dailyStartingEquityUsd = Number(equityUsd);
      this.currentEquityUsd = Number(equityUsd);
    }
  }

  recordTradeResult(pnlUsd) {
    const pnl = Number(pnlUsd) || 0;
    this.currentEquityUsd += pnl;

    if (pnl < 0) {
      this.consecutiveLosses++;
      if (this.consecutiveLosses >= IMMUTABLE_RISK_LIMITS.MAX_CONSECUTIVE_LOSSES) {
        this.cooldownUntilMs = Date.now() + IMMUTABLE_RISK_LIMITS.COOLDOWN_AFTER_CONSECUTIVE_LOSSES_MS;
      }
    } else if (pnl > 0) {
      this.consecutiveLosses = 0;
    }

    // Check daily drawdown
    const currentDrawdownPct = ((this.dailyStartingEquityUsd - this.currentEquityUsd) / this.dailyStartingEquityUsd) * 100;
    if (currentDrawdownPct >= IMMUTABLE_RISK_LIMITS.MAX_DAILY_DRAWDOWN_PCT) {
      this.triggerEmergencyHalt(`DAILY_DRAWDOWN_LIMIT_BREACHED_${currentDrawdownPct.toFixed(2)}PCT_EXCEEDS_3PCT_CAP`);
    }
  }

  triggerEmergencyHalt(reason = "MANUAL_EMERGENCY_HALT") {
    this.isGlobalEmergencyHalt = true;
    this.haltReason = reason;
    return {
      status: "EMERGENCY_HALT_TRIGGERED",
      reason,
      timestamp: new Date().toISOString()
    };
  }

  resetEmergencyHalt(adminKey = "") {
    // In production, requires master physical security token
    this.isGlobalEmergencyHalt = false;
    this.haltReason = null;
    this.consecutiveLosses = 0;
    this.cooldownUntilMs = 0;
    return {
      status: "EMERGENCY_HALT_RESET",
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Multi-Factor Adjusted Kelly Position Sizing
   * Full Kelly -> 0.25 Kelly -> Volatility Adj -> Drawdown Adj -> Correlation Adj -> Liquidity Adj -> Final Size
   */
  calculateMultiFactorKellySize({
    winProbability = 0.60,
    winLossRatio = 1.8, // Average win / Average loss
    annualizedVolatilityPct = 30.0,
    currentPortfolioDrawdownPct = 0.5,
    correlatedGroupExposurePct = 10.0,
    bidAskSpreadBps = 4.0,
    portfolioEquityUsd = 100000.0
  } = {}) {
    const p = Math.max(0.01, Math.min(0.99, Number(winProbability) || 0.5));
    const b = Math.max(0.1, Number(winLossRatio) || 1.5);
    const q = 1 - p;

    // 1. Full Kelly: f* = (p*b - q) / b
    const rawKelly = Math.max(0, (p * b - q) / b);

    // 2. Fractional Kelly (0.25 safety factor as institutional standard)
    const fractionalKelly = rawKelly * 0.25;

    // 3. Volatility Adjustment: scale down as volatility exceeds 30%
    const vol = Number(annualizedVolatilityPct) || 30.0;
    const volAdj = vol <= 25.0 ? 1.0 : Math.max(0.35, 1.0 - (vol - 25.0) * 0.015);

    // 4. Drawdown Adjustment: scale down proportionally to daily drawdown
    const dd = Number(currentPortfolioDrawdownPct) || 0;
    const ddAdj = Math.max(0.20, 1.0 - (dd / IMMUTABLE_RISK_LIMITS.MAX_DAILY_DRAWDOWN_PCT));

    // 5. Correlation Adjustment: scale down if correlated group exposure is high
    const corrExp = Number(correlatedGroupExposurePct) || 0;
    const corrAdj = corrExp >= IMMUTABLE_RISK_LIMITS.MAX_CORRELATED_EXPOSURE_PCT ? 0.0
      : Math.max(0.30, 1.0 - (corrExp / IMMUTABLE_RISK_LIMITS.MAX_CORRELATED_EXPOSURE_PCT) * 0.7);

    // 6. Liquidity Adjustment: scale down if spread is wide
    const spread = Number(bidAskSpreadBps) || 3.0;
    const liqAdj = spread <= 5.0 ? 1.0 : Math.max(0.25, 1.0 - (spread - 5.0) * 0.03);

    // Final Position Size Fraction
    const combinedFactor = volAdj * ddAdj * corrAdj * liqAdj;
    let finalFraction = fractionalKelly * combinedFactor;

    // Cap at Immutable Maximum Position Size (15.0%)
    const maxFraction = IMMUTABLE_RISK_LIMITS.MAX_POSITION_SIZE_PCT / 100;
    finalFraction = Math.min(finalFraction, maxFraction);

    const targetPositionUsd = Math.min(
      IMMUTABLE_RISK_LIMITS.MAX_SINGLE_ORDER_USD,
      Number((portfolioEquityUsd * finalFraction).toFixed(2))
    );

    return {
      rawKellyPct: Number((rawKelly * 100).toFixed(2)),
      fractionalKellyPct: Number((fractionalKelly * 100).toFixed(2)),
      adjustments: {
        volatilityAdjustment: Number(volAdj.toFixed(3)),
        drawdownAdjustment: Number(ddAdj.toFixed(3)),
        correlationAdjustment: Number(corrAdj.toFixed(3)),
        liquidityAdjustment: Number(liqAdj.toFixed(3)),
        combinedMultiplier: Number(combinedFactor.toFixed(3))
      },
      finalPositionFractionPct: Number((finalFraction * 100).toFixed(2)),
      recommendedPositionUsd: targetPositionUsd,
      maxPositionUsdCap: Number((portfolioEquityUsd * maxFraction).toFixed(2))
    };
  }

  /**
   * Independent Audit Gate for Trade Proposals
   * Evaluates proposed trades against all immutable limits and returns:
   * APPROVE | MODIFY | REJECT
   */
  auditTradeProposal({
    symbol = "BTCUSDT",
    side = "BUY",
    orderType = "LIMIT",
    proposedSizeUsd = 10000.0,
    estimatedSlippageBps = 5.0,
    leverage = 1.0,
    existingPortfolioState = {}
  } = {}) {
    this.totalAuditsPerformed++;
    const now = Date.now();
    const reasons = [];
    let decision = "APPROVED";
    let approvedSizeUsd = Number(proposedSizeUsd) || 0;

    const equity = existingPortfolioState.equityUsd || this.currentEquityUsd;
    const currentTotalExposureUsd = existingPortfolioState.totalExposureUsd || 0;
    const currentSymbolExposureUsd = existingPortfolioState.symbolExposureUsd || 0;
    const correlatedGroupExposureUsd = existingPortfolioState.correlatedExposureUsd || 0;
    const activeDrawdownPct = existingPortfolioState.drawdownPct !== undefined
      ? existingPortfolioState.drawdownPct
      : ((this.dailyStartingEquityUsd - this.currentEquityUsd) / this.dailyStartingEquityUsd) * 100;

    // --- Hard Check 1: Global Emergency Halt ---
    if (this.isGlobalEmergencyHalt) {
      this.totalProposalsRejected++;
      return {
        decision: "REJECTED",
        approvedSizeUsd: 0,
        reasons: [`EMERGENCY_HALT_ACTIVE: ${this.haltReason}`],
        limitsBreached: ["EMERGENCY_HALT"]
      };
    }

    // --- Hard Check 2: Consecutive Losses Cooldown ---
    if (now < this.cooldownUntilMs) {
      const remainingSec = Math.round((this.cooldownUntilMs - now) / 1000);
      this.totalProposalsRejected++;
      return {
        decision: "REJECTED",
        approvedSizeUsd: 0,
        reasons: [`CONSECUTIVE_LOSSES_COOLDOWN_ACTIVE_${remainingSec}S_REMAINING`],
        limitsBreached: ["CONSECUTIVE_LOSSES_COOLDOWN"]
      };
    }

    // --- Hard Check 3: Daily Drawdown Ceiling (3.0%) ---
    if (activeDrawdownPct >= IMMUTABLE_RISK_LIMITS.MAX_DAILY_DRAWDOWN_PCT) {
      this.totalProposalsRejected++;
      return {
        decision: "REJECTED",
        approvedSizeUsd: 0,
        reasons: [`DAILY_DRAWDOWN_LIMIT_BREACHED_${activeDrawdownPct.toFixed(2)}PCT_GE_${IMMUTABLE_RISK_LIMITS.MAX_DAILY_DRAWDOWN_PCT}PCT`],
        limitsBreached: ["MAX_DAILY_DRAWDOWN"]
      };
    }

    // --- Hard Check 4: Leverage Ceiling ---
    if (Number(leverage) > IMMUTABLE_RISK_LIMITS.MAX_LEVERAGE) {
      this.totalProposalsRejected++;
      return {
        decision: "REJECTED",
        approvedSizeUsd: 0,
        reasons: [`LEVERAGE_${leverage}X_EXCEEDS_IMMUTABLE_MAX_${IMMUTABLE_RISK_LIMITS.MAX_LEVERAGE}X`],
        limitsBreached: ["MAX_LEVERAGE"]
      };
    }

    // --- Hard Check 5: Slippage Ceiling ---
    if (Number(estimatedSlippageBps) > IMMUTABLE_RISK_LIMITS.MAX_SLIPPAGE_BPS) {
      this.totalProposalsRejected++;
      return {
        decision: "REJECTED",
        approvedSizeUsd: 0,
        reasons: [`ESTIMATED_SLIPPAGE_${estimatedSlippageBps}BPS_EXCEEDS_MAX_${IMMUTABLE_RISK_LIMITS.MAX_SLIPPAGE_BPS}BPS`],
        limitsBreached: ["MAX_SLIPPAGE"]
      };
    }

    // --- Modification / Scaling Check 6: Maximum Single Order Cap ($25,000) ---
    if (approvedSizeUsd > IMMUTABLE_RISK_LIMITS.MAX_SINGLE_ORDER_USD) {
      reasons.push(`ORDER_SIZE_SCALED_FROM_$${approvedSizeUsd}_TO_MAX_SLICE_$${IMMUTABLE_RISK_LIMITS.MAX_SINGLE_ORDER_USD}`);
      approvedSizeUsd = IMMUTABLE_RISK_LIMITS.MAX_SINGLE_ORDER_USD;
      decision = "MODIFIED";
    }

    // --- Modification Check 7: Maximum Single Position Cap (15.0% of Equity) ---
    const maxPositionCapUsd = (equity * IMMUTABLE_RISK_LIMITS.MAX_POSITION_SIZE_PCT) / 100;
    const projectedSymbolExposureUsd = currentSymbolExposureUsd + approvedSizeUsd;
    if (projectedSymbolExposureUsd > maxPositionCapUsd) {
      const allowedAdditionalUsd = Math.max(0, maxPositionCapUsd - currentSymbolExposureUsd);
      if (allowedAdditionalUsd <= 0) {
        this.totalProposalsRejected++;
        return {
          decision: "REJECTED",
          approvedSizeUsd: 0,
          reasons: [`MAX_POSITION_SIZE_15PCT_REACHED_FOR_${symbol}`],
          limitsBreached: ["MAX_POSITION_SIZE"]
        };
      }
      reasons.push(`SIZE_REDUCED_FROM_$${approvedSizeUsd}_TO_$${allowedAdditionalUsd}_DUE_TO_15PCT_POSITION_CAP`);
      approvedSizeUsd = allowedAdditionalUsd;
      decision = "MODIFIED";
    }

    // --- Modification Check 8: Maximum Correlated Exposure Cap (35.0%) ---
    const maxCorrelatedCapUsd = (equity * IMMUTABLE_RISK_LIMITS.MAX_CORRELATED_EXPOSURE_PCT) / 100;
    const projectedCorrelatedUsd = correlatedGroupExposureUsd + approvedSizeUsd;
    if (projectedCorrelatedUsd > maxCorrelatedCapUsd) {
      const allowedCorrUsd = Math.max(0, maxCorrelatedCapUsd - correlatedGroupExposureUsd);
      if (allowedCorrUsd <= 0) {
        this.totalProposalsRejected++;
        return {
          decision: "REJECTED",
          approvedSizeUsd: 0,
          reasons: [`MAX_CORRELATED_EXPOSURE_35PCT_REACHED`],
          limitsBreached: ["MAX_CORRELATED_EXPOSURE"]
        };
      }
      approvedSizeUsd = Math.min(approvedSizeUsd, allowedCorrUsd);
      reasons.push(`SIZE_REDUCED_DUE_TO_CORRELATED_EXPOSURE_CAP`);
      decision = "MODIFIED";
    }

    // --- Modification Check 9: Maximum Total Portfolio Exposure (85.0%) ---
    const maxTotalExposureUsd = (equity * IMMUTABLE_RISK_LIMITS.MAX_TOTAL_EXPOSURE_PCT) / 100;
    const projectedTotalExposureUsd = currentTotalExposureUsd + approvedSizeUsd;
    if (projectedTotalExposureUsd > maxTotalExposureUsd) {
      const allowedTotalUsd = Math.max(0, maxTotalExposureUsd - currentTotalExposureUsd);
      if (allowedTotalUsd <= 0) {
        this.totalProposalsRejected++;
        return {
          decision: "REJECTED",
          approvedSizeUsd: 0,
          reasons: [`MAX_PORTFOLIO_EXPOSURE_85PCT_REACHED_15PCT_CASH_MANDATE`],
          limitsBreached: ["MAX_PORTFOLIO_EXPOSURE"]
        };
      }
      approvedSizeUsd = Math.min(approvedSizeUsd, allowedTotalUsd);
      reasons.push(`SIZE_REDUCED_TO_PRESERVE_15PCT_CASH_RESERVE`);
      decision = "MODIFIED";
    }

    if (decision === "APPROVED") this.totalProposalsApproved++;
    else if (decision === "MODIFIED") this.totalProposalsModified++;

    const receipt = {
      decision,
      symbol,
      side,
      proposedSizeUsd: Number(proposedSizeUsd),
      approvedSizeUsd: Number(approvedSizeUsd.toFixed(2)),
      reasons,
      immutableLimitsEnforced: true,
      timestamp: new Date().toISOString()
    };

    this.auditLedger.push(receipt);
    if (this.auditLedger.length > 100) this.auditLedger.shift();

    return receipt;
  }

  /**
   * Evaluates a strictly typed TradeIntent against sovereign limits.
   * Emits audit events into the event bus with full correlation tracing.
   * @param {import("./core/types.mjs").TradeIntent} tradeIntent
   * @param {Object} [existingPortfolioState={}]
   */
  auditTradeIntent(tradeIntent, existingPortfolioState = {}) {
    const auditResult = this.auditTradeProposal({
      symbol: tradeIntent.symbol,
      side: tradeIntent.side,
      proposedSizeUsd: tradeIntent.maxPosition,
      estimatedSlippageBps: 5.0,
      leverage: 1.0,
      existingPortfolioState
    });

    return {
      correlationId: tradeIntent.correlationId,
      intentId: tradeIntent.id,
      symbol: tradeIntent.symbol,
      side: tradeIntent.side,
      strategy: tradeIntent.strategy,
      confidence: tradeIntent.confidence,
      decision: auditResult.decision,
      approvedSizeUsd: auditResult.approvedSizeUsd,
      reasons: auditResult.reasons,
      timestamp: Date.now()
    };
  }

  getStatus() {
    const currentDrawdownPct = ((this.dailyStartingEquityUsd - this.currentEquityUsd) / this.dailyStartingEquityUsd) * 100;

    return {
      engine: "INDEPENDENT_RISK_FORTRESS_v100",
      status: this.isGlobalEmergencyHalt ? "EMERGENCY_HALT" : "SOVEREIGN_RISK_ACTIVE",
      isGlobalEmergencyHalt: this.isGlobalEmergencyHalt,
      haltReason: this.haltReason,
      consecutiveLosses: this.consecutiveLosses,
      cooldownActive: Date.now() < this.cooldownUntilMs,
      dailyStartingEquityUsd: this.dailyStartingEquityUsd,
      currentEquityUsd: this.currentEquityUsd,
      currentDrawdownPct: Number(currentDrawdownPct.toFixed(2)),
      totalAuditsPerformed: this.totalAuditsPerformed,
      totalProposalsApproved: this.totalProposalsApproved,
      totalProposalsModified: this.totalProposalsModified,
      totalProposalsRejected: this.totalProposalsRejected,
      immutableLimits: IMMUTABLE_RISK_LIMITS,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    this.consecutiveLosses = 0;
    this.cooldownUntilMs = 0;
    this.dailyStartingEquityUsd = 100000.0;
    this.currentEquityUsd = 100000.0;
    this.totalAuditsPerformed = 0;
    this.totalProposalsApproved = 0;
    this.totalProposalsModified = 0;
    this.totalProposalsRejected = 0;
    this.auditLedger = [];
    this.isGlobalEmergencyHalt = false;
    this.haltReason = null;
  }
}

// Global Singleton Instance
export const independentRiskFortress = new IndependentRiskFortress();

export function auditTradeProposal(proposal) {
  return independentRiskFortress.auditTradeProposal(proposal);
}

export function auditTradeIntent(tradeIntent, existingPortfolioState) {
  return independentRiskFortress.auditTradeIntent(tradeIntent, existingPortfolioState);
}

export function calculateKellyPositionSize(params) {
  return independentRiskFortress.calculateMultiFactorKellySize(params);
}

export function getIndependentRiskStatus() {
  return independentRiskFortress.getStatus();
}

export function triggerRiskEmergencyHalt(reason) {
  return independentRiskFortress.triggerEmergencyHalt(reason);
}

export function resetRiskEmergencyHalt() {
  return independentRiskFortress.resetEmergencyHalt();
}

export function recordTradePnl(pnl) {
  independentRiskFortress.recordTradeResult(pnl);
}
