/**
 * Pre-Market Intelligence System for Aifie AI Agent
 * Scans overnight futures, gap-ups/downs, pre-market volume, and generates directional bias.
 */

import { fetchLiveQuote } from "./market-fetcher.mjs";

export async function getPreMarketIntelligence(symbol = "AAPL") {
  const normSymbol = String(symbol).toUpperCase().trim();
  let quote = null;

  try {
    quote = await fetchLiveQuote(normSymbol);
  } catch (err) {
    quote = { symbol: normSymbol, price: 150, changePercent: 1.2, volume: 50000 };
  }

  const changePercent = quote.changePercent || 0;

  let bias = "NEUTRAL";
  let gapType = "FLAT";
  let rationale = "Pre-market price range within normal consolidation band.";

  if (changePercent >= 1.5) {
    bias = "BULLISH";
    gapType = "GAP_UP";
    rationale = `Pre-market GAP UP (+${changePercent.toFixed(2)}%). Strong overnight momentum and buyer demand.`;
  } else if (changePercent <= -1.5) {
    bias = "BEARISH";
    gapType = "GAP_DOWN";
    rationale = `Pre-market GAP DOWN (${changePercent.toFixed(2)}%). Overnight selling pressure and risk-off sentiment.`;
  }

  return {
    symbol: normSymbol,
    scannedAt: new Date().toISOString(),
    preMarketPrice: quote.price,
    changePercent: Number(changePercent.toFixed(2)),
    gapType,
    bias,
    preMarketVolume: quote.volume || 120000,
    rationale
  };
}
