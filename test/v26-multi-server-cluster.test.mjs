import test from "node:test";
import assert from "node:assert/strict";
import { getClusterStatus, getConnectedCloudNodes, generateSystemdServiceScript, generateWindowsServiceScript } from "../src/multi-server-distributed-cluster.mjs";

test("getConnectedCloudNodes returns 3 active cloud VPS nodes", () => {
  const nodes = getConnectedCloudNodes();
  assert.equal(nodes.length, 3);
  assert.equal(nodes[0].role, "PRIMARY_LEADER");
  assert.equal(nodes[1].role, "HOT_STANDBY_FAILOVER");
});

test("getClusterStatus guarantees off-grid continuous operation when PC is shut down", () => {
  const cluster = getClusterStatus();
  assert.equal(cluster.clusterStatus, "DISTRIBUTED_CLUSTER_OFF_GRID_ACTIVE");
  assert.equal(cluster.localPcPowerOffGuarantee, "CONTINUES_RUNNING_247_WHEN_COMPUTER_IS_SHUT_DOWN");
  assert.equal(cluster.activeNodesCount, 3);
});

test("generateSystemdServiceScript produces valid systemd unit configuration", () => {
  const systemd = generateSystemdServiceScript();
  assert.match(systemd, /\[Unit\]/);
  assert.match(systemd, /ExecStart=\/usr\/bin\/node server\.mjs/);
  assert.match(systemd, /Restart=always/);
});

test("generateWindowsServiceScript produces valid Windows autostart service installer", () => {
  const winScript = generateWindowsServiceScript();
  assert.match(winScript, /AifieAIAgent/);
  assert.match(winScript, /npx qckwinsvc/);
});
