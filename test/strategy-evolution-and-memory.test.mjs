// @ts-check
import test from "node:test";
import assert from "node:assert/strict";
import { ExperienceStore } from "../src/learning/experience-store.mjs";
import { StrategyEvolver } from "../src/learning/strategy-evolver.mjs";
import { ExperimentRunner } from "../src/learning/experiment-runner.mjs";
import { StrategyModelRegistry } from "../src/learning/model-registry.mjs";

test("ExperienceStore: manages compartmentalized L1 through L4 memory tiers", () => {
  const store = new ExperienceStore();

  // L1 Working Memory
  store.setWorking("current_task", { action: "ANALYZE_BTC" });
  assert.equal(store.getWorking("current_task").action, "ANALYZE_BTC");

  // L2 Episodic Memory
  const ep = store.recordEpisode({ symbol: "BTCUSDT", strategy: "trend-v1", pnl: 450, validated: true });
  assert.ok(ep.id.startsWith("ep-"));
  assert.equal(store.queryEpisodes({ symbol: "BTCUSDT" }).length, 1);

  // L3 Semantic Memory
  store.storeSemantic("VOLATILITY_EXPANSION_PATTERN", { confidence: 0.88, notes: "Follows range compression" });
  assert.equal(store.getSemantic("VOLATILITY_EXPANSION_PATTERN").confidence, 0.88);

  // L4 Institutional Memory
  const rule = store.getInstitutional("MAX_RISK_PER_TRADE");
  assert.equal(rule.limitPercent, 1.0);
  assert.equal(rule.immutable, true);
});

test("StrategyEvolver: generates candidate experiment mutations without touching production files", () => {
  const evolver = new StrategyEvolver();
  const candidate = evolver.generateCandidate({
    parentStrategy: "momentum-v3",
    parentVersion: "3.2.0",
    baseParameters: { emaFast: 20, emaSlow: 50, rsiThreshold: 30 }
  });

  assert.ok(candidate.experimentId.startsWith("EXP-"));
  assert.equal(candidate.strategy, "momentum-v3");
  assert.equal(candidate.status, "CANDIDATE_QUEUED");
  assert.notEqual(candidate.changes.emaFast, undefined);
  assert.notEqual(candidate.changes.emaSlow, undefined);
});

test("ExperimentRunner: runs 5-stage validation gate and promotes robust candidate", async () => {
  const runner = new ExperimentRunner();
  const candidate = {
    experimentId: "EXP-000001",
    strategy: "meanrev-v2",
    newVersion: "2.1.1-exp"
  };

  const report = await runner.runValidationPipeline(candidate);
  assert.equal(report.allPassed, true);
  assert.equal(report.finalStatus, "PROMOTED_TO_SHADOW_CANDIDATE");
  assert.equal(report.stages.length, 5);
});

test("StrategyModelRegistry: produces sorted leaderboard and formatted ASCII text", () => {
  const registry = new StrategyModelRegistry();
  const leaderboard = registry.getLeaderboard();

  // Sorted by Sharpe descending
  assert.ok(leaderboard[0].sharpe >= leaderboard[1].sharpe);
  assert.equal(leaderboard[0].name, "Momentum v3");

  const formattedText = registry.getFormattedLeaderboardText();
  assert.ok(formattedText.includes("Momentum v3"));
  assert.ok(formattedText.includes("ACTIVE"));
  assert.ok(formattedText.includes("QUARANTINE"));
});
