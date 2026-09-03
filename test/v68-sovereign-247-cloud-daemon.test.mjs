import test from "node:test";
import assert from "node:assert/strict";
import {
  get247CloudKeepAliveStatus,
  syncTo247CloudHost,
  triggerEdgeKeepAliveHeartbeat,
  getCloudHostDeploymentGuide
} from "../src/sovereign-247-cloud-daemon-keepalive.mjs";

test("get247CloudKeepAliveStatus reports active multi-cloud keep-alive status", () => {
  const status = get247CloudKeepAliveStatus();
  assert.equal(status.engineStatus, "SOVEREIGN_247_CLOUD_DAEMON_KEEPALIVE_ONLINE");
  assert.equal(status.protocolVersion, "SOVEREIGN_247_CLOUD_KEEPALIVE_V68");
  assert.equal(status.pcPowerOffOperationGuarantee, "100.00% (ZERO_LOCAL_PC_DEPENDENCY)");
  assert.equal(status.connectedCloudProviders.length, 3);
});

test("syncTo247CloudHost synchronizes AI agent to 24/7 cloud host", () => {
  const sync = syncTo247CloudHost({ cloudProvider: "ORACLE_CLOUD", targetUpiId: "user@upi" });
  assert.equal(sync.syncStatus, "CLOUD_HOST_SYNCHRONIZATION_SUCCESS");
  assert.equal(sync.cloudProvider, "ORACLE_CLOUD");
  assert.equal(sync.targetUpiId, "user@upi");
  assert.ok(sync.syncTxHash.startsWith("0xCLOUD_SYNC_"));
});

test("triggerEdgeKeepAliveHeartbeat increments cloud keep-alive heartbeats", () => {
  const hb1 = triggerEdgeKeepAliveHeartbeat();
  const hb2 = triggerEdgeKeepAliveHeartbeat();
  assert.equal(hb2.currentHeartbeatCount, hb1.currentHeartbeatCount + 1);
  assert.ok(hb2.heartbeatHash.startsWith("0xCLOUD_BEAT_"));
});

test("getCloudHostDeploymentGuide provides deployment steps for 24/7 uptime when PC is off", () => {
  const guide = getCloudHostDeploymentGuide();
  assert.equal(guide.guideTitle, "How to Keep Aifie AI Agent Running 24/7 When Your PC is OFF");
  assert.ok(guide.recommendedMethods.length >= 2);
});
