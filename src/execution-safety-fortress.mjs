/**
 * Execution Safety Fortress & Pre-Trade Risk Gateway v2.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Institutional Risk Caps & Circuit Breakers:
 * 1. Hard maximum notional per order ($50,000 max)
 * 2. Maximum single-asset concentration cap (25% of total equity)
 * 3. Buying power sufficiency gate
 * 4. Maximum intra-day drawdown circuit breaker (3.0% hard halt)
 * 5. Fail-closed live execution gatekeeper
 */

let emergencyHaltActive = false;
let emergencyHaltReason = null;
let maxNotionalPerOrderUSD = 50000;
let maxConcentrationPercent = 25.0;
let maxDrawdownLimitPercent = 3.0;

export function getSafetyFortressStatus() {
  const isLiveEnabled = process.env.LIVE_TRADING_ENABLED === "true";
  return {
    status: "SAFETY_FORTRESS_ONLINE",
    emergencyHaltActive,
    emergencyHaltReason,
    isLiveEnabled,
    limits: {
      maxNotionalPerOrderUSD,
      maxConcentrationPercent,
      maxDrawdownLimitPercent
    },
    timestamp: new Date().toISOString()
  };
}

export function triggerEmergencyKillSwitch(reason = "MANUAL_CIRCUIT_BREAKER_TRIP") {
  emergencyHaltActive = true;
  emergencyHaltReason = reason;
  return getSafetyFortressStatus();
}

export function resetSafetyFortress() {
  emergencyHaltActive = false;
  emergencyHaltReason = null;
  return getSafetyFortressStatus();
}

/**
 * Validates pre-trade risk before order routing
 */
export function validatePreTradeRisk(order = {}, account = {}) {
  if (emergencyHaltActive) {
    return {
      approved: false,
      reason: `EMERGENCY_HALT_ACTIVE: ${emergencyHaltReason}`
    };
  }

  const quantity = Number(order.quantity || order.qty);
  const price = Number(order.price || order.limitPrice || 100);
  const side = String(order.side || "buy").toLowerCase();

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { approved: false, reason: "INVALID_QUANTITY_NON_POSITIVE", quantity };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { approved: false, reason: "INVALID_PRICE_NON_POSITIVE", price };
  }

  const orderNotional = quantity * price;

  // 1. Notional Limit Check
  if (orderNotional > maxNotionalPerOrderUSD) {
    return {
      approved: false,
      reason: "MAX_NOTIONAL_EXCEEDED",
      orderNotional: Number(orderNotional.toFixed(2)),
      maxAllowed: maxNotionalPerOrderUSD
    };
  }

  const cash = Number(account.cash ?? 100000);
  const totalEquity = Number(account.equity ?? account.totalValue ?? 100000);

  // 2. Buying power check for BUY orders
  if (side === "buy" && orderNotional > cash) {
    return {
      approved: false,
      reason: "INSUFFICIENT_BUYING_POWER",
      requiredCash: Number(orderNotional.toFixed(2)),
      availableCash: Number(cash.toFixed(2))
    };
  }

  // 3. Concentration cap (Max single asset % of total equity)
  if (totalEquity > 0) {
    const concentrationPercent = (orderNotional / totalEquity) * 100;
    if (concentrationPercent > maxConcentrationPercent) {
      return {
        approved: false,
        reason: "PORTFOLIO_CONCENTRATION_EXCEEDED",
        concentrationPercent: Number(concentrationPercent.toFixed(2)),
        maxAllowedPercent: maxConcentrationPercent
      };
    }
  }

  return {
    approved: true,
    orderNotional: Number(orderNotional.toFixed(2)),
    symbol: order.symbol,
    side,
    quantity
  };
}

/**
 * Checks if portfolio drawdown breaches the constitutional cap
 */
export function checkDrawdownBreach(currentEquity = 100000, peakEquity = 100000, maxDrawdownPercent = 3.0) {
  if (peakEquity <= 0) return { isBreached: false, drawdownPercent: 0 };

  const drawdownUSD = peakEquity - currentEquity;
  const drawdownPercent = Number(((drawdownUSD / peakEquity) * 100).toFixed(2));
  const isBreached = drawdownPercent >= maxDrawdownPercent;

  if (isBreached) {
    triggerEmergencyKillSwitch(`PORTFOLIO_DRAWDOWN_BREACH: Drawdown of ${drawdownPercent}% exceeds limit of ${maxDrawdownPercent}%`);
  }

  return {
    isBreached,
    drawdownUSD: Number(drawdownUSD.toFixed(2)),
    drawdownPercent,
    limitPercent: maxDrawdownPercent,
    action: isBreached ? "CIRCUIT_BREAKER_TRIPPED_TRADING_LOCKED" : "RISK_WITHIN_BOUNDS"
  };
}

/**
 * Asserts live trading authority. Fails closed if unauthorized.
 */
export function assertExecutionAuthority(mode = "paper", userConfirmed = false) {
  if (mode === "live") {
    const isEnvLive = process.env.LIVE_TRADING_ENABLED === "true";
    if (!isEnvLive) {
      throw new Error("SECURITY_GATE: Live execution disabled. Set LIVE_TRADING_ENABLED=true in server .env");
    }
    if (!userConfirmed) {
      throw new Error("SECURITY_GATE: Live execution requires explicit user confirmation parameter (confirm=true)");
    }
  }
  return { authorized: true, mode };
}
