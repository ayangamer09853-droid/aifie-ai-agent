import test from "node:test";
import assert from "node:assert/strict";
import { openHandsControlGateway, OpenHandsControlGateway } from "../src/integrations/openhands-control-gateway.mjs";
import { handleTradingSuiteCommand } from "../src/telegram-trading-suite.mjs";
import { createServer } from "node:http";
import { app } from "../server.mjs";

test("OpenHandsControlGateway: initializes and reports source repository presence", () => {
  const status = openHandsControlGateway.getStatus();
  assert.equal(status.service, "OpenHandsControlGateway");
  assert.equal(status.sourceAvailable, true);
  assert.ok(status.sourcePath.includes("sources"));
  assert.equal(status.userEmail, "m69249661@gmail.com");
  assert.ok(Array.isArray(status.capabilities));
});

test("OpenHandsControlGateway: executeAction handles CMD_RUN with live stdout", async () => {
  const res = await openHandsControlGateway.executeAction({
    action: "CMD_RUN",
    args: { command: "node --version" }
  });

  assert.equal(res.action, "CMD_RUN");
  assert.equal(res.observation.observationType, "CMD_OUTPUT_OBSERVATION");
  assert.equal(res.observation.exitCode, 0);
  assert.match(res.observation.stdout, /^v\d+\./);
});

test("OpenHandsControlGateway: executeAction handles FILE_READ and FILE_WRITE", async () => {
  const gateway = new OpenHandsControlGateway();
  
  // 1. FILE_WRITE to scratch
  const writeRes = await gateway.executeAction({
    action: "FILE_WRITE",
    args: { path: "data/openhands-test.txt", content: "OpenHands autonomous control active." }
  });
  assert.equal(writeRes.observation.status, "SUCCESS");

  // 2. FILE_READ
  const readRes = await gateway.executeAction({
    action: "FILE_READ",
    args: { path: "data/openhands-test.txt", startLine: 1, maxLines: 5 }
  });
  assert.equal(readRes.observation.observationType, "FILE_CONTENT_OBSERVATION");
  assert.equal(readRes.observation.content, "OpenHands autonomous control active.");
});

test("OpenHandsControlGateway: executeAction handles AGENT_THINK cognitive step", async () => {
  const res = await openHandsControlGateway.executeAction({
    action: "AGENT_THINK",
    args: { thought: "Evaluating market volatility across all 60 sources.", context: { symbol: "BTCUSDT" } }
  });

  assert.equal(res.observation.observationType, "AGENT_THINK_OBSERVATION");
  assert.match(res.observation.thought, /Evaluating market volatility/);
});

test("OpenHandsControlGateway: runAutonomousCycle executes multi-step planning loop", async () => {
  const res = await openHandsControlGateway.runAutonomousCycle({
    goal: "Verify node runtime environment and report status.",
    maxSteps: 3
  });

  assert.equal(res.success, true);
  assert.equal(res.totalStepsExecuted, 3);
  assert.equal(res.goal, "Verify node runtime environment and report status.");
});

test("Telegram Trading Suite: /openhands command returns interactive control dashboard", async () => {
  const res = await handleTradingSuiteCommand("/openhands", {});
  assert.equal(res.handled, true);
  assert.match(res.response.text, /OPENHANDS AUTONOMOUS FULL CONTROL GATEWAY/);
  assert.match(res.response.text, /m69249661@gmail\.com/);
});

test("Server REST Gateway: /api/openhands endpoints respond correctly", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" ? address.port : 8787;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /api/openhands/status
    const statusRes = await fetch(`${baseUrl}/api/openhands/status`);
    assert.equal(statusRes.status, 200);
    const statusJson = await statusRes.json();
    assert.equal(statusJson.service, "OpenHandsControlGateway");
    assert.equal(statusJson.sourceAvailable, true);

    // 2. POST /api/openhands/action
    const actionRes = await fetch(`${baseUrl}/api/openhands/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "AGENT_THINK", args: { thought: "REST action test." } })
    });
    assert.equal(actionRes.status, 200);
    const actionJson = await actionRes.json();
    assert.equal(actionJson.action, "AGENT_THINK");

    // 3. GET /api/openhands/events
    const eventsRes = await fetch(`${baseUrl}/api/openhands/events`);
    assert.equal(eventsRes.status, 200);
    const eventsJson = await eventsRes.json();
    assert.ok(Array.isArray(eventsJson.events));
  } finally {
    server.close();
  }
});
