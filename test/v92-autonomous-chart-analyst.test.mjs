import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeChartPatterns,
  identifyTradeSetup,
  calculatePreTradeRisk,
  explainTradeThesis,
  runFullAutonomousMarketScan,
  getAutonomousAnalystInspection,
  generateDailyAnalystBriefing,
  getAnalystWatchState,
  MONITORED_ASSET_UNIVERSE
} from "../src/autonomous-chart-analyst-engine.mjs";

test("1. IT READS THE CHART — detects SMC structures, Wyckoff phases, and EMA ribbons", () => {
  const analysis = analyzeChartPatterns(null, "BTCUSDT");
  assert.equal(analysis.symbol, "BTCUSDT");
  assert.ok(typeof analysis.currentPrice === "number" && analysis.currentPrice > 0);
  assert.ok(analysis.indicators.ema9 > 0);
  assert.ok(analysis.indicators.ema21 > 0);
  assert.ok(analysis.indicators.rsi >= 0 && analysis.indicators.rsi <= 100);
  assert.ok(typeof analysis.smcStructures.orderBlockDetected === "boolean");
  assert.ok(typeof analysis.smcStructures.liquiditySweep === "boolean");
  assert.ok(typeof analysis.wyckoffPhase === "string");
  assert.ok(["BULLISH", "BEARISH", "NEUTRAL_RANGING"].includes(analysis.trend));
});

test("2. IT FINDS THE SETUPS — scores institutional conviction and determines trade grade", () => {
  const chart = analyzeChartPatterns(null, "ETHUSDT");
  const setup = identifyTradeSetup(chart);
  assert.equal(setup.symbol, "ETHUSDT");
  assert.ok(setup.convictionScore >= 10 && setup.convictionScore <= 100);
  assert.ok(["A+ (INSTITUTIONAL PRIME)", "A (HIGH CONVICTION)", "A (SHORT OPPORTUNITY)", "B (WATCHLIST ONLY)", "C"].includes(setup.grade));
  assert.ok(Array.isArray(setup.confluences));
  assert.ok(typeof setup.actionable === "boolean");
  assert.ok(setup.setupType.length > 0);
});

test("3. IT CALCULATES THE RISK — calculates exact stop-loss, position size, targets, and 1% risk guard", () => {
  const risk = calculatePreTradeRisk({
    currentPrice: 80000,
    direction: "STRONG_BUY",
    atr: 1200,
    accountEquity: 100000,
    riskPercent: 1.0
  });

  assert.equal(risk.accountEquity, 100000);
  assert.equal(risk.maxCapitalAtRisk, 1000); // 1% of 100k
  assert.ok(risk.stopLossPrice < 80000, "Stop loss must be below entry for BUY");
  assert.ok(risk.target1Price > 80000, "Target 1 must be above entry for BUY");
  assert.ok(risk.target2Price > risk.target1Price, "Target 2 must be above Target 1");
  assert.ok(risk.recommendedQuantity > 0);
  assert.equal(risk.riskToRewardRatio, "1 : 3.5");
  assert.ok(risk.kellyOptimalFraction > 0);
});

test("4. IT EXPLAINS THE TRADE — generates comprehensive institutional thesis narrative", () => {
  const chart = analyzeChartPatterns(null, "NVDA");
  const setup = identifyTradeSetup(chart);
  const risk = calculatePreTradeRisk({ currentPrice: 120, direction: setup.direction, atr: 3 });
  const thesis = explainTradeThesis(chart, setup, risk);

  assert.equal(thesis.symbol, "NVDA");
  assert.ok(thesis.summaryLine.includes("NVDA"));
  assert.ok(thesis.fullThesisNarrative.includes("INSTITUTIONAL APEX ANALYST THESIS"));
  assert.ok(thesis.fullThesisNarrative.includes("WHY THIS TRADE IS VALID"));
  assert.ok(thesis.fullThesisNarrative.includes("RISK & EXECUTION BLUEPRINT"));
});

test("5. IT WATCHES EVERY MARKET 24/7 — scans all 13 major assets across crypto, equities, commodities", async () => {
  const scan = await runFullAutonomousMarketScan();
  assert.equal(scan.status, "AUTONOMOUS_MARKET_SCAN_COMPLETE");
  assert.equal(scan.totalAssetsScanned, MONITORED_ASSET_UNIVERSE.length);
  assert.ok(scan.scanResults.length >= 13);
  
  // Verify assets from every category are covered
  const categories = scan.scanResults.map(s => s.category);
  assert.ok(categories.includes("CRYPTO"));
  assert.ok(categories.includes("US_EQUITY"));
  assert.ok(categories.includes("COMMODITY"));
  assert.ok(categories.includes("FOREX"));
});

test("6. IT BECOMES YOUR ANALYST — on-demand inspection and daily analyst briefing", async () => {
  const inspection = await getAutonomousAnalystInspection("BTCUSDT");
  assert.equal(inspection.analystId, "AIFIE_APEX_CHIEF_MARKET_ANALYST");
  assert.equal(inspection.symbol, "BTCUSDT");
  assert.ok(inspection.chart.currentPrice > 0);
  assert.ok(inspection.setup.convictionScore > 0);
  assert.ok(inspection.risk.stopLossPrice > 0);
  assert.ok(inspection.thesis.fullThesisNarrative.length > 50);

  const briefing = await generateDailyAnalystBriefing();
  assert.ok(briefing.briefingTitle.includes("CHIEF MARKET ANALYST"));
  assert.ok(Array.isArray(briefing.topActionablePicks));
  assert.ok(briefing.totalMonitoredAssets === 13);
});
