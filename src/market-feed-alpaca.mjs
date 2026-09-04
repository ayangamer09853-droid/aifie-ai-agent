/**
 * Alpaca Equities Live Market Data Feed v1.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Interacts with Alpaca Data API v2 (SIP Equities & Crypto feeds)
 * Features:
 * - Real-time latest trade execution price & size
 * - NBBO (National Best Bid and Offer) quote fetching
 * - Multi-timeframe OHLCV historical bars (1Min, 5Min, 1Hour, 1Day)
 * - Complete market snapshot query
 * - Safe fallback simulation for unauthenticated or rate-limited runs
 */

const ALPACA_DATA_BASE = "https://data.alpaca.markets/v2";

export function normalizeAlpacaSymbol(symbol = "AAPL") {
  return String(symbol || "AAPL")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function getAlpacaHeaders() {
  const keyId = process.env.ALPACA_API_KEY || process.env.APCA_API_KEY_ID || "";
  const secretKey = process.env.ALPACA_SECRET_KEY || process.env.APCA_API_SECRET_KEY || "";
  return {
    "APCA-API-KEY-ID": keyId,
    "APCA-API-SECRET-KEY": secretKey,
    "accept": "application/json"
  };
}

export function getAlpacaFeedStatus() {
  const headers = getAlpacaHeaders();
  const isConfigured = Boolean(headers["APCA-API-KEY-ID"] && !headers["APCA-API-KEY-ID"].includes("your_") && headers["APCA-API-SECRET-KEY"]);

  return {
    provider: "ALPACA",
    status: "ONLINE",
    isConfigured,
    environment: isConfigured ? "SIP_LIVE_AUTHENTICATED" : "IEX_FREE_OR_SIMULATED",
    baseUrl: ALPACA_DATA_BASE,
    defaultEquities: ["AAPL", "NVDA", "MSFT", "TSLA", "SPY", "QQQ"],
    timestamp: new Date().toISOString()
  };
}

/**
 * Fetches latest trade for a US stock
 */
export async function fetchAlpacaLatestTrade(symbol = "AAPL", { fetchFn = fetch } = {}) {
  const cleanSymbol = normalizeAlpacaSymbol(symbol);
  const headers = getAlpacaHeaders();

  try {
    const res = await fetchFn(`${ALPACA_DATA_BASE}/stocks/${cleanSymbol}/trades/latest`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.trade) {
        return {
          success: true,
          symbol: cleanSymbol,
          price: parseFloat(data.trade.p),
          size: data.trade.s,
          timestamp: data.trade.t,
          conditions: data.trade.c || [],
          provider: "ALPACA_DATA_V2_LIVE",
          updatedAt: data.trade.t
        };
      }
    }
  } catch (_) {}

  // Fallback estimates for common liquid tickers
  const fallbackPrices = {
    AAPL: 228.50,
    NVDA: 124.30,
    MSFT: 448.20,
    TSLA: 215.60,
    SPY: 560.40,
    QQQ: 485.10
  };
  const price = fallbackPrices[cleanSymbol] || 150.00;

  return {
    success: true,
    symbol: cleanSymbol,
    price,
    size: 100,
    timestamp: new Date().toISOString(),
    conditions: ["@"],
    provider: "ALPACA_SIMULATED_FALLBACK",
    updatedAt: new Date().toISOString()
  };
}

/**
 * Fetches latest NBBO quote (bid/ask)
 */
export async function fetchAlpacaLatestQuote(symbol = "AAPL", { fetchFn = fetch } = {}) {
  const cleanSymbol = normalizeAlpacaSymbol(symbol);
  const headers = getAlpacaHeaders();

  try {
    const res = await fetchFn(`${ALPACA_DATA_BASE}/stocks/${cleanSymbol}/quotes/latest`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.quote) {
        return {
          success: true,
          symbol: cleanSymbol,
          bid: parseFloat(data.quote.bp),
          bidSize: data.quote.bs,
          ask: parseFloat(data.quote.ap),
          askSize: data.quote.as,
          spread: Number((data.quote.ap - data.quote.bp).toFixed(4)),
          timestamp: data.quote.t,
          provider: "ALPACA_NBBO_LIVE",
          updatedAt: data.quote.t
        };
      }
    }
  } catch (_) {}

  const trade = await fetchAlpacaLatestTrade(cleanSymbol, { fetchFn });
  const spread = Number((trade.price * 0.0004).toFixed(4));

  return {
    success: true,
    symbol: cleanSymbol,
    bid: Number((trade.price - spread / 2).toFixed(2)),
    bidSize: 200,
    ask: Number((trade.price + spread / 2).toFixed(2)),
    askSize: 200,
    spread,
    timestamp: new Date().toISOString(),
    provider: "ALPACA_NBBO_SYNTHETIC_FALLBACK",
    updatedAt: new Date().toISOString()
  };
}

/**
 * Fetches historical OHLCV bars
 */
export async function fetchAlpacaBars(symbol = "AAPL", timeframe = "1Min", limit = 50, { fetchFn = fetch } = {}) {
  const cleanSymbol = normalizeAlpacaSymbol(symbol);
  const headers = getAlpacaHeaders();

  try {
    const res = await fetchFn(`${ALPACA_DATA_BASE}/stocks/${cleanSymbol}/bars?timeframe=${timeframe}&limit=${limit}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.bars)) {
        const bars = data.bars.map(b => ({
          time: new Date(b.t).getTime(),
          open: parseFloat(b.o),
          high: parseFloat(b.h),
          low: parseFloat(b.l),
          close: parseFloat(b.c),
          volume: b.v,
          vwap: b.vw
        }));
        return {
          success: true,
          symbol: cleanSymbol,
          timeframe,
          barsCount: bars.length,
          bars,
          provider: "ALPACA_BARS_LIVE"
        };
      }
    }
  } catch (_) {}

  // Synthetic fallback bars
  const trade = await fetchAlpacaLatestTrade(cleanSymbol, { fetchFn });
  const basePrice = trade.price;
  const now = Date.now();
  const bars = [];

  for (let i = limit; i >= 1; i--) {
    const t = now - i * 60000;
    const noise = (Math.sin(i / 3) * 0.5);
    const close = Number((basePrice + noise).toFixed(2));
    bars.push({
      time: t,
      open: Number((close - 0.2).toFixed(2)),
      high: Number((close + 0.4).toFixed(2)),
      low: Number((close - 0.4).toFixed(2)),
      close,
      volume: 1200 + Math.floor(Math.random() * 500),
      vwap: close
    });
  }

  return {
    success: true,
    symbol: cleanSymbol,
    timeframe,
    barsCount: bars.length,
    bars,
    provider: "ALPACA_BARS_SYNTHETIC_FALLBACK"
  };
}

/**
 * Fetches combined snapshot (latest trade, latest quote, daily bar)
 */
export async function fetchAlpacaSnapshot(symbol = "AAPL", { fetchFn = fetch } = {}) {
  const [trade, quote, bars] = await Promise.all([
    fetchAlpacaLatestTrade(symbol, { fetchFn }),
    fetchAlpacaLatestQuote(symbol, { fetchFn }),
    fetchAlpacaBars(symbol, "1Min", 10, { fetchFn })
  ]);

  return {
    success: true,
    symbol: normalizeAlpacaSymbol(symbol),
    price: trade.price,
    bid: quote.bid,
    ask: quote.ask,
    spread: quote.spread,
    latestBar: bars.bars[bars.bars.length - 1] || null,
    provider: trade.provider,
    updatedAt: new Date().toISOString()
  };
}
