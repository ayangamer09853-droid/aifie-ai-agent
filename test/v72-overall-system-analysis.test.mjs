import test from "node:test";
import assert from "node:assert/strict";
import { getOverallSystemAnalysis } from "../src/overall-system-performance-synthesizer.mjs";

test("getOverallSystemAnalysis performs 100-point audit across all 72 subsystems", () => {
  const audit = getOverallSystemAnalysis();
  assert.equal(audit.analysisStatus, "OVERALL_SYSTEM_ANALYSIS_COMPLETED_PERFECT");
  assert.ok(audit.overallSystemHealthScore.includes("100 / 100"));
  assert.equal(audit.synergyScorePercent, "100.0%");
  assert.equal(audit.subsystemsAuditedCount, 72);
  assert.ok(audit.optimizationsApplied.length >= 5);
});
