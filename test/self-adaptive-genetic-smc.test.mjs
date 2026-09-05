// test/self-adaptive-genetic-smc.test.mjs
// Test Suite: Self-Adaptive Knowledge Graph, Genetic Mutator & Multi-Timeframe SMC Engine

import test from "node:test";
import assert from "node:assert/strict";
import { knowledgeGraphFeedbackEngine } from "../src/learning/knowledge-graph-feedback-engine.mjs";
import { telegramCommandRouter } from "../src/telegram/telegram-command-router.mjs";
import { geneticStrategyMutator } from "../src/strategies/genetic-strategy-mutator.mjs";
import { multiTimeframeSmcEngine } from "../src/analysis/multi-timeframe-smc-engine.mjs";
import { createQuantResearchMcpServer } from "../src/mcp/servers/quant-research-mcp.mjs";

test("KnowledgeGraphFeedbackEngine: Ingests axioms and evaluates adverse mitigation on NVDA", () => {
  const telemetry = knowledgeGraphFeedbackEngine.getTelemetry();
  assert.ok(telemetry.totalAxioms > 0, "Should have loaded axioms from knowledge store");

  const mitigation = knowledgeGraphFeedbackEngine.evaluateAdverseTradeMitigations("NVDA");
  assert.equal(typeof mitigation.hasAdversePattern, "boolean");
  assert.ok(mitigation.rules.length > 0, "Should detect adverse trade mitigation rule for NVDA");
  assert.equal(mitigation.hasAdversePattern, true);
  assert.ok(mitigation.convictionMultiplier < 1.0, "Should apply conviction dampener");
  assert.ok(mitigation.confirmationTicksRequired >= 2, "Should require additional confirmation ticks");
  assert.ok(mitigation.stopLossBufferMultiplier >= 1.2, "Should widen stop loss buffer");
});

test("KnowledgeGraphFeedbackEngine: Calibrates rule outcome and updates accuracy", () => {
  const rules = knowledgeGraphFeedbackEngine.rulesBySymbol.get("NVDA") || [];
  if (rules.length > 0) {
    const targetAxiom = rules[0];
    const initialCount = targetAxiom.appliedCount || 0;
    const calibrated = knowledgeGraphFeedbackEngine.calibrateRuleOutcome(targetAxiom.id || targetAxiom.axiomId, true);
    assert.ok(calibrated, "Should return calibrated axiom");
    assert.equal(calibrated.appliedCount, initialCount + 1);
    assert.ok(calibrated.accuracyRate.includes("%"), "Should update formatted accuracy rate");
  }
});

test("TelegramCommandRouter: Token-bucket rate limiter throttles burst requests cleanly", () => {
  const limiter = telegramCommandRouter.rateLimiter;
  const chatId = "test_user_burst_123";

  // Burst consume all 5 tokens
  for (let i = 0; i < 5; i++) {
    assert.equal(limiter.consume(chatId), true, `Token ${i + 1} should be accepted`);
  }

  // 6th attempt should be throttled
  const throttled = limiter.consume(chatId);
  assert.equal(throttled, false, "Excessive burst request should be rate-limited");
});

test("TelegramCommandRouter: Dispatches /mitigate command through modular router", async () => {
  const handled = await telegramCommandRouter.dispatch("/mitigate NVDA", {
    chatId: "chat_456",
    reply: (msg) => {
      assert.ok(msg.includes("ADVERSE TRADE MITIGATION"), "Response should contain mitigation report");
      assert.ok(msg.includes("NVDA"), "Response should reference NVDA");
    }
  });
  assert.equal(handled, true, "Should handle /mitigate command");
});

test("GeneticStrategyMutator: Evolve population with Deflated Sharpe Ratio gate", () => {
  const result = geneticStrategyMutator.evolvePopulation({
    strategyName: "TrendFollowingBreakout",
    populationSize: 8,
    mutationRate: 0.15
  });

  assert.equal(result.strategyName, "TrendFollowingBreakout");
  assert.equal(result.evaluatedCandidates, 9, "Should evaluate parent plus 8 mutants");
  assert.ok(result.championCandidate, "Should select a champion candidate");
  assert.ok(typeof result.championCandidate.fitness === "number");
  assert.ok(result.deflatedSharpeAudit, "Should perform Deflated Sharpe Ratio audit");
  assert.ok(typeof result.deflatedSharpeAudit.dsrPValue === "number");
  assert.ok(typeof result.deflatedSharpeAudit.passAudit === "boolean");
});

test("MultiTimeframeSmcEngine: Resamples timeframes, detects FVGs and computes confluence", () => {
  const analysis = multiTimeframeSmcEngine.analyzeSymbol("AAPL");
  assert.equal(analysis.symbol, "AAPL");
  assert.ok(analysis.timeframes["1m"], "Should have 1m timeframe data");
  assert.ok(analysis.timeframes["5m"], "Should have 5m timeframe data");
  assert.ok(analysis.timeframes["15m"], "Should have 15m timeframe data");
  assert.ok(analysis.timeframes["1h"], "Should have 1h timeframe data");
  assert.ok(typeof analysis.confluenceScore === "number");
  assert.ok(["BULLISH", "BEARISH", "NEUTRAL"].includes(analysis.structureBias));
  assert.ok(Array.isArray(analysis.keyZones));
});

test("MultiTimeframeSmcEngine: Renders valid multi-zone SVG chart", () => {
  const analysis = multiTimeframeSmcEngine.analyzeSymbol("BTC");
  const svg = multiTimeframeSmcEngine.renderMultiZoneSvgChart("BTC", analysis);
  assert.ok(typeof svg === "string");
  assert.ok(svg.startsWith("<svg"), "Should be an SVG root element");
  assert.ok(svg.includes("MULTI-TIMEFRAME SMC"), "Should include title header");
  assert.ok(svg.includes("</svg>"), "Should have SVG closing tag");
});

test("MCP Quant Research Server: Invokes new tools (mitigation, genetic, smc)", async () => {
  const server = createQuantResearchMcpServer();

  // Test Tool 25: evaluate_knowledge_mitigation_rules
  const mitigationRes = await server.callTool("evaluate_knowledge_mitigation_rules", { symbol: "NVDA" });
  assert.ok(mitigationRes, "Should return mitigation evaluation");
  assert.ok(mitigationRes.convictionMultiplier <= 1.0);

  // Test Tool 26: run_genetic_strategy_mutation
  const geneticRes = await server.callTool("run_genetic_strategy_mutation", {
    strategyName: "MeanReversionRSI",
    populationSize: 5
  });
  assert.ok(geneticRes, "Should return genetic evolution report");
  assert.ok(geneticRes.championCandidate);

  // Test Tool 27: analyze_multi_timeframe_smc_zones
  const smcRes = await server.callTool("analyze_multi_timeframe_smc_zones", {
    symbol: "ETH",
    includeSvg: true
  });
  assert.ok(smcRes.analysis, "Should return SMC analysis");
  assert.ok(smcRes.svg.includes("<svg"), "Should return embedded SVG chart");
});
