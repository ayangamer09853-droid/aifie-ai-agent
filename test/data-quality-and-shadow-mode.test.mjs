// @ts-check
import test from "node:test";
import assert from "node:assert/strict";
import { DataQualityGate } from "../src/market/data-quality-gate.mjs";
import { ShadowModeEngine } from "../src/execution/shadow-mode-engine.mjs";

test("DataQualityGate: passes fresh valid ticks with monotonically increasing sequence", () => {
  const gate = new DataQualityGate();
  const now = Date.now();

  const res1 = gate.validateTick({ symbol: "BTCUSDT", price: 65000, timestamp: now, sequence: 100 });
  assert.equal(res1.valid, true);
  assert.equal(res1.status, "SAFE");
  assert.equal(res1.sanitizedTick.symbol, "BTCUSDT");

  const res2 = gate.validateTick({ symbol: "BTCUSDT", price: 65100, timestamp: now + 50, sequence: 101 });
  assert.equal(res2.valid, true);
  assert.equal(res2.status, "SAFE");
});

test("DataQualityGate: flags stale ticks and sequence gaps as UNSAFE", () => {
  const gate = new DataQualityGate({ maxStalenessMs: 5000 });
  const now = Date.now();

  // 1. Stale tick (10 seconds old)
  const staleRes = gate.validateTick({ symbol: "ETHUSDT", price: 3500, timestamp: now - 10000, sequence: 1 });
  assert.equal(staleRes.valid, false);
  assert.equal(staleRes.status, "UNSAFE");
  assert.ok(staleRes.reasons.some(r => r.includes("STALE_QUOTE_LATENCY")));

  // 2. Sequence gap
  gate.validateTick({ symbol: "SOLUSDT", price: 150, timestamp: now, sequence: 10 });
  const gapRes = gate.validateTick({ symbol: "SOLUSDT", price: 150.5, timestamp: now + 10, sequence: 15 }); // Jumped from 10 to 15
  assert.equal(gapRes.valid, false);
  assert.equal(gapRes.status, "UNSAFE");
  assert.ok(gapRes.reasons.some(r => r.includes("SEQUENCE_GAP_DETECTED")));
});

test("DataQualityGate: detects sudden flash spikes exceeding deviation threshold", () => {
  const gate = new DataQualityGate({ maxPriceDeviationPercent: 10 });
  const now = Date.now();

  gate.validateTick({ symbol: "AAPL", price: 150, timestamp: now, sequence: 1 });
  // Price jumps from 150 to 195 (30% spike)
  const spikeRes = gate.validateTick({ symbol: "AAPL", price: 195, timestamp: now + 100, sequence: 2 });
  assert.equal(spikeRes.valid, false);
  assert.equal(spikeRes.status, "UNSAFE");
  assert.ok(spikeRes.reasons.some(r => r.includes("PRICE_DEVIATION_SPIKE")));
});

test("ShadowModeEngine: records counterfactual trades with slippage and tracks equity", () => {
  const shadow = new ShadowModeEngine({ startingCapital: 100000, slippageRate: 0.001, commissionRate: 0.001 });

  // Buy 1 BTC @ $60,000 (effective price = $60,060 with slippage)
  const order = shadow.recordShadowOrder({
    symbol: "BTCUSDT",
    side: "BUY",
    quantity: 1,
    price: 60000,
    strategy: "trend-v1"
  });

  assert.equal(order.symbol, "BTCUSDT");
  assert.equal(order.effectivePrice, 60060);
  assert.ok(order.counterfactualNarrative.includes("[SHADOW MODE] Would have executed BUY"));

  let status = shadow.getStatus();
  assert.equal(status.positions.length, 1);
  assert.equal(status.positions[0].quantity, 1);

  // Price rises to $65,000
  shadow.updateMarketPrice("BTCUSDT", 65000);
  status = shadow.getStatus();
  assert.ok(status.totalUnrealizedPnl > 4000);

  // Sell 1 BTC @ $65,000
  shadow.recordShadowOrder({
    symbol: "BTCUSDT",
    side: "SELL",
    quantity: 1,
    price: 65000,
    strategy: "trend-v1"
  });

  status = shadow.getStatus();
  assert.equal(status.positions.length, 0); // Position closed
  assert.equal(status.closedTradesCount, 1);
  assert.ok(status.totalRealizedPnl > 4000);
  assert.equal(status.winRatePercent, 100);
});
