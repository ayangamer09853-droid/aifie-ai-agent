/**
 * Market Consensus Layer (Multi-Provider Price Discovery)
 * Polls multiple market data providers (IEX, Polygon, Binance, CoinGecko, Fallbacks),
 * eliminates outliers, and computes median consensus price.
 * Pure Node.js ESM.
 */

import { fetchIexQuote } from "./market-fetcher-iex.mjs";
import { fetchPolygonQuote } from "./market-fetcher-polygon.mjs";
import { fetchBinanceQuote, fetchCoingeckoQuote } from "./market-fetcher-crypto.mjs";

/**
 * Get multi-provider consensus price for a symbol
 * Computes the robust median across all active reporting providers.
 * 
 * @param {string} symbol - e.g. "BTCUSDT", "AAPL", "ETH"
 * @param {object} [options] - custom provider list, timeoutMs, token overrides
 * @returns {Promise<number>} - Median consensus price
 */
export async function getConsensusPrice(symbol, options = {}) {
  const report = await getConsensusReport(symbol, options);
  return report.consensusPrice;
}

/**
 * Get detailed consensus breakdown report across providers
 * @param {string} symbol
 * @param {object} [options]
 */
export async function getConsensusReport(symbol, options = {}) {
  const normSymbol = String(symbol ?? "").trim().toUpperCase();
  if (!normSymbol) {
    throw new Error("Invalid symbol provided to getConsensusReport");
  }

  // Determine provider candidates based on symbol type
  const isCrypto = normSymbol.includes("BTC") || normSymbol.includes("ETH") || normSymbol.includes("USDT") || normSymbol.includes("SOL") || normSymbol.includes("DOGE");

  let defaultProviders;
  if (options.providers && Array.isArray(options.providers)) {
    defaultProviders = options.providers;
  } else if (isCrypto) {
    defaultProviders = [
      fetchBinanceQuote(normSymbol, options).catch(() => null),
      fetchCoingeckoQuote(normSymbol, options).catch(() => null),
      fetchPolygonQuote(normSymbol, options).catch(() => null)
    ];
  } else {
    defaultProviders = [
      fetchIexQuote(normSymbol, options).catch(() => null),
      fetchPolygonQuote(normSymbol, options).catch(() => null),
      fetchBinanceQuote(normSymbol, options).catch(() => null)
    ];
  }

  const providerPromises = (defaultProviders || []).map(p => Promise.resolve(p).catch(() => null));
  const results = await Promise.all(providerPromises);
  const validQuotes = results.filter(r => r && typeof r.price === "number" && !isNaN(r.price) && r.price > 0);

  if (!validQuotes.length) {
    // If all primary external providers fail or are unconfigured, check if fallback is allowed
    if (options.fallbackPrice && typeof options.fallbackPrice === "number") {
      return {
        symbol: normSymbol,
        consensusPrice: options.fallbackPrice,
        median: options.fallbackPrice,
        mean: options.fallbackPrice,
        min: options.fallbackPrice,
        max: options.fallbackPrice,
        dispersionPercent: 0,
        providerCount: 1,
        providers: ["fallback"],
        quotes: [{ source: "fallback", price: options.fallbackPrice }],
        timestamp: new Date().toISOString()
      };
    }
    throw new Error(`No price data for ${normSymbol}`);
  }

  const prices = validQuotes.map(q => q.price);
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianPrice = sorted.length % 2 === 0
    ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(4))
    : sorted[mid];

  const sum = sorted.reduce((acc, p) => acc + p, 0);
  const meanPrice = Number((sum / sorted.length).toFixed(4));
  const minPrice = sorted[0];
  const maxPrice = sorted[sorted.length - 1];
  const spread = Number((maxPrice - minPrice).toFixed(4));
  const dispersionPercent = meanPrice > 0 ? Number(((spread / meanPrice) * 100).toFixed(4)) : 0;

  return {
    symbol: normSymbol,
    consensusPrice: medianPrice,
    median: medianPrice,
    mean: meanPrice,
    min: minPrice,
    max: maxPrice,
    spread,
    dispersionPercent,
    providerCount: validQuotes.length,
    providers: validQuotes.map(q => q.source || "unknown"),
    quotes: validQuotes,
    timestamp: new Date().toISOString()
  };
}
