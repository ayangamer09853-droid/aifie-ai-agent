import test from "node:test";
import assert from "node:assert/strict";
import { autonomousSelfLearningEngine } from "../src/autonomous-self-learning-engine.mjs";
import { parseTelegramCommand, processTelegramCommand } from "../src/telegram-command-listener.mjs";
import { createPaperState } from "../src/paper-engine.mjs";

test("Autonomous 24/7 Continuous Learning Daemon Test Suite", async (t) => {

  await t.test("should return complete continuous learning status telemetry", () => {
    const status = autonomousSelfLearningEngine.getContinuousLearningStatus();
    assert.ok(status);
    assert.ok(["RUNNING_24_7", "PAUSED"].includes(status.engineStatus));
    assert.ok(typeof status.isRunning === "boolean");
    assert.ok(status.totalCyclesLifetime >= 100);
    assert.ok(status.evolutionScore >= 80);
    assert.ok(status.evolutionRank);
  });

  await t.test("should start and stop the continuous learning daemon cleanly", () => {
    const stopped = autonomousSelfLearningEngine.stopContinuousLearning();
    assert.equal(stopped.isRunning, false);
    assert.equal(stopped.engineStatus, "PAUSED");

    const started = autonomousSelfLearningEngine.startContinuousLearning(30000);
    assert.equal(started.isRunning, true);
    assert.equal(started.engineStatus, "RUNNING_24_7");
    assert.equal(started.intervalSeconds, 30);

    // Revert to 60s
    autonomousSelfLearningEngine.startContinuousLearning(60000);
  });

  await t.test("should execute a continuous learning cycle, record discoveries, and update evolution score", async () => {
    const initialCycles = autonomousSelfLearningEngine.getContinuousLearningStatus().totalCyclesLifetime;
    const result = await autonomousSelfLearningEngine.runContinuousLearningCycle("TEST_RUNNER");

    assert.equal(result.success, true);
    assert.ok(result.cycleNumber > initialCycles);
    assert.ok(result.latestDiscovery);
    assert.ok(result.evolutionScore >= 85);
    assert.ok(result.executedAt);

    const afterStatus = autonomousSelfLearningEngine.getContinuousLearningStatus();
    assert.equal(afterStatus.totalCyclesLifetime, result.cycleNumber);
  });

  await t.test("should parse and respond to Telegram /continuouslearning commands", async () => {
    const parsedButton = parseTelegramCommand("🔄 24/7 Continuous Learning");
    assert.equal(parsedButton.command, "/continuouslearning");

    const paper = createPaperState({ cash: 100000, positions: {} });
    
    // Status
    const statusReply = await processTelegramCommand({ command: "/continuouslearning", symbol: "status" }, { paper, orders: [] });
    assert.match(statusReply, /24\/7 AUTONOMOUS CONTINUOUS LEARNING TELEMETRY/);
    assert.match(statusReply, /Total Learning Cycles:/);

    // On
    const onReply = await processTelegramCommand({ command: "/continuouslearning", symbol: "on" }, { paper, orders: [] });
    assert.match(onReply, /24\/7 CONTINUOUS LEARNING ENGINE ACTIVATED/);

    // Now
    const nowReply = await processTelegramCommand({ command: "/continuouslearning", symbol: "now" }, { paper, orders: [] });
    assert.match(nowReply, /CONTINUOUS LEARNING CYCLE/);
    assert.match(nowReply, /New Discovery:/);

    // Off
    const offReply = await processTelegramCommand({ command: "/continuouslearning", symbol: "off" }, { paper, orders: [] });
    assert.match(offReply, /24\/7 CONTINUOUS LEARNING ENGINE PAUSED/);

    // Restart 24/7 active
    autonomousSelfLearningEngine.startContinuousLearning(60000);
  });

});
