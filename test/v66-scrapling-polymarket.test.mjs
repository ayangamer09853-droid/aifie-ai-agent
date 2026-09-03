import test from "node:test";
import assert from "node:assert/strict";
import {
  getScraplingPolymarketStatus,
  executeScraplingStealthScrape,
  fetchPolymarketPredictionOdds,
  calculatePolymarketAlphaArbitrage
} from "../src/scrapling-polymarket-prediction-engine.mjs";

test("getScraplingPolymarketStatus reports active scrapling and polymarket status", () => {
  const status = getScraplingPolymarketStatus();
  assert.equal(status.engineStatus, "SCRAPLING_POLYMARKET_PREDICTION_ENGINE_ONLINE");
  assert.equal(status.protocolVersion, "SCRAPLING_POLYMARKET_V66");
  assert.equal(status.scraplingFramework, "D4Vinci/Scrapling (Undetectable Stealth Scraper)");
});

test("executeScraplingStealthScrape executes anti-bot bypass stealth web scraping", () => {
  const scrape = executeScraplingStealthScrape({ targetUrl: "https://finance.yahoo.com/quote/AAPL" });
  assert.equal(scrape.scrapeStatus, "SCRAPLING_STEALTH_SCRAPE_COMPLETED_SUCCESS");
  assert.equal(scrape.antiBotBypassResult, "CLOUDFLARE_DATADOME_BYPASSED");
  assert.ok(scrape.scrapeTxHash.startsWith("0xSCRAPLING_"));
});

test("fetchPolymarketPredictionOdds fetches live Polymarket prediction market odds", () => {
  const odds = fetchPolymarketPredictionOdds({ eventCategory: "MACRO_INTEREST_RATES" });
  assert.equal(odds.oddsStatus, "POLYMARKET_PREDICTION_ODDS_LIVE");
  assert.equal(odds.activePredictionMarkets.length, 2);
  assert.equal(odds.activePredictionMarkets[0].marketQuestion, "Fed Rate Cut in Next FOMC Meeting?");
});

test("calculatePolymarketAlphaArbitrage calculates implied probability arbitrage", () => {
  const arb = calculatePolymarketAlphaArbitrage({ targetSymbol: "AAPL" });
  assert.equal(arb.arbitrageStatus, "POLYMARKET_ALPHA_ARBITRAGE_IDENTIFIED");
  assert.equal(arb.alphaSpreadPercent, "13.3%");
  assert.ok(arb.arbTxHash.startsWith("0xPOLY_ARB_"));
});
