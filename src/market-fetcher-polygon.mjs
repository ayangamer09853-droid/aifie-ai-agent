/**
 * Polygon.io Market Data Fetcher (Stocks + Crypto)
 * Connects to Polygon.io REST API for snapshot quotes and aggregate bars.
 * Pure Node.js ESM - uses built-in fetch with configurable timeout and mockable fetchFn.
 */

function normalizePolygonSymbol(symbol) {
  const s = String(symbol ?? "").trim().toUpperCase();
  // If it contains a slash like BTC/USD, standardize for polygon crypto
  return s;
}

/**
 * Fetch snapshot quote from Polygon.io
 * @param {string} symbol - e.g. "AAPL", "X:BTCUSD", "BTC-USD"
 * @param {object} [options] - apiKey override, custom fetchFn, timeoutMs
 */
export async function fetchPolygonQuote(symbol, options = {}) {
  const normSymbol = normalizePolygonSymbol(symbol);
  if (!normSymbol) {
    throw new Error("Invalid symbol provided to fetchPolygonQuote");
  }

  const apiKey = options.apiKey || process.env.POLYGON_API_KEY;
  if (!apiKey) {
    throw new Error("POLYGON_API_KEY not set");
  }

  const fetchFn = options.fetchFn || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Determine whether stock or crypto endpoint
    const isCrypto = normSymbol.startsWith("X:") || normSymbol.includes("BTC") || normSymbol.includes("ETH") || normSymbol.includes("USDT");
    const cleanTicker = normSymbol.replace(/[\/-]/g, "");
    
    let url;
    if (isCrypto && !normSymbol.startsWith("X:")) {
      url = `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers/X:${encodeURIComponent(cleanTicker)}?apiKey=${encodeURIComponent(apiKey)}`;
    } else {
      url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(cleanTicker)}?apiKey=${encodeURIComponent(apiKey)}`;
    }

    let res = await fetchFn(url, { signal: controller.signal });
    if (!res.ok && res.status === 403 && !isCrypto) {
      // Fallback to previous day bar for accounts without real-time snapshot tier
      const prevUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(cleanTicker)}/prev?adjusted=true&apiKey=${encodeURIComponent(apiKey)}`;
      const prevRes = await fetchFn(prevUrl, { signal: controller.signal }).catch(() => null);
      if (prevRes && prevRes.ok) {
        const prevData = await prevRes.json();
        const bar = prevData.results?.[0];
        if (bar) {
          return {
            symbol: normSymbol,
            price: Number(bar.c),
            bid: Number(bar.l),
            ask: Number(bar.h),
            bid_size: null,
            ask_size: null,
            timestamp: bar.t ? new Date(bar.t).toISOString() : new Date().toISOString(),
            source: "polygon"
          };
        }
      }
    }
    if (!res.ok) {
      throw new Error(`Polygon API error: ${res.status} ${res.statusText || ""}`.trim());
    }

    const data = await res.json();
    
    // Parse ticker/results
    const tickerData = data.ticker || data.results?.[0] || {};
    const quote = tickerData.last_quote || tickerData.lastQuote || {};
    const trade = tickerData.last_trade || tickerData.lastTrade || {};
    const min = tickerData.min || {};

    const price = quote.price ?? quote.p ?? trade.p ?? trade.price ?? min.c ?? tickerData.todaysChangePerc ?? null;
    const bid = quote.bid ?? quote.p ?? quote.b ?? null;
    const ask = quote.ask ?? quote.P ?? quote.a ?? null;
    const bidSize = quote.bid_size ?? quote.s ?? quote.bs ?? null;
    const askSize = quote.ask_size ?? quote.S ?? quote.as ?? null;
    const timestamp = quote.last_updated
      ? new Date(quote.last_updated).toISOString()
      : (trade.t ? new Date(trade.t).toISOString() : new Date().toISOString());

    return {
      symbol: normSymbol,
      price: typeof price === "number" ? price : (price ? parseFloat(price) : null),
      bid: typeof bid === "number" ? bid : (bid ? parseFloat(bid) : null),
      ask: typeof ask === "number" ? ask : (ask ? parseFloat(ask) : null),
      bid_size: typeof bidSize === "number" ? bidSize : (bidSize ? parseFloat(bidSize) : null),
      ask_size: typeof askSize === "number" ? askSize : (askSize ? parseFloat(askSize) : null),
      timestamp,
      source: "polygon"
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch previous day bar or aggregates from Polygon.io
 * @param {string} symbol - e.g. "AAPL"
 * @param {object} [options]
 */
export async function fetchPolygonHistorical(symbol, options = {}) {
  const normSymbol = normalizePolygonSymbol(symbol);
  if (!normSymbol) {
    throw new Error("Invalid symbol provided to fetchPolygonHistorical");
  }

  const apiKey = options.apiKey || process.env.POLYGON_API_KEY;
  if (!apiKey) {
    throw new Error("POLYGON_API_KEY not set");
  }

  const fetchFn = options.fetchFn || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const cleanTicker = normSymbol.replace(/[\/-]/g, "");
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(cleanTicker)}/prev?adjusted=true&apiKey=${encodeURIComponent(apiKey)}`;
    const res = await fetchFn(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Polygon API error: ${res.status} ${res.statusText || ""}`.trim());
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
