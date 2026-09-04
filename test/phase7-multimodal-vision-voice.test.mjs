import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { analyzeChartWithVision, analyzeChartStream, placeOrderFromChart } from "../src/chart-vision-advanced.mjs";
import { captureChart, startChartCaptureDaemon } from "../src/chart-capture-engine.mjs";
import { transcribeAudio, parseVoiceCommand, executeVoiceCommand, startVoiceListener } from "../src/voice-transcriber.mjs";
import { speakResponse, generateVoiceResponse } from "../src/voice-responder.mjs";
import { createVisionDashboard } from "../src/dashboard-vision.mjs";
import { MultimodalOrchestrator } from "../src/multimodal-orchestrator.mjs";
import { analyzeSentimentFromNews, compareChartPatterns, generateVisualTradingReport } from "../src/sentiment-vision-news.mjs";
import { createPaperState } from "../src/paper-engine.mjs";
import { app } from "../server.mjs";

test("Phase 7A: analyzeChartWithVision recognizes pattern, trend, support/resistance, and generates signals", async () => {
  const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const indicators = { rsi: 30, macd: { histogram: 0.5 }, currentPrice: 180.0 };

  const analysis = await analyzeChartWithVision(dummyBase64, indicators);
  assert.ok(analysis.pattern);
  assert.ok(analysis.trend);
  assert.ok(["BUY", "SELL", "HOLD"].includes(analysis.signal));
  assert.ok(analysis.confidence >= 0 && analysis.confidence <= 1.0);
  assert.ok(Array.isArray(analysis.support_levels) && analysis.support_levels.length > 0);
  assert.ok(Array.isArray(analysis.resistance_levels) && analysis.resistance_levels.length > 0);
  assert.ok(analysis.recommended_entry > 0);
  assert.ok(analysis.recommended_stop_loss > 0);
  assert.ok(analysis.recommended_take_profit > 0);
});

test("Phase 7A: analyzeChartStream yields real-time streaming frames", async () => {
  const frames = [
    Buffer.from("frame-1"),
    Buffer.from("frame-2")
  ];

  const stream = analyzeChartStream(frames, { currentPrice: 182.0 }, { delayMs: 1 });
  let count = 0;
  for await (const frameAnalysis of stream) {
    count++;
    assert.ok(frameAnalysis.timestamp);
    assert.ok(frameAnalysis.signal);
  }
  assert.equal(count, 2);
});

test("Phase 7A: captureChart produces valid PNG buffer and daemon controls emissions", async () => {
  const chartBuffer = await captureChart("https://tradingview.com/chart/AAPL", "1m");
  assert.ok(Buffer.isBuffer(chartBuffer));
  assert.ok(chartBuffer.length >= 8);
  // PNG signature check
  assert.equal(chartBuffer[0], 0x89);
  assert.equal(chartBuffer[1], 0x50); // P
  assert.equal(chartBuffer[2], 0x4e); // N
  assert.equal(chartBuffer[3], 0x47); // G

  const daemon = startChartCaptureDaemon("https://tradingview.com/chart/AAPL", 50);
  assert.equal(daemon.isRunning(), true);
  daemon.stop();
  assert.equal(daemon.isRunning(), false);
});

test("Phase 7A: placeOrderFromChart executes order matching user intent", async () => {
  const paper = createPaperState({ cash: 100000 });
  const chartBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const result = await placeOrderFromChart(chartBase64, "long AAPL 10 shares", paper);
  assert.equal(result.success, true);
  assert.equal(result.order.symbol, "AAPL");
  assert.equal(result.order.side, "buy");
  assert.ok(result.fill);
});

test("Phase 7B: Speech-to-Text and parseVoiceCommand extract structured intents", async () => {
  const transcript = await transcribeAudio(Buffer.from("audio-mock"), { mockText: "Buy 15 shares of TSLA at 210 stop 195" });
  assert.equal(transcript, "Buy 15 shares of TSLA at 210 stop 195");

  const parsed = await parseVoiceCommand(transcript);
  assert.equal(parsed.action, "BUY");
  assert.equal(parsed.symbol, "TSLA");
  assert.equal(parsed.quantity, 15);
  assert.equal(parsed.order_type, "limit");
  assert.equal(parsed.limit_price, 210);
  assert.equal(parsed.stop_price, 195);
  assert.ok(parsed.confidence > 0.8);
});

test("Phase 7B: executeVoiceCommand places trades and checks positions", async () => {
  const paper = createPaperState({ cash: 100000 });
  const buyCmd = { action: "BUY", symbol: "AAPL", quantity: 5, limit_price: 180 };
  const execResult = await executeVoiceCommand(buyCmd, paper);
  assert.equal(execResult.status, "executed");
  assert.equal(execResult.order.symbol, "AAPL");

  const checkCmd = { action: "CHECK_POSITION", symbol: "AAPL" };
  const checkResult = await executeVoiceCommand(checkCmd, paper);
  assert.equal(checkResult.status, "position_checked");
  assert.equal(checkResult.position.quantity, 5);
});

test("Phase 7B: speakResponse and generateVoiceResponse generate speech safely", async () => {
  const spoken = await speakResponse("Order placed", "en-US-male", { mockSpeak: true });
  assert.equal(spoken, true);

  const verbal = await generateVoiceResponse({ order: { symbol: "BTCUSDT", side: "buy", quantity: 1 }, fill: { price: 65000 } }, { silent: true });
  assert.ok(verbal.includes("BTCUSDT"));
  assert.ok(verbal.includes("BUY"));
});

test("Phase 7C: createVisionDashboard generates HTML and MultimodalOrchestrator manages fusion", async () => {
  const html = createVisionDashboard();
  assert.ok(html.includes("Real-Time Chart Vision"));
  assert.ok(html.includes("Voice Trading Co-Pilot"));
  assert.ok(html.includes("Market Sentiment"));

  const paper = createPaperState({ cash: 100000 });
  const orchestrator = new MultimodalOrchestrator(paper);
  const status = await orchestrator.start({ intervalMs: 100 });
  assert.equal(status.status, "orchestrator_online");

  // Process aligned voice command
  const fusionResult = await orchestrator.processFusionCommand({ action: "BUY", symbol: "AAPL", quantity: 5, requires_confirmation: false }, { silent: true });
  assert.ok(["executed", "confirmation_required"].includes(fusionResult.status));

  orchestrator.stop();
});

test("Phase 7D: Sentiment from news, cross-timeframe comparison, and daily report generation", async () => {
  const headlines = [
    "Tech stocks surge on record semiconductor earnings",
    "Central banks reiterate cautious inflation approach"
  ];
  const sentiments = await analyzeSentimentFromNews(headlines);
  assert.equal(sentiments.length, 2);
  assert.ok(["BULLISH", "BEARISH", "NEUTRAL"].includes(sentiments[0].sentiment));

  const comparison = await compareChartPatterns({
    "AAPL-1h": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "AAPL-4h": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  });
  assert.ok(comparison.overall_signal_strength > 0);
  assert.ok(comparison.confluence_zones);

  const report = await generateVisualTradingReport("2026-09-04");
  assert.ok(report.reportDate);
  assert.ok(report.marketOverview);
  assert.ok(report.topSignals.length > 0);
});

test("Server Integration: Mounts all Phase 7 Multimodal Vision & Voice REST endpoints", async () => {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. POST /api/vision/analyze-chart
    const analyzeRes = await fetch(`${baseUrl}/api/vision/analyze-chart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chartBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" })
    });
    assert.equal(analyzeRes.status, 200);
    const analyzeData = await analyzeRes.json();
    assert.equal(analyzeData.success, true);
    assert.ok(analyzeData.pattern);

    // 2. POST /api/voice/parse-command
    const voiceRes = await fetch(`${baseUrl}/api/voice/parse-command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "Buy 10 shares of AAPL" })
    });
    assert.equal(voiceRes.status, 200);
    const voiceData = await voiceRes.json();
    assert.equal(voiceData.success, true);
    assert.equal(voiceData.action, "BUY");

    // 3. GET /api/vision/dashboard
    const dashRes = await fetch(`${baseUrl}/api/vision/dashboard`);
    assert.equal(dashRes.status, 200);
    const dashData = await dashRes.json();
    assert.equal(dashData.vision_engine, "ready");
    assert.ok(dashData.dashboardHtml.includes("Real-Time Chart Vision"));

    // 4. POST /api/vision/sentiment
    const sentRes = await fetch(`${baseUrl}/api/vision/sentiment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headlines: ["Market rally continues with strong breadth"] })
    });
    assert.equal(sentRes.status, 200);
    const sentData = await sentRes.json();
    assert.equal(sentData.success, true);
    assert.equal(sentData.sentiment[0].sentiment, "BULLISH");

    // 5. POST /api/vision/compare-patterns
    const compRes = await fetch(`${baseUrl}/api/vision/compare-patterns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ charts: {} })
    });
    assert.equal(compRes.status, 200);
    const compData = await compRes.json();
    assert.equal(compData.success, true);

    // 6. GET /api/vision/report
    const repRes = await fetch(`${baseUrl}/api/vision/report`);
    assert.equal(repRes.status, 200);
    const repData = await repRes.json();
    assert.equal(repData.success, true);
    assert.ok(repData.report.topSignals);

    // 7. POST /api/vision/order-from-chart
    const orderRes = await fetch(`${baseUrl}/api/vision/order-from-chart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chartBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        userIntent: "buy AAPL 5 shares"
      })
    });
    assert.equal(orderRes.status, 200);
    const orderData = await orderRes.json();
    assert.equal(orderData.success, true);
    assert.equal(orderData.order.symbol, "AAPL");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
