// test/chaos-and-historical-replay.test.mjs
// Verifies:
// 1. 12-Scenario Chaos Engineering Battery (100% resilience & recovery).
// 2. Deterministic Historical Date Replay (aifie replay --date <date> --symbol <sym>).
// 3. Enterprise Structured JSON Logger & Correlation Tracing.
// 4. Constrained Signed Command Gateway for Telegram & External APIs.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { chaosEngine } from "../src/benchmarks/chaos-engine.mjs";
import { HistoricalReplayEngine } from "../src/research/historical-replay-engine.mjs";
import { StructuredLogger } from "../src/observability/structured-logger.mjs";
import { constrainedCommandGateway } from "../src/security/command-signer.mjs";

describe("Chaos Engineering, Historical Replay, Structured Logging & Signed Commands", () => {
  it("1. 12-Scenario Chaos Engineering Engine asserts 100% resilience", () => {
    const report = chaosEngine.runFullChaosBattery();
    assert.equal(report.totalScenarios, 12);
    assert.equal(report.passedScenarios, 12);
    assert.equal(report.allPassed, true);

    const scenarioNames = report.scenarios.map(s => s.scenario);
    assert.ok(scenarioNames.includes("KILL_BINANCE_WS"));
    assert.ok(scenarioNames.includes("KILL_ALPACA_WS"));
    assert.ok(scenarioNames.includes("DROP_5PCT_TICKS"));
    assert.ok(scenarioNames.includes("DELAY_PACKETS_JITTER"));
    assert.ok(scenarioNames.includes("MALFORMED_JSON_INJECTION"));
    assert.ok(scenarioNames.includes("CORRUPT_QUOTE"));
    assert.ok(scenarioNames.includes("STALE_QUOTE"));
    assert.ok(scenarioNames.includes("FREEZE_MODEL_TIMEOUT"));
    assert.ok(scenarioNames.includes("DOUBLE_FILL_PREVENTION"));
    assert.ok(scenarioNames.includes("DISCONNECT_BROKER"));
    assert.ok(scenarioNames.includes("RESTART_RISK_ENGINE"));
    assert.ok(scenarioNames.includes("RESTART_EXECUTION_ENGINE"));
  });

  it("2. Deterministic Historical Date Replay generates session report and trade ledger", () => {
    const report = HistoricalReplayEngine.replayDateAndSymbol({
      date: "2026-08-20",
      symbol: "BTCUSDT",
      startingCapital: 100000,
      barsCount: 120
    });

    assert.equal(report.date, "2026-08-20");
    assert.equal(report.symbol, "BTCUSDT");
    assert.equal(report.startingCapital, 100000);
    assert.ok(report.endingEquity > 0);
    assert.ok(report.metrics.barsReplayed === 120);
    assert.ok(report.metrics.ticksAudited > 0);
    assert.ok(report.metrics.tradesExecuted >= 0);
    assert.ok(Array.isArray(report.trades));
  });

  it("3. Enterprise Structured JSON Logger adheres to senior engineer format", () => {
    const testLogger = new StructuredLogger({ silent: true, minLevel: "DEBUG" });

    const entry = testLogger.warn("risk-engine", "VPIN_BREACH", {
      symbol: "BTCUSDT",
      value: 0.71,
      correlationId: "corr_vpin_001"
    });

    assert.equal(entry.level, "WARN");
    assert.equal(entry.service, "risk-engine");
    assert.equal(entry.event, "VPIN_BREACH");
    assert.equal(entry.symbol, "BTCUSDT");
    assert.equal(entry.value, 0.71);
    assert.equal(entry.correlationId, "corr_vpin_001");
    assert.ok(entry.timestamp);

    const logs = testLogger.getRecentLogs(10);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, "VPIN_BREACH");
  });

  it("4. Constrained Signed Command Gateway validates allowlist, replay nonces, and HMAC signatures", () => {
    // 1. Valid signed command passes
    const validEnvelope = constrainedCommandGateway.signCommand("STATUS", {}, "telegram_admin");
    const result = constrainedCommandGateway.dispatchCommand(validEnvelope);
    assert.equal(result.status, "SUCCESS");
    assert.equal(result.command, "STATUS");
    assert.equal(result.result.system, "AIFIE_ONLINE");

    // 2. Replay attack with duplicate nonce is blocked
    assert.throws(() => {
      constrainedCommandGateway.dispatchCommand(validEnvelope);
    }, /Replay Attack blocked/);

    // 3. Disallowed command (e.g. arbitrary code or direct order) is blocked
    const disallowedEnvelope = constrainedCommandGateway.signCommand("PLACE_DIRECT_ORDER", { size: 10000 });
    assert.throws(() => {
      constrainedCommandGateway.dispatchCommand(disallowedEnvelope);
    }, /Command 'PLACE_DIRECT_ORDER' is not permitted/);

    // 4. Tampered signature is blocked
    const tamperedEnvelope = constrainedCommandGateway.signCommand("EMERGENCY_HALT", {});
    const tampered = { ...tamperedEnvelope, signature: "corrupted_hex_signature" };
    assert.throws(() => {
      constrainedCommandGateway.dispatchCommand(tampered);
    }, /Invalid or tampered cryptographic HMAC signature/);

    // 5. Expired command is blocked
    const expiredEnvelope = constrainedCommandGateway.signCommand("PAUSE", {}, "telegram_admin", Date.now() - 120000);
    assert.throws(() => {
      constrainedCommandGateway.dispatchCommand(expiredEnvelope);
    }, /Command timestamp expired/);
  });
});
