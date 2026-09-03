import test from "node:test";
import assert from "node:assert/strict";
import {
  getAutonomousQuantResearchPlatformStatus,
  evaluateStrategyScorecard,
  auditBacktestOverfittingPBO,
  getAlphaLifecycleGovernanceState,
  getMarketRegimeMatrix,
  runTailRiskSimulationLab,
  compileStrategyGenome,
  getResearchBudgetControllerStatus
} from "../src/autonomous-quant-research-intelligence-platform.mjs";

test("getAutonomousQuantResearchPlatformStatus reports active quant platform status", () => {
  const status = getAutonomousQuantResearchPlatformStatus();
  assert.equal(status.platformStatus, "AUTONOMOUS_QUANT_RESEARCH_PLATFORM_ONLINE");
  assert.equal(status.protocolVersion, "QUANT_RESEARCH_PLATFORM_V69_APEX");
  assert.equal(status.deflatedSharpeRatioDSR, 3.48);
  assert.ok(status.totalAlphasInPipeline > 0);
});

test("evaluateStrategyScorecard calculates comprehensive strategy scorecard & pre/post trade attribution", () => {
  const scorecard = evaluateStrategyScorecard({ strategyId: "ALPHA_SMC_MOMENTUM_V69", targetSymbol: "AAPL" });
  assert.equal(scorecard.decisionState, "KEEP_ACTIVE_IN_PRODUCTION");
  assert.equal(scorecard.scorecard.sharpeRatio, 3.42);
  assert.equal(scorecard.preTradeAttribution.expectedSharpe, 3.50);
  assert.equal(scorecard.postTradeAttribution.realizedSharpe, 3.42);
});

test("auditBacktestOverfittingPBO calculates PBO and Deflated Sharpe Ratio", () => {
  const pbo = auditBacktestOverfittingPBO({ strategyGenomeId: "GENOME_PAIR_ARB_01", backtestTrialsCount: 250 });
  assert.equal(pbo.auditStatus, "ANTI_OVERFITTING_AUDIT_COMPLETED_PASSED");
  assert.equal(pbo.probabilityOfBacktestOverfittingPBO, 0.042);
  assert.equal(pbo.deflatedSharpeRatioDSR, 3.48);
  assert.ok(pbo.pboTxHash.startsWith("0xPBO_AUDIT_"));
});

test("getAlphaLifecycleGovernanceState tracks 9-stage alpha lifecycle pipeline", () => {
  const lifecycle = getAlphaLifecycleGovernanceState({ alphaId: "ALPHA_MACRO_PAIRS_V69" });
  assert.equal(lifecycle.currentStatus, "PRODUCTION_ACTIVE");
  assert.equal(lifecycle.stagePipeline.length, 9);
});

test("compileStrategyGenome compiles natural language prompt into structured genome with research memory search", () => {
  const genome = compileStrategyGenome({ promptText: "Create co-integrated mean reverting pair strategy for AAPL and MSFT" });
  assert.equal(genome.genomeStatus, "STRATEGY_GENOME_COMPILED_SUCCESS");
  assert.equal(genome.researchMemorySearch.similarPastExperimentsFound, 1);
  assert.ok(genome.genomeHash.startsWith("0xGENOME_"));
});

test("getResearchBudgetControllerStatus enforces research compute limits", () => {
  const budget = getResearchBudgetControllerStatus();
  assert.equal(budget.budgetStatus, "RESEARCH_BUDGET_CONTROLLER_ACTIVE");
  assert.equal(budget.maxExperimentsPerDay, 50);
  assert.equal(budget.remainingExperimentsToday, 36);
});
