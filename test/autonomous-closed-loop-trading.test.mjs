import test from "node:test";
import assert from "node:assert/strict";
import {
  AutomatedTradeExecutor,
  TradingDataCollector,
  StrategyPerformanceEvaluator,
  RiskAndPositionSizingManager,
  EdgeDecayDetector,
  TradingParameterOptimizer,
  MarketRegimeAdapter,
  ClosedLoopLearningEngine,
  AutonomousClosedLoopTradingSystem,
  autonomousClosedLoopSystem
} from "../src/core/autonomous-closed-loop-trading-system.mjs";
import { createQuantResearchMcpServer } from "../src/mcp/servers/quant-research-mcp.mjs";

test("Pillar 1: AutomatedTradeExecutor executes orders and enforces live trading safety guard", async () => {
  const executor = new AutomatedTradeExecutor({ mode: "paper", maxSlippageBps: 20 });
  
  // Paper order execution
  const fill = await executor.executeOrder({
    symbol: "AAPL",
    side: "BUY",
    quantity: 100,
    price: 150.0,
    strategyId: "CORE_MOMENTUM"
  });

  assert.equal(fill.status, "FILLED");
  assert.equal(fill.symbol, "AAPL");
  assert.equal(fill.filledQuantity, 100);
  assert.ok(fill.fillPrice > 0);
  assert.ok(fill.notionalValue > 0);
  assert.ok(fill.feeUsd >= 0);
  assert.equal(executor.getOpenPositions()["AAPL"].quantity, 100);

  // Live order without env flag must be blocked
  const liveExecutor = new AutomatedTradeExecutor({ mode: "live" });
  delete process.env.ENABLE_LIVE_TRADING;
  delete process.env.LIVE_TRADING_ENABLED;
  const blocked = await liveExecutor.executeOrder({
    symbol: "NVDA",
    side: "BUY",
    quantity: 10,
    price: 120.0
  });

  assert.equal(blocked.status, "REJECTED_SAFETY_GUARD");
  assert.match(blocked.reason, /Live execution blocked/);
});

test("Pillar 2: TradingDataCollector captures microstructure analytics and journal", () => {
  const collector = new TradingDataCollector();
  
  collector.recordTradeEvent({
    tradeId: "T1",
    symbol: "AAPL",
    side: "BUY",
    quantity: 50,
    requestedPrice: 150.0,
    fillPrice: 150.05,
    slippageBps: 3.33,
    feeUsd: 3.75,
    pnlUsd: 120.0,
    strategyId: "ALPHA_1"
  });

  collector.recordTradeEvent({
    tradeId: "T2",
    symbol: "AAPL",
    side: "SELL",
    quantity: 50,
    requestedPrice: 152.0,
    fillPrice: 151.95,
    slippageBps: 3.29,
    feeUsd: 3.80,
    pnlUsd: -40.0,
    strategyId: "ALPHA_1"
  });

  const analytics = collector.getMicrostructureAnalytics();
  assert.equal(analytics.totalTradesLogged, 2);
  assert.equal(analytics.netRealizedPnlUsd, 80.0);
  assert.ok(analytics.avgSlippageBps > 0);
  assert.ok(analytics.winLossRatio > 0);
});

test("Pillar 3: StrategyPerformanceEvaluator computes Sharpe, Sortino, Calmar, MaxDD, and Win Rate", () => {
  const evaluator = new StrategyPerformanceEvaluator();

  // Add 10 trades
  for (let i = 0; i < 7; i++) {
    evaluator.addCompletedTrade({ symbol: "AAPL", pnlUsd: 150, returnPct: 1.5, isWin: true });
  }
  for (let i = 0; i < 3; i++) {
    evaluator.addCompletedTrade({ symbol: "AAPL", pnlUsd: -100, returnPct: -1.0, isWin: false });
  }

  const metrics = evaluator.calculateMetrics(100000);
  assert.equal(metrics.totalTrades, 10);
  assert.equal(metrics.winningTrades, 7);
  assert.equal(metrics.losingTrades, 3);
  assert.equal(metrics.winRatePercent, 70.0);
  assert.ok(metrics.sharpeRatio > 0);
  assert.ok(metrics.sortinoRatio > 0);
  assert.ok(metrics.calmarRatio > 0);
  assert.ok(metrics.profitFactor > 1.0);
  assert.ok(metrics.expectancyUsd > 0);
});

test("Pillar 4: RiskAndPositionSizingManager calculates Half-Kelly, ATR Volatility Parity, and 1-Day VaR", () => {
  const riskManager = new RiskAndPositionSizingManager({ maxRiskPerTradePct: 0.02, maxLeverage: 1.5 });

  const sizing = riskManager.calculateOptimalPositionSize({
    symbol: "MSFT",
    accountEquity: 100000,
    winRate: 0.60,
    winLossRatio: 1.5,
    atr: 5.0,
    currentPrice: 400.0
  });

  assert.equal(sizing.status, "PASS");
  assert.ok(sizing.recommendedShares > 0);
  assert.ok(sizing.recommendedCapitalUsd > 0);
  assert.ok(sizing.halfKellyFraction > 0);
  assert.ok(sizing.riskBounds.var95Usd > 0);
  assert.ok(sizing.riskBounds.cvar95Usd > 0);
  assert.ok(sizing.recommendedCapitalUsd <= 100000 * 0.15); // Concentration cap
});

test("Pillar 5: EdgeDecayDetector computes Information Coefficient, t-stat, and quarantine status", () => {
  const sentry = new EdgeDecayDetector({ icDecayThreshold: 0.02, minTStat: 1.5 });

  for (let i = 0; i < 15; i++) {
    sentry.recordStrategyOutcome("STRONG_ALPHA", 100 + i * 5, 1.2);
  }
  for (let i = 0; i < 15; i++) {
    sentry.recordStrategyOutcome("DECAYING_ALPHA", -50 - i * 5, -0.8);
  }

  const report = sentry.getAttributionReport();
  assert.equal(report.totalTrackedStrategies, 6);
  assert.equal(report.strategies["STRONG_ALPHA"].quarantined, false);
  assert.equal(report.strategies["DECAYING_ALPHA"].quarantined, true);
  assert.ok(report.quarantinedCount >= 1);
});

test("Pillar 6: TradingParameterOptimizer runs Bayesian parameter grid search", () => {
  const optimizer = new TradingParameterOptimizer();

  const optResult = optimizer.runBayesianOptimization({
    strategyId: "SMC_STRUCTURAL_BREAK",
    lookbackRange: [10, 20, 30],
    stopLossRange: [0.01, 0.02],
    confidenceRange: [0.6, 0.75]
  });

  assert.equal(optResult.status, "OPTIMAL_PARAMETER_CONVERGENCE");
  assert.equal(optResult.strategyId, "SMC_STRUCTURAL_BREAK");
  assert.ok(optResult.optimalParameters.lookback >= 10);
  assert.ok(optResult.bestSharpeRatio > 0);
  assert.equal(optResult.totalEvaluations, 12);
});

test("Pillar 7: MarketRegimeAdapter classifies market regime and dynamically reallocates weights", () => {
  const adapter = new MarketRegimeAdapter();

  // Test Bullish Trend
  const bullState = adapter.classifyAndAdapt({ adx: 35.0, atrPct: 0.015, realizedVol: 0.14 });
  assert.equal(bullState.currentRegime, "TRENDING_BULLISH");
  assert.ok(bullState.strategyWeights.GNN_CONTAGION_MOMENTUM > 0.2);

  // Test High Volatility Crisis
  const crisisState = adapter.classifyAndAdapt({ adx: 45.0, atrPct: 0.06, realizedVol: 0.45 });
  assert.equal(crisisState.currentRegime, "HIGH_VOLATILITY_CRISIS");
  assert.ok(crisisState.strategyWeights.DEFENSIVE_HEDGER >= 0.4);
});

test("Pillar 8: ClosedLoopLearningEngine updates Bayesian Beta priors and diagnostic attribution", () => {
  const learner = new ClosedLoopLearningEngine();

  // Win increases alpha
  const r1 = learner.ingestTradeOutcome({
    tradeId: "T101",
    strategyId: "ALPHA_TEST",
    isWin: true,
    pnlUsd: 150.0,
    rootCause: "SMC FVG confluence"
  });

  assert.equal(r1.isWin, true);
  assert.equal(r1.posteriorPrior.alpha, 11); // 10 prior + 1
  assert.equal(r1.posteriorPrior.beta, 10);
  assert.ok(r1.posteriorPrior.expectedWinRatePercent > 50.0);

  // Loss increases beta
  const r2 = learner.ingestTradeOutcome({
    tradeId: "T102",
    strategyId: "ALPHA_TEST",
    isWin: false,
    pnlUsd: -80.0,
    rootCause: "Late session slippage"
  });

  assert.equal(r2.isWin, false);
  assert.equal(r2.posteriorPrior.beta, 11);
  assert.equal(learner.learningLog.length, 2);
});

test("Master Orchestrator: AutonomousClosedLoopTradingSystem runs complete autonomous cycle", async () => {
  const system = new AutonomousClosedLoopTradingSystem();

  const cycle = await system.runAutonomousCycle({
    symbol: "AAPL",
    currentPrice: 230.0,
    accountEquity: 100000,
    strategyId: "GNN_CONTAGION_MOMENTUM"
  });

  assert.ok(cycle.cycleId.startsWith("AUTOCYCLE_"));
  assert.equal(cycle.symbol, "AAPL");
  assert.ok(cycle.regime);
  assert.ok(cycle.positionSizing.recommendedShares > 0);
  assert.equal(cycle.orderResult.status, "FILLED");
  assert.ok(cycle.performanceSummary);
  assert.ok(cycle.attributionSummary);
  assert.ok(cycle.learnedBeliefs.length > 0);

  const status = system.getSystemStatus();
  assert.ok(status.executor);
  assert.ok(status.dataCollector);
  assert.ok(status.evaluator);
  assert.ok(status.regime);
});

test("MCP Hub: Quantitative Research Server registers and executes Tools 43-48", async () => {
  const mcpServer = createQuantResearchMcpServer();
  const toolNames = Array.from(mcpServer.tools.keys());

  assert.ok(toolNames.includes("execute_autonomous_trade"));
  assert.ok(toolNames.includes("get_strategy_performance_metrics"));
  assert.ok(toolNames.includes("calculate_risk_position_sizing"));
  assert.ok(toolNames.includes("detect_edge_decay_attribution"));
  assert.ok(toolNames.includes("optimize_strategy_parameters"));
  assert.ok(toolNames.includes("ingest_trade_outcome_learning"));

  // Call Tool 43: execute_autonomous_trade
  const res43 = await mcpServer.callTool("execute_autonomous_trade", {
    symbol: "AAPL",
    side: "BUY",
    quantity: 10,
    price: 230.0
  });
  assert.equal(res43.status, "FILLED");

  // Call Tool 44: get_strategy_performance_metrics
  const res44 = await mcpServer.callTool("get_strategy_performance_metrics", { equity: 100000 });
  assert.ok(res44.sharpeRatio !== undefined);

  // Call Tool 45: calculate_risk_position_sizing
  const res45 = await mcpServer.callTool("calculate_risk_position_sizing", {
    symbol: "AAPL",
    accountEquity: 100000,
    currentPrice: 230.0
  });
  assert.equal(res45.status, "PASS");

  // Call Tool 46: detect_edge_decay_attribution
  const res46 = await mcpServer.callTool("detect_edge_decay_attribution", {});
  assert.ok(res46.aggregateInformationCoefficient !== undefined);

  // Call Tool 47: optimize_strategy_parameters
  const res47 = await mcpServer.callTool("optimize_strategy_parameters", { strategyId: "SMC_STRUCTURAL_BREAK" });
  assert.equal(res47.status, "OPTIMAL_PARAMETER_CONVERGENCE");

  // Call Tool 48: ingest_trade_outcome_learning
  const res48 = await mcpServer.callTool("ingest_trade_outcome_learning", {
    strategyId: "MCP_TEST_STRAT",
    isWin: true,
    pnlUsd: 100.0,
    rootCause: "MCP test"
  });
  assert.equal(res48.isWin, true);
});
