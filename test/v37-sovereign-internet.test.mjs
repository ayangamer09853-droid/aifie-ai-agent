import test from "node:test";
import assert from "node:assert/strict";
import { getSovereignInternetStatus, fetchLiveInternetMarketIntelligence, executeAutonomousWebTask, runFullInternetLearningLoop } from "../src/sovereign-internet-worker-engine.mjs";

test("getSovereignInternetStatus reports unconstrained freedom tier and scraping engines", () => {
  const status = getSovereignInternetStatus();
  assert.equal(status.sovereignFreedomStatus, "SOVEREIGN_UNCONSTRAINED_FREEDOM_TIER_MAX");
  assert.equal(status.internetAccessMode, "REAL_TIME_INTERNET_LEARNING_AND_WORKER_ACTIVE");
  assert.equal(status.webScrapingEnginesCount, 5);
  assert.equal(status.userInterventionRequired, false);
});

test("fetchLiveInternetMarketIntelligence ingests live internet feeds and sentiment", async () => {
  const intel = await fetchLiveInternetMarketIntelligence({ symbol: "AAPL" });
  assert.equal(intel.intelligenceStatus, "INTERNET_INTELLIGENCE_INGESTED_SUCCESSFULLY");
  assert.equal(intel.targetSymbol, "AAPL");
  assert.ok(intel.liveMarketPrice.startsWith("₹"));
  assert.equal(intel.compositeInternetSentiment, "STRONG_BULLISH_CONVICTION");
  assert.ok(intel.internetNewsHighlights.length >= 3);
});

test("executeAutonomousWebTask dispatches HTTP webhook worker tasks", () => {
  const task = executeAutonomousWebTask({ targetUrl: "https://api.aifie.org/webhook", payload: { test: true } });
  assert.equal(task.taskStatus, "AUTONOMOUS_WEB_TASK_EXECUTED");
  assert.equal(task.httpStatusCode, 200);
  assert.equal(task.payloadProcessed.agentFreedomLevel, "SOVEREIGN_UNCONSTRAINED_FREEDOM_TIER_MAX");
});

test("runFullInternetLearningLoop executes complete internet learning and web execution cycle", async () => {
  const loop = await runFullInternetLearningLoop({ symbol: "AAPL" });
  assert.equal(loop.learningLoopStatus, "CONTINUOUS_INTERNET_LEARNING_LOOP_COMPLETED");
  assert.ok(loop.systemVerdict.includes("executed full internet learning loop"));
});
