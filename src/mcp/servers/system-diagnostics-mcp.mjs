// src/mcp/servers/system-diagnostics-mcp.mjs
// MCP Server: System Diagnostics, Error Sentinel & Forensic Replay Gateway
// Connects 8 Hard Architectural Boundaries, Alert Sentinels & Event Sourcing to MCP

import { McpServer } from "../mcp-server.mjs";
import { SystemDiagnostics } from "../../observability/system-diagnostics.mjs";
import { aifieEventBus } from "../../core/event-bus-replay.mjs";

export function createSystemDiagnosticsMcpServer() {
  const server = new McpServer({
    serverId: "system-diagnostics-mcp",
    name: "Aifie Observability & Forensic Diagnostics MCP Server",
    version: "1.0.0",
    description: "Audits all 8 hard boundaries, error sentinels, and replays complete forensic causality timelines."
  });

  // Tool 1: get_8plane_diagnostics
  server.registerTool({
    name: "get_8plane_diagnostics",
    description: "Audit working processes and operational status across all 8 hard architectural boundaries.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      return SystemDiagnostics.runDiagnostics();
    }
  });

  // Tool 2: get_error_sentinel_alerts
  server.registerTool({
    name: "get_error_sentinel_alerts",
    description: "Get active system faults, circuit breaker breaches, and actionable fix recommendations.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const diag = SystemDiagnostics.runDiagnostics();
      return {
        overallStatus: diag.overallStatus,
        totalIssues: diag.totalIssues,
        criticalCount: diag.criticalCount,
        warningCount: diag.warningCount,
        activeAlerts: diag.activeAlerts
      };
    }
  });

  // Tool 3: replay_trade_causality
  server.registerTool({
    name: "replay_trade_causality",
    description: "Forensically replay the full deterministic causality timeline for a trade correlation ID.",
    inputSchema: {
      type: "object",
      properties: {
        correlationId: { type: "string", description: "Trade correlation ID" }
      },
      required: ["correlationId"]
    },
    handler: async ({ correlationId }) => {
      return aifieEventBus.replayTradeDecision(correlationId);
    }
  });

  // Tool 4: query_event_journal
  server.registerTool({
    name: "query_event_journal",
    description: "Query recent event sourcing records and disk journal synchronization status.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of recent events to retrieve (default: 20)" }
      }
    },
    handler: async ({ limit = 20 }) => {
      const numLimit = Math.max(1, Math.min(100, Number(limit) || 20));
      const stats = typeof aifieEventBus.getJournalStats === "function"
        ? aifieEventBus.getJournalStats()
        : { totalEventsEmitted: aifieEventBus.sequenceCounter || 0, inMemoryEventsCount: (aifieEventBus.eventLog || []).length };
      const events = typeof aifieEventBus.getRecentEvents === "function"
        ? aifieEventBus.getRecentEvents(numLimit)
        : (aifieEventBus.eventLog || []).slice(-numLimit).reverse();
      return {
        stats,
        recentEventsCount: events.length,
        events
      };
    }
  });

  // Resource 1: diagnostics://sentinel/status
  server.registerResource({
    uri: "diagnostics://sentinel/status",
    name: "Diagnostics & Sentinel Status",
    description: "Real-time health report for all 8 architectural planes.",
    handler: async () => {
      return SystemDiagnostics.runDiagnostics();
    }
  });

  return server;
}
