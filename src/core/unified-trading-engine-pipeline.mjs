// src/core/unified-trading-engine-pipeline.mjs
// Unified End-to-End Trading Engine Orchestrator
// Signal Generation -> Portfolio Construction -> Risk Gate -> Execution Slicing
// Pure Native Node.js ESM built-ins only

import { knowledgeGraphFeedbackEngine } from "../learning/knowledge-graph-feedback-engine.mjs";
import { institutionalRiskFortress } from "../risk/institutional-risk-fortress.mjs";
import { riskEngine } from "../risk/risk-engine.mjs";
import { algorithmicExecutionSlicer } from "../execution/algorithmic-execution-slicer.mjs";
import { multiTimeframeSmcEngine } from "../analysis/multi-timeframe-smc-engine.mjs";
import { eventSourcingWalJournal } from "../storage/event-sourcing-wal.mjs";

export class UnifiedTradingEnginePipeline {
  constructor() {
    this.pipelineExecutionLog = [];
  }

  /**
   * Run complete end-to-end institutional trading cycle.
   */
  async executeTradingCycle({
    symbol = "AAPL",
    side = "buy",
    rawSignal = { confidence: 85, archetype: "MOMENTUM_BREAKOUT" },
    account = { cash: 100000, equity: 100000 },
    positions = {},
    marketQuote = { price: 150.0, timestamp: Date.now(), source: "live_feed" },
    executionAlgorithm = "TWAP",
    paperState = null,
    orders = []
  } = {}) {
    const cycleId = `CYCLE_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = Date.now();
    const normSymbol = symbol.toUpperCase();
    const currentPrice = Number(marketQuote.price || 150.0);

    // =========================================================================
    // STAGE 1: SIGNAL SCORING & MULTI-TIMEFRAME SMC CONFLUENCE
    // =========================================================================
    const smc = multiTimeframeSmcEngine.analyzeSymbol(normSymbol);
    const baseConfidence = Number(rawSignal.confidence || 80);
    const confluenceBonus = (smc.confluenceScore - 0.5) * 20; // +/- 10 pts
    let combinedConfidence = Math.max(10, Math.min(99, baseConfidence + confluenceBonus));

    // =========================================================================
    // STAGE 2: KNOWLEDGE GRAPH ADVERSE TRADE MITIGATION
    // =========================================================================
    const mitigation = knowledgeGraphFeedbackEngine.evaluateAdverseTradeMitigations(normSymbol);
    if (mitigation.hasMitigation) {
      combinedConfidence = combinedConfidence * mitigation.convictionMultiplier;
    }

    // =========================================================================
    // STAGE 3: PORTFOLIO ALLOCATION & POSITION SIZING (FRACTIONAL KELLY)
    // =========================================================================
    // Kelly fraction = (p * b - q) / b; capped conservatively to 2% max NAV
    const winProb = Math.min(0.85, Math.max(0.40, combinedConfidence / 100));
    const winLossRatio = 1.5;
    const kelly = Math.max(0.005, Math.min(0.02, (winProb * winLossRatio - (1 - winProb)) / winLossRatio));
    const targetCapitalUSD = account.equity * kelly;
    const rawQuantity = Math.max(1, Math.floor(targetCapitalUSD / currentPrice));

    const proposedOrder = {
      cycleId,
      symbol: normSymbol,
      side: side.toLowerCase(),
      quantity: rawQuantity,
      price: currentPrice,
      confidence: Number(combinedConfidence.toFixed(1)),
      targetCapitalUSD: Number(targetCapitalUSD.toFixed(2))
    };

    // =========================================================================
    // STAGE 4: INSTITUTIONAL PRE-TRADE RISK FORTRESS & RISK ENGINE GATE
    // =========================================================================
    const riskCheck = institutionalRiskFortress.evaluatePreTradeRisk({
      order: proposedOrder,
      account,
      positions,
      marketQuote,
      now
    });

    if (!riskCheck.approved) {
      const rejectedResult = {
        cycleId,
        symbol: normSymbol,
        status: "REJECTED_BY_RISK_FORTRESS",
        reason: riskCheck.reason,
        details: riskCheck.details,
        proposedOrder,
        timestamp: now
      };
      this.pipelineExecutionLog.unshift(rejectedResult);
      return rejectedResult;
    }

    // Unbypassable independent Risk Engine check
    const independentRiskCheck = await riskEngine.validate({
      symbol: normSymbol,
      side: side.toUpperCase(),
      quantity: proposedOrder.quantity,
      price: proposedOrder.price,
      portfolio: {
        totalNav: account.equity || account.cash || 100000,
        cash: account.cash || 100000,
        positions
      },
      market: marketQuote,
      quoteTimestamp: marketQuote.timestamp || now
    });

    if (!independentRiskCheck.approved) {
      const rejectedResult = {
        cycleId,
        symbol: normSymbol,
        status: "REJECTED_BY_RISK_ENGINE",
        reason: independentRiskCheck.reason,
        stage: independentRiskCheck.stage,
        details: independentRiskCheck.details,
        proposedOrder,
        timestamp: now
      };
      this.pipelineExecutionLog.unshift(rejectedResult);
      return rejectedResult;
    }

    // =========================================================================
    // STAGE 5: ALGORITHMIC EXECUTION SLICING (TWAP / VWAP / ICEBERG)
    // =========================================================================
    let schedule = null;
    if (executionAlgorithm.toUpperCase() === "VWAP") {
      schedule = algorithmicExecutionSlicer.createVwapSchedule({
        symbol: normSymbol,
        side: proposedOrder.side,
        totalQuantity: proposedOrder.quantity,
        arrivalPrice: currentPrice,
        durationMinutes: 10
      });
    } else {
      schedule = algorithmicExecutionSlicer.createTwapSchedule({
        symbol: normSymbol,
        side: proposedOrder.side,
        totalQuantity: proposedOrder.quantity,
        arrivalPrice: currentPrice,
        durationMinutes: 10,
        tranchesCount: 4
      });
    }

    // Execute first slice immediately
    const executionResult = algorithmicExecutionSlicer.executeTranche(
      schedule.scheduleId,
      1,
      currentPrice,
      paperState,
      orders
    );

    // Log to Write-Ahead Log (WAL) for institutional auditability
    try {
      eventSourcingWalJournal.appendEvent("UNIFIED_PIPELINE_EXECUTION", {
        cycleId,
        symbol: normSymbol,
        order: proposedOrder,
        scheduleId: schedule.scheduleId,
        firstSliceFill: executionResult.tranche?.executedPrice
      });
    } catch (_) {}

    const successResult = {
      cycleId,
      symbol: normSymbol,
      status: "EXECUTING_ALGORITHMIC_SLICER",
      proposedOrder,
      mitigationActive: mitigation.hasMitigation,
      confluenceScore: smc.confluenceScore,
      riskAudit: riskCheck,
      schedule: {
        scheduleId: schedule.scheduleId,
        algorithm: schedule.algorithm,
        totalQuantity: schedule.totalQuantity,
        tranchesCount: schedule.tranches.length,
        firstTranche: executionResult.tranche
      },
      timestamp: now
    };

    this.pipelineExecutionLog.unshift(successResult);
    if (this.pipelineExecutionLog.length > 50) this.pipelineExecutionLog.pop();

    return successResult;
  }

  getPipelineTelemetry() {
    return {
      totalCyclesExecuted: this.pipelineExecutionLog.length,
      recentExecutions: this.pipelineExecutionLog.slice(0, 5)
    };
  }
}

export const unifiedTradingEnginePipeline = new UnifiedTradingEnginePipeline();
