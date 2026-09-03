import test from "node:test";
import assert from "node:assert/strict";
import { getOnlineCloudStatus, recordCloudKeepAlivePing, getOnlineDeploymentSteps } from "../src/online-cloud-service-relay.mjs";
import { zeroDepStreamHub } from "../src/zero-dependency-server.mjs";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

test("Online Cloud Service Relay reports online 24/7 services and records keep-alive pings", () => {
  const status = getOnlineCloudStatus();
  assert.equal(status.status, "ONLINE_CLOUD_RELAY_ACTIVE");
  assert.equal(status.cloudMode, "ZERO_LOCAL_DEPENDENCY_247");
  assert.equal(status.isZeroDependencyCompatible, true);
  assert.ok(status.supportedOnlineServices.length >= 4);

  const ping = recordCloudKeepAlivePing({ source: "CRON_JOB_TEST" });
  assert.equal(ping.success, true);
  assert.equal(ping.source, "CRON_JOB_TEST");
  assert.ok(ping.totalPings >= 1);
  assert.ok(typeof ping.pingTxHash === "string");

  const steps = getOnlineDeploymentSteps();
  assert.ok(steps.steps.length >= 3);
});

test("Zero-Dependency Native Streaming Hub manages clients and broadcasts events", () => {
  assert.ok(zeroDepStreamHub !== undefined);
  assert.equal(typeof zeroDepStreamHub.broadcast, "function");

  // Mock response object
  let writtenData = "";
  const mockRes = {
    writeHead: () => {},
    write: (chunk) => { writtenData += chunk; },
    on: () => {}
  };

  zeroDepStreamHub.addClient(mockRes);
  assert.ok(zeroDepStreamHub.getClientCount() >= 1);

  zeroDepStreamHub.broadcast("MARKET_TICK", { symbol: "AAPL", price: 326.5 });
  assert.ok(writtenData.includes("MARKET_TICK"));
  assert.ok(writtenData.includes("AAPL"));
});

test("24/7 Cloud Deployment Manifests (Dockerfile, render.yaml, GitHub Actions) exist and are valid", () => {
  const dockerfilePath = join(process.cwd(), "Dockerfile");
  assert.ok(existsSync(dockerfilePath), "Dockerfile must exist");
  const dockerfileContent = readFileSync(dockerfilePath, "utf-8");
  assert.ok(dockerfileContent.includes("node:22-alpine"));

  const renderYamlPath = join(process.cwd(), "render.yaml");
  assert.ok(existsSync(renderYamlPath), "render.yaml must exist");
  const renderContent = readFileSync(renderYamlPath, "utf-8");
  assert.ok(renderContent.includes("aifie-ai-agent-247"));

  const githubActionsPath = join(process.cwd(), ".github", "workflows", "aifie-247-cloud-daemon.yml");
  assert.ok(existsSync(githubActionsPath), "GitHub Actions workflow must exist");
  const ghContent = readFileSync(githubActionsPath, "utf-8");
  assert.ok(ghContent.includes("schedule:"));
  assert.ok(ghContent.includes("cloud-agent-swarm"));
});
