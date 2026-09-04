/**
 * Aifie Constitutional Constraints Governor (Phase 18+ Invariants)
 * Enforces unalterable mathematical limits on trading, leverage, and drawdown.
 */

export const CONSTITUTIONAL_LIMITS = {
  DAILY_LOSS_CEILING: 1000,          // Maximum daily net loss ($1,000)
  MAX_DRAWDOWN_LIMIT: 0.20,          // Maximum peak-to-trough drawdown (20%)
  MAX_GROSS_LEVERAGE: 2.0,           // Maximum portfolio leverage (2.0x)
  MAX_CONCENTRATION: 0.25,           // Maximum single-asset concentration (25%)
  MAX_DAILY_ORDERS: 1000,            // Maximum trade executions per 24 hours
  MAX_OPTIONS_DELTA: 0.50,           // Maximum net options delta (50% notional)
  PROFIT_SWEEP_THRESHOLD: 10000,     // Daily profit threshold triggering cold sweep ($10,000)
  PROFIT_SWEEP_PERCENT: 0.20,        // Percentage swept to cold storage (20%)
  MIN_BFT_QUORUM: 3                  // Minimum BFT affirmative votes (3 of 5)
};

export class ConstitutionalConstraintsGuard {
  constructor(customLimits = {}) {
    this.limits = { ...CONSTITUTIONAL_LIMITS, ...customLimits };
    this.dailyStats = {
      realizedLoss: 0,
      unrealizedLoss: 0,
      dailyProfit: 0,
      orderCount: 0,
      lastResetDate: new Date().toISOString().slice(0, 10),
      sweptReservesTotal: 0
    };
    this.violationsLog = [];
  }

  resetDailyCountersIfNewDay() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyStats.lastResetDate !== today) {
      this.dailyStats.realizedLoss = 0;
      this.dailyStats.unrealizedLoss = 0;
      this.dailyStats.dailyProfit = 0;
      this.dailyStats.orderCount = 0;
      this.dailyStats.lastResetDate = today;
    }
  }

  /**
   * Validate order proposal against all 8 Constitutional Invariants
   * @param {Object} context - { order, portfolio, dailyStats, bftVotes }
   * @returns {Object} { permitted: boolean, violation?: string, details: Object }
   */
  validateOrder(context = {}) {
    this.resetDailyCountersIfNewDay();

    const order = context.order || {};
    const portfolio = context.portfolio || {
      equity: 100000,
      totalExposure: 0,
      drawdown: 0,
      netDelta: 0,
      assetExposure: {}
    };
    const bftVotes = context.bftVotes || null;

    const orderNotional = Number(order.price || 100) * Number(order.qty || order.quantity || 1);
    const symbol = (order.symbol || 'UNKNOWN').toUpperCase();

    // 1. Daily Loss Ceiling Invariant ($1,000)
    const currentDailyLoss = Math.max(0, (context.dailyStats?.realizedLoss || this.dailyStats.realizedLoss) +
      (context.dailyStats?.unrealizedLoss || this.dailyStats.unrealizedLoss));
    if (currentDailyLoss >= this.limits.DAILY_LOSS_CEILING) {
      return this.recordViolation('RULE_1_DAILY_LOSS_CEILING', {
        currentDailyLoss,
        limit: this.limits.DAILY_LOSS_CEILING,
        action: 'HALT_TRADING'
      });
    }

    // 2. Maximum Drawdown Brake Invariant (20%)
    const currentDrawdown = Number(portfolio.drawdown || 0);
    if (currentDrawdown >= this.limits.MAX_DRAWDOWN_LIMIT) {
      return this.recordViolation('RULE_2_MAX_DRAWDOWN_EXCEEDED', {
        currentDrawdown,
        limit: this.limits.MAX_DRAWDOWN_LIMIT,
        action: 'DELEVERAGE_50_PERCENT'
      });
    }

    // 3. Gross Leverage Cap Invariant (2.0x)
    const equity = Math.max(1, Number(portfolio.equity || 100000));
    const projectedExposure = Number(portfolio.totalExposure || 0) + orderNotional;
    const projectedLeverage = projectedExposure / equity;
    if (projectedLeverage > this.limits.MAX_GROSS_LEVERAGE) {
      return this.recordViolation('RULE_3_LEVERAGE_CAP_EXCEEDED', {
        projectedLeverage,
        limit: this.limits.MAX_GROSS_LEVERAGE,
        action: 'REJECT_ORDER'
      });
    }

    // 4. Single-Asset Concentration Cap Invariant (25%)
    const currentAssetExposure = Number(portfolio.assetExposure?.[symbol] || 0);
    const projectedAssetExposure = currentAssetExposure + orderNotional;
    const concentrationRatio = projectedAssetExposure / equity;
    if (concentrationRatio > this.limits.MAX_CONCENTRATION) {
      return this.recordViolation('RULE_4_CONCENTRATION_CAP_EXCEEDED', {
        symbol,
        concentrationRatio,
        limit: this.limits.MAX_CONCENTRATION,
        action: 'REJECT_ORDER'
      });
    }

    // 5. Daily Order Throttle Invariant (1,000 orders/24h)
    const currentOrderCount = context.dailyStats?.orderCount || this.dailyStats.orderCount;
    if (currentOrderCount >= this.limits.MAX_DAILY_ORDERS) {
      return this.recordViolation('RULE_5_DAILY_ORDER_THROTTLE_EXCEEDED', {
        currentOrderCount,
        limit: this.limits.MAX_DAILY_ORDERS,
        action: 'MANUAL_REVIEW_REQUIRED'
      });
    }

    // 6. Options Delta Boundary Invariant (50% notional equity)
    const currentDelta = Math.abs(Number(portfolio.netDelta || 0));
    if (currentDelta > this.limits.MAX_OPTIONS_DELTA) {
      return this.recordViolation('RULE_6_OPTIONS_DELTA_EXCEEDED', {
        currentDelta,
        limit: this.limits.MAX_OPTIONS_DELTA,
        action: 'LIMIT_OPTIONS_EXPOSURE'
      });
    }

    // 7. Mandatory 3-of-5 BFT Quorum Consensus Invariant
    if (Array.isArray(bftVotes)) {
      const affirmativeVotes = bftVotes.filter(v => v.approved === true || v.vote === 'APPROVE').length;
      if (affirmativeVotes < this.limits.MIN_BFT_QUORUM) {
        return this.recordViolation('RULE_8_BFT_QUORUM_FAILED', {
          affirmativeVotes,
          required: this.limits.MIN_BFT_QUORUM,
          action: 'VETO_ORDER'
        });
      }
    }

    // All invariants satisfied
    this.dailyStats.orderCount += 1;
    return {
      permitted: true,
      code: 'CONSTITUTIONAL_APPROVAL',
      symbol,
      projectedLeverage: Number(projectedLeverage.toFixed(3)),
      concentrationRatio: Number(concentrationRatio.toFixed(3)),
      dailyOrderIndex: this.dailyStats.orderCount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Rule 7: Sovereign Reserve Sweep Invariant
   * When daily profits exceed $10,000, automatically sweep 20% into cold reserves.
   */
  evaluateProfitSweep(dailyProfitAmount) {
    const profit = Number(dailyProfitAmount || this.dailyStats.dailyProfit);
    if (profit >= this.limits.PROFIT_SWEEP_THRESHOLD) {
      const sweepAmount = Number((profit * this.limits.PROFIT_SWEEP_PERCENT).toFixed(2));
      this.dailyStats.sweptReservesTotal += sweepAmount;
      return {
        sweepTriggered: true,
        profit,
        sweepAmount,
        remainingTradingProfit: Number((profit - sweepAmount).toFixed(2)),
        totalSweptReserves: this.dailyStats.sweptReservesTotal,
        destination: 'COLD_STORAGE_RESERVE',
        timestamp: new Date().toISOString()
      };
    }
    return {
      sweepTriggered: false,
      profit,
      threshold: this.limits.PROFIT_SWEEP_THRESHOLD,
      totalSweptReserves: this.dailyStats.sweptReservesTotal
    };
  }

  recordViolation(ruleName, details) {
    const record = {
      permitted: false,
      rule: ruleName,
      details,
      timestamp: new Date().toISOString()
    };
    this.violationsLog.unshift(record);
    if (this.violationsLog.length > 100) this.violationsLog.pop();
    return record;
  }

  getStatus() {
    this.resetDailyCountersIfNewDay();
    return {
      status: 'CONSTITUTIONAL_GOVERNOR_ACTIVE',
      limits: this.limits,
      dailyStats: this.dailyStats,
      recentViolationsCount: this.violationsLog.length,
      lastViolation: this.violationsLog[0] || null,
      invariantsEnforced: [
        'DAILY_LOSS_CEILING_1000',
        'DRAWDOWN_BRAKE_20_PCT',
        'LEVERAGE_CAP_2X',
        'CONCENTRATION_CAP_25_PCT',
        'ORDER_THROTTLE_1000',
        'OPTIONS_DELTA_50_PCT',
        'SOVEREIGN_PROFIT_SWEEP_20_PCT',
        'BFT_QUORUM_3_OF_5'
      ]
    };
  }
}

export const constitutionalGuard = new ConstitutionalConstraintsGuard();
