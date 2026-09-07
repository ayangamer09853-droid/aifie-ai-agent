import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";
import { L3OrderQueueEngine, l3MicrostructureEngine } from "../src/microstructure/l3-order-queue-dynamics.mjs";
import { FeatureDriftSentinel, featureDriftSentinel } from "../src/microstructure/feature-drift-sentinel.mjs";
import { mcpHub } from "../src/mcp/mcp-hub.mjs";
import { processTelegramCommand, parseTelegramCommand } from "../src/telegram-command-listener.mjs";

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

test("L3 Order Queue: processes ADD, MODIFY, CANCEL, EXECUTE and tracks FIFO queue priority", () => {
  const engine = new L3OrderQueueEngine({ symbol: "BTCUSDT", bucketVolume: 10, numBuckets: 5 });

  // 1. Add order 1 @ $65,000
  const ev1 = engine.processL3Event({ eventType: "ADD", side: "buy", price: 65000, size: 2.0, orderId: "ord-1" });
  assert.equal(ev1.status, "L3_EVENT_COMMITTED");
  assert.equal(engine.getTopOfBook().bestBid, 65000);

  // 2. Add order 2 @ $65,000 (queued behind ord-1)
  engine.processL3Event({ eventType: "ADD", side: "buy", price: 65000, size: 3.0, orderId: "ord-2" });

  // 3. Estimate queue priority for a new order @ $65,000
  const priority = engine.estimateQueuePriority({ side: "buy", price: 65000, quantity: 1.0 });
  assert.equal(priority.ordersAhead, 2);
  assert.equal(priority.volumeAheadAtPrice, 5.0);
  assert.equal(priority.queuePosition, 3);
  assert.ok(priority.fillProbabilityPercent > 0);

  // 4. Modify order 1: decrease size retains priority
  engine.processL3Event({ eventType: "MODIFY", side: "buy", price: 65000, size: 1.5, orderId: "ord-1" });
  const priorityAfterModify = engine.estimateQueuePriority({ side: "buy", price: 65000, quantity: 1.0 });
  assert.equal(priorityAfterModify.volumeAheadAtPrice, 4.5);

  // 5. Cancel order 2
  engine.processL3Event({ eventType: "CANCEL", side: "buy", price: 65000, size: 3.0, orderId: "ord-2" });
  const priorityAfterCancel = engine.estimateQueuePriority({ side: "buy", price: 65000, quantity: 1.0 });
  assert.equal(priorityAfterCancel.ordersAhead, 1);
  assert.equal(priorityAfterCancel.volumeAheadAtPrice, 1.5);

  // 6. Execute order 1
  engine.processL3Event({ eventType: "EXECUTE", side: "buy", price: 65000, size: 1.5, orderId: "ord-1" });
  assert.equal(engine.getTopOfBook().bestBid, null);
});

test("L3 Order Queue: computes rolling VPIN toxicity across volume buckets", () => {
  const engine = new L3OrderQueueEngine({ symbol: "ETHUSDT", bucketVolume: 10, numBuckets: 4 });

  // Ingest heavy buy execution (informed toxic flow)
  for (let i = 0; i < 4; i++) {
    engine.processL3Event({ eventType: "ADD", side: "buy", price: 3500, size: 10, orderId: `b-${i}` });
    engine.processL3Event({ eventType: "EXECUTE", side: "buy", price: 3500, size: 10, orderId: `b-${i}` });
  }

  const vpinMetrics = engine.calculateVpin();
  assert.ok(vpinMetrics.sampleBuckets >= 4);
  assert.equal(vpinMetrics.vpin, 1.0); // 100% buy imbalance in buckets
  assert.equal(vpinMetrics.toxicityLevel, "EXTREME_TOXICITY_ADVERSE_SELECTION");
});

test("L3 Order Queue: evaluates Cancel-to-Fill Ratio (CFR) and detects quote stuffing / spoofing", () => {
  const engine = new L3OrderQueueEngine({ symbol: "SOLUSDT" });

  // Simulate 60 rapid cancels with only 1 fill
  for (let i = 0; i < 60; i++) {
    engine.processL3Event({ eventType: "ADD", side: "sell", price: 150 + (i * 0.1), size: 10, orderId: `spoof-${i}` });
    engine.processL3Event({ eventType: "CANCEL", side: "sell", price: 150 + (i * 0.1), size: 10, orderId: `spoof-${i}` });
  }
  engine.processL3Event({ eventType: "ADD", side: "sell", price: 150, size: 1, orderId: "fill-1" });
  engine.processL3Event({ eventType: "EXECUTE", side: "sell", price: 150, size: 1, orderId: "fill-1" });

  const cfr = engine.evaluateCancelToFillRatio();
  assert.equal(cfr.cancelCount, 60);
  assert.equal(cfr.fillCount, 1);
  assert.equal(cfr.cancelToFillRatio, 60.0);
  assert.equal(cfr.isSpoofingSuspected, true);
  assert.equal(cfr.anomalyStatus, "HIGH_CFR_SPOOFING_ALERT");
});

test("Feature Drift Sentinel: calculates K-S Statistic and detects continuous distribution shift", () => {
  const sentinel = new FeatureDriftSentinel({ ksThreshold: 0.15 });

  const baseline = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const identicalSample = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const shiftedSample = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35];

  const ksIdentical = sentinel.calculateKsStatistic(baseline, identicalSample);
  assert.equal(ksIdentical.statistic, 0);
  assert.equal(ksIdentical.isDriftDetected, false);

  const ksShifted = sentinel.calculateKsStatistic(baseline, shiftedSample);
  assert.equal(ksShifted.statistic, 1.0);
  assert.equal(ksShifted.isDriftDetected, true);
});

test("Feature Drift Sentinel: calculates Population Stability Index (PSI) and Wasserstein distance", () => {
  const sentinel = new FeatureDriftSentinel({ psiThreshold: 0.25 });

  const baseline = Array.from({ length: 100 }, (_, i) => i + 1);
  const stableActual = Array.from({ length: 100 }, (_, i) => i + 1.5);
  const shiftedActual = Array.from({ length: 100 }, (_, i) => (i + 1) * 3);

  const stablePsi = sentinel.calculatePsi(baseline, stableActual);
  assert.ok(stablePsi.psi < 0.10);
  assert.equal(stablePsi.driftStatus, "NO_DRIFT");

  const shiftedPsi = sentinel.calculatePsi(baseline, shiftedActual);
  assert.ok(shiftedPsi.psi >= 0.25);
  assert.equal(shiftedPsi.driftStatus, "SIGNIFICANT_DRIFT_ACTION_REQUIRED");

  const emd = sentinel.calculateWassersteinDistance(baseline, shiftedActual);
  assert.ok(emd > 0);
});

test("Feature Drift Sentinel: registers baseline, audits feature, and enforces automated quarantine", () => {
  const sentinel = new FeatureDriftSentinel();

  const reg = sentinel.setFeatureBaseline("rsi_14_momentum", [30, 35, 40, 45, 50, 55, 60, 65, 70, 75]);
  assert.equal(reg.status, "BASELINE_REGISTERED");

  // Ingest stable observations
  const auditStable = sentinel.auditFeature("rsi_14_momentum", [32, 37, 42, 47, 52, 57, 62, 67, 72, 77]);
  assert.equal(auditStable.isQuarantined, false);
  assert.equal(auditStable.recommendedAction, "MAINTAIN_CURRENT_WEIGHT");

  // Ingest heavily shifted observations
  const auditDrifted = sentinel.auditFeature("rsi_14_momentum", [85, 90, 92, 95, 96, 97, 98, 99, 95, 92]);
  assert.equal(auditDrifted.isQuarantined, true);
  assert.equal(auditDrifted.recommendedAction, "QUARANTINE_AND_RECALIBRATE_MODEL");

  const report = sentinel.getDriftReport();
  assert.equal(report.totalQuarantined, 1);
  assert.ok(report.quarantinedFeatureList.includes("rsi_14_momentum"));
});

test("Server REST API: exposes /api/microstructure/status, /l3/feed, /l3/queue-estimate, and /drift/*", async () => {
  // 1. GET /api/microstructure/status
  const statusRes = await fetch(`${baseUrl}/api/microstructure/status`);
  assert.equal(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.equal(statusData.status, "L3_MICROSTRUCTURE_AND_DRIFT_ONLINE");
  assert.ok(statusData.microstructure);
  assert.ok(statusData.driftSentinel);

  // 2. POST /api/microstructure/l3/feed
  const feedRes = await fetch(`${baseUrl}/api/microstructure/l3/feed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType: "ADD", side: "buy", price: 65000, size: 5.0 })
  });
  assert.equal(feedRes.status, 200);
  const feedData = await feedRes.json();
  assert.equal(feedData.status, "L3_EVENT_COMMITTED");

  // 3. POST /api/microstructure/l3/queue-estimate
  const queueRes = await fetch(`${baseUrl}/api/microstructure/l3/queue-estimate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ side: "buy", price: 65000, quantity: 2.0 })
  });
  assert.equal(queueRes.status, 200);
  const queueData = await queueRes.json();
  assert.ok("queuePosition" in queueData);
  assert.ok("fillProbabilityPercent" in queueData);

  // 4. POST /api/microstructure/drift/baseline
  const baseRes = await fetch(`${baseUrl}/api/microstructure/drift/baseline`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ feature: "test_spread", values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })
  });
  assert.equal(baseRes.status, 200);

  // 5. POST /api/microstructure/drift/evaluate
  const evalRes = await fetch(`${baseUrl}/api/microstructure/drift/evaluate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ feature: "test_spread", samples: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })
  });
  assert.equal(evalRes.status, 200);
  const evalData = await evalRes.json();
  assert.equal(evalData.feature, "test_spread");

  // 6. GET /api/microstructure/drift/report
  const repRes = await fetch(`${baseUrl}/api/microstructure/drift/report`);
  assert.equal(repRes.status, 200);
  const repData = await repRes.json();
  assert.equal(repData.status, "FEATURE_DRIFT_SENTINEL_ONLINE");
});

test("MCP Hub: executes estimate_l3_queue_priority_and_vpin (Tool 80) and audit_feature_distribution_drift (Tool 81)", async () => {
  const tool80 = await mcpHub.callTool("estimate_l3_queue_priority_and_vpin", {
    symbol: "BTCUSDT",
    side: "buy",
    price: 65000,
    quantity: 1.0
  });
  assert.equal(tool80.isError, false);
  const data80 = JSON.parse(tool80.content[0].text);
  assert.ok("queuePosition" in data80);

  featureDriftSentinel.setFeatureBaseline("vwap_deviation", [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
  const tool81 = await mcpHub.callTool("audit_feature_distribution_drift", {
    feature: "vwap_deviation",
    samples: [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85]
  });
  assert.equal(tool81.isError, false);
  const data81 = JSON.parse(tool81.content[0].text);
  assert.equal(data81.feature, "vwap_deviation");
});

test("Telegram Bot: executes /l3, /vpin, and /drift commands cleanly", async () => {
  // 1. /l3
  const cmdL3 = parseTelegramCommand("⚡ L3 Queue Dynamics");
  assert.equal(cmdL3.command, "/l3");
  const resL3 = await processTelegramCommand(cmdL3, { paper: {}, orders: [] });
  assert.ok(resL3.includes("LEVEL 3 (L3) ORDER QUEUE DYNAMICS"));
  assert.ok(resL3.includes("VPIN Toxicity"));

  // 2. /vpin
  const cmdVpin = parseTelegramCommand("/vpin");
  assert.equal(cmdVpin.command, "/vpin");
  const resVpin = await processTelegramCommand(cmdVpin, { paper: {}, orders: [] });
  assert.ok(resVpin.includes("VPIN"));
  assert.ok(resVpin.includes("Toxicity") || resVpin.includes("TOXICITY"));

  // 3. /drift
  const cmdDrift = parseTelegramCommand("📉 Feature Drift Sentry");
  assert.equal(cmdDrift.command, "/drift");
  const resDrift = await processTelegramCommand(cmdDrift, { paper: {}, orders: [] });
  assert.ok(resDrift.includes("FEATURE DRIFT & DATA DISTRIBUTION SENTRY"));
  assert.ok(resDrift.includes("Kolmogorov-Smirnov"));
});
