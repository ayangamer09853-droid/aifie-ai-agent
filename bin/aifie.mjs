#!/usr/bin/env node
// bin/aifie.mjs
// Aifie Autonomous Trading Platform - Forensic Replay & Control CLI

import { aifieEventBus } from "../src/core/event-bus-replay.mjs";
import { strategyRegistry } from "../src/strategies/strategy-registry.mjs";
import { independentRiskFortress } from "../src/independent-risk-fortress.mjs";
import { ProbabilityCalibrator } from "../src/research/probability-calibrator.mjs";
import { SystemDiagnostics } from "../src/observability/system-diagnostics.mjs";
import { twoKeySecurityVault } from "../src/security/two-key-vault.mjs";
import { dataFeedingEngine } from "../src/ingestion/data-feeding-engine.mjs";
import { mcpHub } from "../src/mcp/mcp-hub.mjs";

const args = process.argv.slice(2);
const command = args[0] || "help";

function printBanner() {
  console.log(`
========================================================================
  AIFIE SOVEREIGN TRADING SYSTEM (v101-baseline)
  Forensic Replay, Contract Auditing & Control Plane
========================================================================
`);
}


export function formatTradeReplay(correlationId) {
  const report = aifieEventBus.replayTradeDecision(correlationId);
  if (!report.found) {
    return `[ERROR] No trade events found for correlation ID: ${correlationId}`;
  }

  const { causalityReport, rawTimeline } = report;
  const lines = [];

  lines.push(`------------------------------------------------------------------------`);
  lines.push(` FORENSIC TRADE DECISION REPLAY: ${correlationId}`);
  lines.push(` Asset: ${causalityReport.symbol} | Duration: ${report.elapsedTimeMs}ms | Total Events: ${report.totalEvents}`);
  lines.push(`------------------------------------------------------------------------`);
  lines.push(``);
  lines.push(`[1. DATA PLANE]`);
  lines.push(`   Tick Arrival Price: $${causalityReport.tickPrice ?? "N/A"}`);
  lines.push(``);
  lines.push(`[2. FEATURE PLANE]`);
  if (causalityReport.features) {
    for (const [k, v] of Object.entries(causalityReport.features)) {
      lines.push(`   - ${k.padEnd(16)}: ${v}`);
    }
  } else {
    lines.push(`   - Features: Standard computed`);
  }
  lines.push(``);
  lines.push(`[3. ALPHA PLANE] Contributing Signals:`);
  for (const s of causalityReport.contributingSignals) {
    lines.push(`   - [${s.source}] ${s.direction} (Confidence: ${(s.confidence * 100).toFixed(1)}%) -> ${s.rationale}`);
  }
  lines.push(``);
  lines.push(`[4. DECISION PLANE] TradeIntent Generated:`);
  if (causalityReport.tradeIntent) {
    const ti = causalityReport.tradeIntent;
    lines.push(`   Side: ${ti.side} | Entry: $${ti.entry} | StopLoss: $${ti.stopLoss} | TakeProfit: $${ti.takeProfit}`);
    lines.push(`   Requested Max Exposure: $${ti.maxPosition} | Calibrated Confidence: ${(ti.confidence * 100).toFixed(1)}%`);
  } else {
    lines.push(`   (No TradeIntent assembled)`);
  }
  lines.push(``);
  lines.push(`[5. RISK PLANE] Sovereign Gate Verdict:`);
  const rd = causalityReport.riskDecision;
  lines.push(`   Verdict : ${rd.status}`);
  if (rd.status === "APPROVED") {
    lines.push(`   Approved Size: $${rd.approvedSize} (VaR 99%: $${rd.var99 ?? "N/A"}, CVaR: $${rd.cvar99 ?? "N/A"})`);
  } else if (rd.status === "REJECTED") {
    lines.push(`   Rejection Reason: ${rd.reason ?? "Ceiling Breached"}`);
  }
  lines.push(``);
  lines.push(`[6. EXECUTION PLANE] Broker Routing & Fill:`);
  const ex = causalityReport.execution;
  lines.push(`   Status      : ${ex.status}`);
  if (ex.status === "FILLED") {
    lines.push(`   OrderId     : ${ex.orderId}`);
    lines.push(`   Filled Price: $${ex.filledPrice}`);
    lines.push(`   Quantity    : ${ex.filledQuantity}`);
    lines.push(`   Slippage    : ${ex.slippageBps} bps`);
  }
  lines.push(`------------------------------------------------------------------------`);

  return lines.join("\n");
}

export function getSystemPlaneStatus() {
  const riskStatus = independentRiskFortress.getStatus();
  const strategies = strategyRegistry.list();

  return {
    planes: {
      DATA_PLANE: { status: "HEALTHY", normalizerActive: true, dataQualityThreshold: 85 },
      FEATURE_PLANE: { status: "HEALTHY", l2DepthActive: true, vpinActive: true },
      ALPHA_PLANE: { status: "ACTIVE", registeredStrategies: strategies.length },
      DECISION_PLANE: { status: "ACTIVE", governorProtocol: "TradeIntent" },
      RISK_PLANE: {
        status: riskStatus.status,
        emergencyHalt: riskStatus.isGlobalEmergencyHalt,
        dailyDrawdownPct: riskStatus.currentDrawdownPct,
        maxDrawdownCap: 3.0
      },
      EXECUTION_PLANE: { status: "ACTIVE", defaultMode: "PAPER", twoKeyVault: "ENABLED" },
      AUDIT_PLANE: { status: "ACTIVE", eventSourcing: "CIRCULAR_LOG_ACTIVE" },
      OBSERVABILITY_PLANE: { status: "ACTIVE", multiClockTracking: true }
    }
  };
}

import { HistoricalReplayEngine } from "../src/research/historical-replay-engine.mjs";
import { chaosEngine } from "../src/benchmarks/chaos-engine.mjs";
import { MonteCarloRuinEngine } from "../src/research/monte-carlo-ruin-engine.mjs";
import { TransactionCostAnalyzer } from "../src/execution/transaction-cost-analyzer.mjs";

function printHelp() {
  printBanner();
  console.log(`Usage:
  node bin/aifie.mjs <command> [options]

Commands:
  monitor                 Launch interactive live terminal TUI cockpit (--once for single frame)
  status                  Inspect health across all 8 architectural planes
  strategies              List registered alpha strategies and regime weights
  calibrate               Generate probability calibration and Brier score report
  tca                     Run Transaction Cost Analysis (TCA) & slippage decomposition
  monte-carlo             Run 10,000-path Monte Carlo ruin & tail risk simulation
  chaos                   Execute full 12-scenario chaos engineering battery
  replay --trade <id>     Replay the full causality timeline for a trade
  replay --date <date> --symbol <sym>  Replay full historical trading session
  feed [status|tick|candle|news|signal|ledger]  Direct multi-channel data feeding into agent core
  mcp [status|servers|tools|call]  Model Context Protocol (MCP) Hub & Tool Dispatcher
  help                    Show this guidance
`);
}

async function runCli() {
  switch (command) {
    case "monitor": {
      const isOnce = args.includes("--once");
      const renderFrame = () => {
        const diag = SystemDiagnostics.runDiagnostics();
        const strategies = strategyRegistry.list();
        const risk = independentRiskFortress.getStatus();
        const now = new Date().toISOString();

        process.stdout.write("\x1b[2J\x1b[H"); // Clear screen & move to top-left
        console.log(`\x1b[1;36m========================================================================================\x1b[0m`);
        console.log(`\x1b[1;37m   AIFIE SOVEREIGN TRADING SYSTEM (v101) - LIVE CONTROL PANEL & COCKPIT\x1b[0m`);
        console.log(`\x1b[90m   Local Time: ${now} | Process ID: ${process.pid} | Node: ${process.version}\x1b[0m`);
        console.log(`\x1b[1;36m========================================================================================\x1b[0m`);
        
        console.log(`\x1b[1;33m[1. HARD BOUNDARIES — ACTIVE WORKING PROCESSES]\x1b[0m`);
        for (const [plane, wp] of Object.entries(diag.workingProcesses)) {
          const isOk = wp.status.includes("HEALTHY") || wp.status.includes("ACTIVE");
          const sym = isOk ? "\x1b[32m✔" : "\x1b[31m✖";
          const stateColor = isOk ? "\x1b[32m" : "\x1b[31m";
          console.log(`  ${sym} \x1b[1m${plane.padEnd(20)}\x1b[0m [${stateColor}${wp.status}\x1b[0m] -> \x1b[36m${wp.step}\x1b[0m`);
          console.log(`     \x1b[90m↳ Process: ${wp.description}\x1b[0m`);
        }

        console.log(`\n\x1b[1;33m[2. REAL-TIME FAULT & ERROR SENTINEL]\x1b[0m`);
        if (diag.totalIssues === 0) {
          console.log(`  \x1b[42;30m ✔ ALL SYSTEMS OPTIMAL \x1b[0m \x1b[32m0 Critical Errors | 0 Circuit Breaches | 0 Stale Feeds | 0 Drift Errors\x1b[0m`);
        } else {
          console.log(`  \x1b[41;37m ✖ SYSTEM ALERTS DETECTED: ${diag.totalIssues} Issue(s) (${diag.criticalCount} Critical, ${diag.warningCount} Warnings) \x1b[0m`);
          for (const alert of diag.activeAlerts) {
            const badge = alert.severity === "CRITICAL" ? "\x1b[41;37m CRITICAL \x1b[0m" : "\x1b[43;30m WARNING \x1b[0m";
            console.log(`  ${badge} \x1b[1;31m[${alert.component}]\x1b[0m: ${alert.message}`);
            console.log(`     \x1b[33m↳ Fix / Action Required:\x1b[0m ${alert.recommendation}`);
          }
        }

        console.log(`\n\x1b[1;33m[3. RISK FORTRESS STATUS]\x1b[0m`);
        const haltBadge = risk.isGlobalEmergencyHalt ? "\x1b[41;37m EMERGENCY HALTED \x1b[0m" : "\x1b[42;30m NORMAL LIQUIDITY \x1b[0m";
        console.log(`  Gate Status: ${haltBadge} | Daily DD: ${(risk.currentDrawdownPct ?? 0).toFixed(2)}% / Max Cap: 3.0%`);
        console.log(`  Breaches Today: ${risk.circuitBreakersTriggered ?? 0} | Sovereign Key: \x1b[32mARMED\x1b[0m | Mode: \x1b[36m${twoKeySecurityVault.getExecutionMode()}\x1b[0m`);

        console.log(`\n\x1b[1;33m[4. ACTIVE STRATEGY REGIME WEIGHTS]\x1b[0m`);
        for (const s of strategies) {
          const barLen = Math.round(s.currentWeight * 25);
          const bar = "█".repeat(barLen) + "-".repeat(Math.max(0, 25 - barLen));
          console.log(`  ${s.id.padEnd(18)} [${bar}] ${(s.currentWeight * 100).toFixed(1)}% | Sharpe: ${s.historicalPerformance.sharpe} | WR: ${(s.historicalPerformance.winRate * 100).toFixed(0)}%`);
        }

        console.log(`\n\x1b[1;33m[5. RECENT CAUSALITY EVENTS]\x1b[0m`);
        const recentEvts = aifieEventBus.eventLog.slice(-5);
        if (recentEvts.length === 0) {
          console.log(`  \x1b[90m(Awaiting incoming market events / ticks)\x1b[0m`);
        } else {
          for (const e of recentEvts) {
            console.log(`  \x1b[35m[${new Date(e.timestamp).toISOString().slice(11, 19)}]\x1b[0m \x1b[1m${e.eventType.padEnd(22)}\x1b[0m src: ${e.source}`);
          }
        }

        console.log(`\x1b[1;36m----------------------------------------------------------------------------------------\x1b[0m`);
        console.log(`  \x1b[90mPress Ctrl+C to detach cockpit.\x1b[0m`);
      };

      renderFrame();
      if (!isOnce) {
        const interval = setInterval(renderFrame, 1000);
        process.on("SIGINT", () => {
          clearInterval(interval);
          process.stdout.write("\n\x1b[0mCockpit detached.\n");
          process.exit(0);
        });
      }
      break;
    }
    case "tca": {
      printBanner();
      console.log("Transaction Cost Analysis (TCA) - Execution Drag Decomposition:\n");
      // Analyze sample benchmark fills
      const sampleFills = [
        { side: "BUY", quantity: 1.5, arrivalPrice: 65420.0, submissionPrice: 65421.2, bidPrice: 65420.5, askPrice: 65421.5, executedPrice: 65422.0, feeBps: 2.0 },
        { side: "SELL", quantity: 2.0, arrivalPrice: 65450.0, submissionPrice: 65449.5, bidPrice: 65449.0, askPrice: 65450.0, executedPrice: 65448.8, feeBps: 2.0 },
        { side: "BUY", quantity: 0.8, arrivalPrice: 65380.0, submissionPrice: 65380.0, bidPrice: 65379.8, askPrice: 65380.2, executedPrice: 65380.3, feeBps: 2.0 }
      ];
      const reports = sampleFills.map(f => TransactionCostAnalyzer.analyzeOrder(f));
      console.table(reports.map(r => ({
        Side: r.side,
        Quantity: r.quantity,
        Arrival: `$${r.arrivalPrice}`,
        Fill: `$${r.executedPrice}`,
        TotalBps: `${r.totalShortfallBps} bps`,
        HalfSpread: `$${r.breakdown.halfSpreadCost}`,
        MarketImpact: `$${r.breakdown.impactCost}`,
        LatencyDelay: `$${r.breakdown.latencyCost}`,
        Rating: r.dragRating
      })));

      const agg = TransactionCostAnalyzer.aggregate(reports);
      console.log(`\nPortfolio TCA Summary:`);
      console.log(`  Total Notional Volume   : $${agg.totalNotional.toLocaleString()}`);
      console.log(`  Total Execution Shortfall: $${agg.totalShortfallCost} (${agg.averageShortfallBps} bps avg drag)`);
      console.log(`  Drag Cost Attribution   : Spread: ${agg.attributionPercentages.spread}% | Impact: ${agg.attributionPercentages.marketImpact}% | Latency: ${agg.attributionPercentages.latency}% | Fees: ${agg.attributionPercentages.fees}%\n`);
      break;
    }
    case "monte-carlo": {
      printBanner();
      console.log("Monte Carlo Ruin Probability & Tail Risk Simulation (10,000 Paths):\n");
      // Historical representative returns array
      const sampleReturns = [
        0.015, -0.008, 0.022, 0.005, -0.012, 0.018, -0.004, 0.009, 0.025, -0.015,
        0.007, -0.006, 0.014, -0.011, 0.030, -0.020, 0.008, 0.012, -0.005, 0.019
      ];
      const sim = MonteCarloRuinEngine.simulate({
        returns: sampleReturns,
        initialCapital: 100000,
        simulations: 10000,
        horizon: 250,
        ruinThreshold: 0.30,
        leverage: 1.0
      });
      console.log(`Simulation Parameters:`);
      console.log(`  Paths: ${sim.simulations.toLocaleString()} | Horizon: ${sim.horizon} trades | Ruin Threshold: ${(sim.ruinThreshold * 100)}% DD`);
      console.log(`\nRisk of Ruin & Tail Metrics:`);
      console.log(`  Probability of Ruin (P_ruin) : ${sim.metrics.probabilityOfRuinPercent}% (Audit Pass: ${sim.passAudit ? "✔ YES" : "✖ NO"})`);
      console.log(`  Expected Max Drawdown        : ${(sim.metrics.expectedMaxDrawdown * 100).toFixed(2)}%`);
      console.log(`  Median Ending Equity         : $${sim.metrics.medianFinalEquity.toLocaleString()}`);
      console.log(`  95th Percentile Drawdown     : ${(sim.metrics.drawdownQuantiles.p95 * 100).toFixed(2)}%`);
      console.log(`  99th Percentile Drawdown     : ${(sim.metrics.drawdownQuantiles.p99 * 100).toFixed(2)}%`);
      console.log(`  99.9% Value at Risk (VaR)    : ${(sim.metrics.var999 * 100).toFixed(2)}%`);
      console.log(`  99.9% Expected Shortfall     : ${(sim.metrics.cvar999 * 100).toFixed(2)}%`);
      console.log(`  Recommended Safe Leverage    : ${sim.metrics.safeLeverageMultiplier}x`);
      console.log(`  Operational Action           : \x1b[32m${sim.recommendedAction}\x1b[0m\n`);
      break;
    }
    case "replay": {
      const dateIdx = args.indexOf("--date");
      if (dateIdx !== -1) {
        const date = args[dateIdx + 1] || "2026-08-20";
        const symIdx = args.indexOf("--symbol");
        const symbol = symIdx !== -1 ? args[symIdx + 1] : "BTCUSDT";
        printBanner();
        console.log(`Replaying Historical Market Date: ${date} for ${symbol}...\n`);
        const report = HistoricalReplayEngine.replayDateAndSymbol({ date, symbol });
        console.log(`------------------------------------------------------------------------`);
        console.log(` HISTORICAL SESSION REPLAY: ${report.date} [${report.symbol}]`);
        console.log(` Starting Capital: $${report.startingCapital.toLocaleString()} -> Ending Equity: $${report.endingEquity.toLocaleString()}`);
        console.log(` Net Session PnL : $${report.netSessionPnl} (${report.netSessionReturnPct}%) | Max DD: ${report.maxDrawdownPct}%`);
        console.log(` Trades Executed : ${report.metrics.tradesExecuted} (Win Rate: ${(report.metrics.winRate * 100).toFixed(1)}%)`);
        console.log(` Risk Decisions  : ${report.metrics.riskApprovals} Approved | ${report.metrics.riskRejections} Rejected`);
        console.log(`------------------------------------------------------------------------`);
        if (report.trades.length > 0) {
          console.log(`\nSession Trade Ledger:`);
          console.table(report.trades.map(t => ({
            Time: t.time.slice(11, 19),
            Side: t.side,
            Entry: `$${t.entryPrice}`,
            Exec: `$${t.executionPrice}`,
            Notional: `$${t.notional}`,
            NetPnL: `$${t.netPnl}`,
            Outcome: t.outcome
          })));
        }
        break;
      }

      const tradeIdx = args.indexOf("--trade");
      const tradeId = tradeIdx !== -1 ? args[tradeIdx + 1] : args[1];
      if (!tradeId) {
        console.error("Error: Please specify: node bin/aifie.mjs replay --trade <id> OR --date <YYYY-MM-DD> --symbol <SYM>");
        process.exit(1);
      }
      
      const asyncReport = await aifieEventBus.replayTradeDecisionAsync(tradeId);
      if (asyncReport.found) {
        console.log(formatTradeReplay(tradeId));
      } else {
        console.log(`[ERROR] No trade events found for correlation ID: ${tradeId}`);
      }
      break;
    }
    case "chaos": {
      printBanner();
      console.log("Executing Full 12-Scenario Chaos Engineering Battery...\n");
      const report = chaosEngine.runFullChaosBattery();
      console.table(report.scenarios.map(s => ({
        Scenario: s.scenario,
        Passed: s.passed ? "✔ PASS" : "✖ FAIL",
        Details: s.details
      })));
      console.log(`\nChaos Battery Verdict: ${report.allPassed ? "100% RESILIENT (ALL 12 PASSED)" : "FAILURES DETECTED"}`);
      break;
    }
    case "status": {
      printBanner();
      const diag = SystemDiagnostics.runDiagnostics();
      console.log("System Status Across 8 Hard Boundaries — Working Processes:\n");
      for (const [plane, wp] of Object.entries(diag.workingProcesses)) {
        const isOk = wp.status.includes("HEALTHY") || wp.status.includes("ACTIVE");
        const sym = isOk ? "✔" : "✖";
        console.log(`  ${sym} [${plane}] -> ${wp.status}`);
        console.log(`      Current Step: ${wp.step}`);
        console.log(`      Process Flow: ${wp.description}`);
      }
      console.log("\nFault & Error Sentinel Report:");
      if (diag.totalIssues === 0) {
        console.log("  ✔ All Systems Optimal: 0 Critical Errors, 0 Breaches, 0 Stale Feeds.\n");
      } else {
        console.log(`  ✖ Detected ${diag.totalIssues} Alert(s):`);
        for (const a of diag.activeAlerts) {
          console.log(`    - [${a.severity}] ${a.component}: ${a.message} (Action: ${a.recommendation})`);
        }
        console.log("");
      }
      break;
    }
    case "strategies": {
      printBanner();
      console.log("Registered Alpha Strategies & Regime Weights:\n");
      const list = strategyRegistry.list();
      console.table(list.map(s => ({
        ID: s.id,
        Name: s.name,
        Status: s.status,
        Weight: `${(s.currentWeight * 100).toFixed(1)}%`,
        Sharpe: s.historicalPerformance.sharpe,
        WinRate: `${(s.historicalPerformance.winRate * 100).toFixed(0)}%`
      })));
      break;
    }
    case "calibrate": {
      printBanner();
      const mockPreds = [0.85, 0.82, 0.81, 0.88, 0.45, 0.55, 0.20, 0.30];
      const mockOutcomes = [1, 1, 0, 1, 0, 1, 0, 0];
      const report = ProbabilityCalibrator.generateReliabilityDiagram(mockPreds, mockOutcomes, 5);
      console.log(`Reliability Diagram & Calibration Report:`);
      console.log(`Brier Score: ${report.brierScore} (0.0 = perfect, 0.25 = uninformative)`);
      console.log(`Expected Calibration Error (ECE): ${report.expectedCalibrationError}`);
      console.log(`\nProbability Bins:`);
      console.table(report.bins.map(b => ({
        Range: `${b.minProb} - ${b.maxProb}`,
        Count: b.count,
        MeanPredicted: b.meanPredicted,
        EmpiricalWinRate: b.empiricalFrequency,
        Gap: b.calibrationGap
      })));
      break;
    }
    case "feed": {
      printBanner();
      const sub = (args[1] || "status").toLowerCase();

      const getFlag = (name, fallback = null) => {
        const idx = args.indexOf(`--${name}`);
        if (idx !== -1 && args[idx + 1]) return args[idx + 1];
        return fallback;
      };

      if (sub === "status") {
        const tel = dataFeedingEngine.getTelemetry();
        console.log("Aifie Sovereign Data Feeding Engine Telemetry:\n");
        console.table([{
          TotalRecordsFed: tel.totalRecordsFed,
          MarketTicks: tel.ticksFed,
          OHLCVCandles: tel.candlesFed,
          NewsSentiments: tel.newsFed,
          AlphaSignals: tel.signalsFed,
          LedgerSize: `${tel.ledgerSize} / ${tel.maxLedgerSize}`,
          ActiveChannels: tel.activeChannels.join(", ") || "API, CLI"
        }]);
        break;
      }

      if (sub === "ledger" || sub === "history") {
        const limit = parseInt(getFlag("limit", "15"), 10);
        const ledger = dataFeedingEngine.getRecentLedger(limit);
        console.log(`Recent Data Feeding Ledger (Last ${ledger.length} events):\n`);
        if (ledger.length === 0) {
          console.log("  No records fed in current session.");
        } else {
          console.table(ledger.map(item => ({
            Time: new Date(item.timestamp).toLocaleTimeString(),
            Channel: item.channel,
            Type: item.type,
            Symbol: item.symbol || "N/A",
            PriceOrSummary: item.price ? `$${item.price}` : item.close ? `Close: $${item.close}` : item.headline?.slice(0, 30) || item.action || "---",
            CorrelationId: (item.correlationId || "").slice(0, 12)
          })));
        }
        break;
      }

      if (sub === "tick") {
        const symbol = getFlag("symbol", args[2] || "BTC/USDT").toUpperCase();
        const price = parseFloat(getFlag("price", args[3] || "68500.00"));
        const volume = parseFloat(getFlag("vol", getFlag("volume", args[4] || "1.0")));
        const source = getFlag("source", "CLI_TERMINAL");

        console.log(`Feeding real-time tick into agent core...`);
        const result = dataFeedingEngine.feedTick({ symbol, price, volume, source, channel: "CLI" });
        if (result.success) {
          console.log(`✔ SUCCESS: Fed ${symbol} @ $${price} (Vol: ${volume})`);
          console.log(`  Event Bus: Emitted MARKET_TICK with correlation ID: ${result.correlationId}`);
          console.log(`  Latency: ${result.latencyMs.toFixed(3)} ms`);
        } else {
          console.error(`✖ FAILED: ${result.reason}`);
        }
        break;
      }

      if (sub === "candle") {
        const symbol = getFlag("symbol", args[2] || "BTC/USDT").toUpperCase();
        const close = parseFloat(getFlag("close", args[3] || "68400"));
        const open = parseFloat(getFlag("open", String(close * 0.999)));
        const high = parseFloat(getFlag("high", String(Math.max(open, close) * 1.002)));
        const low = parseFloat(getFlag("low", String(Math.min(open, close) * 0.998)));
        const volume = parseFloat(getFlag("vol", "50"));
        const timeframe = getFlag("tf", "1m");

        console.log(`Feeding OHLCV candle into agent core...`);
        const result = dataFeedingEngine.feedCandle({ symbol, open, high, low, close, volume, timeframe, channel: "CLI" });
        if (result.success) {
          console.log(`✔ SUCCESS: Fed ${timeframe} candle for ${symbol} Close: $${close}`);
          console.log(`  Correlation ID: ${result.correlationId}`);
        } else {
          console.error(`✖ FAILED: ${result.reason}`);
        }
        break;
      }

      if (sub === "news") {
        const symbol = getFlag("symbol", args[2] || "BTC").toUpperCase();
        const headline = getFlag("headline", args.slice(3).join(" ") || "Macro sentiment indicators point to bullish continuation");
        const sentiment = parseFloat(getFlag("sentiment", "0.85"));

        console.log(`Ingesting news narrative & sentiment...`);
        const result = dataFeedingEngine.feedNews({ symbol, headline, sentiment, channel: "CLI", source: "CLI" });
        if (result.success) {
          console.log(`✔ SUCCESS: Ingested news for ${symbol} [Score: ${sentiment}]`);
          console.log(`  Headline: "${headline}"`);
          console.log(`  Correlation ID: ${result.correlationId}`);
        } else {
          console.error(`✖ FAILED: ${result.reason}`);
        }
        break;
      }

      if (sub === "signal") {
        const symbol = getFlag("symbol", args[2] || "BTC/USDT").toUpperCase();
        const action = getFlag("action", args[3] || "BUY").toUpperCase();
        const confidence = parseFloat(getFlag("conf", args[4] || "0.90"));
        const targetPrice = parseFloat(getFlag("target", "0"));

        console.log(`Dispatching custom alpha signal...`);
        const result = dataFeedingEngine.feedSignal({ symbol, action, confidence, targetPrice, strategy: "CLI_ALPHA", channel: "CLI" });
        if (result.success) {
          console.log(`✔ SUCCESS: Signal dispatched [${action} ${symbol} @ Conf: ${(confidence * 100).toFixed(0)}%]`);
          console.log(`  Correlation ID: ${result.correlationId}`);
        } else {
          console.error(`✖ FAILED: ${result.reason}`);
        }
        break;
      }

      console.log(`Unknown feed subcommand: ${sub}. Use 'aifie feed [status|tick|candle|news|signal|ledger]'`);
      break;
    }
    case "mcp": {
      printBanner();
      const sub = (args[1] || "status").toLowerCase();

      if (sub === "status") {
        const tel = mcpHub.getTelemetry();
        console.log(`Model Context Protocol (MCP) Unified Hub Telemetry:\n`);
        console.table([{
          ProtocolVersion: tel.protocolVersion,
          Status: tel.status,
          ConnectedServers: `${tel.connectedServersCount} / 6`,
          TotalTools: tel.totalToolsCount,
          TotalResources: tel.totalResourcesCount,
          TotalRequests: tel.totalRequests,
          TotalInvocations: tel.totalToolCalls,
          TotalErrors: tel.totalErrors
        }]);
        break;
      }

      if (sub === "servers") {
        const servers = mcpHub.listServers();
        console.log(`Connected Domain MCP Servers (${servers.length}):\n`);
        console.table(servers.map(s => ({
          ServerId: s.serverId,
          Name: s.name,
          Status: s.status,
          Tools: s.toolsCount,
          Resources: s.resourcesCount,
          Calls: s.invocations || 0
        })));
        break;
      }

      if (sub === "tools") {
        const tools = mcpHub.listAllTools();
        console.log(`Available MCP Tools across 6 Servers (${tools.length} total):\n`);
        console.table(tools.map(t => ({
          ToolName: t.name,
          ServerId: t.serverId,
          Description: t.description.length > 55 ? t.description.slice(0, 52) + "..." : t.description,
          RequiredParams: t.inputSchema?.required ? t.inputSchema.required.join(", ") : "none"
        })));
        break;
      }

      if (sub === "call") {
        const toolName = args[2];
        if (!toolName) {
          console.error(`✖ Error: Tool name is required. Usage: node bin/aifie.mjs mcp call <toolName> [jsonArgs]`);
          break;
        }

        let toolArgs = {};
        const rawArgs = args.slice(3).join(" ");
        if (rawArgs.trim()) {
          try {
            toolArgs = JSON.parse(rawArgs);
          } catch (err) {
            // Support simple key=val pairs
            try {
              const parsed = {};
              for (const pair of args.slice(3)) {
                if (pair.includes("=")) {
                  const [k, ...vParts] = pair.split("=");
                  const val = vParts.join("=");
                  parsed[k] = isNaN(Number(val)) ? val : Number(val);
                }
              }
              toolArgs = Object.keys(parsed).length > 0 ? parsed : { raw: rawArgs };
            } catch (_) {
              toolArgs = {};
            }
          }
        }

        console.log(`Executing MCP Tool '${toolName}' via Unified Hub...`);
        try {
          const result = await mcpHub.callTool(toolName, toolArgs);
          if (result.isError) {
            console.error(`✖ TOOL EXECUTION FAILED:`);
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(`✔ SUCCESS [Server: ${result.serverId || "auto"}]:`);
            if (result.content && Array.isArray(result.content)) {
              for (const c of result.content) {
                if (c.text) {
                  try {
                    const parsed = JSON.parse(c.text);
                    console.dir(parsed, { depth: null, colors: true });
                  } catch (_) {
                    console.log(c.text);
                  }
                }
              }
            } else {
              console.log(JSON.stringify(result, null, 2));
            }
          }
        } catch (err) {
          console.error(`✖ MCP Tool Error: ${err.message}`);
        }
        break;
      }

      console.log(`Unknown mcp subcommand: '${sub}'. Use 'aifie mcp [status|servers|tools|call <tool> <args>]'`);
      break;
    }
    case "help":
    default:
      printHelp();
      break;
  }
}

// Only run CLI automatically if executed directly from terminal
if (process.argv[1] && process.argv[1].endsWith("aifie.mjs")) {
  runCli();
}

