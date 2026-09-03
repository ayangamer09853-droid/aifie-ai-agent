import test from "node:test";
import assert from "node:assert/strict";
import { getZeroHumanStatus, runZeroHumanSelfRecovery, executeZeroHumanBankSweep } from "../src/zero-human-autonomous-sovereign-engine.mjs";

test("getZeroHumanStatus reports zero human requirement protocol telemetry", () => {
  const status = getZeroHumanStatus();
  assert.equal(status.zeroHumanStatus, "ZERO_HUMAN_AUTONOMOUS_SOVEREIGN_SYSTEM_OPTIMAL");
  assert.equal(status.protocolVersion, "ZERO_HUMAN_AUTONOMOUS_V69");
  assert.equal(status.humanInterventionRequirement, "0.00% (ZERO_HUMAN_REQUIREMENT_GUARANTEED)");
  assert.equal(status.zeroHumanUptimePercent, "100%");
});

test("runZeroHumanSelfRecovery executes autonomous self-healing recovery without human commands", () => {
  const recovery = runZeroHumanSelfRecovery({ faultType: "CLOUD_NODE_DISRUPTION" });
  assert.equal(recovery.recoveryStatus, "ZERO_HUMAN_SELF_RECOVERY_COMPLETED_SUCCESS");
  assert.equal(recovery.faultType, "CLOUD_NODE_DISRUPTION");
  assert.equal(recovery.humanInterventionRequired, false);
  assert.ok(recovery.recoveryTxHash.startsWith("0xZERO_HEAL_"));
});

test("executeZeroHumanBankSweep sweeps generated profits to Bank UPI hands-free", () => {
  const sweep = executeZeroHumanBankSweep({ targetUpiId: "user@upi", sweepAmountUSD: 0 });
  assert.equal(sweep.sweepStatus, "PAPER_SIMULATION_ZERO_REAL_MONEY_SWEPT");
  assert.equal(sweep.targetUpiId, "user@upi");
  assert.equal(sweep.sweptAmountUSD, "$0.00 USD");
  assert.ok(sweep.sweepTxHash.startsWith("0xAUTO_SWEEP_"));
});
