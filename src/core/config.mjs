// @ts-check
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Unified Immutable Configuration Manager for Aifie
 */

function readEnvFile() {
  const envPath = join(process.cwd(), ".env");
  const values = {};
  if (!existsSync(envPath)) return values;

  try {
    const raw = readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const k = trimmed.slice(0, eq).trim();
        const v = trimmed.slice(eq + 1).trim();
        values[k] = v;
      }
    }
  } catch (_) {}
  return values;
}

const fileEnv = readEnvFile();

function getEnv(key, defaultVal) {
  if (process.env[key] !== undefined && process.env[key] !== "") {
    return process.env[key];
  }
  if (fileEnv[key] !== undefined && fileEnv[key] !== "") {
    return fileEnv[key];
  }
  return defaultVal;
}

export const AIFIE_CONFIG = Object.freeze({
  VERSION: "1.2.0",
  ENVIRONMENT: getEnv("NODE_ENV", "development"),
  PORT: Number(getEnv("PORT", 8787)),
  HOST: getEnv("HOST", "0.0.0.0"),

  // User & Administrative Identity
  USER_EMAIL: getEnv("USER_EMAIL", "m69249661@gmail.com"),
  ADMIN_EMAIL: getEnv("ADMIN_EMAIL", "m69249661@gmail.com"),
  TELEGRAM_BOT_TOKEN: getEnv("TELEGRAM_BOT_TOKEN", ""),
  TELEGRAM_CHAT_ID: getEnv("TELEGRAM_CHAT_ID", "6628905748"),

  // Safety & Trading Boundaries
  TRADING_MODE: "paper",
  LIVE_TRADING_ENABLED: getEnv("LIVE_TRADING_ENABLED", "false") === "true",
  ENABLE_LIVE_TRADING: false, // Strict safety duplicate
  MAX_LIVE_ORDER_NOTIONAL: Number(getEnv("MAX_LIVE_ORDER_NOTIONAL", 50000)),
  MAX_DAILY_LOSS_PERCENT: Number(getEnv("MAX_DAILY_LOSS_PERCENT", 3.5)),
  RISK_PER_TRADE_PERCENT: Number(getEnv("RISK_PER_TRADE_PERCENT", 1.0)),

  // Mining & Cluster Bounds
  MINING_AUTOSTART_247: getEnv("MINING_AUTOSTART_247", "false") === "true",
  MINING_MAX_THREADS: Number(getEnv("MINING_MAX_THREADS", 8)),
  MINING_INTENSITY: Number(getEnv("MINING_INTENSITY", 95))
});

/**
 * Returns safe config dump without leaking API secret tokens
 */
export function getMaskedConfig() {
  return {
    version: AIFIE_CONFIG.VERSION,
    environment: AIFIE_CONFIG.ENVIRONMENT,
    port: AIFIE_CONFIG.PORT,
    host: AIFIE_CONFIG.HOST,
    userEmail: AIFIE_CONFIG.USER_EMAIL,
    adminEmail: AIFIE_CONFIG.ADMIN_EMAIL,
    telegramConfigured: Boolean(AIFIE_CONFIG.TELEGRAM_BOT_TOKEN),
    tradingMode: AIFIE_CONFIG.TRADING_MODE,
    liveTradingEnabled: AIFIE_CONFIG.LIVE_TRADING_ENABLED,
    maxLiveOrderNotional: AIFIE_CONFIG.MAX_LIVE_ORDER_NOTIONAL,
    maxDailyLossPercent: AIFIE_CONFIG.MAX_DAILY_LOSS_PERCENT,
    riskPerTradePercent: AIFIE_CONFIG.RISK_PER_TRADE_PERCENT
  };
}
