import test from "node:test";
import assert from "node:assert/strict";
import { getVelocityEngineStatus, executeAcceleratedMoneyMakingCycle } from "../src/high-frequency-velocity-engine.mjs";

test("getVelocityEngineStatus reports 250ms execution interval and 5.14x speed multiplier", () => {
  const v = getVelocityEngineStatus();
  assert.equal(v.velocityStatus, "ULTRA_HIGH_VELOCITY_ACTIVE_250MS");
  assert.equal(v.executionIntervalMs, 250);
  assert.equal(v.scansPerSecond, 4);
  assert.equal(v.flashLoanSizeUSD, "$500,000.00");
  assert.equal(v.acceleratedNetProfitPerFlashUSD, "$470.75");
});

test("executeAcceleratedMoneyMakingCycle executes 250ms accelerated high-frequency capture", () => {
  const cycle = executeAcceleratedMoneyMakingCycle();
  assert.equal(cycle.cycleStatus, "ACCELERATED_HIGH_FREQUENCY_CYCLE_EXECUTED");
  assert.equal(cycle.instantCapturedNetProfitUSD, "$470.75");
});
