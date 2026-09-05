// src/microstructure/limit-order-book-simulator.mjs
// High-Fidelity Level 3 Limit Order Book (LOB) Simulator & Almgren-Chriss Optimal Execution Trajectory
// Pure Node.js ESM built-ins only

import { randomUUID } from "crypto";

/**
 * Order Book Price Level containing queued limit orders in FIFO sequence.
 */
class PriceLevel {
  constructor(price) {
    this.price = Number(price.toFixed(4));
    this.totalQuantity = 0;
    this.orders = []; // FIFO queue
  }

  addOrder(order) {
    this.orders.push(order);
    this.totalQuantity += order.quantity;
  }

  removeOrder(orderId) {
    const idx = this.orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      const removed = this.orders.splice(idx, 1)[0];
      this.totalQuantity -= removed.quantity;
      return removed;
    }
    return null;
  }
}

/**
 * High-Fidelity Limit Order Book (LOB) Engine with FIFO queue matching and market impact.
 */
export class LimitOrderBook {
  constructor(symbol = "AAPL", basePrice = 150.0) {
    this.symbol = symbol;
    this.basePrice = basePrice;
    this.bids = new Map(); // price -> PriceLevel (descending)
    this.asks = new Map(); // price -> PriceLevel (ascending)
    this.tradeHistory = [];
    this.seedSyntheticLiquidity(basePrice);
  }

  seedSyntheticLiquidity(midPrice, depthLevels = 10, tickSize = 0.05, avgDepth = 500) {
    this.bids.clear();
    this.asks.clear();

    for (let i = 1; i <= depthLevels; i++) {
      const bidPrice = Number((midPrice - i * tickSize).toFixed(4));
      const askPrice = Number((midPrice + i * tickSize).toFixed(4));

      // Level depth grows slightly deeper into the book
      const bidQty = Math.round(avgDepth * (1 + (i - 1) * 0.15) + (Math.sin(i * 1.5) * 50));
      const askQty = Math.round(avgDepth * (1 + (i - 1) * 0.15) + (Math.cos(i * 1.5) * 50));

      this.addLimitOrder("BUY", bidPrice, Math.max(10, bidQty), `seed-bid-${i}`);
      this.addLimitOrder("SELL", askPrice, Math.max(10, askQty), `seed-ask-${i}`);
    }
  }

  getBestBid() {
    if (this.bids.size === 0) return null;
    const prices = Array.from(this.bids.keys()).sort((a, b) => b - a);
    return prices[0];
  }

  getBestAsk() {
    if (this.asks.size === 0) return null;
    const prices = Array.from(this.asks.keys()).sort((a, b) => a - b);
    return prices[0];
  }

  getMidPrice() {
    const bestBid = this.getBestBid() ?? this.basePrice;
    const bestAsk = this.getBestAsk() ?? this.basePrice;
    return Number(((bestBid + bestAsk) / 2).toFixed(4));
  }

  getSpread() {
    const bestBid = this.getBestBid();
    const bestAsk = this.getBestAsk();
    if (bestBid === null || bestAsk === null) return 0;
    return Number((bestAsk - bestBid).toFixed(4));
  }

  addLimitOrder(side, price, quantity, orderId = null) {
    const id = orderId || `ord-${randomUUID().slice(0, 8)}`;
    const normalizedSide = side.toUpperCase();
    const normalizedPrice = Number(price.toFixed(4));
    const targetMap = normalizedSide === "BUY" ? this.bids : this.asks;

    if (!targetMap.has(normalizedPrice)) {
      targetMap.set(normalizedPrice, new PriceLevel(normalizedPrice));
    }

    const order = {
      id,
      symbol: this.symbol,
      side: normalizedSide,
      price: normalizedPrice,
      quantity,
      timestamp: Date.now()
    };

    targetMap.get(normalizedPrice).addOrder(order);
    return order;
  }

  cancelOrder(orderId) {
    for (const level of this.bids.values()) {
      const removed = level.removeOrder(orderId);
      if (removed) {
        if (level.totalQuantity <= 0) this.bids.delete(level.price);
        return { success: true, order: removed };
      }
    }
    for (const level of this.asks.values()) {
      const removed = level.removeOrder(orderId);
      if (removed) {
        if (level.totalQuantity <= 0) this.asks.delete(level.price);
        return { success: true, order: removed };
      }
    }
    return { success: false, reason: "Order not found" };
  }

  /**
   * Execute incoming market order against limit order book depth (FIFO matching).
   */
  executeMarketOrder(side, requestedQuantity) {
    const normalizedSide = side.toUpperCase();
    const arrivalPrice = this.getMidPrice();
    let remainingQuantity = requestedQuantity;
    const fills = [];
    let totalCost = 0;

    const targetMap = normalizedSide === "BUY" ? this.asks : this.bids;
    const sortedPrices = Array.from(targetMap.keys()).sort(
      normalizedSide === "BUY" ? (a, b) => a - b : (a, b) => b - a
    );

    for (const price of sortedPrices) {
      if (remainingQuantity <= 0) break;
      const level = targetMap.get(price);

      while (level.orders.length > 0 && remainingQuantity > 0) {
        const topOrder = level.orders[0];
        const fillQty = Math.min(remainingQuantity, topOrder.quantity);

        topOrder.quantity -= fillQty;
        level.totalQuantity -= fillQty;
        remainingQuantity -= fillQty;

        totalCost += fillQty * price;
        fills.push({
          orderId: topOrder.id,
          price,
          quantity: fillQty,
          timestamp: Date.now()
        });

        if (topOrder.quantity === 0) {
          level.orders.shift();
        }
      }

      if (level.totalQuantity <= 0) {
        targetMap.delete(price);
      }
    }

    const executedQuantity = requestedQuantity - remainingQuantity;
    const vwapExecuted = executedQuantity > 0 ? Number((totalCost / executedQuantity).toFixed(4)) : arrivalPrice;
    
    // Implementation Shortfall (IS) vs. arrival price benchmark (in bps)
    const slippageBps = arrivalPrice > 0
      ? Number((((normalizedSide === "BUY" ? vwapExecuted - arrivalPrice : arrivalPrice - vwapExecuted) / arrivalPrice) * 10000).toFixed(2))
      : 0;

    // Kyle's Lambda empirical price impact: (delta Price / delta Volume)
    const kyleLambda = executedQuantity > 0 
      ? Math.abs(vwapExecuted - arrivalPrice) / executedQuantity 
      : 0.0001;

    const result = {
      symbol: this.symbol,
      side: normalizedSide,
      requestedQuantity,
      executedQuantity,
      unfilledQuantity: remainingQuantity,
      arrivalPrice,
      vwapExecuted,
      slippageBps,
      kyleLambda: Number(kyleLambda.toFixed(6)),
      fillsCount: fills.length,
      fills,
      timestamp: Date.now()
    };

    this.tradeHistory.push(result);

    // Replenish synthetic liquidity if depth drops below threshold
    if (this.bids.size < 4 || this.asks.size < 4) {
      this.seedSyntheticLiquidity(vwapExecuted);
    }

    return result;
  }

  getSnapshot(depth = 5) {
    const sortedBids = Array.from(this.bids.entries())
      .sort((a, b) => b[0] - a[0])
      .slice(0, depth)
      .map(([price, lvl]) => ({ price, quantity: lvl.totalQuantity, ordersCount: lvl.orders.length }));

    const sortedAsks = Array.from(this.asks.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, depth)
      .map(([price, lvl]) => ({ price, quantity: lvl.totalQuantity, ordersCount: lvl.orders.length }));

    const totalBidVol = sortedBids.reduce((acc, b) => acc + b.quantity, 0);
    const totalAskVol = sortedAsks.reduce((acc, a) => acc + a.quantity, 0);
    const orderImbalance = (totalBidVol + totalAskVol > 0)
      ? Number(((totalBidVol - totalAskVol) / (totalBidVol + totalAskVol)).toFixed(4))
      : 0;

    return {
      symbol: this.symbol,
      midPrice: this.getMidPrice(),
      spread: this.getSpread(),
      bestBid: this.getBestBid(),
      bestAsk: this.getBestAsk(),
      bids: sortedBids,
      asks: sortedAsks,
      orderImbalance,
      timestamp: Date.now()
    };
  }
}

/**
 * Almgren-Chriss Optimal Execution Trajectory Engine.
 * Computes trade schedule balancing market impact vs. inventory risk.
 * 
 * References:
 * Almgren, R., & Chriss, N. (2000). Optimal execution of portfolio transactions.
 * Journal of Risk, 3, 5-40.
 */
export function computeAlmgrenChrissTrajectory({
  totalShares = 1000,
  horizonMinutes = 60,
  numberOfTranches = 10,
  volatilityDaily = 0.02,
  tempImpactParamEta = 2.5e-6,
  permImpactParamGamma = 2.5e-7,
  riskAversionLambda = 1e-6
}) {
  const X = Math.max(1, totalShares);
  const N = Math.max(2, numberOfTranches);
  const T = Math.max(1, horizonMinutes);
  const tau = T / N; // interval length

  // Intraday variance per minute
  const sigmaMinute = volatilityDaily / Math.sqrt(390);
  const sigmaSquared = Math.pow(sigmaMinute, 2);

  // Kappa: velocity of execution parameter
  // kappa^2 approx (lambda * sigma^2) / eta
  const etaTilde = tempImpactParamEta * (1 - 0.5 * permImpactParamGamma * tau);
  const kappaSq = (riskAversionLambda * sigmaSquared) / Math.max(1e-10, etaTilde);
  const kappa = Math.sqrt(Math.max(1e-6, kappaSq));

  // Compute trajectory: remaining holdings x_j and tranche slices n_j
  const trajectory = [];
  let remainingShares = X;
  const sinhKappaT = Math.sinh(kappa * T);

  for (let j = 1; j <= N; j++) {
    const t_j = j * tau;
    // Expected remaining shares at end of step j:
    // x_j = (sinh(kappa * (T - t_j)) / sinh(kappa * T)) * X
    const x_j = Math.max(0, Math.round((Math.sinh(kappa * (T - t_j)) / (sinhKappaT || 1)) * X));
    
    // Slice executed during period j:
    const slice = j === N ? remainingShares : Math.max(1, remainingShares - x_j);
    remainingShares = Math.max(0, remainingShares - slice);

    trajectory.push({
      step: j,
      timeMinute: Number(t_j.toFixed(1)),
      sliceQuantity: slice,
      remainingHoldings: remainingShares
    });
  }

  // Ensure exact sum equality
  const totalAllocated = trajectory.reduce((acc, t) => acc + t.sliceQuantity, 0);
  if (totalAllocated !== X && trajectory.length > 0) {
    trajectory[trajectory.length - 1].sliceQuantity += (X - totalAllocated);
    trajectory[trajectory.length - 1].remainingHoldings = 0;
  }

  // Calculate theoretical expected cost (basis points) and cost variance
  const expectedCostNotional = (0.5 * permImpactParamGamma * Math.pow(X, 2)) +
    (tempImpactParamEta * trajectory.reduce((acc, t) => acc + Math.pow(t.sliceQuantity, 2) / tau, 0));
  
  const expectedCostBps = Number(((expectedCostNotional / (X * 150)) * 10000).toFixed(2));

  return {
    totalShares: X,
    numberOfTranches: N,
    horizonMinutes: T,
    kappa: Number(kappa.toFixed(6)),
    expectedCostBps,
    trajectory,
    timestamp: Date.now()
  };
}
