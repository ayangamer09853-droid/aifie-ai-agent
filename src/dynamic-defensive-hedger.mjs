/**
 * Dynamic Defensive Hedger & Deleveraging Engine - Phase 4 Institutional Fortress
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Features:
 * 1. calculateBlackScholesPut - Analytical Black-Scholes-Merton European Put pricing & Greeks (Delta, Gamma, Vega)
 * 2. determineDrawdownDefenseTier - 4-tier progressive drawdown defense escalation (Normal -> Caution -> High Alert -> Circuit Breaker)
 * 3. generateDefensiveHedgePlan - Actionable hedging plan with protective put options, inverse ETFs, and cash reserve buffers
 * 4. getDefensiveHedgerStatus - Diagnostic telemetry
 */

/**
 * Standard Normal Cumulative Distribution Function N(x) using Abramowitz & Stegun (7.1.26)
 */
export function normalCDF(x) {
  const b1 =  0.319381530;
  const b2 = -0.356563782;
  const b3 =  1.781477937;
  const b4 = -1.821255978;
  const b5 =  1.330274429;
  const p  =  0.2316419;
  const c  =  0.3989422804014327; // 1 / sqrt(2 * PI)

  if (x >= 0) {
    const t = 1.0 / (1.0 + p * x);
    return 1.0 - c * Math.exp(-x * x / 2.0) * t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  } else {
    const t = 1.0 / (1.0 - p * x);
    return c * Math.exp(-x * x / 2.0) * t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  }
}

/**
 * Standard Normal Probability Density Function N'(x)
 */
export function normalPDF(x) {
  return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Black-Scholes-Merton European Put Option Pricing & Analytical Greeks
 */
export function calculateBlackScholesPut({
  spot = 100,
  strike = 95,
  timeYears = 30 / 365, // 30 days
  riskFreeRate = 0.045,
  volatility = 0.25
} = {}) {
  const S = Math.max(0.01, spot);
  const K = Math.max(0.01, strike);
  const T = Math.max(1e-4, timeYears);
  const r = riskFreeRate;
  const sigma = Math.max(0.01, volatility);

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const N_neg_d1 = normalCDF(-d1);
  const N_neg_d2 = normalCDF(-d2);
  const discountFactor = Math.exp(-r * T);

  // Put Price = K * e^(-rT) * N(-d2) - S * N(-d1)
  const putPrice = K * discountFactor * N_neg_d2 - S * N_neg_d1;

  // Greeks
  const delta = Nd1 - 1.0; // Negative for puts
  const gamma = normalPDF(d1) / (S * sigma * sqrtT);
  const vega = (S * sqrtT * normalPDF(d1)) / 100.0; // 1% vol change

  return {
    spot: S,
    strike: K,
    timeYears: Number(T.toFixed(4)),
    volatility: Number(sigma.toFixed(4)),
    putPrice: Number(Math.max(0, putPrice).toFixed(2)),
    greeks: {
      delta: Number(delta.toFixed(4)),
      gamma: Number(gamma.toFixed(6)),
      vega: Number(vega.toFixed(4))
    },
    moneyness: Number((K / S).toFixed(4)),
    intrinsicValue: Number(Math.max(0, K - S).toFixed(2)),
    timeValue: Number(Math.max(0, putPrice - Math.max(0, K - S)).toFixed(2))
  };
}

/**
 * Determines Drawdown Defense Tier based on current daily drawdown
 */
export function determineDrawdownDefenseTier(dailyDrawdownPercent = 0.0, maxAllowedDrawdown = 3.0) {
  const dd = Math.max(0, dailyDrawdownPercent);
  const maxDD = Math.max(1.0, maxAllowedDrawdown);

  const cautionThreshold = maxDD * 0.50; // e.g. 1.5%
  const alertThreshold = maxDD * 0.833; // e.g. 2.5%
  const breachThreshold = maxDD;        // e.g. 3.0%

  if (dd >= breachThreshold) {
    return {
      tier: 4,
      level: "CIRCUIT_BREAKER_PRESERVATION",
      action: "EMERGENCY_HALT_LIQUIDATE_HIGH_BETA",
      targetHedgeRatio: 1.0,
      newOrderPermitted: false,
      positionSizeThrottle: 0.0,
      description: `Daily drawdown (${dd.toFixed(2)}%) reached or exceeded maximum limit (${maxDD.toFixed(2)}%). All trading halted and capital frozen in risk-free preservation.`
    };
  } else if (dd >= alertThreshold) {
    return {
      tier: 3,
      level: "HIGH_ALERT_FREEZE",
      action: "FREEZE_NEW_BUYS_DEPLOY_50PCT_HEDGE",
      targetHedgeRatio: 0.50,
      newOrderPermitted: false,
      positionSizeThrottle: 0.0,
      description: `Daily drawdown (${dd.toFixed(2)}%) in critical threshold zone (${alertThreshold.toFixed(2)}% - ${breachThreshold.toFixed(2)}%). New buys frozen, defensive hedge deployed.`
    };
  } else if (dd >= cautionThreshold) {
    return {
      tier: 2,
      level: "CAUTION_DELEVERAGING",
      action: "DEPLOY_25PCT_HEDGE_THROTTLE_SIZING",
      targetHedgeRatio: 0.25,
      newOrderPermitted: true,
      positionSizeThrottle: 0.50,
      description: `Daily drawdown (${dd.toFixed(2)}%) entered caution threshold (${cautionThreshold.toFixed(2)}%). Position sizing halved, partial hedge activated.`
    };
  }

  return {
    tier: 1,
    level: "NORMAL_OPERATION",
    action: "STANDARD_TRADING_ACTIVE",
    targetHedgeRatio: 0.0,
    newOrderPermitted: true,
    positionSizeThrottle: 1.0,
    description: `Daily drawdown (${dd.toFixed(2)}%) within safe operating bounds (< ${cautionThreshold.toFixed(2)}%).`
  };
}

/**
 * Generates an actionable dynamic defensive hedging plan
 */
export function generateDefensiveHedgePlan({
  portfolioValue = 100000,
  positions = [],
  currentVix = 18.0,
  dailyDrawdownPercent = 0.5,
  maxAllowedDrawdownPercent = 3.0
} = {}) {
  const defenseTier = determineDrawdownDefenseTier(dailyDrawdownPercent, maxAllowedDrawdownPercent);
  const isVixSpike = currentVix >= 25.0;

  // Effective hedge ratio blends drawdown defense with VIX macro volatility
  let effectiveHedgeRatio = defenseTier.targetHedgeRatio;
  if (isVixSpike && effectiveHedgeRatio < 0.25) {
    effectiveHedgeRatio = Math.min(0.50, ((currentVix - 20) / 20) * 0.35);
  }

  const hedgeNotionalUSD = portfolioValue * effectiveHedgeRatio;

  // Options protective collar pricing (5% OTM 30-day put)
  const indexProxySpot = 500.0; // S&P 500 ETF proxy price
  const strike = indexProxySpot * 0.95;
  const impliedVol = Math.max(0.15, currentVix / 100.0);
  const putOption = calculateBlackScholesPut({
    spot: indexProxySpot,
    strike,
    timeYears: 30 / 365,
    riskFreeRate: 0.045,
    volatility: impliedVol
  });

  const contractsNeeded = hedgeNotionalUSD > 0
    ? Math.max(1, Math.round(hedgeNotionalUSD / (indexProxySpot * 100)))
    : 0;

  const totalPremiumCostUSD = contractsNeeded * (putOption.putPrice * 100);

  return {
    success: true,
    engine: "DYNAMIC_DEFENSIVE_HEDGER",
    portfolioValue,
    currentVix,
    dailyDrawdownPercent,
    defenseTier,
    hedgeRecommended: effectiveHedgeRatio > 0,
    effectiveHedgeRatio: Number(effectiveHedgeRatio.toFixed(3)),
    hedgeNotionalUSD: Number(hedgeNotionalUSD.toFixed(2)),
    protectivePutSpecification: {
      underlyingProxy: "SPY_US_EQUITIES",
      spotPrice: indexProxySpot,
      strikePrice: strike,
      expiryDays: 30,
      impliedVolatility: Number((impliedVol * 100).toFixed(1)),
      unitPutPrice: putOption.putPrice,
      contractsRecommended: contractsNeeded,
      estimatedPremiumUSD: Number(totalPremiumCostUSD.toFixed(2)),
      putDelta: putOption.greeks.delta
    },
    alternativeHedges: [
      {
        instrument: "INVERSE_INDEX_ETF",
        ticker: "SH",
        allocationUSD: Number(hedgeNotionalUSD.toFixed(2)),
        mechanism: "-1x S&P 500 Daily Inverse Protection"
      },
      {
        instrument: "TREASURY_CASH_SWEEP",
        ticker: "USDC_OR_TBILLS",
        allocationUSD: Number((portfolioValue * Math.max(0.10, effectiveHedgeRatio)).toFixed(2)),
        yieldApyPercent: 5.2
      }
    ],
    timestamp: new Date().toISOString()
  };
}

/**
 * Diagnostic Telemetry
 */
export function getDefensiveHedgerStatus() {
  return {
    module: "dynamic-defensive-hedger",
    status: "ACTIVE",
    pricingEngine: "BLACK_SCHOLES_MERTON_ANALYTIC",
    drawdownDefenseTiers: 4,
    circuitBreakerMaxDrawdown: "3.0%",
    inverseEtfSupport: true
  };
}
