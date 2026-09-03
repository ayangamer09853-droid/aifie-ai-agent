/**
 * Real Market Live Data & Execution Safety Verification Test
 * Connects to live public market data adapters (US Equities, Indian Stocks, Crypto 24/7)
 * and tests live broker safety gates against live price feeds.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { fetchLiveQuote, getPriceBuffer } from "../src/market-fetcher.mjs";
import { getLiveBrokerStatus, enableLiveTrading, placeLiveOrder } from "../src/live-broker.mjs";
import { fetchUniversalQuote } from "../src/universal-providers.mjs";

test("Real Market Check: Fetch live market quotes for US Equities (AAPL, TSLA)", async () => {
  const quoteAAPL = await fetchLiveQuote("AAPL");
  assert.equal(quoteAAPL.symbol, "AAPL");
  assert.ok(typeof quoteAAPL.price === "number" && quoteAAPL.price > 0, "AAPL price must be a positive number");

  const quoteTSLA = await fetchLiveQuote("TSLA");
  assert.equal(quoteTSLA.symbol, "TSLA");
  assert.ok(typeof quoteTSLA.price === "number" && quoteTSLA.price > 0, "TSLA price must be a positive number");
});

test("Real Market Check: Fetch live market quote for Crypto 24/7 (BTC)", async () => {
  const quoteBTC = await fetchUniversalQuote("BTC", "auto");
  assert.equal(quoteBTC.symbol, "BTC");
  assert.ok(typeof quoteBTC.price === "number" && quoteBTC.price > 0, "BTC price must be a positive number");
});

test("Real Market Check: Price buffer updates with live prices", async () => {
  const prices = getPriceBuffer("AAPL");
  assert.ok(Array.isArray(prices) && prices.length > 0, "Price buffer must contain historical/live price points");
  assert.ok(prices[prices.length - 1] > 0, "Latest price buffer entry must be positive");
});

test("Live Broker Safety Gate Check: Locked mode prevents unauthorized live execution", () => {
  const status = getLiveBrokerStatus();
  assert.equal(status.isLiveModeUnlocked, false, "Live mode must be locked by default for safety");

  assert.throws(
    () => placeLiveOrder({ symbol: "AAPL", side: "buy", quantity: 1, currentPrice: 150 }),
    /Live execution locked/,
    "Order placement must throw safety error when live mode is locked"
  );
});
