import test from "node:test";
import assert from "node:assert/strict";
import { getServerHardwareMetrics, optimizeServerEnergyLoad } from "../src/hardware-energy-manager.mjs";
import { getDeFiYieldHarvestStatus, runYieldCompoundingCycle } from "../src/decentralized-autonomous-bank.mjs";

test("getServerHardwareMetrics reports optimal CPU/RAM and thermal efficiency", () => {
  const hw = getServerHardwareMetrics();
  assert.equal(hw.serverStatus, "OPTIMAL_PERFORMANCE");
  assert.ok(hw.vpsInstance);
  assert.ok(hw.cpuTemperatureCelsius < 80);
});

test("optimizeServerEnergyLoad balances hardware load and thread allocation", () => {
  const opt = optimizeServerEnergyLoad();
  assert.equal(opt.optimizationStatus, "HARDWARE_ENERGY_LOAD_BALANCED");
  assert.ok(opt.allocatedThreads);
});

test("getDeFiYieldHarvestStatus tracks cross-chain liquidity staking yield", () => {
  const bank = getDeFiYieldHarvestStatus();
  assert.equal(bank.bankStatus, "DEFI_YIELD_FARMING_ACTIVE");
  assert.equal(bank.totalStakedReservesUSD, "$50,000.00");
  assert.equal(bank.blendedAnnualYieldApy, "5.82%");
});
