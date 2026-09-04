/**
 * IEX Cloud Market Data Fetcher
 * Connects to IEX Cloud REST API for equities quotes and historical charts.
 * Pure Node.js ESM - uses built-in fetch with configurable timeout and mockable fetchFn.
 */

function normalizeSymbol(symbol) {
  return String(symbol ?? "").trim().toUpperCase().replace(/[\/-]/g, "");
}

/**
 * Fetch real-time or delayed quote from IEX Cloud
 * @param {string} symbol - e.g. "AAPL", "MSFT"
 * @param {object} [options] - token override, custom fetchFn, timeoutMs
 */
export async function fetchIexQuote(symbol, options = {}) {
  const normSymbol = normalizeSymbol(symbol);
  if (!normSymbol) {
    throw new Error("Invalid symbol provided to fetchIexQuote");
  }

  const token = options.token || process.env.IEX_CLOUD_TOKEN;
  if (!token) {
    throw new Error("IEX_CLOUD_TOKEN not set");
  }

  const fetchFn = options.fetchFn || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://cloud.iexapis.com/stable/stock/${encodeURIComponent(normSymbol)}/quote?token=${encodeURIComponent(token)}`;
    const res = await fetchFn(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`IEX API error: ${res.status} ${res.statusText || ""}`.trim());
    }

    const data = await res.json();
    return {
      symbol: normSymbol,
      companyName: data.companyName || normSymbol,
      price: typeof data.latestPrice === "number" ? data.latestPrice : (data.iexRealtimePrice || null),
      bid: typeof data.iexBidPrice === "number" ? data.iexBidPrice : null,
      ask: typeof data.iexAskPrice === "number" ? data.iexAskPrice : null,
      bid_size: typeof data.iexBidSize === "number" ? data.iexBidSize : null,
      ask_size: typeof data.iexAskSize === "number" ? data.iexAskSize : null,
      volume: typeof data.latestVolume === "number" ? data.latestVolume : (data.previousVolume || null),
      timestamp: data.latestUpdate ? new Date(data.latestUpdate).toISOString() : new Date().toISOString(),
      source: "iex-cloud"
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch historical chart bars from IEX Cloud
 * @param {string} symbol - e.g. "AAPL"
 * @param {string} [range='5y'] - e.g. "1m", "3m", "1y", "5y"
 * @param {object} [options]
 */
export async function fetchIexHistorical(symbol, range = "5y", options = {}) {
  const normSymbol = normalizeSymbol(symbol);
  if (!normSymbol) {
    throw new Error("Invalid symbol provided to fetchIexHistorical");
  }

  const token = options.token || process.env.IEX_CLOUD_TOKEN;
  if (!token) {
    throw new Error("IEX_CLOUD_TOKEN not set");
  }

  const fetchFn = options.fetchFn || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://cloud.iexapis.com/stable/stock/${encodeURIComponent(normSymbol)}/chart/${encodeURIComponent(range)}?token=${encodeURIComponent(token)}`;
    const res = await fetchFn(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`IEX API error: ${res.status} ${res.statusText || ""}`.trim());
    }

    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
