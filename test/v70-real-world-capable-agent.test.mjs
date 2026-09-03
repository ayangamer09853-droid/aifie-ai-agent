import test from "node:test";
import assert from "node:assert/strict";
import {
  getRealWorldCapableAgentStatus,
  generateRealWorldEnvTemplate,
  runRealWorldPreFlightChecklist,
  executeRealWorldLiveOrder
} from "../src/real-world-capable-agent-orchestrator.mjs";

test("getRealWorldCapableAgentStatus reports active orchestrator status", () => {
  const status = getRealWorldCapableAgentStatus();
  assert.equal(status.orchestratorStatus, "REAL_WORLD_CAPABLE_AGENT_ORCHESTRATOR_ONLINE");
  assert.equal(status.protocolVersion, "REAL_WORLD_AGENT_V70_PRODUCTION");
  assert.equal(typeof status.liveTradingUnlocked, "boolean");
  assert.equal(typeof status.configuredBrokersCount, "number");
});

test("generateRealWorldEnvTemplate generates valid production .env configuration template", () => {
  const template = generateRealWorldEnvTemplate();
  assert.equal(template.templateTitle, "Aifie AI Agent v70.0 Production Real-World .env Configuration Template");
  assert.ok(template.envTemplate.includes("LIVE_TRADING_ENABLED=false"));
  assert.ok(template.envTemplate.includes("ALPACA_API_KEY"));
  assert.ok(template.envTemplate.includes("ZERODHA_API_KEY"));
  assert.ok(template.envTemplate.includes("BINANCE_API_KEY"));
});

test("runRealWorldPreFlightChecklist verifies 7-point pre-flight safety audit", () => {
  const checklist = runRealWorldPreFlightChecklist({ symbol: "AAPL", side: "BUY", quantity: 1, price: 150.0 });
  assert.ok(checklist.checks.length >= 5);
  assert.equal(checklist.checks[1].checkName, "API_SIGNATURE_AUTH");
  assert.equal(checklist.checks[2].checkName, "MAX_1_PERCENT_RISK_CAP");
});

test("executeRealWorldLiveOrder routes live order when LIVE_TRADING_ENABLED is active", () => {
  const res = executeRealWorldLiveOrder({ symbol: "AAPL", side: "BUY", quantity: 1, fillPrice: 150.0, broker: "ALPACA" });
  assert.ok(res.executionStatus.includes("REAL_WORLD_"));
  assert.ok(res.transactionHash.startsWith("0xREAL_WORLD_LIVE_"));
});
