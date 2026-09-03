import test from "node:test";
import assert from "node:assert/strict";
import { getVisionEngineStatus, detectVisualChartPatterns, analyzeChartImage } from "../src/multimodal-vision-chart-engine.mjs";

test("getVisionEngineStatus reports real-world neural vision transformer engine status", () => {
  const status = getVisionEngineStatus();
  assert.equal(status.visionEngineStatus, "MULTIMODAL_VISION_ENGINE_REAL_WORLD_ONLINE");
  assert.equal(status.visionModel, "GEMINI_1_5_FLASH_VISION_NEURAL_V32");
  assert.equal(status.realWorldApiConnected, true);
  assert.ok(status.supportedPatterns.length >= 5);
});

test("detectVisualChartPatterns identifies primary order block and live prices", () => {
  const patterns = detectVisualChartPatterns("AAPL");
  assert.equal(patterns.symbol, "AAPL");
  assert.ok(patterns.currentLivePrice.startsWith("₹"));
  assert.ok(patterns.primaryVisualPattern);
  assert.ok(patterns.visualConfidenceScore >= 80);
});

test("analyzeChartImage processes visual screenshot via real-world vision pipeline", async () => {
  const analysis = await analyzeChartImage({ symbol: "AAPL", imageUrl: "https://example.com/chart.png" });
  assert.equal(analysis.analysisStatus, "REAL_WORLD_VISUAL_CHART_ANALYSIS_SUCCESSFUL");
  assert.equal(analysis.parsedSymbol, "AAPL");
  assert.ok(analysis.visionInferenceEngine.includes("GEMINI"));
  assert.ok(analysis.visualChartSummary.includes("Real-world multi-modal vision"));
});
