import test from "node:test";
import assert from "node:assert/strict";
import {
  initializeWebSocketGateway,
  getWebSocketGatewayStatus,
  broadcastToAllClients,
  stopWebSocketGateway
} from "../src/realtime-websocket-broadcast-gateway.mjs";
import {
  runCombinatorialPurgedCrossValidation,
  evaluateHansenSpaFalsificationTest
} from "../src/walkforward-falsification-engine.mjs";

test("WebSocket Gateway initializes, reports online, broadcasts, and stops cleanly", () => {
  const init = initializeWebSocketGateway({ port: 8799 });
  assert.ok(init.status === "WS_GATEWAY_STARTED" || init.status === "ALREADY_INITIALIZED");

  const status = getWebSocketGatewayStatus();
  assert.equal(status.gatewayStatus, "WS_GATEWAY_ONLINE");

  const sent = broadcastToAllClients({ type: "TEST_TICK", data: 123 });
  assert.equal(typeof sent, "number");

  const stop = stopWebSocketGateway();
  assert.equal(stop.status, "WS_GATEWAY_STOPPED");
});

test("Combinatorial Purged Cross-Validation evaluates 15 paths with OOS stability", () => {
  const cpcv = runCombinatorialPurgedCrossValidation({ folds: 6, testFolds: 2 });
  assert.equal(cpcv.cpcvStatus, "CPCV_AUDIT_COMPLETED");
  assert.equal(cpcv.totalCombinatorialPaths, 15);
  assert.ok(cpcv.cpcvStabilityScore > 80.0);
  assert.ok(!cpcv.isOverfitted);
});

test("Hansen SPA Falsification Test rejects data-mining null hypothesis with valid p-value", () => {
  const spa = evaluateHansenSpaFalsificationTest({ strategyName: "MOMENTUM_APEX_V78" });
  assert.equal(spa.testStatus, "HANSEN_SPA_TEST_COMPLETE");
  assert.ok(spa.spaPValue < 0.05);
  assert.ok(spa.deflatedSharpeRatio > 2.0);
  assert.equal(spa.passedFalsificationGate, true);
});
