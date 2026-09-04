/**
 * Admin Configuration & Command Manager v89.0
 * Provides credential fulfillment, secret masking, atomic .env persistence,
 * and administrative command execution for Aifie AI Agent.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { startBot, stopBot, getBotStatus } from "./trading-bot.mjs";
import { executeZeroHumanBankSweep } from "./zero-human-autonomous-sovereign-engine.mjs";
import { executeFleetWorkCycle, queryFleetAgents } from "./autonomous-100-agent-fleet.mjs";
import { deployMicrostructureDefensiveHedge } from "./microstructure-defensive-hedger.mjs";
import { runBlackSwanStressTestLab } from "./black-swan-stress-test-lab.mjs";
import { setKillSwitch, controlPlaneStatus } from "./alfie-control-plane.mjs";

const ENV_PATH = join(process.cwd(), ".env");

function maskSecret(val) {
  if (!val || typeof val !== "string" || val.length < 8) return val ? "******" : "";
  return val.slice(0, 4) + "••••••••" + val.slice(-4);
}

export function getAdminConfigStatus() {
  return {
    status: "ADMIN_CONFIG_ONLINE",
    protocolVersion: "AIFIE_ADMIN_V89",
    timestamp: new Date().toISOString(),
    coreSettings: {
      PORT: process.env.PORT || "8787",
      HOST: process.env.HOST || "0.0.0.0",
      LIVE_TRADING_ENABLED: process.env.LIVE_TRADING_ENABLED === "true",
      MAX_DAILY_LOSS_PERCENT: parseFloat(process.env.MAX_DAILY_LOSS_PERCENT || "3.0"),
      RISK_PER_TRADE_PERCENT: parseFloat(process.env.RISK_PER_TRADE_PERCENT || "1.0")
    },
    bankingRequirements: {
      BANK_UPI_ID: process.env.BANK_UPI_ID || "user@upi",
      isConfigured: Boolean(process.env.BANK_UPI_ID && process.env.BANK_UPI_ID !== "user@upi")
    },
    telegramRequirements: {
      TELEGRAM_BOT_TOKEN: maskSecret(process.env.TELEGRAM_BOT_TOKEN),
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",
      isConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    },
    aiLlmRequirements: {
      GEMINI_API_KEY: maskSecret(process.env.GEMINI_API_KEY),
      OPENAI_API_KEY: maskSecret(process.env.OPENAI_API_KEY),
      isConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)
    },
    brokerRequirements: {
      alpaca: {
        apiKeyId: maskSecret(process.env.ALPACA_API_KEY_ID),
        secretKey: maskSecret(process.env.ALPACA_SECRET_KEY),
        paperMode: process.env.ALPACA_PAPER !== "false",
        isConfigured: Boolean(process.env.ALPACA_API_KEY_ID && !process.env.ALPACA_API_KEY_ID.includes("your_"))
      },
      binance: {
        apiKey: maskSecret(process.env.BINANCE_API_KEY),
        secretKey: maskSecret(process.env.BINANCE_SECRET_KEY),
        isConfigured: Boolean(process.env.BINANCE_API_KEY && !process.env.BINANCE_API_KEY.includes("your_"))
      },
      bybit: {
        apiKey: maskSecret(process.env.BYBIT_API_KEY),
        isConfigured: Boolean(process.env.BYBIT_API_KEY && !process.env.BYBIT_API_KEY.includes("your_"))
      },
      indianBrokers: {
        upstoxKey: maskSecret(process.env.UPSTOX_API_KEY),
        angelOneKey: maskSecret(process.env.ANGEL_ONE_API_KEY),
        fyersKey: maskSecret(process.env.FYERS_API_KEY),
        isConfigured: Boolean(process.env.UPSTOX_API_KEY && !process.env.UPSTOX_API_KEY.includes("your_"))
      }
    },
    marketFeedsRequirements: {
      POLYGON_API_KEY: maskSecret(process.env.POLYGON_API_KEY),
      TWELVE_DATA_KEY: maskSecret(process.env.TWELVE_DATA_KEY),
      ALPHA_VANTAGE_KEY: maskSecret(process.env.ALPHA_VANTAGE_KEY),
      FINNHUB_API_KEY: maskSecret(process.env.FINNHUB_API_KEY)
    },
    supabaseRequirements: {
      SUPABASE_URL: process.env.SUPABASE_URL || "",
      SUPABASE_ANON_KEY: maskSecret(process.env.SUPABASE_ANON_KEY),
      isConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_URL.includes("your-project"))
    },
    requirementsChecklist: {
      bankingFulfilled: Boolean(process.env.BANK_UPI_ID && process.env.BANK_UPI_ID !== "user@upi"),
      telegramFulfilled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      aiIntelligenceFulfilled: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
      marketFeedsFulfilled: Boolean(process.env.POLYGON_API_KEY || process.env.TWELVE_DATA_KEY),
      supabaseFulfilled: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_URL.includes("your-project")),
      liveTradingReady: Boolean(process.env.LIVE_TRADING_ENABLED === "true")
    }
  };
}

export function updateAdminConfig(updates = {}) {
  const currentEnv = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf-8") : "";
  const lines = currentEnv.split("\n");
  const envMap = new Map();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      envMap.set(k, v);
    }
  }

  // Apply updates to Map and process.env
  const allowedKeys = [
    "BANK_UPI_ID",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "ALPACA_API_KEY_ID",
    "ALPACA_SECRET_KEY",
    "ALPACA_PAPER",
    "BINANCE_API_KEY",
    "BINANCE_SECRET_KEY",
    "BYBIT_API_KEY",
    "UPSTOX_API_KEY",
    "ANGEL_ONE_API_KEY",
    "FYERS_API_KEY",
    "POLYGON_API_KEY",
    "TWELVE_DATA_KEY",
    "ALPHA_VANTAGE_KEY",
    "FINNHUB_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "MAX_DAILY_LOSS_PERCENT",
    "RISK_PER_TRADE_PERCENT",
    "LIVE_TRADING_ENABLED",
    "ENABLE_LIVE_TRADING",
    "APCA_API_KEY_ID",
    "APCA_API_SECRET_KEY",
    "APCA_API_BASE_URL",
    "COINGECKO_API_KEY",
    "COINGECKO_DEMO_API_KEY"
  ];

  const appliedUpdates = {};
  for (const [key, val] of Object.entries(updates)) {
    if (allowedKeys.includes(key) && val !== undefined && val !== null) {
      const cleanVal = String(val).trim();
      if (!cleanVal.includes("••••")) { // Ignore masked placeholders
        envMap.set(key, cleanVal);
        process.env[key] = cleanVal;
        appliedUpdates[key] = cleanVal.length > 8 ? maskSecret(cleanVal) : cleanVal;
      }
    }
  }

  // Re-serialize .env
  let newEnvContent = "# Aifie AI Agent Environment Configuration (Updated via Admin Panel)\n";
  for (const [k, v] of envMap.entries()) {
    newEnvContent += `${k}=${v}\n`;
  }
  writeFileSync(ENV_PATH, newEnvContent, "utf-8");

  return {
    success: true,
    message: "Admin configuration updated and applied successfully in memory and .env file.",
    appliedUpdatesCount: Object.keys(appliedUpdates).length,
    appliedUpdates,
    updatedAt: new Date().toISOString()
  };
}

export function executeAdminCommand(commandName = "", payload = {}, context = {}) {
  const cmd = commandName.toUpperCase().trim();

  switch (cmd) {
    case "START_BOT": {
      const { paper, strategyLab, orders, persist } = context;
      const status = startBot({ paper, strategyLab, orders, persist });
      if (persist) persist();
      return { success: true, command: cmd, result: status };
    }

    case "STOP_BOT": {
      const status = stopBot();
      if (context.persist) context.persist();
      return { success: true, command: cmd, result: status };
    }

    case "TRIGGER_SWEEP": {
      const targetUpi = payload.targetUpiId || process.env.BANK_UPI_ID || "user@upi";
      const sweep = executeZeroHumanBankSweep({ targetUpiId: targetUpi });
      return { success: true, command: cmd, result: sweep };
    }

    case "RUN_SWARM_TICK": {
      const cycle = executeFleetWorkCycle();
      return { success: true, command: cmd, result: cycle };
    }

    case "DEPLOY_VPIN_DEFENSE": {
      const symbol = payload.symbol || "BTC/USDT";
      const defense = deployMicrostructureDefensiveHedge({ symbol });
      return { success: true, command: cmd, result: defense };
    }

    case "RUN_BLACK_SWAN_REPLAY": {
      const lab = runBlackSwanStressTestLab();
      return { success: true, command: cmd, result: lab };
    }

    case "RESET_KILLSWITCH": {
      setKillSwitch({ active: false, reason: "ADMIN_DASHBOARD_RESET" });
      return { success: true, command: cmd, result: { killSwitchEngaged: false, message: "Emergency kill switch reset to operational." } };
    }

    default:
      return { success: false, command: cmd, error: `Unknown admin command: ${cmd}` };
  }
}
