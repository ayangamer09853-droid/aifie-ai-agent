import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";
import {
  detectHostingEnvironment,
  getCloudSovereignNodeStatus,
  startCloudKeepAliveDaemon,
  stopCloudKeepAliveDaemon,
  get1ClickCloudDeploymentBlueprints
} from "../src/cloud-independent-sovereign-node.mjs";

test("detectHostingEnvironment correctly evaluates hosting context", () => {
  const env = detectHostingEnvironment();
  assert.ok(env.platform);
  assert.equal(typeof env.isCloud, "boolean");
});

test("getCloudSovereignNodeStatus provides full 24/7 cloud autonomy status", () => {
  const status = getCloudSovereignNodeStatus();
  assert.equal(status.status, "CLOUD_SOVEREIGN_NODE_ONLINE");
  assert.equal(status.version, "AIFIE_APEX_CLOUD_V100");
  assert.ok(status.perpetualUptime.uptimeSeconds >= 0);
  assert.ok(status.cloudAutonomyGuarantees.length >= 4);
  assert.ok(status.recommendedFreeClouds.length >= 3);
});

test("startCloudKeepAliveDaemon and stop manage anti-sleep pinger cleanly", () => {
  const startRes = startCloudKeepAliveDaemon({ intervalMs: 600000 });
  assert.equal(startRes.status, "CLOUD_KEEP_ALIVE_STARTED");

  const stopRes = stopCloudKeepAliveDaemon();
  assert.equal(stopRes.status, "CLOUD_KEEP_ALIVE_STOPPED");
});

test("get1ClickCloudDeploymentBlueprints returns valid templates for Render, Railway, and Oracle", () => {
  const bps = get1ClickCloudDeploymentBlueprints();
  assert.ok(bps.render);
  assert.equal(bps.render.platform, "Render.com");
  assert.ok(bps.railway);
  assert.equal(bps.railway.platform, "Railway.app");
  assert.ok(bps.oracleVps);
  assert.equal(bps.oracleVps.platform, "Oracle Cloud Free Tier");
});

test("Apex v100 Cloud Sovereign Node HTTP endpoints respond with 200 OK", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const statusRes = await fetch(`${baseUrl}/api/v100/cloud/status`);
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.status, "CLOUD_SOVEREIGN_NODE_ONLINE");

    const bpRes = await fetch(`${baseUrl}/api/v100/cloud/blueprints`);
    assert.equal(bpRes.status, 200);
    const bpData = await bpRes.json();
    assert.ok(bpData.render);

    const kaRes = await fetch(`${baseUrl}/api/v100/cloud/keepalive`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intervalMs: 600000 })
    });
    assert.equal(kaRes.status, 200);
    const kaData = await kaRes.json();
    assert.ok(kaData.status);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
