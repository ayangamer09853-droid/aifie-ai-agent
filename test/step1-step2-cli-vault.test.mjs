// test/step1-step2-cli-vault.test.mjs
// Verifies Step 1 (Forensic Replay CLI) & Step 2 (Two-Key Security Vault Gate)

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatTradeReplay, getSystemPlaneStatus } from "../bin/aifie.mjs";
import { aifieEventBus } from "../src/core/event-bus-replay.mjs";
import { twoKeySecurityVault } from "../src/security/two-key-vault.mjs";

describe("Step 1 & Step 2: Forensic Replay CLI & Two-Key Security Vault", () => {
  it("Step 1.1: System plane status reports all 8 hard boundaries", () => {
    const status = getSystemPlaneStatus();
    assert.ok(status.planes.DATA_PLANE);
    assert.ok(status.planes.FEATURE_PLANE);
    assert.ok(status.planes.ALPHA_PLANE);
    assert.ok(status.planes.DECISION_PLANE);
    assert.ok(status.planes.RISK_PLANE);
    assert.ok(status.planes.EXECUTION_PLANE);
    assert.ok(status.planes.AUDIT_PLANE);
    assert.ok(status.planes.OBSERVABILITY_PLANE);

    assert.equal(status.planes.RISK_PLANE.emergencyHalt, false);
    assert.equal(status.planes.EXECUTION_PLANE.defaultMode, "PAPER");
  });

  it("Step 1.2: Forensic trade replay generates structured ASCII report", () => {
    const correlationId = "corr_cli_test_101";

    aifieEventBus.emit("MARKET_TICK", "BinanceConnector", correlationId, { symbol: "SOLUSDT", price: 145.2 });
    aifieEventBus.emit("FEATURE_UPDATE", "FeatureEngine", correlationId, { features: { vpin: 0.22, obi: 0.35 } });
    aifieEventBus.emit("SIGNAL_CREATED", "stat-arb-v5", correlationId, {
      direction: "BUY",
      confidence: 0.74,
      rationale: "Cointegration spread oversold at -2.4 sigma"
    });
    aifieEventBus.emit("TRADE_INTENT_CREATED", "Governor", correlationId, {
      id: "intent_sol_101",
      symbol: "SOLUSDT",
      side: "BUY",
      entry: 145.2,
      stopLoss: 142.0,
      takeProfit: 151.0,
      maxPosition: 5000,
      confidence: 0.74
    });
    aifieEventBus.emit("RISK_APPROVED", "IndependentRiskFortress", correlationId, {
      approvedSize: 5000,
      var99: 75,
      cvar99: 110
    });
    aifieEventBus.emit("ORDER_FILLED", "BinanceBrokerAdapter", correlationId, {
      orderId: "ORD_SOL_998",
      filledPrice: 145.22,
      filledQuantity: 34.4,
      slippageBps: 1.4
    });

    const output = formatTradeReplay(correlationId);
    assert.ok(output.includes("FORENSIC TRADE DECISION REPLAY"));
    assert.ok(output.includes("SOLUSDT"));
    assert.ok(output.includes("DATA PLANE"));
    assert.ok(output.includes("ALPHA PLANE"));
    assert.ok(output.includes("RISK PLANE"));
    assert.ok(output.includes("APPROVED"));
    assert.ok(output.includes("EXECUTION PLANE"));
    assert.ok(output.includes("ORD_SOL_998"));
  });

  it("Step 2.1: Two-Key Vault defaults to PAPER and blocks LIVE order when not in LIVE mode", () => {
    // Default mode is PAPER
    const defaultMode = twoKeySecurityVault.getExecutionMode();
    assert.equal(defaultMode, "PAPER");

    const mockIntent = { id: "intent_vault_01", correlationId: "c_01", symbol: "BTCUSDT", side: "BUY" };
    const mockRiskApproval = { decision: "APPROVED", approvedSizeUsd: 10000 };

    const riskToken = twoKeySecurityVault.generateRiskToken(mockIntent, mockRiskApproval);
    const operatorSig = twoKeySecurityVault.generateOperatorSignature("intent_vault_01", 10000);

    // Attempting live authorization while in PAPER mode must throw
    assert.throws(() => {
      twoKeySecurityVault.verifyTwoKeyAuthorization({
        riskToken,
        operatorSignature: operatorSig,
        orderNotionalUsd: 10000
      });
    }, /EXECUTION_MODE is 'PAPER'/);
  });

  it("Step 2.2: Two-Key Vault validates both keys when EXECUTION_MODE is LIVE", () => {
    const originalMode = process.env.EXECUTION_MODE;
    try {
      process.env.EXECUTION_MODE = "LIVE";

      const mockIntent = { id: "intent_vault_02", correlationId: "c_02", symbol: "BTCUSDT", side: "BUY" };
      const mockRiskApproval = { decision: "APPROVED", approvedSizeUsd: 8000 };

      const riskToken = twoKeySecurityVault.generateRiskToken(mockIntent, mockRiskApproval);
      const operatorSig = twoKeySecurityVault.generateOperatorSignature("intent_vault_02", 8000);

      // 1. Valid execution passes
      const auth = twoKeySecurityVault.verifyTwoKeyAuthorization({
        riskToken,
        operatorSignature: operatorSig,
        orderNotionalUsd: 8000
      });
      assert.equal(auth.status, "AUTHORIZED");
      assert.equal(auth.authorizedNotionalUsd, 8000);

      // 2. Tampered risk token is rejected
      const tamperedToken = { ...riskToken, approvedSizeUsd: 50000 }; // Attacker tries to increase limit
      assert.throws(() => {
        twoKeySecurityVault.verifyTwoKeyAuthorization({
          riskToken: tamperedToken,
          operatorSignature: operatorSig,
          orderNotionalUsd: 8000
        });
      }, /Tampered or invalid Sovereign Risk Token/);

      // 3. Invalid operator signature is rejected
      assert.throws(() => {
        twoKeySecurityVault.verifyTwoKeyAuthorization({
          riskToken,
          operatorSignature: "fake_invalid_sig_hex",
          orderNotionalUsd: 8000
        });
      }, /Missing or invalid Operator Master Signature/);

      // 4. Order exceeding token limit is rejected
      assert.throws(() => {
        twoKeySecurityVault.verifyTwoKeyAuthorization({
          riskToken,
          operatorSignature: operatorSig,
          orderNotionalUsd: 15000 // Exceeds 8000 limit
        });
      }, /exceeds token authorized limit/);

    } finally {
      process.env.EXECUTION_MODE = originalMode || "PAPER";
    }
  });
});
