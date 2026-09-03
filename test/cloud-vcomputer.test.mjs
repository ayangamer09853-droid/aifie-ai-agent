import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  getCloudVComputerStatus,
  executeCloudTerminalCommand,
  cloudBrowseUrl,
  getCloudVComputerConfig,
  aifieExecuteAutonomousTerminalTask,
  aifieAutonomousWebInvestigation,
  aifieManageCloudWorkstation,
  aifieGetAutonomousAgentUsageSummary
} from "../src/cloud-vcomputer.mjs";

let server;
let baseUrl;

test.before(async () => {
  // Create an isolated HTTP test server implementing the vcomputer routes
  server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/api/vcomputer/status") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(getCloudVComputerStatus()));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/vcomputer/config") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(getCloudVComputerConfig()));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/vcomputer/terminal/exec") {
      let body = "";
      req.on("data", c => { body += c; });
      req.on("end", async () => {
        const payload = JSON.parse(body || "{}");
        const out = await executeCloudTerminalCommand(payload.command, payload.cwd);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(out));
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/vcomputer/browser/browse") {
      let body = "";
      req.on("data", c => { body += c; });
      req.on("end", async () => {
        const payload = JSON.parse(body || "{}");
        const out = await cloudBrowseUrl(payload.url);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(out));
      });
      return;
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html><head><title>Aifie Test Portal</title></head><body><h1>Aifie Cloud Virtual Computer</h1></body></html>");
  });

  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test("cloud virtual computer status returns hardware and services telemetry", () => {
  const status = getCloudVComputerStatus();
  assert.equal(status.success, true);
  assert.ok(status.virtualHardware);
  assert.ok(status.virtualHardware.cpuCount > 0);
  assert.ok(status.virtualHardware.totalMemoryGb);
  assert.ok(status.cloudServices.virtualDesktop);
  assert.equal(status.cloudServices.virtualDesktop.port, 3000);
  assert.equal(status.cloudServices.webTerminal.port, 7681);
});

test("cloud virtual computer config provides connection endpoints", () => {
  const config = getCloudVComputerConfig();
  assert.equal(config.success, true);
  assert.equal(config.services.length, 3);
  assert.ok(config.quickCommands.length > 0);
});

test("executeCloudTerminalCommand runs a safe shell command and returns output", async () => {
  const res = await executeCloudTerminalCommand("echo Aifie Cloud OK");
  assert.equal(res.success, true);
  assert.match(res.stdout, /Aifie Cloud OK/);
  assert.equal(res.exitCode, 0);
});

test("executeCloudTerminalCommand blocks dangerous commands", async () => {
  const res = await executeCloudTerminalCommand("rm -rf /");
  assert.equal(res.success, false);
  assert.match(res.stderr, /SECURITY VIOLATION/);
  assert.equal(res.exitCode, 126);
});

test("cloudBrowseUrl fetches and extracts title from http/https", async () => {
  const res = await cloudBrowseUrl(baseUrl);
  assert.equal(res.success, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.title, "Aifie Test Portal");
});

test("GET /api/vcomputer/status returns 200 with telemetry", async () => {
  const response = await fetch(`${baseUrl}/api/vcomputer/status`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.ok(data.virtualHardware.hostname);
});

test("GET /api/vcomputer/config returns 200 with service configuration", async () => {
  const response = await fetch(`${baseUrl}/api/vcomputer/config`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.ok(data.services.some(s => s.id === "virtual-desktop"));
});

test("POST /api/vcomputer/terminal/exec executes commands via API", async () => {
  const response = await fetch(`${baseUrl}/api/vcomputer/terminal/exec`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ command: "node -v" })
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.match(data.stdout, /^v\d+/);
});

test("POST /api/vcomputer/browser/browse fetches remote web pages via API", async () => {
  const response = await fetch(`${baseUrl}/api/vcomputer/browser/browse`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: baseUrl })
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.equal(data.title, "Aifie Test Portal");
});

test("aifieExecuteAutonomousTerminalTask executes shell task and records verdict", async () => {
  const res = await aifieExecuteAutonomousTerminalTask({ intent: "Self Diagnostics", command: "echo AIFIE_ONLINE" });
  assert.equal(res.success, true);
  assert.ok(res.taskRecord);
  assert.equal(res.taskRecord.agent, "AIFIE_AUTONOMOUS_OPERATOR");
  assert.match(res.fullOutput, /AIFIE_ONLINE/);
});

test("aifieAutonomousWebInvestigation scans URL and extracts sentiment", async () => {
  const res = await aifieAutonomousWebInvestigation({ topic: "Test Portal", targetUrl: baseUrl });
  assert.equal(res.success, true);
  assert.ok(res.investigation);
  assert.equal(res.investigation.agent, "AIFIE_INTELLIGENCE_CRAWLER");
  assert.equal(res.investigation.title, "Aifie Test Portal");
});

test("aifieManageCloudWorkstation audits system resources and containers", async () => {
  const res = await aifieManageCloudWorkstation({ action: "health_audit" });
  assert.equal(res.success, true);
  assert.ok(res.telemetry.ramUsage);
  assert.ok(res.actionsTaken.length > 0);
});

test("aifieGetAutonomousAgentUsageSummary returns log history", () => {
  const summary = aifieGetAutonomousAgentUsageSummary();
  assert.equal(summary.success, true);
  assert.ok(summary.totalAutonomousActions > 0);
});
