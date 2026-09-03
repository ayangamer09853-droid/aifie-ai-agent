import test from "node:test";
import assert from "node:assert/strict";
import {
  recordOrderAuditTrail,
  queryAuditTrail,
  getAuditEvidenceByOrderId
} from "../src/research-audit-trail-engine.mjs";

test("recordOrderAuditTrail saves research evidence and links to orderId", () => {
  const testOrderId = "ORD_TEST_99";
  const record = recordOrderAuditTrail({
    orderId: testOrderId,
    symbol: "ETH/USDT",
    side: "BUY",
    quantity: 2,
    price: 3250.0,
    strategy: "ALPHA_CONVERGENCE_V95",
    alphaScore: 89.2
  });

  assert.equal(record.orderId, testOrderId);
  assert.equal(record.symbol, "ETH/USDT");
  assert.equal(record.notionalUSD, 6500.0);
  assert.equal(record.evidence.alphaScore, "89.2%");
  assert.equal(record.evidence.falsificationVerified, true);
});

test("queryAuditTrail returns filtered records by symbol", () => {
  const res = queryAuditTrail({ symbol: "ETH/USDT" });
  assert.ok(res.totalRecords >= 1);
  assert.equal(res.records[0].symbol, "ETH/USDT");
});

test("getAuditEvidenceByOrderId retrieves evidence dossier by orderId", () => {
  const dossier = getAuditEvidenceByOrderId("ORD_INIT_BTC_01");
  assert.equal(dossier.success, true);
  assert.equal(dossier.record.symbol, "BTC/USDT");
  assert.equal(dossier.record.evidence.strategy, "APEX_TRINITY_CYCLE");
});

test("getAuditEvidenceByOrderId handles non-existent order gracefully", () => {
  const dossier = getAuditEvidenceByOrderId("ORD_NON_EXISTENT");
  assert.equal(dossier.success, false);
  assert.ok(dossier.error.includes("No audit evidence found"));
});
