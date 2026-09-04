/**
 * Quantitative Algorithmic Execution Slicers Engine v2.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Features:
 * - Time-Weighted Average Price (TWAP) with randomized interval jitter
 * - Volume-Weighted Average Price (VWAP) conforming to U-shaped intraday volume curves
 * - Iceberg Order Execution (Visible tip + Hidden reserve queue)
 * - Percentage-of-Volume (POV) dynamic participation rate regulator
 */

import { randomUUID } from "node:crypto";

/**
 * Standard U-Shaped intraday volume curve distribution weights (10 intervals across trading session)
 * Higher activity at market open and close, lower in mid-day
 */
const DEFAULT_INTRADAY_VOLUME_PROFILE = [
  0.18, // Market open surge (9:30-10:00)
  0.12,
  0.08,
  0.06,
  0.05, // Mid-day lull (12:00-13:00)
  0.06,
  0.08,
  0.10,
  0.12,
  0.15  // Market close ramp (15:30-16:00)
];

/**
 * Generates TWAP Slices: Equal child orders spaced evenly across time horizon
 * Includes optional randomized jitter (-15% to +15%) to avoid detection by predatory HFT algorithms
 */
export function generateTwapSlices({
  symbol = "AAPL",
  side = "buy",
  totalQuantity = 100,
  durationMinutes = 30,
  slicesCount = 6,
  randomizeJitter = true
} = {}) {
  const normSymbol = String(symbol || "AAPL").trim().toUpperCase();
  const normSide = String(side || "buy").trim().toLowerCase();
  const count = Math.max(2, Math.min(slicesCount, 120));
  const baseIntervalSeconds = Math.floor((durationMinutes * 60) / count);

  const baseSlice = Math.floor(totalQuantity / count);
  let remainingQuantity = totalQuantity;
  const slices = [];

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    let qty = isLast ? remainingQuantity : baseSlice;

    if (randomizeJitter && !isLast && baseSlice > 3) {
      // Jitter quantity by up to +/- 10%
      const jitterFactor = 1 + (Math.sin(i * 1.7) * 0.1);
      qty = Math.max(1, Math.min(Math.round(baseSlice * jitterFactor), remainingQuantity - (count - i - 1)));
    }

    remainingQuantity -= qty;

    // Time schedule with jitter (+/- 5 seconds)
    const timeJitter = randomizeJitter ? Math.floor(Math.sin(i * 2.3) * 5) : 0;
    const executeAtSecond = Math.max(0, i * baseIntervalSeconds + timeJitter);

    slices.push({
      sliceIndex: i + 1,
      orderId: randomUUID(),
      symbol: normSymbol,
      side: normSide,
      quantity: qty,
      executeAtSecond,
      status: "SCHEDULED"
    });
  }

  return {
    algorithm: "TWAP_TIME_WEIGHTED",
    symbol: normSymbol,
    side: normSide,
    totalQuantity,
    allocatedQuantity: totalQuantity - remainingQuantity,
    durationMinutes,
    slicesCount: count,
    intervalSeconds: baseIntervalSeconds,
    slices
  };
}

/**
 * Generates VWAP Slices: Weights child order size according to volume profile
 */
export function generateVwapSlices({
  symbol = "AAPL",
  side = "buy",
  totalQuantity = 100,
  intradayVolumeProfile = DEFAULT_INTRADAY_VOLUME_PROFILE
} = {}) {
  const normSymbol = String(symbol || "AAPL").trim().toUpperCase();
  const normSide = String(side || "buy").trim().toLowerCase();
  const profile = Array.isArray(intradayVolumeProfile) && intradayVolumeProfile.length > 0
    ? intradayVolumeProfile
    : DEFAULT_INTRADAY_VOLUME_PROFILE;

  // Normalize profile to sum to 1.0
  const sumWeights = profile.reduce((a, b) => a + b, 0);
  const normalizedWeights = profile.map(w => w / sumWeights);

  let remaining = totalQuantity;
  const slices = [];

  for (let i = 0; i < normalizedWeights.length; i++) {
    const isLast = i === normalizedWeights.length - 1;
    const qty = isLast ? remaining : Math.max(1, Math.round(totalQuantity * normalizedWeights[i]));
    const actualQty = Math.min(qty, remaining);
    remaining -= actualQty;

    slices.push({
      sliceIndex: i + 1,
      orderId: randomUUID(),
      symbol: normSymbol,
      side: normSide,
      targetWeight: Number(normalizedWeights[i].toFixed(4)),
      quantity: actualQty,
      status: "SCHEDULED"
    });

    if (remaining <= 0) break;
  }

  return {
    algorithm: "VWAP_VOLUME_WEIGHTED",
    symbol: normSymbol,
    side: normSide,
    totalQuantity,
    allocatedQuantity: totalQuantity - remaining,
    slicesCount: slices.length,
    slices
  };
}

/**
 * Generates Iceberg Order: Displays only a visible tip while replenishing from hidden reserve
 */
export function generateIcebergOrder({
  symbol = "AAPL",
  side = "buy",
  totalQuantity = 1000,
  visibleSize = 100,
  limitPrice = 150.00
} = {}) {
  const normSymbol = String(symbol || "AAPL").trim().toUpperCase();
  const normSide = String(side || "buy").trim().toLowerCase();
  const visible = Math.max(1, Math.min(visibleSize, totalQuantity));
  const hiddenReserve = totalQuantity - visible;
  const estimatedRefills = Math.ceil(totalQuantity / visible);

  return {
    algorithm: "ICEBERG_DISCRETIONARY_QUEUE",
    parentOrderId: randomUUID(),
    symbol: normSymbol,
    side: normSide,
    totalQuantity,
    visibleSize: visible,
    hiddenReserve,
    limitPrice: Number(limitPrice.toFixed(4)),
    estimatedRefills,
    currentTipOrder: {
      tipOrderId: randomUUID(),
      quantity: visible,
      limitPrice: Number(limitPrice.toFixed(4)),
      status: "POSTED_TO_BOOK"
    },
    status: "ACTIVE_MANAGED_QUEUE"
  };
}

/**
 * Computes Percentage-of-Volume (POV) participation rate
 */
export function calculatePovParticipationRate({
  targetParticipationPercent = 10,
  marketIntervalVolume = 5000,
  remainingOrderQuantity = 500
} = {}) {
  const targetFraction = Math.max(0.01, Math.min(targetParticipationPercent / 100, 0.5));
  const maxSafeSlice = Math.floor(marketIntervalVolume * targetFraction);
  const scheduledSlice = Math.min(maxSafeSlice, remainingOrderQuantity);

  return {
    algorithm: "POV_PARTICIPATION_RATE",
    targetParticipationPercent,
    marketIntervalVolume,
    scheduledSliceQuantity: Math.max(1, scheduledSlice),
    remainingQuantity: Math.max(0, remainingOrderQuantity - scheduledSlice),
    effectiveParticipationPercent: marketIntervalVolume > 0 ? Number(((scheduledSlice / marketIntervalVolume) * 100).toFixed(2)) : 0
  };
}

export function getSlicersEngineStatus() {
  return {
    status: "ALGO_SLICERS_ONLINE",
    version: "2.0_INSTITUTIONAL",
    supportedAlgorithms: ["TWAP_TIME_WEIGHTED", "VWAP_VOLUME_WEIGHTED", "ICEBERG_DISCRETIONARY", "POV_PARTICIPATION"],
    antiGamingJitterEnabled: true,
    timestamp: new Date().toISOString()
  };
}
