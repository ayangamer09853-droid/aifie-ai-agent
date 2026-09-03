import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";
import { runEventDrivenBacktest, runMonteCarloSimulation, getBacktesterStatus } from "../src/event-driven-backtester.mjs";
import { analyzeChartVision, processNaturalVoiceCommand, routeLlmEnsembleQuery } from "../src/chart-vision-copilot.mjs";

test("event-driven backtester executes walk-forward simulation with CPCV validation", () => {
  const result = runEventDrivenBacktest({ symbol: "BTC/USDT", initialCapital: 100000 });
  assert.equal(result.engine, "AIFIE_APEX_EVENT_DRIVEN_BACKTESTER_V100");
  assert.equal(result.symbol, "BTC/USDT");
  assert.ok(Number.isFinite(result.finalEquity));
  assert.ok(result.metrics.totalTrades > 0);
  assert.ok(result.metrics.winRatePct >= 0 && result.metrics.winRatePct <= 100);
  assert.ok(Number.isFinite(result.metrics.sharpeRatio));
  assert.equal(result.cpcvValidationStatus, "COMBINATORIAL_PURGED_CROSS_VALIDATION_PASSED");
  assert.equal(result.cpcvRegimesPassed, 16);
});

test("10k Monte Carlo engine computes tail-risk drawdown probability cone", () => {
  const result = runMonteCarloSimulation({ pathsCount: 500, initialCapital: 100000 });
  assert.equal(result.engine, "AIFIE_APEX_10K_MONTE_CARLO_ENGINE");
  assert.equal(result.totalPathsSimulated, 500);
  assert.ok(Number.isFinite(result.probabilityCone.medianExpectedEquity));
  assert.ok(result.probabilityCone.worst5thPercentileEquity <= result.probabilityCone.top95thPercentileEquity);
  assert.ok(Number.isFinite(result.probabilityCone.p95WorstExpectedDrawdownPct));
  assert.ok(result.institutionalVerdict);
});

test("backtester status reports institutional capabilities", () => {
  const status = getBacktesterStatus();
  assert.equal(status.status, "EVENT_DRIVEN_BACKTESTER_ONLINE");
  assert.ok(status.capabilities.length >= 4);
});

test("chart vision co-pilot identifies candlestick order blocks and FVGs", () => {
  const vision = analyzeChartVision({ symbol: "ETH-USD" });
  assert.equal(vision.engine, "AIFIE_APEX_CHART_VISION_V100");
  assert.equal(vision.symbol, "ETH-USD");
  assert.ok(vision.visualFindings.orderBlockStatus);
  assert.ok(vision.visualFindings.fairValueGap);
  assert.ok(vision.patternVerdict);
  assert.ok(vision.confidencePct > 0);
  assert.ok(vision.voiceSummaryScript.includes("ETH-USD"));
});

test("natural voice command processor accurately extracts trading intent and audio script", () => {
  const buyCmd = processNaturalVoiceCommand("Aifie buy 2 btc now");
  assert.equal(buyCmd.parsedIntent, "EXECUTE_TRADE");
  assert.equal(buyCmd.extractedParameters.symbol, "BTC/USDT");
  assert.equal(buyCmd.extractedParameters.side, "BUY");
  assert.ok(buyCmd.audioResponseSpeechScript.includes("BTC/USDT"));

  const btCmd = processNaturalVoiceCommand("Run backtest on solana");
  assert.equal(btCmd.parsedIntent, "RUN_BACKTEST");
  assert.equal(btCmd.extractedParameters.symbol, "SOL");
});

test("LLM ensemble router dynamically balances between Gemini, GPT-4, and Hermes-3", () => {
  const fast = routeLlmEnsembleQuery({ prompt: "Quick alpha check", modelPreference: "AUTO_FAST" });
  assert.equal(fast.selectedModel, "gemini-1.5-flash");

  const local = routeLlmEnsembleQuery({ prompt: "Private quant logic", modelPreference: "LOCAL" });
  assert.equal(local.selectedModel, "hermes-3-llama-70b");
});

test("Apex v100 HTTP endpoints serve backtest, Monte Carlo, vision, and voice APIs", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const btRes = await fetch(`${baseUrl}/api/v100/backtest/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: "BTC/USDT", initialCapital: 50000 })
    });
    assert.equal(btRes.status, 200);
    const btData = await btRes.json();
    assert.equal(btData.symbol, "BTC/USDT");

    const mcRes = await fetch(`${baseUrl}/api/v100/backtest/montecarlo?paths=200`);
    assert.equal(mcRes.status, 200);
    const mcData = await mcRes.json();
    assert.equal(mcData.totalPathsSimulated, 200);

    const visRes = await fetch(`${baseUrl}/api/v100/vision/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: "SOL" })
    });
    assert.equal(visRes.status, 200);
    const visData = await visRes.json();
    assert.equal(visData.symbol, "SOL");

    const voiceRes = await fetch(`${baseUrl}/api/v100/voice/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript: "check btc status" })
    });
    assert.equal(voiceRes.status, 200);
    const voiceData = await voiceRes.json();
    assert.ok(voiceData.audioResponseSpeechScript);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
