/**
 * Market Data Fetcher & Price History Buffer
 * Handles live/simulated market data feeds and maintains price history candles
 * required for technical indicators.
 */

import { recordMarketTick } from "./timeseries-market-store.mjs";

const priceBuffers = new Map();

function normalizeSymbol(symbol) {
  const normalized = String(symbol ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]+(?:[\.\/\-_][A-Z0-9]+)*$/.test(normalized)) throw new Error("invalid symbol");
  return normalized;
}

export function getPriceBuffer(symbol, { defaultBaseline = 150 } = {}) {
  const normalized = normalizeSymbol(symbol);
  if (!priceBuffers.has(normalized)) {
    const initialPrices = [];
    let seed = defaultBaseline;
    for (let i = 0; i < 30; i++) {
      seed = Number((seed * (1 + (Math.random() - 0.49) * 0.015)).toFixed(2));
      initialPrices.push(seed);
    }
    priceBuffers.set(normalized, initialPrices);
  }
  return priceBuffers.get(normalized);
}

export function recordPrice(symbol, price) {
  const normalized = normalizeSymbol(symbol);
  const buffer = getPriceBuffer(normalized);
  buffer.push(price);
  if (buffer.length > 100) {
    buffer.shift();
  }
  try {
    recordMarketTick({ symbol: normalized, price, volume: 1 });
  } catch (_e) {
    // Non-blocking
  }
  return buffer;
}

export async function fetchLiveQuote(symbol, { mockBaseline = 150 } = {}) {
  const normalized = normalizeSymbol(symbol);
  
  // Try fetching from Yahoo Finance Public API (HTTPS node request)
  try {
    let querySymbol = normalized.replace("/", "-");
    const isCrypto = querySymbol.endsWith("-USD") || querySymbol.endsWith("-USDT") || ["BTC", "ETH", "SOL"].includes(querySymbol);
    if (isCrypto && !querySymbol.includes("-")) querySymbol = `${querySymbol}-USD`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=1m&range=1d`;
    
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const regularPrice = result?.meta?.regularMarketPrice;
      const closes = result?.indicators?.quote?.[0]?.close;
      const buffer = getPriceBuffer(normalized);
      if (Array.isArray(closes) && buffer.length < 25) {
        for (const c of closes) {
          if (typeof c === "number" && c > 0) recordPrice(normalized, Number(c.toFixed(2)));
        }
      }
      if (typeof regularPrice === "number" && regularPrice > 0) {
        recordPrice(normalized, regularPrice);
        return {
          symbol: normalized,
          price: Number(regularPrice.toFixed(2)),
          source: "yahoo_finance_live",
          updatedAt: new Date().toISOString()
        };
      }
    }
  } catch (_err) {
    // Fall back to tick simulation if offline or API blocked
  }

  // Fallback tick generator for offline / simulated execution
  const buffer = getPriceBuffer(normalized);
  if (buffer.length < 25) {
    let seedPrice = mockBaseline;
    for (let i = 0; i < 30; i++) {
      seedPrice = Number((seedPrice * (1 + (Math.random() - 0.49) * 0.015)).toFixed(2));
      buffer.push(seedPrice);
    }
  }
  const lastPrice = buffer.length > 0 ? buffer[buffer.length - 1] : mockBaseline;
  
  // Random walk: -1.5% to +1.5% tick change
  const deltaPercent = (Math.random() - 0.48) * 0.03;
  const newPrice = Number(Math.max(1, lastPrice * (1 + deltaPercent)).toFixed(2));

  recordPrice(normalized, newPrice);

  return {
    symbol: normalized,
    price: newPrice,
    source: "simulated_tick_feed",
    updatedAt: new Date().toISOString()
  };
}

export function createAutomatedQuoteProvider(stateQuotes) {
  return {
    name: "automated_multi_feed",
    async getQuote(symbol) {
      const quote = await fetchLiveQuote(symbol);
      stateQuotes[quote.symbol] = quote;
      return quote;
    }
  };
}
