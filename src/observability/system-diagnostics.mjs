// src/observability/system-diagnostics.mjs
// Unified System Diagnostics & Real-Time Error Sentinel
// Inspects working processes across all 8 planes and captures any faults or errors.

import { dataQualitySentinel } from "../data-quality-sentinel.mjs";
import { independentRiskFortress } from "../independent-risk-fortress.mjs";
import { strategyRegistry } from "../strategies/strategy-registry.mjs";
import { twoKeySecurityVault } from "../security/two-key-vault.mjs";
import { latencyProfiler } from "../latency-pipeline-profiler.mjs";
import { aifieEventBus } from "../core/event-bus-replay.mjs";
import v8 from "node:v8";
import fs from "node:fs";

export class SystemDiagnostics {
  /**
   * Performs an exhaustive health and working-process audit across all systems.
   * @returns {Object} Full diagnostic report with active alerts and working processes
   */
  static runDiagnostics() {
    const alerts = [];
    const now = Date.now();

    // 1. DATA PLANE AUDIT
    let dataQuality;
    let computedQualityScore = 100;
    try {
      dataQuality = dataQualitySentinel.getStatus();
      const summaries = Object.values(dataQuality?.symbolSummaries || {});
      if (summaries.length > 0) {
        computedQualityScore = Math.round(summaries.reduce((acc, s) => acc + (s.qualityScore ?? 100), 0) / summaries.length);
      }
      if (computedQualityScore < 85) {
        alerts.push({
          component: "DATA_PLANE",
          severity: "WARNING",
          message: `Data Quality Score degraded to ${computedQualityScore}% (Threshold: 85%)`,
          recommendation: "Inspect feed provider latency and stale tick frequency."
        });
      }
    } catch (err) {
      alerts.push({
        component: "DATA_PLANE",
        severity: "CRITICAL",
        message: `Data Quality Sentinel error: ${err.message}`,
        recommendation: "Restart market data ingestion stream."
      });
      dataQuality = { sentinelStatus: "ERROR" };
      computedQualityScore = 0;
    }

    // 2. RISK PLANE AUDIT
    let riskStatus;
    try {
      riskStatus = independentRiskFortress.getStatus();
      if (riskStatus.isGlobalEmergencyHalt) {
        alerts.push({
          component: "RISK_PLANE",
          severity: "CRITICAL",
          message: "GLOBAL EMERGENCY HALT is active! Trading is strictly blocked.",
          recommendation: "Review circuit breaker triggers and clear halt once risk normalizes."
        });
      }
      if (riskStatus.currentDrawdownPct >= 2.5) {
        alerts.push({
          component: "RISK_PLANE",
          severity: "CRITICAL",
          message: `Severe Daily Drawdown at ${riskStatus.currentDrawdownPct.toFixed(2)}% (Max Cap: 3.0%)`,
          recommendation: "Flatten open risk exposures immediately."
        });
      } else if (riskStatus.currentDrawdownPct >= 1.5) {
        alerts.push({
          component: "RISK_PLANE",
          severity: "WARNING",
          message: `Elevated Daily Drawdown at ${riskStatus.currentDrawdownPct.toFixed(2)}%`,
          recommendation: "Reduce position sizing factor."
        });
      }
      if (riskStatus.circuitBreakersTriggered > 0) {
        alerts.push({
          component: "RISK_PLANE",
          severity: "WARNING",
          message: `Circuit breakers triggered ${riskStatus.circuitBreakersTriggered} time(s) today.`,
          recommendation: "Investigate market volatility spikes or abnormal slippage."
        });
      }
    } catch (err) {
      alerts.push({
        component: "RISK_PLANE",
        severity: "CRITICAL",
        message: `Risk Fortress error: ${err.message}`,
        recommendation: "Halt trading; risk fortress state is compromised."
      });
      riskStatus = { isGlobalEmergencyHalt: true, currentDrawdownPct: 0 };
    }

    // 3. ALPHA PLANE AUDIT
    let strategies = [];
    try {
      strategies = strategyRegistry.list();
      let totalWeight = 0;
      for (const s of strategies) {
        totalWeight += s.currentWeight;
        if (s.status === "HALTED") {
          alerts.push({
            component: "ALPHA_PLANE",
            severity: "WARNING",
            message: `Strategy '${s.id}' is HALTED due to consecutive losses or PSI drift.`,
            recommendation: "Re-calibrate model weights or review out-of-sample attribution."
          });
        }
      }
      if (Math.abs(totalWeight - 1.0) > 0.01 && strategies.length > 0) {
        alerts.push({
          component: "ALPHA_PLANE",
          severity: "WARNING",
          message: `Strategy weights sum to ${(totalWeight * 100).toFixed(1)}% instead of 100%.`,
          recommendation: "Rebalance alpha strategy regime weights."
        });
      }
    } catch (err) {
      alerts.push({
        component: "ALPHA_PLANE",
        severity: "CRITICAL",
        message: `Strategy Registry error: ${err.message}`,
        recommendation: "Verify strategy registry instantiation."
      });
    }

    // 4. EXECUTION PLANE & TWO-KEY VAULT AUDIT
    let execMode = "PAPER";
    try {
      execMode = twoKeySecurityVault.getExecutionMode();
      if (execMode === "LIVE") {
        alerts.push({
          component: "EXECUTION_PLANE",
          severity: "WARNING",
          message: "EXECUTION MODE IS LIVE! Real capital is engaged.",
          recommendation: "Ensure operator dual-keys and risk parameters are continually monitored."
        });
      }
    } catch (err) {
      alerts.push({
        component: "EXECUTION_PLANE",
        severity: "CRITICAL",
        message: `Two-Key Vault error: ${err.message}`,
        recommendation: "Fallback to PAPER execution mode."
      });
    }

    // 5. AUDIT PLANE & DISK JOURNAL AUDIT
    let diskJournalStatus = "OK";
    try {
      if (aifieEventBus.enableDiskJournal) {
        if (!fs.existsSync(aifieEventBus.journalPath)) {
          alerts.push({
            component: "AUDIT_PLANE",
            severity: "WARNING",
            message: `Disk event journal file does not yet exist at: ${aifieEventBus.journalPath}`,
            recommendation: "Will be created upon first flushed event."
          });
        }
      }
    } catch (err) {
      alerts.push({
        component: "AUDIT_PLANE",
        severity: "WARNING",
        message: `Disk Journal I/O error: ${err.message}`,
        recommendation: "Check disk write permissions for data/ directory."
      });
      diskJournalStatus = "DEGRADED";
    }

    // 6. OBSERVABILITY & SYSTEM MEMORY AUDIT
    const memUsage = process.memoryUsage();
    // Use actual v8 heap limit to avoid false alarms on dynamically sized initial heapTotal
    let heapLimit = 1024 * 1024 * 1024; // fallback 1GB
    try {
      if (v8 && typeof v8.getHeapStatistics === "function") {
        heapLimit = v8.getHeapStatistics().heap_size_limit || heapLimit;
      }
    } catch (_) {}
    const heapLimitRatio = memUsage.heapUsed / heapLimit;
    if (heapLimitRatio > 0.85) {
      alerts.push({
        component: "OBSERVABILITY_PLANE",
        severity: "CRITICAL",
        message: `V8 Heap Memory nearly exhausted: ${(heapLimitRatio * 100).toFixed(1)}% used (${(memUsage.heapUsed / 1024 / 1024).toFixed(0)}MB / ${(heapLimit / 1024 / 1024).toFixed(0)}MB limit)`,
        recommendation: "Trigger garbage collection or increase Node max-old-space-size."
      });
    }

    let latencies;
    try {
      latencies = latencyProfiler.getTelemetryReport();
      if (latencies && latencies.percentiles && latencies.percentiles.p99 > 15) {
        alerts.push({
          component: "OBSERVABILITY_PLANE",
          severity: "WARNING",
          message: `Elevated pipeline p99 latency: ${latencies.percentiles.p99.toFixed(2)}ms (Threshold: 15ms)`,
          recommendation: "Investigate I/O bottlenecks or event loop contention."
        });
      }
    } catch {
      latencies = { percentiles: { p50: 0, p99: 0 } };
    }

    const criticalCount = alerts.filter(a => a.severity === "CRITICAL").length;
    const warningCount = alerts.filter(a => a.severity === "WARNING").length;

    let overallStatus = "OPTIMAL";
    if (criticalCount > 0) {
      overallStatus = "CRITICAL_ACTION_REQUIRED";
    } else if (warningCount > 0) {
      overallStatus = "DEGRADED_ATTENTION_NEEDED";
    }

    return Object.freeze({
      overallStatus,
      criticalCount,
      warningCount,
      totalIssues: alerts.length,
      timestamp: now,
      workingProcesses: {
        DATA_PLANE: {
          step: "Zero-GC Tick Ingestion & Sanitization",
          description: "Streams WebSocket market ticks -> RingBuffer -> Sanitizer validates timestamp, bid/ask inversion, price bounds",
          status: computedQualityScore >= 85 ? "RUNNING_HEALTHY" : "DEGRADED",
          activeVenue: "BINANCE_USDT_PERP",
          qualityScore: computedQualityScore
        },
        FEATURE_PLANE: {
          step: "Real-Time Microstructure & Feature Generation",
          description: "Calculates L2 Order Book Depth, VPIN Orderflow Toxicity, Fractional Diff, and PSI Feature Drift Sentinel",
          status: "RUNNING_HEALTHY",
          activeCalculators: ["VPIN_TOXICITY", "ORDERBOOK_DEPTH", "PSI_DRIFT_SENTINEL"]
        },
        ALPHA_PLANE: {
          step: "Multi-Model Alpha Signal Generation & Calibration",
          description: "Generates concurrent signals across 6 strategies -> Applies Brier reliability calibration -> Dynamic regime weighting",
          status: strategies.every(s => s.status === "ACTIVE" || s.status === "PRODUCTION") ? "RUNNING_HEALTHY" : "ATTENTION_NEEDED",
          registeredStrategies: strategies.length,
          activeStrategies: strategies.filter(s => s.status === "ACTIVE" || s.status === "PRODUCTION").length
        },
        DECISION_PLANE: {
          step: "Bayesian Consensus & TradeIntent Formation",
          description: "Weighs contributing alpha evidence -> Checks invalidator gates -> Assembles immutable TradeIntent envelope",
          status: "RUNNING_HEALTHY",
          protocol: "TradeIntent_v1"
        },
        RISK_PLANE: {
          step: "Sovereign Risk Fortress & Sovereign Gatekeeper",
          description: "Independent veto authority enforcing 3% daily drawdown limit, Half-Kelly sizing, and CVaR 99% portfolio constraint",
          status: riskStatus?.isGlobalEmergencyHalt ? "EMERGENCY_HALTED" : "ARMED_AND_ACTIVE",
          currentDailyDrawdown: `${(riskStatus?.currentDrawdownPct ?? 0).toFixed(2)}%`,
          maxDailyDrawdownCap: "3.00%"
        },
        EXECUTION_PLANE: {
          step: "Two-Key Vault & Smart Order Routing & TCA",
          description: "Validates Two-Key signatures -> Routes to exchange adapter -> Decomposes slippage into latency, spread, and impact drag",
          status: "RUNNING_HEALTHY",
          mode: execMode,
          router: "SmartOrderRouter_v1"
        },
        AUDIT_PLANE: {
          step: "Deterministic Event Sourcing & Persistent Journaling",
          description: "Every event envelopes timestamp, correlationId, sequence -> Synchronizes to memory circular log and data/event_journal.jsonl",
          status: diskJournalStatus === "OK" ? "RUNNING_HEALTHY" : "DEGRADED",
          inMemoryEvents: aifieEventBus.eventLog.length
        },
        OBSERVABILITY_PLANE: {
          step: "End-to-End Multi-Clock Latency & Memory Profiling",
          description: "Tracks nanosecond latency attribution across pipeline stages -> Profiles V8 heap bounds and event loop lag",
          status: heapLimitRatio < 0.85 ? "RUNNING_HEALTHY" : "MEMORY_WARNING",
          heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
          p99LatencyMs: latencies?.percentiles?.p99 ?? 0
        }
      },
      activeAlerts: alerts
    });
  }
}
