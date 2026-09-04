import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aiInterconnectionBus } from "../src/ai-interconnection-neural-bus.mjs";
import { parseTelegramCommand, processTelegramCommand } from "../src/telegram-command-listener.mjs";

describe("AI Cognitive Interconnection Neural Bus Test Suite", () => {
  it("should report full interconnection status across all 10 AI nodes", () => {
    const status = aiInterconnectionBus.getInterconnectionStatus();
    assert.equal(status.interconnectionStatus, "ALL_AI_NODES_INTERCONNECTED_100%");
    assert.ok(status.activeNodesCount >= 10);
    assert.ok(Array.isArray(status.activeNodes));
    assert.ok(status.subsystemTelemetry);
    assert.ok(status.subsystemTelemetry.multiLlmSwarm);
    assert.ok(status.subsystemTelemetry.autonomousLearning);
    assert.ok(status.subsystemTelemetry.continuousOptimizer);
    assert.ok(status.subsystemTelemetry.autoTrader);
    assert.ok(status.subsystemTelemetry.constitutionalGuard);
  });

  it("should synthesize a 360° interconnected AI intelligence payload for an asset", async () => {
    const synthesis = await aiInterconnectionBus.synthesizeUnified360Intelligence("AAPL");
    assert.ok(synthesis);
    assert.equal(synthesis.symbol, "AAPL");
    assert.ok(synthesis.compositeConvictionScore);
    assert.ok(["STRONG_BUY", "ACCUMULATE_BUY", "HOLD", "DEFENSIVE_SELL"].includes(synthesis.recommendedAction));
    assert.ok(synthesis.interconnectedConfluences);
    assert.ok(synthesis.interconnectedConfluences.chartVision);
    assert.ok(synthesis.interconnectedConfluences.multiLlmSwarm);
    assert.ok(synthesis.interconnectedConfluences.vibeAlpha101);
    assert.ok(synthesis.interconnectedConfluences.worldMonitorMacro);
    assert.ok(synthesis.interconnectedConfluences.whaleTapeOrderflow);
    assert.ok(synthesis.autonomousExecutionApproval);
  });

  it("should handle event-driven cross-module synapses on TRADE_EXECUTED", (t, done) => {
    const initialCount = aiInterconnectionBus.synapseEventCount;
    aiInterconnectionBus.emit("TRADE_EXECUTED", {
      symbol: "NVDA",
      side: "BUY",
      quantity: 5,
      realizedPnLUSD: 125.50,
      strategy: "SMC_CONFLUENCE",
      marketCondition: "BULL_TREND_CONFLUENCE"
    });

    setImmediate(() => {
      assert.ok(aiInterconnectionBus.synapseEventCount > initialCount);
      const recent = aiInterconnectionBus.getInterconnectionStatus().recentSynapses;
      assert.ok(recent.length > 0);
      done();
    });
  });

  it("should parse and respond to Telegram /synapse command", async () => {
    const parsed = parseTelegramCommand("🧠 360° AI Interconnection");
    assert.equal(parsed.command, "/synapse");

    const reply = await processTelegramCommand(parsed);
    assert.ok(typeof reply === "string");
    assert.ok(reply.includes("360° INTERCONNECTED AI COGNITIVE SYNAPSE MATRIX"));
    assert.ok(reply.includes("Composite Conviction:"));
    assert.ok(reply.includes("Vision Engine:"));
    assert.ok(reply.includes("Multi-LLM Swarm:"));
    assert.ok(reply.includes("Vibe Alpha#101:"));
  });
});
