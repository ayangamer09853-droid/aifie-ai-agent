import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateVpinIndex
} from "../src/vpin-microstructure-toxicity-engine.mjs";
import {
  deployMicrostructureDefensiveHedge
} from "../src/microstructure-defensive-hedger.mjs";

test("VPIN engine computes volume buckets, BVC buy/sell volumes, and bounded VPIN index", () => {
  const vpin = calculateVpinIndex({ symbol: "BTC/USDT", bucketVolume: 50, numberOfBuckets: 50 });
  assert.equal(vpin.engineStatus, "VPIN_ENGINE_ACTIVE");
  assert.equal(vpin.symbol, "BTC/USDT");
  assert.ok(vpin.vpin >= 0.0 && vpin.vpin <= 1.0);
  assert.ok(vpin.recentBuckets.length > 0);
  assert.ok(["NORMAL_FLOW", "ELEVATED_VOLATILITY_FLOW", "TOXIC_INFORMED_FLOW"].includes(vpin.toxicityRegime));
});

test("Microstructure Defensive Hedger widens quotes and deploys hedge when flow is toxic", () => {
  const normal = deployMicrostructureDefensiveHedge({ symbol: "BTC/USDT", vpinOverride: 0.15 });
  assert.equal(normal.hedgerStatus, "NORMAL_MARKET_MAKING");
  assert.equal(normal.quoteSpreadMultiplier, 1.0);
  assert.equal(normal.protectiveHedgeExecuted, false);

  const toxic = deployMicrostructureDefensiveHedge({ symbol: "BTC/USDT", vpinOverride: 0.40 });
  assert.equal(toxic.hedgerStatus, "DEFENSIVE_SHIELD_DEPLOYED");
  assert.equal(toxic.quoteSpreadMultiplier, 2.5);
  assert.equal(toxic.cancelledRestingOrdersCount, 4);
  assert.equal(toxic.protectiveHedgeExecuted, true);
  assert.ok(toxic.hedgeOrder !== null);
});
