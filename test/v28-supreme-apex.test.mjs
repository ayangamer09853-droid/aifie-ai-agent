import test from "node:test";
import assert from "node:assert/strict";
import { getApexGrandmasterStatus, runSupremeApexAudit, runUniversalHyperOptimization } from "../src/supreme-apex-grandmaster-synthesizer.mjs";

test("getApexGrandmasterStatus reports optimal state and 29 audited subsystems", () => {
  const status = getApexGrandmasterStatus();
  assert.equal(status.apexStatus, "SUPREME_APEX_GRANDMASTER_OPTIMAL");
  assert.equal(status.auditedSubsystemsCount, 29);
  assert.equal(status.subsystemAuditRegistry.length, 29);
});

test("runSupremeApexAudit verifies 100% PASS across all 29 core sub-engines", () => {
  const audit = runSupremeApexAudit();
  assert.equal(audit.auditVerdict, "ALL_29_SUBSYSTEMS_OPERATING_AT_SUPREME_APEX_EFFICIENCY");
  assert.equal(audit.auditedSubsystemsCount, 29);
});

test("runUniversalHyperOptimization tunes system parameters to 100% synergy score", () => {
  const opt = runUniversalHyperOptimization();
  assert.equal(opt.optimizationVerdict, "UNIVERSAL_HYPER_OPTIMIZATION_COMPLETED");
  assert.equal(opt.apexSynergyScore, "100.00 / 100 (PERFECT_APEX_SYNTHESIS)");
  assert.ok(opt.tunedParameters.length >= 5);
});
