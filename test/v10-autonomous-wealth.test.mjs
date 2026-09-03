import test from "node:test";
import assert from "node:assert/strict";
import { runAutonomousWealthCycle } from "../src/autonomous-wealth-generator.mjs";
import { enableLiveTrading, disableLiveTrading, getLiveBrokerStatus, placeLiveOrder } from "../src/live-broker.mjs";

test("runAutonomousWealthCycle executes autonomous freedom loop and calculates profit compounding", () => {
  const wealth = runAutonomousWealthCycle({ portfolioEquity: 120000, realizedPnl: 10000 });
  assert.equal(wealth.engineStatus, "SOVEREIGN_AUTONOMOUS_FREEDOM_ACTIVE");
  assert.ok(wealth.highWaterMark);
  assert.ok(wealth.treasuryPartitioning.profitVault);
  assert.equal(wealth.compoundingTier, "EXPANDED_COMPOUNDING_ACTIVE (+10% Capacity Boost)");
});

test("live broker gateway safety prevents unauthorized live execution without user confirmation", () => {
  disableLiveTrading();
  assert.throws(() => placeLiveOrder({ symbol: "AAPL", side: "buy", quantity: 1, price: 150 }), /Live execution locked/);

  assert.throws(() => enableLiveTrading(false), /requires explicit user confirmation/);

  enableLiveTrading(true);
  const status = getLiveBrokerStatus();
  assert.equal(status.isLiveModeUnlocked, true);

  const fill = placeLiveOrder({ symbol: "AAPL", side: "buy", quantity: 2, price: 150 });
  assert.equal(fill.status, "FILLED");
  assert.equal(fill.symbol, "AAPL");

  disableLiveTrading();
});
