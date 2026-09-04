import test from "node:test";
import assert from "node:assert/strict";
import { autonomousSelfLearningEngine } from "../src/autonomous-self-learning-engine.mjs";
import { generateDailyReport } from "../src/daily-report.mjs";
import { parseTelegramCommand, processTelegramCommand } from "../src/telegram-command-listener.mjs";

test("autonomousSelfLearningEngine: 10-module operational status matrix", () => {
  const matrix = autonomousSelfLearningEngine.getModulesStatusMatrix();
  assert.equal(matrix.modules.length, 10, "Must have exactly 10 modules");
  assert.equal(matrix.summary.totalModules, 10);
  assert.equal(matrix.summary.healthyModules, 10);

  const requiredModuleNames = [
    "Learning Engine",
    "Research Engine",
    "Backtesting Engine",
    "Strategy Optimizer",
    "Risk Engine",
    "News Intelligence Engine",
    "Sentiment Engine",
    "Model Training Engine",
    "Knowledge Graph Engine",
    "Auto-Deployment Engine"
  ];

  for (const name of requiredModuleNames) {
    const mod = matrix.modules.find(m => m.name === name);
    assert.ok(mod, `Module ${name} must be present`);
    assert.equal(mod.status, "Healthy");
    assert.ok(typeof mod.liveProgressPercent === "number");
    assert.ok(typeof mod.currentTask === "string" && mod.currentTask.length > 0);
    assert.ok(typeof mod.keyMetrics === "string" && mod.keyMetrics.length > 0);
  }
});

test("autonomousSelfLearningEngine: daily learning report dashboard structure", () => {
  const dash = autonomousSelfLearningEngine.getDailyLearningReportDashboard();
  
  // Executive Summary
  assert.ok(dash.executiveSummary, "Executive summary must exist");
  assert.ok(dash.executiveSummary.headline);
  assert.ok(Array.isArray(dash.executiveSummary.whatWasLearnedToday) && dash.executiveSummary.whatWasLearnedToday.length > 0);
  assert.ok(Array.isArray(dash.executiveSummary.whatImprovedToday) && dash.executiveSummary.whatImprovedToday.length > 0);
  assert.ok(Array.isArray(dash.executiveSummary.whatStillNeedsImprovement) && dash.executiveSummary.whatStillNeedsImprovement.length > 0);
  assert.ok(Array.isArray(dash.executiveSummary.expectedImpactOnFutureTrading) && dash.executiveSummary.expectedImpactOnFutureTrading.length > 0);
  assert.ok(dash.executiveSummary.overallSystemEvolutionScore >= 0 && dash.executiveSummary.overallSystemEvolutionScore <= 100);

  // Today's Learning Summary
  assert.ok(dash.todaysLearningSummary);
  assert.ok(Array.isArray(dash.todaysLearningSummary.newPatternsDiscovered) && dash.todaysLearningSummary.newPatternsDiscovered.length > 0);
  assert.ok(Array.isArray(dash.todaysLearningSummary.newMarketBehaviorsIdentified));
  assert.ok(Array.isArray(dash.todaysLearningSummary.newCorrelationsDetected));
  assert.ok(Array.isArray(dash.todaysLearningSummary.importantNewsEventsLearned));
  assert.ok(Array.isArray(dash.todaysLearningSummary.newTradingInsightsGenerated));

  // Strategy Improvement Report
  assert.ok(dash.strategyImprovementReport);
  assert.ok(Array.isArray(dash.strategyImprovementReport.strategiesImprovedToday));
  assert.ok(Array.isArray(dash.strategyImprovementReport.parametersOptimized));
  assert.ok(Array.isArray(dash.strategyImprovementReport.newIndicatorsTested));
  assert.ok(Array.isArray(dash.strategyImprovementReport.modelsRetrained));
  assert.ok(dash.strategyImprovementReport.overfittingPboAudit.pboRatio < 0.05, "PBO must pass < 5% gate");

  // Prediction Accuracy Analysis
  assert.ok(dash.predictionAccuracyAnalysis);
  assert.ok(dash.predictionAccuracyAnalysis.signalAccuracy.current > 50);
  assert.ok(dash.predictionAccuracyAnalysis.winRate.current > 50);
  assert.ok(dash.predictionAccuracyAnalysis.profitFactor.current > 1.5);
  assert.ok(dash.predictionAccuracyAnalysis.sharpeRatio.current > 1.5);

  // Mistake Analysis
  assert.ok(dash.mistakeAnalysis);
  assert.ok(Array.isArray(dash.mistakeAnalysis.tradesThatFailed));
  assert.ok(Array.isArray(dash.mistakeAnalysis.rootCausesOfLosses));
  assert.ok(Array.isArray(dash.mistakeAnalysis.recommendedFixes));

  // Research Lab
  assert.ok(dash.researchExperimentLab);
  assert.ok(Array.isArray(dash.researchExperimentLab.experimentsConductedToday));

  // Internet Learning Activity
  assert.ok(dash.internetLearningActivity);
  assert.ok(Array.isArray(dash.internetLearningActivity.sourcesAnalyzed));
  assert.ok(Array.isArray(dash.internetLearningActivity.researchPapersProcessed));

  // AI Evolution Metrics
  assert.ok(dash.aiEvolutionMetrics);
  assert.ok(dash.aiEvolutionMetrics.knowledgeBaseGrowth.totalConceptsLearned >= 1000);

  // Tomorrow's Plan
  assert.ok(dash.tomorrowsImprovementPlan);
  assert.ok(Array.isArray(dash.tomorrowsImprovementPlan.highPriorityOptimizations));
});

test("autonomousSelfLearningEngine: runAutonomousLearningCycle executes and evolves", async () => {
  const initialCycles = autonomousSelfLearningEngine.getDailyLearningReportDashboard().continuousLoopMetrics.totalCyclesCompleted;
  const cycleResult = await autonomousSelfLearningEngine.runAutonomousLearningCycle("UNIT_TEST_TRIGGER");

  assert.ok(cycleResult.cycleId.startsWith("LEARN-CYCLE-"));
  assert.ok(cycleResult.durationMs >= 0);
  assert.ok(cycleResult.evolutionScore >= 80);
  assert.ok(cycleResult.retrainedModelsCount >= 1);
  assert.ok(cycleResult.generatedHypothesesCount >= 1);

  const updatedCycles = autonomousSelfLearningEngine.getDailyLearningReportDashboard().continuousLoopMetrics.totalCyclesCompleted;
  assert.equal(updatedCycles, initialCycles + 1);
});

test("autonomousSelfLearningEngine: ingestTradeOutcome handles WIN and LOSS feedback", () => {
  // Test WIN outcome
  const winResult = autonomousSelfLearningEngine.ingestTradeOutcome({
    symbol: "ETH/USDT",
    result: "WIN",
    profitPnl: 220,
    strategy: "SMC_BULLISH_OB",
    patternUsed: "SMC_BULLISH_OB"
  });

  assert.equal(winResult.success, true);
  assert.ok(winResult.accuracyMetrics.signalAccuracy.current > 0);

  // Test LOSS outcome (triggers mistake diagnosis and fix generation)
  const lossResult = autonomousSelfLearningEngine.ingestTradeOutcome({
    symbol: "SOL/USDT",
    result: "LOSS",
    realizedLossPnl: -85,
    strategy: "BREAKOUT_VOL_LONG",
    rootCause: "Whale limit wall absorption false breakout",
    marketCondition: "HIGH_VOLATILITY_COMPRESSION"
  });

  assert.equal(lossResult.success, true);
  assert.ok(lossResult.mistakeDiagnosis);
  assert.ok(lossResult.mistakeDiagnosis.recommendedFix);

  // Verify the loss is reflected in dashboard mistake analysis
  const dash = autonomousSelfLearningEngine.getDailyLearningReportDashboard();
  const foundMistake = dash.mistakeAnalysis.tradesThatFailed.find(t => t.symbol === "SOL/USDT");
  assert.ok(foundMistake, "Failed trade must be cataloged in mistake analysis");
  assert.equal(foundMistake.symbol, "SOL/USDT");
});

test("dailyReport: integrates learning report dashboard and CEO summary", () => {
  const report = generateDailyReport();
  assert.ok(report.learningDashboard, "Daily report must contain learningDashboard");
  assert.ok(report.executiveBriefing, "Daily report must contain executiveBriefing");
  assert.ok(report.executiveBriefing.overallSystemEvolutionScore >= 80);
  assert.ok(Array.isArray(report.executiveBriefing.whatWasLearnedToday));
  assert.ok(Array.isArray(report.executiveBriefing.whatImprovedToday));
});

test("telegram: parses and responds to /learning, /learncycle, /modulehealth", async () => {
  // Parsing
  const parsedLearning = parseTelegramCommand("🧠 Daily Learning Report");
  assert.equal(parsedLearning.command, "/learning");

  const parsedCycle = parseTelegramCommand("⚡ Run Self-Learning");
  assert.equal(parsedCycle.command, "/learncycle");

  const parsedHealth = parseTelegramCommand("🎛️ 10-Module Health");
  assert.equal(parsedHealth.command, "/modulehealth");

  // Execution
  const learningReply = await processTelegramCommand({ command: "/learning" });
  assert.ok(learningReply.includes("AUTONOMOUS 24/7 SELF-LEARNING"));
  assert.ok(learningReply.includes("CEO EXECUTIVE BRIEFING"));
  assert.ok(learningReply.includes("PREDICTION ACCURACY"));

  const healthReply = await processTelegramCommand({ command: "/modulehealth" });
  assert.ok(healthReply.includes("10-MODULE AUTONOMOUS CONTROL & OPERATIONAL MATRIX"));
  assert.ok(healthReply.includes("Learning Engine:"));
  assert.ok(healthReply.includes("Auto-Deployment Engine:"));

  const cycleReply = await processTelegramCommand({ command: "/learncycle" });
  assert.ok(cycleReply.includes("AUTONOMOUS 24/7 LEARNING CYCLE EXECUTED!"));
  assert.ok(cycleReply.includes("Retrained Models:"));
});
