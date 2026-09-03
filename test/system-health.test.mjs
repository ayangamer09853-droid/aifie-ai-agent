import test from "node:test";
import assert from "node:assert/strict";
import { getSystemHealthOverview, runSystemSelfDiagnostics } from "../src/system-health.mjs";

test("getSystemHealthOverview computes overall health score and telemetry metrics", () => {
  const health = getSystemHealthOverview();
  assert.ok(health.overallHealthScore >= 0 && health.overallHealthScore <= 100);
  assert.ok(["HEALTHY", "DEGRADED", "CRITICAL"].includes(health.statusLabel));
  assert.ok(health.ramUsageMB > 0);
  assert.ok(health.uptimeSeconds >= 0);
  assert.ok(Array.isArray(health.components));
  assert.ok(health.components.length >= 8);

  for (const comp of health.components) {
    assert.ok(comp.id);
    assert.ok(comp.name);
    assert.ok(["WORKING", "WARNING", "ERROR", "OFFLINE"].includes(comp.status));
    assert.ok(typeof comp.latencyMs === "number");
  }
});

test("runSystemSelfDiagnostics triggers comprehensive system self-test sweep", () => {
  const result = runSystemSelfDiagnostics();
  assert.ok(result.diagnosticId);
  assert.equal(result.status, "COMPLETED");
  assert.ok(result.diagnosticsResult.message.includes("Self-diagnostic sweep completed"));
  assert.ok(result.systemOverview.overallHealthScore >= 0);
});
