import test from "node:test";
import assert from "node:assert/strict";
import { fetchUniversalNews, fetchUniversalQuote, getUniversalProvidersStatus, UNIVERSAL_PROVIDERS } from "../src/universal-providers.mjs";

test("UNIVERSAL_PROVIDERS contains 35+ market APIs across 5 categories", () => {
  assert.ok(UNIVERSAL_PROVIDERS.length >= 35);
  const categories = new Set(UNIVERSAL_PROVIDERS.map(p => p.category));
  assert.ok(categories.has("INDIAN_STOCKS"));
  assert.ok(categories.has("US_STOCKS"));
  assert.ok(categories.has("CRYPTO"));
  assert.ok(categories.has("FOREX_COMMODITIES"));
  assert.ok(categories.has("NEWS_SENTIMENT"));
});

test("getUniversalProvidersStatus reports provider health and fallback chain", () => {
  const status = getUniversalProvidersStatus();
  assert.ok(status.totalProviders >= 35);
  assert.ok(status.activeOnlineProviders >= 7);
  assert.ok(Array.isArray(status.fallbackChain));
});

test("fetchUniversalQuote normalizes quotes with provider attribution", async () => {
  const res = await fetchUniversalQuote("RELIANCE.NS", "yahoo_finance_nse");
  assert.equal(res.symbol, "RELIANCE.NS");
  assert.ok(typeof res.price === "number");
  assert.ok(res.providerUsed);
});

test("fetchUniversalNews aggregates headlines across multiple financial news feeds", () => {
  const news = fetchUniversalNews("Crypto");
  assert.equal(news.topic, "Crypto");
  assert.ok(Array.isArray(news.articles));
  assert.ok(news.articles.length >= 5);
});
