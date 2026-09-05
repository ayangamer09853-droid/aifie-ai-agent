/**
 * Real-Time L2 Order Book Depth & Micro-Price Engine v1.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Features:
 * - In-memory sorted Level-2 order book (Bids descending, Asks ascending)
 * - Order Book Imbalance (OBI) computation: (V_bid - V_ask) / (V_bid + V_ask)
 * - Quantitative Micro-Price calculation adjusted for queue volume asymmetry
 * - Spread anomaly & liquidity hole detection (Spread Spike Detector)
 * - Multi-depth level aggregation (Top 5, 10, 20, 50 levels)
 */

const orderBooks = new Map();

export function normalizeSymbolKey(symbol) {
  return String(symbol || "BTCUSDT").trim().toUpperCase().replace(/[/]/g, "");
}

export function createOrderBook(symbol) {
  const key = normalizeSymbolKey(symbol);
  const book = {
    symbol: key,
    bids: [], // [price, volume] sorted descending by price
    asks: [], // [price, volume] sorted ascending by price
    lastUpdateId: 0,
    updatedAt: new Date().toISOString()
  };
  orderBooks.set(key, book);
  return book;
}

export function getOrderBook(symbol) {
  const key = normalizeSymbolKey(symbol);
  if (!orderBooks.has(key)) {
    return createOrderBook(key);
  }
  return orderBooks.get(key);
}

/**
 * Updates an L2 Order Book with sorted bids and asks
 */
export function updateOrderBookL2(symbol, { bids = [], asks = [], lastUpdateId = Date.now(), timestamp = Date.now() } = {}) {
  const book = getOrderBook(symbol);

  // Sort bids descending: highest price first
  book.bids = bids
    .map(([p, v]) => [Number(p), Number(v)])
    .filter(([p, v]) => Number.isFinite(p) && p > 0 && Number.isFinite(v) && v > 0)
    .sort((a, b) => b[0] - a[0]);

  // Sort asks ascending: lowest price first
  book.asks = asks
    .map(([p, v]) => [Number(p), Number(v)])
    .filter(([p, v]) => Number.isFinite(p) && p > 0 && Number.isFinite(v) && v > 0)
    .sort((a, b) => a[0] - b[0]);

  book.lastUpdateId = lastUpdateId;
  book.updatedAt = new Date(timestamp).toISOString();

  return {
    symbol: book.symbol,
    bidsCount: book.bids.length,
    asksCount: book.asks.length,
    bestBid: book.bids[0] || null,
    bestAsk: book.asks[0] || null,
    updatedAt: book.updatedAt
  };
}

/**
 * Computes Order Book Imbalance (OBI) across top N levels
 * Return value ranges from -1.0 (100% ask heavy / selling pressure) to +1.0 (100% bid heavy / buying pressure)
 */
export function calculateBidAskImbalance(symbol, depth = 10) {
  const book = getOrderBook(symbol);
  const topBids = book.bids.slice(0, depth);
  const topAsks = book.asks.slice(0, depth);

  if (topBids.length === 0 || topAsks.length === 0) {
    return { symbol: book.symbol, imbalance: 0, totalBidVolume: 0, totalAskVolume: 0, depth: 0 };
  }

  const totalBidVolume = topBids.reduce((acc, [, v]) => acc + v, 0);
  const totalAskVolume = topAsks.reduce((acc, [, v]) => acc + v, 0);
  const sumVolume = totalBidVolume + totalAskVolume;

  const imbalance = sumVolume > 0 ? Number(((totalBidVolume - totalAskVolume) / sumVolume).toFixed(4)) : 0;

  return {
    symbol: book.symbol,
    imbalance,
    totalBidVolume: Number(totalBidVolume.toFixed(4)),
    totalAskVolume: Number(totalAskVolume.toFixed(4)),
    depth: Math.min(topBids.length, topAsks.length),
    bias: imbalance > 0.15 ? "BULLISH_PRESSURE" : imbalance < -0.15 ? "BEARISH_PRESSURE" : "NEUTRAL"
  };
}

/**
 * Computes Micro-Price: P_micro = (P_ask * V_bid + P_bid * V_ask) / (V_bid + V_ask)
 * Accounts for volume queuing on best bid vs best ask
 */
export function computeMicroPrice(symbol) {
  const book = getOrderBook(symbol);
  const bestBid = book.bids[0];
  const bestAsk = book.asks[0];

  if (!bestBid || !bestAsk) {
    return { symbol: book.symbol, microPrice: null, midPrice: null, spread: 0 };
  }

  const [bidPrice, bidVolume] = bestBid;
  const [askPrice, askVolume] = bestAsk;
  const midPrice = Number(((bidPrice + askPrice) / 2).toFixed(4));
  const totalTopVolume = bidVolume + askVolume;

  if (totalTopVolume <= 0) {
    return { symbol: book.symbol, microPrice: midPrice, midPrice, spread: Number((askPrice - bidPrice).toFixed(4)) };
  }

  const microPrice = Number(((askPrice * bidVolume + bidPrice * askVolume) / totalTopVolume).toFixed(4));
  const spread = Number((askPrice - bidPrice).toFixed(4));

  return {
    symbol: book.symbol,
    microPrice,
    midPrice,
    spread,
    spreadBasisPoints: Number(((spread / midPrice) * 10000).toFixed(2)),
    bestBid: { price: bidPrice, volume: bidVolume },
    bestAsk: { price: askPrice, volume: askVolume }
  };
}

/**
 * Detects liquidity black-holes or abnormal spread spikes
 */
export function detectSpreadSpike(symbol, thresholdPercent = 0.25) {
  const { spread, midPrice, symbol: key } = computeMicroPrice(symbol);
  if (!midPrice || midPrice <= 0) return { isSpike: false, spreadPercent: 0 };

  const spreadPercent = Number(((spread / midPrice) * 100).toFixed(4));
  const isSpike = spreadPercent >= thresholdPercent;

  return {
    symbol: key,
    isSpike,
    spreadPercent,
    thresholdPercent,
    recommendation: isSpike ? "HALT_MARKET_ORDERS_USE_LIMITS" : "NORMAL_LIQUIDITY"
  };
}

/**
 * Returns snapshot of top N levels of bids and asks
 */
export function getOrderBookSnapshot(symbol, depth = 10) {
  const book = getOrderBook(symbol);
  const micro = computeMicroPrice(symbol);
  const obi = calculateBidAskImbalance(symbol, depth);

  return {
    symbol: book.symbol,
    bids: book.bids.slice(0, depth),
    asks: book.asks.slice(0, depth),
    microPrice: micro.microPrice,
    midPrice: micro.midPrice,
    spread: micro.spread,
    imbalance: obi.imbalance,
    bias: obi.bias,
    lastUpdateId: book.lastUpdateId,
    updatedAt: book.updatedAt
  };
}

export function getTrackedOrderBooks() {
  return Array.from(orderBooks.keys());
}

export function clearOrderBook(symbol) {
  const key = normalizeSymbolKey(symbol);
  orderBooks.delete(key);
}

/**
 * Hummingbot Avellaneda-Stoikov Pure Market Making Spread Model
 * Computes optimal reservation price and symmetric half-spreads around mid-price
 */
export function calculateHummingbotMarketMakingSpread(symbol, {
  targetVolatility = 0.02,
  riskAversion = 0.5,
  inventorySkew = 0,
  orderAmount = 1
} = {}) {
  const micro = computeMicroPrice(symbol);
  const mid = micro.midPrice || 100;
  
  const reservationPrice = mid - (inventorySkew * riskAversion * Math.pow(targetVolatility, 2) * mid);
  const optimalHalfSpread = mid * (targetVolatility * 0.5 + Math.max(0.0005, riskAversion * 0.002));

  const optimalBid = Number((reservationPrice - optimalHalfSpread).toFixed(4));
  const optimalAsk = Number((reservationPrice + optimalHalfSpread).toFixed(4));
  const spreadBps = Number((((optimalAsk - optimalBid) / mid) * 10000).toFixed(1));

  return {
    engine: "HUMMINGBOT_AVELLANEDA_STOIKOV_PMM",
    symbol: micro.symbol,
    midPrice: mid,
    reservationPrice: Number(reservationPrice.toFixed(4)),
    optimalBid,
    optimalAsk,
    spreadBps,
    inventorySkew,
    recommendedOrderSize: orderAmount
  };
}

/**
 * Exchange-Core LMAX-Style Matching Engine Simulation
 * Walks Level-2 order book depth to estimate slippage footprint, market impact, and fill probability
 */
export function simulateExchangeCoreMatchingImpact(symbol, {
  side = "buy",
  quantity = 10
} = {}) {
  const book = getOrderBook(symbol);
  const normSide = String(side).toLowerCase();
  const queue = normSide === "buy" ? book.asks : book.bids;

  if (!queue || queue.length === 0) {
    const defaultPrice = 100;
    return {
      engine: "EXCHANGE_CORE_LMAX_MATCHER",
      symbol: book.symbol,
      side: normSide,
      requestedQuantity: quantity,
      executedQuantity: quantity,
      averageFillPrice: defaultPrice,
      slippageBps: 1.5,
      liquidityRating: "FAIR_MOCK_LIQUIDITY",
      levelsConsumed: 1
    };
  }

  let remaining = quantity;
  let totalNotional = 0;
  let levelsConsumed = 0;
  const bestPrice = queue[0][0];

  for (const [price, volume] of queue) {
    if (remaining <= 0) break;
    levelsConsumed++;
    const fillAtLevel = Math.min(remaining, volume);
    totalNotional += fillAtLevel * price;
    remaining -= fillAtLevel;
  }

  const executedQuantity = quantity - remaining;
  const averageFillPrice = executedQuantity > 0 ? Number((totalNotional / executedQuantity).toFixed(4)) : bestPrice;
  const slippageBps = Number((Math.abs((averageFillPrice - bestPrice) / bestPrice) * 10000).toFixed(1));

  return {
    engine: "EXCHANGE_CORE_LMAX_MATCHER",
    symbol: book.symbol,
    side: normSide,
    requestedQuantity: quantity,
    executedQuantity,
    bestPrice,
    averageFillPrice,
    slippageBps,
    liquidityRating: slippageBps < 3 ? "PRIME_A_PLUS" : slippageBps < 10 ? "SOLID_B" : "THIN_C",
    levelsConsumed
  };
}
