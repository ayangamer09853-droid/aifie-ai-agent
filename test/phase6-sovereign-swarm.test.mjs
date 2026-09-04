import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";

import {
  getSwarmFleetAgents,
  delegateSwarmTask,
  evaluateBftQuorumConsensus,
  executeSwarmFleetTick,
  getSwarmFleetStatus
} from "../src/alfie-multi-agent-coordinator.mjs";

import {
  executeNexusAutonomousTick,
  startNexusAutonomousLoop,
  stopNexusAutonomousLoop,
  getMasterNexusReport,
  getNexusCycleStatus
} from "../src/master-autonomous-nexus-cycle.mjs";

import {
  dispatchMobileSignalAlert,
  processMobileConfirmationCallback,
  getPendingSignalAlerts,
  getMobileConfirmationGateStatus
} from "../src/telegram-mobile-confirmation-gate.mjs";

import {
  detectCloudPlatform,
  startAntiSleepPinger,
  stopAntiSleepPinger,
  getCloudSovereigntyMetrics
} from "../src/cloud-sovereign-keepalive-daemon.mjs";

let server;
let baseUrl;

test.before(async () => {
  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

test("Phase 6: Multi-Agent Swarm coordinates 10 specialized lanes and enforces 3-of-5 BFT quorum consensus", () => {
  // 1. Verify 10 Specialized Lanes
  const agents = getSwarmFleetAgents();
  assert.equal(agents.length, 10, "Swarm fleet must register exactly 10 specialized agent lanes");
  assert.ok(agents.every(a => a.status === "HEALTHY"));

  // 2. Delegate Tasks with Evidence
  const task = delegateSwarmTask({
    lane: "risk_governance",
    objective: "Verify portfolio VaR 99% under extreme volatility shock",
    priority: "high"
  });
  assert.equal(task.lane, "risk_governance");
  assert.equal(task.status, "ASSIGNED");
  assert.equal(task.evidenceRequired, true);

  // 3. 3-of-5 BFT Quorum Consensus (Approval Case)
  const approvedQuorum = evaluateBftQuorumConsensus({
    symbol: "BTC/USDT",
    side: "BUY",
    quantity: 0.5,
    votes: [
      { agent: "Alpha Scanner", vote: "APPROVE" },
      { agent: "Microstructure VPIN", vote: "APPROVE" },
      { agent: "SMC Order Flow", vote: "APPROVE" },
      { agent: "Risk Fortress", vote: "REJECT" },
      { agent: "Convex Optimizer", vote: "APPROVE" }
    ]
  });
  assert.equal(approvedQuorum.consensusVerdict, "BFT_QUORUM_APPROVED");
  assert.equal(approvedQuorum.executionPermitted, true);
  assert.equal(approvedQuorum.approvalVotesCount, 4);

  // 4. 3-of-5 BFT Quorum Consensus (Rejection Case)
  const rejectedQuorum = evaluateBftQuorumConsensus({
    symbol: "SOL/USDT",
    side: "BUY",
    quantity: 10,
    votes: [
      { agent: "Alpha Scanner", vote: "APPROVE" },
      { agent: "Microstructure VPIN", vote: "REJECT" },
      { agent: "SMC Order Flow", vote: "REJECT" },
      { agent: "Risk Fortress", vote: "REJECT" },
      { agent: "Convex Optimizer", vote: "APPROVE" }
    ]
  });
  assert.equal(rejectedQuorum.consensusVerdict, "BFT_QUORUM_REJECTED");
  assert.equal(rejectedQuorum.executionPermitted, false);
  assert.equal(rejectedQuorum.approvalVotesCount, 2);

  // 5. Fleet Heartbeat Tick
  const tick = executeSwarmFleetTick();
  assert.equal(tick.success, true);
  assert.equal(tick.allAgentsHealthy, true);

  // 6. Telemetry
  const status = getSwarmFleetStatus();
  assert.equal(status.status, "ACTIVE");
  assert.equal(status.totalAgentsCount, 10);
});

test("Phase 6: Master Autonomous Nexus unifies all 5 layers into continuous self-healing loop", () => {
  // 1. Single Synchronous 5-Layer Cycle Execution
  const report = executeNexusAutonomousTick();
  assert.equal(report.success, true);

  // Layer 1: Runtime
  assert.ok(report.layer1_SystemRuntime.platform);
  assert.equal(report.layer1_SystemRuntime.executionMode, "100% SIMULATED PAPER TRADING (FAIL-CLOSED ZERO RISK)");

  // Layer 2: Alpha Research & Microstructure
  assert.ok(report.layer2_QuantitativeResearch.vpinToxicity);
  assert.ok(report.layer2_QuantitativeResearch.statArbSignal);

  // Layer 3: Risk Governance
  assert.ok(report.layer3_RiskGovernance.dailyVaR99Notional >= 0);
  assert.equal(report.layer3_RiskGovernance.circuitBreakerMaxDrawdown, "3.0%");

  // Layer 4: Execution & Accounting
  assert.ok(["BFT_QUORUM_APPROVED", "BFT_QUORUM_REJECTED"].includes(report.layer4_ExecutionAccounting.bftQuorumConsensus));

  // Layer 5: Interfaces
  assert.equal(report.layer5_SovereignInterfaces.telegramMobileListener, "ACTIVE");

  // 2. Loop Lifecycle (Start & Stop)
  const loopStart = startNexusAutonomousLoop(2000);
  assert.ok(["LOOP_ACTIVATED", "ALREADY_RUNNING"].includes(loopStart.status));

  const loopStop = stopNexusAutonomousLoop();
  assert.equal(loopStop.status, "LOOP_HALTED");

  // 3. 360° Comprehensive Dossier
  const nexusDoc = getMasterNexusReport();
  assert.equal(nexusDoc.success, true);
  assert.equal(nexusDoc.nexusStatus, "ALL_LAYERS_SYNCHRONIZED");

  // 4. Status Telemetry
  const cycleStatus = getNexusCycleStatus();
  assert.equal(cycleStatus.layersCount, 5);
});

test("Phase 6: Telegram 1-Tap Mobile Confirmation Gate dispatches alerts and processes executions/vetoes", () => {
  // 1. Dispatch Mobile Trade Proposal
  const alert = dispatchMobileSignalAlert({
    symbol: "NVDA",
    side: "BUY",
    quantity: 15,
    estimatedPriceUSD: 125.00,
    convictionScore: 96,
    strategy: "SMC_MOMENTUM_V100"
  });
  assert.equal(alert.success, true);
  assert.ok(alert.signalId);
  assert.ok(alert.replyMarkup.inline_keyboard[0].length === 2);
  assert.equal(alert.replyMarkup.inline_keyboard[0][0].callback_data, `EXEC_${alert.signalId}`);
  assert.equal(alert.replyMarkup.inline_keyboard[0][1].callback_data, `VETO_${alert.signalId}`);

  // Check pending list
  const pending = getPendingSignalAlerts();
  assert.ok(pending.some(s => s.signalId === alert.signalId));

  // 2. Process Mobile Execution Callback
  const execResult = processMobileConfirmationCallback({
    callbackData: `EXEC_${alert.signalId}`,
    userId: "12345678"
  });
  assert.equal(execResult.success, true);
  assert.equal(execResult.action, "EXECUTION_AUTHORIZED");
  assert.equal(execResult.status, "EXECUTED_CONFIRMED");
  assert.ok(execResult.ledger);

  // 3. Idempotency Guard (Replay attack prevention)
  const duplicateResult = processMobileConfirmationCallback({
    callbackData: `EXEC_${alert.signalId}`,
    userId: "12345678"
  });
  assert.equal(duplicateResult.success, false);
  assert.equal(duplicateResult.error, "SIGNAL_ALREADY_PROCESSED");

  // 4. Dispatch and Veto Callback
  const vetoAlert = dispatchMobileSignalAlert({
    symbol: "TSLA",
    side: "BUY",
    quantity: 20,
    estimatedPriceUSD: 210.00
  });
  const vetoResult = processMobileConfirmationCallback({
    callbackData: `VETO_${vetoAlert.signalId}`,
    userId: "12345678"
  });
  assert.equal(vetoResult.success, true);
  assert.equal(vetoResult.action, "VETO_CONFIRMED");
  assert.equal(vetoResult.status, "VETOED_BY_USER");

  // 5. Telemetry
  const status = getMobileConfirmationGateStatus();
  assert.equal(status.status, "ACTIVE");
  assert.equal(status.idempotencyGuard, true);
});

test("Phase 6: Cloud Sovereign Keepalive detects environment, runs anti-sleep pings, and reports metrics", () => {
  // 1. Platform Detection
  const env = detectCloudPlatform();
  assert.ok(env.platform);
  assert.ok(typeof env.isCloud === "boolean");

  // 2. Anti-Sleep Pinger Lifecycle
  const pinger = startAntiSleepPinger("http://127.0.0.1:8787/api/status", 5);
  assert.ok(["PINGER_ONLINE", "ALREADY_ACTIVE"].includes(pinger.status));

  const pingerStop = stopAntiSleepPinger();
  assert.equal(pingerStop.status, "PINGER_HALTED");

  // 3. Sovereignty Metrics
  const metrics = getCloudSovereigntyMetrics();
  assert.equal(metrics.status, "CLOUD_SOVEREIGN_NODE_ONLINE");
  assert.ok(metrics.perpetualUptime.uptimeFormatted);
  assert.ok(metrics.cloudAutonomyGuarantees.length >= 4);
});

test("Phase 6: Server exposes all swarm, nexus, telegram mobile, and cloud sovereign REST endpoints", async () => {
  // 1. GET /api/swarm/status
  const swarmRes = await fetch(`${baseUrl}/api/swarm/status`);
  assert.equal(swarmRes.status, 200);
  const swarmData = await swarmRes.json();
  assert.equal(swarmData.success, true);
  assert.equal(swarmData.totalAgentsCount, 10);

  // 2. POST /api/swarm/delegate
  const delegateRes = await fetch(`${baseUrl}/api/swarm/delegate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lane: "alpha_research", objective: "Run genetic mutation on champions" })
  });
  assert.equal(delegateRes.status, 200);
  const delegateData = await delegateRes.json();
  assert.equal(delegateData.success, true);
  assert.equal(delegateData.result.lane, "alpha_research");

  // 3. POST /api/swarm/quorum
  const quorumRes = await fetch(`${baseUrl}/api/swarm/quorum`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "ETH/USDT", side: "BUY", quantity: 2 })
  });
  assert.equal(quorumRes.status, 200);
  const quorumData = await quorumRes.json();
  assert.equal(quorumData.success, true);
  assert.ok(quorumData.result.consensusVerdict);

  // 4. POST /api/nexus/tick
  const tickRes = await fetch(`${baseUrl}/api/nexus/tick`, { method: "POST" });
  assert.equal(tickRes.status, 200);
  const tickData = await tickRes.json();
  assert.equal(tickData.success, true);
  assert.ok(tickData.result.layer1_SystemRuntime);

  // 5. GET /api/nexus/status
  const nexusRes = await fetch(`${baseUrl}/api/nexus/status`);
  assert.equal(nexusRes.status, 200);
  const nexusData = await nexusRes.json();
  assert.equal(nexusData.success, true);
  assert.equal(nexusData.nexusStatus, "ALL_LAYERS_SYNCHRONIZED");

  // 6. POST /api/telegram/signal-alert
  const alertRes = await fetch(`${baseUrl}/api/telegram/signal-alert`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "AAPL", side: "BUY", quantity: 5, estimatedPriceUSD: 175.0 })
  });
  assert.equal(alertRes.status, 200);
  const alertData = await alertRes.json();
  assert.equal(alertData.success, true);
  assert.ok(alertData.signalId);

  // 7. POST /api/telegram/signal-callback
  const callbackRes = await fetch(`${baseUrl}/api/telegram/signal-callback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callbackData: `EXEC_${alertData.signalId}`, userId: "998877" })
  });
  assert.equal(callbackRes.status, 200);
  const callbackData = await callbackRes.json();
  assert.equal(callbackData.success, true);
  assert.equal(callbackData.action, "EXECUTION_AUTHORIZED");

  // 8. GET /api/cloud/sovereign
  const cloudRes = await fetch(`${baseUrl}/api/cloud/sovereign`);
  assert.equal(cloudRes.status, 200);
  const cloudData = await cloudRes.json();
  assert.equal(cloudData.success, true);
  assert.equal(cloudData.phase, "PHASE_6_SOVEREIGN_AUTOMATION");
  assert.equal(cloudData.cloud.status, "CLOUD_SOVEREIGN_NODE_ONLINE");
});
