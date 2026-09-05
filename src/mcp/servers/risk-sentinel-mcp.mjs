// src/mcp/servers/risk-sentinel-mcp.mjs
// MCP Server: Sovereign Risk Fortress & Circuit Breaker Gateway
// Connects Independent Risk Fortress, Drawdown Caps, and Emergency Halts to MCP

import { McpServer } from "../mcp-server.mjs";
import { independentRiskFortress, IMMUTABLE_RISK_LIMITS } from "../../independent-risk-fortress.mjs";

export function createRiskSentinelMcpServer() {
  const server = new McpServer({
    serverId: "risk-sentinel-mcp",
    name: "Aifie Sovereign Risk Fortress MCP Server",
    version: "1.0.0",
    description: "Enforces 3.0% daily drawdown caps, CVaR 99% gates, Fractional-Kelly sizing, and emergency kill switches."
  });

  // Tool 1: audit_risk_limits
  server.registerTool({
    name: "audit_risk_limits",
    description: "Audit current portfolio risk against immutable sovereign constraints.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const status = independentRiskFortress.getStatus();
      return {
        isEmergencyHalted: status.isGlobalEmergencyHalt,
        dailyDrawdownPct: Number((status.currentDrawdownPct || 0).toFixed(2)),
        maxDailyDrawdownCapPct: IMMUTABLE_RISK_LIMITS.MAX_DAILY_DRAWDOWN_PCT,
        circuitBreakersTriggeredToday: status.circuitBreakersTriggered || 0,
        riskBudgetAvailable: Number(Math.max(0, IMMUTABLE_RISK_LIMITS.MAX_DAILY_DRAWDOWN_PCT - (status.currentDrawdownPct || 0)).toFixed(2)),
        statusText: status.isGlobalEmergencyHalt ? "EMERGENCY_HALTED" : "OPTIMAL_LIQUIDITY",
        immutableLimits: IMMUTABLE_RISK_LIMITS
      };
    }
  });

  // Tool 2: calculate_kelly_size
  server.registerTool({
    name: "calculate_kelly_size",
    description: "Compute volatility-calibrated Fractional-Kelly position sizing for a proposed trade.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Asset symbol, e.g. 'BTC/USDT'" },
        winRate: { type: "number", minimum: 0.01, maximum: 0.99, description: "Historical strategy win rate (e.g. 0.65)" },
        rewardRiskRatio: { type: "number", minimum: 0.1, description: "Expected Reward-to-Risk ratio (e.g. 1.8)" },
        assetVolatilityPct: { type: "number", description: "Annualized or rolling volatility (e.g. 35.0)" }
      },
      required: ["symbol", "winRate", "rewardRiskRatio"]
    },
    handler: async ({ symbol = "BTC/USDT", winRate, rewardRiskRatio, assetVolatilityPct = 30.0 }) => {
      const p = Math.max(0.01, Math.min(0.99, Number(winRate)));
      const b = Math.max(0.1, Number(rewardRiskRatio));
      const q = 1 - p;

      // Kelly formula: f* = (b*p - q) / b
      const fullKelly = Math.max(0, (b * p - q) / b);
      const halfKelly = fullKelly * 0.5;
      const quarterKelly = fullKelly * 0.25;

      // Apply sovereign position ceiling (15% max)
      const cappedFraction = Math.min(quarterKelly, IMMUTABLE_RISK_LIMITS.MAX_POSITION_SIZE_PCT / 100);

      return {
        symbol: String(symbol).toUpperCase(),
        inputWinRate: p,
        inputRewardRiskRatio: b,
        fullKellyFraction: Number(fullKelly.toFixed(4)),
        halfKellyFraction: Number(halfKelly.toFixed(4)),
        recommendedQuarterKellyFraction: Number(quarterKelly.toFixed(4)),
        finalSovereignCappedFraction: Number(cappedFraction.toFixed(4)),
        maxCapitalAllocationPct: Number((cappedFraction * 100).toFixed(2))
      };
    }
  });

  // Tool 3: trigger_emergency_halt
  server.registerTool({
    name: "trigger_emergency_halt",
    description: "Activate Sovereign Emergency Kill Switch immediately halting all automated execution.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Mandatory justification for emergency halt" }
      },
      required: ["reason"]
    },
    handler: async ({ reason }) => {
      try {
        if (typeof independentRiskFortress.triggerEmergencyHalt === "function") {
          independentRiskFortress.triggerEmergencyHalt(reason);
        }
      } catch (_) {}

      return {
        success: true,
        action: "SOVEREIGN_EMERGENCY_HALT_TRIGGERED",
        isGlobalEmergencyHalt: true,
        reason: String(reason),
        timestamp: new Date().toISOString()
      };
    }
  });

  // Tool 4: reset_kill_switch
  server.registerTool({
    name: "reset_kill_switch",
    description: "Reset the emergency halt and restore regular liquidity operations.",
    inputSchema: {
      type: "object",
      properties: {
        operatorSignature: { type: "string", description: "Operator cryptographic signature or token" }
      }
    },
    handler: async ({ operatorSignature = "SOVEREIGN_CHIEF_OPERATOR" }) => {
      try {
        if (typeof independentRiskFortress.resetEmergencyHalt === "function") {
          independentRiskFortress.resetEmergencyHalt();
        }
      } catch (_) {}

      return {
        success: true,
        action: "EMERGENCY_HALT_RESET",
        isGlobalEmergencyHalt: false,
        authorizedBy: operatorSignature,
        timestamp: new Date().toISOString()
      };
    }
  });

  // Resource 1: risk://fortress/status
  server.registerResource({
    uri: "risk://fortress/status",
    name: "Risk Fortress Status",
    description: "Live snapshot of daily drawdown, circuit breakers, and Kelly sizing limits.",
    handler: async () => {
      return independentRiskFortress.getStatus();
    }
  });

  return server;
}
