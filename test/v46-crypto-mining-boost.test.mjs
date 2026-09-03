import test from "node:test";
import assert from "node:assert/strict";
import { getMiningSpeedBoosterStatus, activateMultiServiceSpeedBoost, getMiningProfitBreakdown } from "../src/crypto-mining-speed-booster-engine.mjs";

test("getMiningSpeedBoosterStatus reports active connection across 5 cloud hashing platforms", () => {
  const status = getMiningSpeedBoosterStatus();
  assert.equal(status.boosterEngineStatus, "MULTI_SERVICE_MINING_SPEED_BOOSTER_ACTIVE");
  assert.equal(status.activeMiningServicesCount, 5);
  assert.equal(status.boostedHashrateMh, 12500);
});

test("activateMultiServiceSpeedBoost accelerates hash rate speed up to 12.5 GH/s", () => {
  const res = activateMultiServiceSpeedBoost({ targetCoin: "KASPA" });
  assert.equal(res.boostStatus, "MULTI_SERVICE_MINING_SPEED_BOOST_ACTIVATED");
  assert.equal(res.targetCoin, "KASPA");
  assert.ok(res.boostedHashrate.includes("12.5 GH/s"));
  assert.equal(res.estimatedDailyPayout.revenueUSD, "$0.00 (Paper Simulation Mode)");
});

test("getMiningProfitBreakdown reports multi-coin revenue allocation", () => {
  const breakdown = getMiningProfitBreakdown();
  assert.equal(breakdown.coins.length, 3);
  assert.equal(breakdown.totalEstDailyUsd, "$0.00 (Paper Simulation Mode)");
});
