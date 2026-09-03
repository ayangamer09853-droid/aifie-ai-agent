import test from "node:test";
import assert from "node:assert/strict";
import { accountSnapshot, createPaperState, placePaperOrder, setQuote } from "../src/paper-engine.mjs";

test("paper engine applies slippage, commission, and records a position", () => {
  const state = createPaperState();
  setQuote(state, { symbol: "AAPL", price: 100, source: "test" });
  const fill = placePaperOrder(state, { symbol: "AAPL", side: "buy", quantity: 10 });
  assert.equal(fill.status, "simulated");
  assert.equal(state.account.positions.AAPL.quantity, 10);
  assert.ok(accountSnapshot(state).cash < 99000);
});

test("paper engine rejects a trade without a quote", () => {
  assert.throws(() => placePaperOrder(createPaperState(), { symbol: "AAPL", side: "buy", quantity: 1 }), /price/);
});

test("paper engine rejects position sizes over the risk limit", () => {
  const state = createPaperState();
  setQuote(state, { symbol: "AAPL", price: 1000 });
  assert.throws(() => placePaperOrder(state, { symbol: "AAPL", side: "buy", quantity: 11 }), /notional/);
});

test("paper engine rejects stale quote execution", () => {
  const state = createPaperState();
  setQuote(state, { symbol: "AAPL", price: 100 });
  state.quotes.AAPL.updatedAt = "2020-01-01T00:00:00.000Z";
  assert.throws(() => placePaperOrder(state, { symbol: "AAPL", side: "buy", quantity: 1 }), /stale/);
});

test("paper engine accepts crypto pairs with slash and dash as well as dot symbols", () => {
  const state = createPaperState();
  const q1 = setQuote(state, { symbol: "BTC/USDT", price: 65000 });
  assert.equal(q1.price, 65000);
  assert.ok(state.quotes["BTC/USDT"]);

  const q2 = setQuote(state, { symbol: "ETH-USD", price: 3500 });
  assert.equal(q2.price, 3500);
  assert.ok(state.quotes["ETH-USD"]);

  const q3 = setQuote(state, { symbol: "BRK.A", price: 500000 });
  assert.equal(q3.price, 500000);
  assert.ok(state.quotes["BRK.A"]);
});
