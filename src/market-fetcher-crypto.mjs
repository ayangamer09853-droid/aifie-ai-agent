/**
 * Crypto Market Data Fetchers (Binance + CoinGecko)
 * Fetches real-time crypto ticker data and spot market-cap prices.
 * Pure Node.js ESM - uses built-in fetch with configurable timeout and mockable fetchFn.
 */

const COINGECKO_MAP = {
  BTC: "bitcoin",
  BTCUSDT: "bitcoin",
  "BTC/USDT": "bitcoin",
  "BTC-USD": "bitcoin",
  ETH: "ethereum",
  ETHUSDT: "ethereum",
  "ETH/USDT": "ethereum",
  "ETH-USD": "ethereum",
  SOL: "solana",
  SOLUSDT: "solana",
  "SOL/USDT": "solana",
  DOGE: "dogecoin",
  ADA: "cardano",
  XRP: "ripple",
  BNB: "binancecoin"
};

/**
 * Fetch 24-hour ticker quote from Binance Public REST API
 * @param {string} symbol - e.g. "BTCUSDT", "ETHUSDT", "BTC/USDT"
 * @param {object} [options] - custom fetchFn, timeoutMs
 */
export async function fetchBinanceQuote(symbol, options = {}) {
  const raw = String(symbol ?? "").trim().toUpperCase();
  const cleanSymbol = raw.replace(/[\/\-_]/g, "");
  if (!cleanSymbol) {
    throw new Error("Invalid symbol provided to fetchBinanceQuote");
  }

  const fetchFn = options.fetchFn || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(cleanSymbol)}`;
    const res = await fetchFn(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Binance API error: ${res.status} ${res.statusText || ""}`.trim());
    }

    const data = await res.json();
    return {
      symbol: cleanSymbol,
      price: parseFloat(data.lastPrice),
      bid: parseFloat(data.bidPrice),
      ask: parseFloat(data.askPrice),
      bid_size: parseFloat(data.bidQty),
      ask_size: parseFloat(data.askQty),
      volume_24h: parseFloat(data.volume),
      quote_volume_24h: parseFloat(data.quoteVolume || "0"),
      price_change_percent: parseFloat(data.priceChangePercent || "0"),
      timestamp: new Date().toISOString(),
      source: "binance"
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch spot price and market cap from CoinGecko Public API
 * @param {string} symbol - e.g. "bitcoin", "ethereum", or ticker "BTC", "ETH"
 * @param {object} [options] - custom fetchFn, timeoutMs
 */
export async function fetchCoingeckoQuote(symbol, options = {}) {
  const raw = String(symbol ?? "").trim();
  const lower = raw.toLowerCase();
  const coinId = COINGECKO_MAP[raw.toUpperCase()] || COINGECKO_MAP[raw] || lower;

  if (!coinId) {
    throw new Error("Invalid symbol provided to fetchCoingeckoQuote");
  }

  const fetchFn = options.fetchFn || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd&include_market_cap=true`;
    const res = await fetchFn(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status} ${res.statusText || ""}`.trim());
    }

    const data = await res.json();
    const entry = data[coinId];
    if (!entry || typeof entry.usd !== "number") {
      throw new Error(`No CoinGecko price data found for id: ${coinId}`);
    }

    return {
      symbol: raw,
      id: coinId,
      price: entry.usd,
      marketcap: entry.usd_market_cap || null,
      source: "coingecko",
      timestamp: new Date().toISOString()
    };
  } finally {
    clearTimeout(timer);
  }
}
