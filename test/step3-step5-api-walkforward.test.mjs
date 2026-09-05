// test/step3-step5-api-walkforward.test.mjs
// Verifies Step 3 (Consolidated REST API Gateway) & Step 5 (Automated Walk-Forward Pipeline)

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { dispatchV1Route } from "../src/api/v1-router.mjs";
import { WalkForwardAlphaPipeline } from "../src/research/walkforward-pipeline.mjs";

describe("Step 3 & Step 5: API Gateway & Walk-Forward Alpha Pipeline", () => {
  it("Step 3.1: API Gateway categorizes routes across all 8 hard boundaries", () => {
    // 1. Data Plane
    const dataRes = dispatchV1Route("/api/v1/data");
    assert.equal(dataRes.plane, "DATA_PLANE");
    assert.equal(dataRes.success, true);
    assert.ok(dataRes.data.sentinel);

    // 2. Feature Plane
    const featRes = dispatchV1Route("/api/v1/features");
    assert.equal(featRes.plane, "FEATURE_PLANE");
    assert.ok(featRes.data.microstructure);

    // 3. Alpha Plane
    const alphaRes = dispatchV1Route("/api/v1/signals");
    assert.equal(alphaRes.plane, "ALPHA_PLANE");
    assert.ok(alphaRes.data.strategies.length >= 6);

    // 4. Decision Plane
    const decRes = dispatchV1Route("/api/v1/decision");
    assert.equal(decRes.plane, "DECISION_PLANE");
    assert.equal(decRes.data.protocol, "TradeIntent");

    // 5. Risk Plane
    const riskRes = dispatchV1Route("/api/v1/risk");
    assert.equal(riskRes.plane, "RISK_PLANE");
    assert.ok(riskRes.data.sovereignRisk);
    assert.equal(riskRes.data.limits.MAX_DAILY_DRAWDOWN_PCT, 3.0);

    // 6. Execution Plane
    const execRes = dispatchV1Route("/api/v1/execution");
    assert.equal(execRes.plane, "EXECUTION_PLANE");
    assert.equal(execRes.data.executionMode, "PAPER");

    // 7. Audit Plane
    const auditRes = dispatchV1Route("/api/v1/audit");
    assert.equal(auditRes.plane, "AUDIT_PLANE");

    // 8. Observability Plane
    const obsRes = dispatchV1Route("/api/v1/observability");
    assert.equal(obsRes.plane, "OBSERVABILITY_PLANE");
    assert.ok(obsRes.data.runtime);
  });

  it("Step 3.2: API Gateway handles forensic replay query", () => {
    const replayRes = dispatchV1Route("/api/v1/audit/replay/non_existent_id");
    assert.equal(replayRes.plane, "AUDIT_PLANE");
    assert.equal(replayRes.status, 404);
    assert.equal(replayRes.data.found, false);
  });

  it("Step 5.1: Walk-forward pipeline generates purged splits with embargo", () => {
    const splits = WalkForwardAlphaPipeline.generatePurgedSplits(500, 4, 0.25, 15);
    assert.equal(splits.length, 4);

    for (const split of splits) {
      assert.ok(split.inSample[1] <= split.outOfSample[0] - 15, "Embargo buffer must separate IS from OOS");
    }
  });

  it("Step 5.2: Walk-forward evaluates out-of-sample alpha and promotion gate", () => {
    // Generate synthetic price series (200 bars)
    const priceSeries = Array.from({ length: 200 }, (_, i) => ({
      price: 100 + Math.sin(i / 10) * 5 + i * 0.05,
      volume: 1000 + (i % 50) * 10
    }));

    const report = WalkForwardAlphaPipeline.evaluateStrategy("trend-v12", priceSeries, { numFolds: 3 });

    assert.equal(report.strategyId, "trend-v12");
    assert.equal(report.totalOosBarsTested, 200);
    assert.equal(report.numFolds, 3);
    assert.ok(report.aggregateWinRate >= 0 && report.aggregateWinRate <= 1);
    assert.ok(report.oosSharpeRatio !== undefined);
    assert.ok(report.brierScore >= 0);
    assert.ok(["PROMOTE_TO_PAPER", "RETAIN_IN_VALIDATION", "QUARANTINE"].includes(report.promotionRecommendation));
  });
});
