/**
 * Institutional Smart Order Router v2: Algorithmic Execution Slicer
 * Implements TWAP, VWAP, POV, and Iceberg execution algorithms with stealth jitter
 * to eliminate market footprint drag and adverse selection costs.
 * 100% native Node.js ESM built-ins (zero dependencies).
 */

import { realtimeEventStream } from "../realtime-event-stream.mjs";
import { placePaperOrder } from "../paper-engine.mjs";

export class AlgorithmicExecutionSlicer {
  constructor(options = {}) {
    this.activeSchedules = new Map();
    this.completedSchedules = [];
    this.defaultJitterPercent = options.defaultJitterPercent || 15;
    this.maxParticipationRate = options.maxParticipationRate || 0.10; // 10% maximum volume participation
  }

  /**
   * 1. TWAP Slicer: Time-Weighted Average Price with Stealth Interval Jitter
   * Divides total quantity across N randomized tranches to prevent algorithmic detection.
   */
  createTwapSchedule({
    symbol = "BTC/USDT",
    side = "buy",
    totalQuantity = 10,
    durationMinutes = 15,
    tranchesCount = 5,
    jitterPercent = 15,
    arrivalPrice = 65000.00
  } = {}) {
    const normSymbol = String(symbol || "BTC/USDT").trim().toUpperCase();
    const normSide = String(side || "buy").trim().toLowerCase();
    const qty = Math.max(1, Math.round(Number(totalQuantity) || 10));
    const n = Math.max(2, Math.min(50, Math.round(Number(tranchesCount) || 5)));
    const durationMs = Math.max(1, durationMinutes) * 60 * 1000;
    const baseIntervalMs = Math.floor(durationMs / n);

    const baseSlice = Math.floor(qty / n);
    let remainder = qty - (baseSlice * n);

    const tranches = [];
    let cumulativeTime = 0;

    for (let i = 0; i < n; i++) {
      const sliceQty = baseSlice + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;

      // Apply randomized stealth jitter (+/- jitterPercent)
      const jitterFactor = 1 + ((Math.random() * 2 - 1) * (jitterPercent / 100));
      const trancheInterval = Math.max(500, Math.round(baseIntervalMs * jitterFactor));
      cumulativeTime += (i === 0 ? 0 : trancheInterval);

      tranches.push({
        trancheIndex: i + 1,
        quantity: sliceQty,
        scheduledDelayMs: cumulativeTime,
        scheduledDispatchAt: new Date(Date.now() + cumulativeTime).toISOString(),
        status: "PENDING",
        executedPrice: null,
        slippageBps: null,
        executedAt: null
      });
    }

    const scheduleId = `TWAP_${normSymbol.replace(/[^A-Z0-9]/g, "")}_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const schedule = {
      scheduleId,
      algorithm: "TWAP",
      symbol: normSymbol,
      side: normSide,
      totalQuantity: qty,
      executedQuantity: 0,
      remainingQuantity: qty,
      arrivalPrice,
      durationMinutes,
      tranchesCount: n,
      jitterPercent,
      status: "ACTIVE",
      tranches,
      createdAt: new Date().toISOString()
    };

    this.activeSchedules.set(scheduleId, schedule);
    realtimeEventStream.broadcast("execution_schedule_created", { scheduleId, algorithm: "TWAP", symbol: normSymbol, totalQuantity: qty });
    return schedule;
  }

  /**
   * 2. VWAP Slicer: Volume-Weighted Average Price
   * Weights order tranches against the asset's intraday U-shaped historical volume curve.
   */
  createVwapSchedule({
    symbol = "BTC/USDT",
    side = "buy",
    totalQuantity = 10,
    durationMinutes = 30,
    tranchesCount = 6,
    arrivalPrice = 65000.00,
    customVolumeWeights = null
  } = {}) {
    const normSymbol = String(symbol || "BTC/USDT").trim().toUpperCase();
    const normSide = String(side || "buy").trim().toLowerCase();
    const qty = Math.max(1, Math.round(Number(totalQuantity) || 10));
    const n = Math.max(2, Math.min(24, Math.round(Number(tranchesCount) || 6)));

    // Standard institutional U-shaped volume curve (higher at open/close, lower mid-session)
    const defaultWeights = [0.24, 0.16, 0.12, 0.11, 0.15, 0.22];
    let weights = Array.isArray(customVolumeWeights) && customVolumeWeights.length === n
      ? customVolumeWeights
      : defaultWeights.slice(0, n);

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    const durationMs = Math.max(1, durationMinutes) * 60 * 1000;
    const intervalMs = Math.floor(durationMs / n);

    let allocatedQty = 0;
    const tranches = [];

    for (let i = 0; i < n; i++) {
      let sliceQty = (i === n - 1)
        ? qty - allocatedQty
        : Math.max(1, Math.round(qty * normalizedWeights[i]));

      allocatedQty += sliceQty;
      const dispatchTime = i * intervalMs;

      tranches.push({
        trancheIndex: i + 1,
        quantity: sliceQty,
        volumeWeightPercent: Number((normalizedWeights[i] * 100).toFixed(1)),
        scheduledDelayMs: dispatchTime,
        scheduledDispatchAt: new Date(Date.now() + dispatchTime).toISOString(),
        status: "PENDING",
        executedPrice: null,
        slippageBps: null,
        executedAt: null
      });
    }

    const scheduleId = `VWAP_${normSymbol.replace(/[^A-Z0-9]/g, "")}_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const schedule = {
      scheduleId,
      algorithm: "VWAP",
      symbol: normSymbol,
      side: normSide,
      totalQuantity: qty,
      executedQuantity: 0,
      remainingQuantity: qty,
      arrivalPrice,
      durationMinutes,
      tranchesCount: n,
      volumeCurve: "U_SHAPED_INTRADAY",
      status: "ACTIVE",
      tranches,
      createdAt: new Date().toISOString()
    };

    this.activeSchedules.set(scheduleId, schedule);
    realtimeEventStream.broadcast("execution_schedule_created", { scheduleId, algorithm: "VWAP", symbol: normSymbol, totalQuantity: qty });
    return schedule;
  }

  /**
   * 3. POV (Percentage of Volume) Slicer
   * Caps execution participation rate to a conservative fraction of market tape volume (e.g. 5%).
   */
  createPovSchedule({
    symbol = "BTC/USDT",
    side = "buy",
    totalQuantity = 10,
    participationRate = 0.05,
    estimatedTapeRatePerMin = 50,
    arrivalPrice = 65000.00
  } = {}) {
    const normSymbol = String(symbol || "BTC/USDT").trim().toUpperCase();
    const normSide = String(side || "buy").trim().toLowerCase();
    const qty = Math.max(1, Math.round(Number(totalQuantity) || 10));
    const pRate = Math.min(this.maxParticipationRate, Math.max(0.01, Number(participationRate) || 0.05));

    // Calculate maximum allowable slice per minute without market impact
    const slicePerMin = Math.max(1, Math.round(estimatedTapeRatePerMin * pRate));
    const estimatedMinutes = Math.ceil(qty / slicePerMin);
    const n = Math.min(50, estimatedMinutes);

    return this.createTwapSchedule({
      symbol: normSymbol,
      side: normSide,
      totalQuantity: qty,
      durationMinutes: estimatedMinutes,
      tranchesCount: n,
      arrivalPrice
    });
  }

  /**
   * 4. Iceberg Order Engine: Public Display Tranche vs Hidden Reserve
   */
  createIcebergOrder({
    symbol = "BTC/USDT",
    side = "buy",
    totalQuantity = 50,
    displayQuantity = 10,
    limitPrice = 65000.00
  } = {}) {
    const normSymbol = String(symbol || "BTC/USDT").trim().toUpperCase();
    const normSide = String(side || "buy").trim().toLowerCase();
    const total = Math.max(1, Math.round(Number(totalQuantity) || 50));
    const display = Math.max(1, Math.min(total, Math.round(Number(displayQuantity) || 10)));
    const hidden = total - display;

    const orderId = `ICEBERG_${normSymbol.replace(/[^A-Z0-9]/g, "")}_${Date.now()}`;
    const iceberg = {
      orderId,
      algorithm: "ICEBERG",
      symbol: normSymbol,
      side: normSide,
      totalQuantity: total,
      displayQuantity: display,
      hiddenReserveQuantity: hidden,
      limitPrice,
      activeDisplayQuantity: display,
      filledTotalQuantity: 0,
      tranchesRefreshed: 0,
      status: "OPEN_ACTIVE",
      createdAt: new Date().toISOString()
    };

    realtimeEventStream.broadcast("iceberg_order_placed", { orderId, symbol: normSymbol, displayQuantity: display, totalQuantity: total });
    return iceberg;
  }

  /**
   * Convenience alias for simulateExecuteSlice
   */
  executeTranche(scheduleId, trancheIndex = 1, currentMarketPrice = null, paper = {}, orders = []) {
    return this.simulateExecuteSlice(scheduleId, trancheIndex, currentMarketPrice, { paper, orders });
  }

  /**
   * Simulate execution of a scheduled tranche with realistic slippage and Implementation Shortfall
   */
  simulateExecuteSlice(scheduleId, trancheIndex = 1, currentMarketPrice = null, { paper = {}, orders = [] } = {}) {
    const schedule = this.activeSchedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Execution schedule "${scheduleId}" not found or already completed`);
    }

    const tranche = schedule.tranches.find(t => t.trancheIndex === trancheIndex);
    if (!tranche) {
      throw new Error(`Tranche index ${trancheIndex} does not exist for schedule ${scheduleId}`);
    }
    if (tranche.status === "FILLED") {
      return { schedule, tranche, alreadyFilled: true };
    }

    const mktPrice = currentMarketPrice || schedule.arrivalPrice || 150.0;
    // Model realistic micro-impact: slippage is proportional to square root of tranche size
    const impactBps = Number((Math.sqrt(tranche.quantity) * 0.45).toFixed(2));
    const fillPrice = schedule.side === "buy"
      ? Number((mktPrice * (1 + impactBps / 10000)).toFixed(2))
      : Number((mktPrice * (1 - impactBps / 10000)).toFixed(2));

    // Implementation Shortfall vs Arrival Benchmark
    const arrivalPrice = schedule.arrivalPrice || fillPrice;
    const implementationShortfallBps = Number((((fillPrice - arrivalPrice) / arrivalPrice) * 10000).toFixed(2));

    tranche.status = "FILLED";
    tranche.executedPrice = fillPrice;
    tranche.slippageBps = impactBps;
    tranche.implementationShortfallBps = implementationShortfallBps;
    tranche.executedAt = new Date().toISOString();

    schedule.executedQuantity += tranche.quantity;
    schedule.remainingQuantity = schedule.totalQuantity - schedule.executedQuantity;

    // Execute through paper trading engine if state provided
    try {
      if (paper && paper.account) {
        paper.quotes = paper.quotes || {};
        paper.quotes[schedule.symbol] = paper.quotes[schedule.symbol] || { price: fillPrice, updatedAt: new Date().toISOString() };
        paper.journal = paper.journal || [];
        paper.risk = paper.risk || { maxPositionNotional: 100000, maxDrawdownPercent: 10, maxQuoteAgeMs: 60000, slippageRate: 0.0005, commissionRate: 0.0002 };
        placePaperOrder(paper, { symbol: schedule.symbol, side: schedule.side, quantity: tranche.quantity });
      }
    } catch (_err) {
      // Sandboxed execution tolerance
    }

    if (Array.isArray(orders)) {
      orders.unshift({
        id: `SLICE_${schedule.algorithm}_${Date.now()}`,
        symbol: schedule.symbol,
        side: schedule.side.toUpperCase(),
        quantity: tranche.quantity,
        price: fillPrice,
        status: "FILLED_SLICE",
        timestamp: new Date().toISOString()
      });
    }

    if (schedule.remainingQuantity <= 0) {
      schedule.status = "COMPLETED";
      this.activeSchedules.delete(scheduleId);
      this.completedSchedules.unshift(schedule);
      if (this.completedSchedules.length > 50) this.completedSchedules.pop();
    }

    realtimeEventStream.broadcast("execution_slice_filled", {
      scheduleId,
      trancheIndex,
      symbol: schedule.symbol,
      fillPrice,
      quantity: tranche.quantity,
      remainingQuantity: schedule.remainingQuantity
    });

    return { schedule, tranche };
  }

  /**
   * Institutional Implementation Shortfall Decomposition
   * Breaks total cost into Half-Spread, Temporary Impact, Permanent Impact, and Delay Drift
   */
  decomposeExecutionCost({
    arrivalPrice = 100.0,
    fillPrice = 100.15,
    quantity = 100,
    side = "buy",
    dailyVolume = 1000000,
    dailyVolatility = 0.02,
    halfSpreadBps = 5
  } = {}) {
    const isBuy = side.toLowerCase() === "buy";
    const totalShortfallUSD = isBuy ? (fillPrice - arrivalPrice) * quantity : (arrivalPrice - fillPrice) * quantity;
    const totalShortfallBps = Number((((fillPrice - arrivalPrice) / (arrivalPrice || 1)) * 10000 * (isBuy ? 1 : -1)).toFixed(2));

    const halfSpreadUSD = arrivalPrice * (halfSpreadBps / 10000) * quantity;
    const participationRatio = quantity / (dailyVolume || 1000000);
    const tempImpactUSD = 0.5 * dailyVolatility * Math.sqrt(participationRatio) * arrivalPrice * quantity;
    const permImpactUSD = 0.1 * dailyVolatility * participationRatio * arrivalPrice * quantity;
    const delayDriftUSD = Math.max(0, totalShortfallUSD - halfSpreadUSD - tempImpactUSD - permImpactUSD);

    return {
      arrivalPrice,
      fillPrice,
      quantity,
      totalShortfallUSD: Number(totalShortfallUSD.toFixed(2)),
      totalShortfallBps,
      decomposition: {
        halfSpreadUSD: Number(halfSpreadUSD.toFixed(2)),
        temporaryImpactUSD: Number(tempImpactUSD.toFixed(2)),
        permanentImpactUSD: Number(permImpactUSD.toFixed(2)),
        delayDriftUSD: Number(delayDriftUSD.toFixed(2))
      },
      efficiencyScore: Number(Math.max(0, Math.min(100, 100 - (totalShortfallBps * 1.5))).toFixed(1))
    };
  }

  /**
   * Get active and recent slicing schedules telemetry
   */
  getTelemetry() {
    return {
      activeSchedulesCount: this.activeSchedules.size,
      activeSchedules: Array.from(this.activeSchedules.values()),
      recentCompletedCount: this.completedSchedules.length,
      recentCompleted: this.completedSchedules.slice(0, 10)
    };
  }
}

export const algorithmicExecutionSlicer = new AlgorithmicExecutionSlicer();
