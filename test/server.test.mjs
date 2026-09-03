import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";

let server;
let baseUrl;

test.before(async () => {
  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
});

test("catalog contains all 24 supplied repositories", async () => {
  const response = await fetch(`${baseUrl}/api/sources`);
  const data = await response.json();
  assert.equal(data.length, 24);
  assert.ok(data.every(s => s.connected));
});

test("integrations endpoint returns manifest covering all 24 repositories", async () => {
  const response = await fetch(`${baseUrl}/api/integrations`);
  const data = await response.json();
  assert.equal(data.length, 24);
  assert.ok(data.every(s => s.liveOrderAuthority === false));
});

test("source-audit endpoint audits local repositories and orders them", async () => {
  const response = await fetch(`${baseUrl}/api/source-audit`);
  const data = await response.json();
  assert.ok(Array.isArray(data.audit));
  assert.ok(Array.isArray(data.recommendations));
  assert.equal(data.audit.length, 24);
});

test("sources scan aggregates intelligence across all 24 sources", async () => {
  const response = await fetch(`${baseUrl}/api/sources/scan?symbol=NVDA`);
  const data = await response.json();
  assert.equal(data.symbol, "NVDA");
  assert.equal(data.totalSourcesConnected, 24);
  assert.equal(data.activeCount, 24);
  assert.ok(data.signals.Kronos);
  assert.ok(data.signals["hermes-agent"]);
  assert.ok(data.signals["vercel-skills"]);
});

test("sources consensus endpoint returns multi-source alpha consensus", async () => {
  const response = await fetch(`${baseUrl}/api/sources/consensus?symbol=AAPL`);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.equal(data.totalSourcesQueried, 24);
  assert.equal(data.consensusScore, 1.0);
  assert.equal(data.consensusVerdict, "UNIFIED_ALL_24_SOURCES_OPTIMAL");
});

test("sources execute endpoint runs sandboxed adapter safely", async () => {
  const response = await fetch(`${baseUrl}/api/sources/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ repository: "Kronos", params: { symbol: "BTC/USDT" } })
  });
  const data = await response.json();
  assert.equal(data.success, true);
  assert.equal(data.isolationBound, "SIMULATED_PREDICTION_ONLY");
});

test("control panel is served from the root route", async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /AIFIE/i);
});

test("research normalizes a symbol", async () => {
  const response = await fetch(`${baseUrl}/api/research?symbol=%20aapl%20`);
  assert.equal((await response.json()).symbol, "AAPL");
});

test("live orders are rejected when live mode is locked", async () => {
  const response = await fetch(`${baseUrl}/api/orders`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symbol: "AAPL", side: "buy", quantity: 1, mode: "live" }) });
  assert.equal(response.status, 400);
});

test("quotes endpoint accepts and stores valid quotes for paper execution", async () => {
  const response = await fetch(`${baseUrl}/api/quotes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "BTC/USDT", price: 65000, source: "manual" })
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.equal(data.quote.price, 65000);
});

test("control plane endpoints serve agent registry, control plane status, heartbeat, tasks, and kill switch", async () => {
  const agentsRes = await fetch(`${baseUrl}/api/agents`);
  assert.equal(agentsRes.status, 200);
  const agentsData = await agentsRes.json();
  assert.ok(Array.isArray(agentsData.agents));

  const cpRes = await fetch(`${baseUrl}/api/control-plane`);
  assert.equal(cpRes.status, 200);
  const cpData = await cpRes.json();
  assert.ok(cpData.safety);
  assert.equal(cpData.safety.killSwitchActive, false);

  const hbRes = await fetch(`${baseUrl}/api/heartbeat`, { method: "POST" });
  assert.equal(hbRes.status, 200);
  const hbData = await hbRes.json();
  assert.ok(Array.isArray(hbData.actions));

  const taskRes = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lane: "market_data", objective: "Check BTC quote freshness" })
  });
  assert.equal(taskRes.status, 200);
  const taskData = await taskRes.json();
  assert.equal(taskData.status, "assigned");

  const replicaRes = await fetch(`${baseUrl}/api/replicas`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ templateId: "strategy-research", reason: "load test" })
  });
  assert.equal(replicaRes.status, 200);
  const replicaData = await replicaRes.json();
  assert.ok(replicaData.replica);

  const killRes = await fetch(`${baseUrl}/api/kill-switch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ active: false, reason: "resuming" })
  });
  assert.equal(killRes.status, 200);
});
