import test from "node:test";
import assert from "node:assert/strict";
import { createManualQuoteProvider, getFreshQuote } from "../src/market-data.mjs";

test("manual provider returns attributable fresh quote data", async () => {
  const now = Date.parse("2026-08-28T10:00:00.000Z");
  const provider = createManualQuoteProvider({ AAPL: { price: 100, source: "test", updatedAt: "2026-08-28T09:59:30.000Z" } });
  const quote = await getFreshQuote(provider, "aapl", { now });
  assert.equal(quote.provider, "manual_local");
  assert.equal(quote.ageMs, 30000);
});

test("market data rejects stale quotes", async () => {
  const provider = createManualQuoteProvider({ AAPL: { price: 100, updatedAt: "2026-08-28T09:58:00.000Z" } });
  await assert.rejects(() => getFreshQuote(provider, "AAPL", { now: Date.parse("2026-08-28T10:00:00.000Z") }), /stale/);
});
