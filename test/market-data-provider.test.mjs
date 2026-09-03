import test from "node:test";
import assert from "node:assert/strict";
import { fetchMarketQuote, getMarketDataProviderStatus } from "../src/market-data-provider-adapter.mjs";

test("fetchMarketQuote returns valid quote with provenance and freshness", () => {
  const quote = fetchMarketQuote({ symbol: "BTC/USDT", preferredProvider: "binance_public" });
  assert.equal(quote.success, true);
  assert.equal(quote.symbol, "BTC/USDT");
  assert.ok(quote.bid > 0);
  assert.ok(quote.ask >= quote.bid);
  assert.ok(quote.last > 0);
  assert.ok(quote.provenance);
  assert.equal(quote.provenance.isFresh, true);
  assert.ok(quote.provenance.quoteAgeMs <= 5000);
  assert.equal(quote.provenance.providerKey, "binance_public");
});

test("fetchMarketQuote falls back to mock if unknown provider is passed", () => {
  const quote = fetchMarketQuote({ symbol: "ETH/USDT", preferredProvider: "unknown_broken_feed" });
  assert.equal(quote.success, true);
  assert.equal(quote.provenance.providerKey, "mock_deterministic");
  assert.equal(quote.provenance.isFresh, true);
});

test("getMarketDataProviderStatus reports provider registry and rate limits", () => {
  const status = getMarketDataProviderStatus();
  assert.equal(status.status, "MARKET_DATA_PROVIDER_ADAPTER_OPERATIONAL");
  assert.ok(status.activeProviders.binance_public);
  assert.ok(status.stalenessPolicy.maxStalenessMs === 5000);
});
