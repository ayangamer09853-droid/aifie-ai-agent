import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  EXTENDED_SOURCE_REPOSITORIES,
  getExtendedUniverseStatus,
  runExtendedUniverseScan,
  executeExtendedAdapter
} from "../src/extended-sources-universe.mjs";
import { app } from "../server.mjs";

test("Extended Universe defines all 36 requested repositories with domains and operations", () => {
  assert.equal(EXTENDED_SOURCE_REPOSITORIES.length, 36);

  const requiredRepos = [
    "browser-use", "agentmemory", "scientific-agent-skills", "diagram-design",
    "Anthropic-Cybersecurity-Skills", "rakazo", "OpenMausBot", "ponytail",
    "500-AI-Agents-Projects", "FinceptTerminal", "ai-berkshire", "tushare",
    "OpenStock", "valuecell", "a-stock-data", "Stock-Prediction-Models",
    "financial-machine-learning", "FinanceDatabase", "awesome-ai-in-finance",
    "ticker", "tradingview-mcp", "zvt", "Finance", "TradeMaster", "exchange-core",
    "openalgo", "stocksight", "awesome-investing", "free-stockdb", "hummingbot",
    "eliza", "ai-agents-from-scratch", "awesome-ai-agents", "ai-agent-tools-catalog",
    "awesome-ai-apps", "PraisonAI"
  ];

  for (const name of requiredRepos) {
    const found = EXTENDED_SOURCE_REPOSITORIES.find(r => r.repository === name);
    assert.ok(found, `Expected repository ${name} in EXTENDED_SOURCE_REPOSITORIES`);
    assert.ok(found.category);
    assert.ok(found.domain);
    assert.ok(found.role);
    assert.ok(found.url);
    assert.ok(Array.isArray(found.supportedOperations) && found.supportedOperations.length > 0);
  }
});

test("getExtendedUniverseStatus reports telemetry across all 36 sources", () => {
  const status = getExtendedUniverseStatus();
  assert.equal(status.length, 36);
  assert.ok(status.every(s => s.connected === true));
  assert.ok(status.every(s => typeof s.present === "boolean"));
  assert.ok(status.every(s => s.state.includes("connected")));
});

test("runExtendedUniverseScan synthesizes 360° quantitative intelligence across all domains", () => {
  const scan = runExtendedUniverseScan("NVDA");
  assert.equal(scan.symbol, "NVDA");
  assert.equal(scan.totalExtendedSources, 36);
  assert.ok(scan.signals["ai-berkshire"]);
  assert.ok(scan.signals["valuecell"]);
  assert.ok(scan.signals["financial-machine-learning"]);
  assert.ok(scan.signals["Stock-Prediction-Models"]);
  assert.ok(scan.signals["TradeMaster"]);
  assert.ok(scan.signals["hummingbot"]);
  assert.ok(scan.signals["exchange-core"]);
  assert.ok(scan.signals["tradingview-mcp"]);
  assert.ok(scan.signals["stocksight"]);
  assert.ok(scan.signals["browser-use"]);
  assert.ok(scan.multiSourceConsensus);
  assert.ok(scan.multiSourceConsensus.convictionScore > 0);
});

test("executeExtendedAdapter runs paper-sandboxed operations safely", () => {
  const res1 = executeExtendedAdapter("TradeMaster", "evaluateRlPolicy", { model: "PPO" });
  assert.equal(res1.success, true);
  assert.equal(res1.repository, "TradeMaster");
  assert.equal(res1.result.executionMode, "READ_ONLY_PAPER_ISOLATED");

  const res2 = executeExtendedAdapter("hummingbot", "calculateSpreadMargin", { pair: "BTC-USDT" });
  assert.equal(res2.success, true);
  assert.equal(res2.repository, "hummingbot");

  assert.throws(() => executeExtendedAdapter("non_existent_source"), /Unknown extended source/);
});

test("Universe REST API endpoints respond with 200 OK", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    const statusRes = await fetch(`http://127.0.0.1:${port}/api/v100/universe/status`);
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.success, true);
    assert.equal(statusData.totalExtendedSources, 36);

    const scanRes = await fetch(`http://127.0.0.1:${port}/api/v100/universe/scan?symbol=ETHUSDT`);
    assert.equal(scanRes.status, 200);
    const scanData = await scanRes.json();
    assert.equal(scanData.symbol, "ETHUSDT");
    assert.equal(scanData.totalExtendedSources, 36);

    const execRes = await fetch(`http://127.0.0.1:${port}/api/v100/universe/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repository: "ai-berkshire", operation: "calculateIntrinsicValue" })
    });
    assert.equal(execRes.status, 200);
    const execData = await execRes.json();
    assert.equal(execData.success, true);
    assert.equal(execData.repository, "ai-berkshire");
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
});
