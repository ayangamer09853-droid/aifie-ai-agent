// src/api/v1-router.mjs
// Consolidated REST API Gateway v1.0
// Categorizes all endpoints strictly into the 8 Hard Architectural Boundaries.

import { aifieEventBus } from "../core/event-bus-replay.mjs";
import { strategyRegistry } from "../strategies/strategy-registry.mjs";
import { independentRiskFortress } from "../independent-risk-fortress.mjs";
import { latencyProfiler } from "../latency-pipeline-profiler.mjs";
import { dataQualitySentinel } from "../data-quality-sentinel.mjs";
import { twoKeySecurityVault } from "../security/two-key-vault.mjs";
import { SystemDiagnostics } from "../observability/system-diagnostics.mjs";
import { dataFeedingEngine } from "../ingestion/data-feeding-engine.mjs";
import { mcpHub } from "../mcp/mcp-hub.mjs";

/**
 * Dispatches and resolves /api/v1 requests according to the 8 Hard Boundaries.
 * @param {string} pathname
 * @param {string} method
 * @param {URLSearchParams} [searchParams=new URLSearchParams()]
 * @param {Object} [body={}]
 * @returns {Object} Standardized JSON response envelope
 */
export function dispatchV1Route(pathname, method = "GET", searchParams = new URLSearchParams(), body = {}) {
  const cleanPath = pathname.replace(/^\/api\/v1\/?/, "").toLowerCase();
  const segments = cleanPath.split("/").filter(Boolean);
  const primaryResource = segments[0] || "system";

  // Helper to wrap response
  const envelope = (plane, data, status = 200) => ({
    status,
    success: status >= 200 && status < 300,
    version: "v1",
    plane,
    timestamp: Date.now(),
    data
  });

  switch (primaryResource) {
    // DATA FEEDING SYSTEM (DATA_PLANE)
    case "feed": {
      const subResource = segments[1] || "status";
      if (subResource === "status") {
        return envelope("DATA_PLANE", dataFeedingEngine.getTelemetry());
      }
      if (subResource === "history" || subResource === "ledger") {
        const limit = parseInt(searchParams.get("limit") || "30", 10);
        return envelope("DATA_PLANE", { ledger: dataFeedingEngine.getRecentLedger(limit) });
      }
      if (method === "POST" || method === "PUT") {
        if (subResource === "tick") {
          const res = dataFeedingEngine.feedTick(body);
          return envelope("DATA_PLANE", res, res.success ? 200 : 400);
        }
        if (subResource === "candle" || subResource === "candles") {
          if (Array.isArray(body.candles)) {
            const res = dataFeedingEngine.feedCandles(body);
            return envelope("DATA_PLANE", res, res.success ? 200 : 400);
          }
          const res = dataFeedingEngine.feedCandle(body);
          return envelope("DATA_PLANE", res, res.success ? 200 : 400);
        }
        if (subResource === "orderbook") {
          const res = dataFeedingEngine.feedOrderBook(body);
          return envelope("DATA_PLANE", res, res.success ? 200 : 400);
        }
        if (subResource === "news") {
          const res = dataFeedingEngine.feedNews(body);
          return envelope("DATA_PLANE", res, res.success ? 200 : 400);
        }
        if (subResource === "signal") {
          const res = dataFeedingEngine.feedSignal(body);
          return envelope("DATA_PLANE", res, res.success ? 200 : 400);
        }
        if (subResource === "batch") {
          const res = dataFeedingEngine.feedBatch(body);
          return envelope("DATA_PLANE", res, res.success ? 200 : 400);
        }
      }
      return envelope("DATA_PLANE", { error: "Unknown feed endpoint or method" }, 404);
    }

    // MODEL CONTEXT PROTOCOL (MCP) GATEWAY
    case "mcp": {
      const subResource = segments[1] || "status";
      if (subResource === "status") {
        return envelope("OBSERVABILITY_PLANE", mcpHub.getTelemetry());
      }
      if (subResource === "servers") {
        return envelope("OBSERVABILITY_PLANE", { servers: mcpHub.listServers() });
      }
      if (subResource === "tools") {
        if (segments[2] === "call" || method === "POST") {
          const toolName = body.name || searchParams.get("name");
          const toolArgs = body.arguments || body.args || {};
          const callPromise = mcpHub.callTool(toolName, toolArgs);
          return callPromise.then
            ? callPromise.then(res => envelope("OBSERVABILITY_PLANE", res, res.isError ? 400 : 200))
            : envelope("OBSERVABILITY_PLANE", callPromise);
        }
        return envelope("OBSERVABILITY_PLANE", { tools: mcpHub.listAllTools() });
      }
      if (subResource === "resources") {
        return envelope("OBSERVABILITY_PLANE", { resources: mcpHub.listAllResources() });
      }
      return envelope("OBSERVABILITY_PLANE", mcpHub.getTelemetry());
    }

    // 1. DATA PLANE
    case "data": {
      const dqStatus = dataQualitySentinel.getStatus();
      return envelope("DATA_PLANE", {
        sentinel: dqStatus,
        feed: {
          activeVenue: "BINANCE",
          fallbackVenue: "ALPACA",
          subscriptions: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AAPL", "NVDA"]
        }
      });
    }

    // 2. FEATURE PLANE
    case "features": {
      return envelope("FEATURE_PLANE", {
        microstructure: { vpin: 0.22, toxicity: "LOW", obi: 0.35, depthSpreadBps: 2.1 },
        afml: { fractionalDiffD: 0.45, barrierMultiplier: 2.0 },
        regime: { active: "TRENDING", hurst: 0.64 }
      });
    }

    // 3. ALPHA PLANE
    case "signals": {
      const strategies = strategyRegistry.list();
      return envelope("ALPHA_PLANE", {
        totalStrategies: strategies.length,
        strategies: strategies.map(s => ({
          id: s.id,
          name: s.name,
          weight: s.currentWeight,
          status: s.status,
          sharpe: s.historicalPerformance.sharpe
        }))
      });
    }

    // 4. DECISION PLANE
    case "decision": {
      return envelope("DECISION_PLANE", {
        protocol: "TradeIntent",
        governor: "BayesianConsensusGovernor",
        activeIntentsCount: 0
      });
    }

    // 5. RISK PLANE
    case "risk": {
      const riskStatus = independentRiskFortress.getStatus();
      return envelope("RISK_PLANE", {
        sovereignRisk: riskStatus,
        limits: riskStatus.immutableLimits
      });
    }

    // 6. EXECUTION PLANE
    case "execution": {
      const mode = twoKeySecurityVault.getExecutionMode();
      return envelope("EXECUTION_PLANE", {
        executionMode: mode,
        twoKeyVaultEnabled: true,
        smartOrderRouter: "ACTIVE",
        activeBrokers: ["PAPER_SIMULATOR", "ALPACA_REST", "BINANCE_REST"]
      });
    }

    // 7. AUDIT PLANE
    case "audit": {
      if (segments[1] === "replay") {
        const correlationId = segments[2] || searchParams.get("correlationId") || searchParams.get("id");
        if (!correlationId) {
          return envelope("AUDIT_PLANE", { error: "Missing correlationId: /api/v1/audit/replay/:correlationId" }, 400);
        }
        const replay = aifieEventBus.replayTradeDecision(correlationId);
        return envelope("AUDIT_PLANE", replay, replay.found ? 200 : 404);
      }

      return envelope("AUDIT_PLANE", {
        eventLogCapacity: aifieEventBus.maxLogSize,
        currentEventsInLog: aifieEventBus.eventLog.length,
        indexedTradesCount: aifieEventBus.correlationIndex.size
      });
    }

    // 8. OBSERVABILITY PLANE
    case "observability": {
      const latencyStats = latencyProfiler.getTelemetryReport();
      return envelope("OBSERVABILITY_PLANE", {
        latencies: latencyStats,
        multiClockActive: true,
        runtime: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          platform: process.platform
        }
      });
    }

    // SYSTEM OVERVIEW & DIAGNOSTICS
    case "system":
    default: {
      const subAction = segments[1] || "";
      if (subAction === "diagnostics" || subAction === "errors") {
        const report = SystemDiagnostics.runDiagnostics();
        if (subAction === "errors") {
          return envelope("SYSTEM_DIAGNOSTICS", {
            overallStatus: report.overallStatus,
            totalIssues: report.totalIssues,
            activeAlerts: report.activeAlerts
          });
        }
        return envelope("SYSTEM_DIAGNOSTICS", report);
      }

      const diagnostics = SystemDiagnostics.runDiagnostics();
      return envelope("SYSTEM_OVERVIEW", {
        name: "Aifie Sovereign Agent OS",
        release: "v101-baseline",
        overallStatus: diagnostics.overallStatus,
        totalIssues: diagnostics.totalIssues,
        workingProcesses: diagnostics.workingProcesses,
        activeAlerts: diagnostics.activeAlerts,
        planes: [
          "/api/v1/data",
          "/api/v1/features",
          "/api/v1/signals",
          "/api/v1/decision",
          "/api/v1/risk",
          "/api/v1/execution",
          "/api/v1/audit",
          "/api/v1/observability",
          "/api/v1/system/diagnostics",
          "/api/v1/system/errors"
        ]
      });
    }
  }
}
