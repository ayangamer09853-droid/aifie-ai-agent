/**
 * Centralized Configuration Management for Aifie AI Agent
 * Loads from environment variables with validation and defaults
 * Provides typed, validated config access across all modules
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Load .env file if it exists
function loadEnvFile() {
  const envPath = process.cwd() + '/.env';
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim();
          if (key && !process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not load .env file: ${error.message}`);
    }
  }
}

loadEnvFile();

/**
 * Configuration Schema with defaults and validation
 */
const configSchema = {
  // Server Configuration
  port: {
    env: 'PORT',
    default: 8787,
    type: 'number',
    description: 'HTTP server port',
  },
  host: {
    env: 'HOST',
    default: '0.0.0.0',
    type: 'string',
    description: 'HTTP server host',
  },

  // Trading & Risk Configuration
  liveTradeEnabled: {
    env: 'LIVE_TRADING_ENABLED',
    default: false,
    type: 'boolean',
    description: 'Enable live trading (requires explicit confirmation)',
  },
  maxLiveOrderNotional: {
    env: 'MAX_LIVE_ORDER_NOTIONAL',
    default: 50000,
    type: 'number',
    description: 'Maximum notional value per live order',
  },
  maxDailyLossPercent: {
    env: 'MAX_DAILY_LOSS_PERCENT',
    default: 3.5,
    type: 'number',
    description: 'Maximum daily loss percentage before stopping trades',
  },
  riskPerTradePercent: {
    env: 'RISK_PER_TRADE_PERCENT',
    default: 1.0,
    type: 'number',
    description: 'Risk per trade as % of account',
  },

  // Agent Configuration
  maxTotalAgents: {
    env: 'MAX_TOTAL_AGENTS',
    default: 50,
    type: 'number',
    description: 'Maximum total agents in the system',
  },
  maxReplicasPerTemplate: {
    env: 'MAX_REPLICAS_PER_TEMPLATE',
    default: 10,
    type: 'number',
    description: 'Maximum replicas for any single agent template',
  },

  // API & Security Configuration
  apiToken: {
    env: 'API_TOKEN',
    default: '',
    type: 'string',
    description: 'API token for protected endpoints (optional, required in production)',
  },
  nodeEnv: {
    env: 'NODE_ENV',
    default: 'development',
    type: 'string',
    description: 'Node environment (development, production, test)',
  },

  // External Service Configuration
  telegramBotToken: {
    env: 'TELEGRAM_BOT_TOKEN',
    default: '',
    type: 'string',
    description: 'Telegram bot token for command listener',
    sensitive: true,
  },
  telegramChatId: {
    env: 'TELEGRAM_CHAT_ID',
    default: '',
    type: 'string',
    description: 'Telegram chat ID for alerts',
  },
  bankUpiId: {
    env: 'BANK_UPI_ID',
    default: '',
    type: 'string',
    description: 'Bank UPI ID for withdrawals',
  },

  // AI Model Configuration
  geminiApiKey: {
    env: 'GEMINI_API_KEY',
    default: '',
    type: 'string',
    description: 'Google Gemini API key',
    sensitive: true,
  },
  openaiApiKey: {
    env: 'OPENAI_API_KEY',
    default: '',
    type: 'string',
    description: 'OpenAI API key',
    sensitive: true,
  },

  // Broker Configuration
  alpacaApiKeyId: {
    env: 'ALPACA_API_KEY_ID',
    default: '',
    type: 'string',
    description: 'Alpaca API key ID',
    sensitive: true,
  },
  alpacaSecretKey: {
    env: 'ALPACA_SECRET_KEY',
    default: '',
    type: 'string',
    description: 'Alpaca secret key',
    sensitive: true,
  },
  alpacaPaper: {
    env: 'ALPACA_PAPER',
    default: true,
    type: 'boolean',
    description: 'Use Alpaca paper trading',
  },
  binanceApiKey: {
    env: 'BINANCE_API_KEY',
    default: '',
    type: 'string',
    description: 'Binance API key',
    sensitive: true,
  },
  binanceSecretKey: {
    env: 'BINANCE_SECRET_KEY',
    default: '',
    type: 'string',
    description: 'Binance secret key',
    sensitive: true,
  },

  // Database Configuration
  supabaseUrl: {
    env: 'SUPABASE_URL',
    default: '',
    type: 'string',
    description: 'Supabase project URL',
  },
  supabaseAnonKey: {
    env: 'SUPABASE_ANON_KEY',
    default: '',
    type: 'string',
    description: 'Supabase anonymous key',
    sensitive: true,
  },

  // Timeouts & Limits
  apiTimeoutMs: {
    env: 'API_TIMEOUT_MS',
    default: 30000,
    type: 'number',
    description: 'API request timeout in milliseconds',
  },
  shutdownGracePeriodMs: {
    env: 'SHUTDOWN_GRACE_PERIOD_MS',
    default: 30000,
    type: 'number',
    description: 'Grace period for graceful shutdown',
  },

  // Logging Configuration
  logLevel: {
    env: 'LOG_LEVEL',
    default: 'INFO',
    type: 'string',
    description: 'Log level (DEBUG, INFO, WARN, ERROR)',
  },
  debugMode: {
    env: 'DEBUG',
    default: false,
    type: 'boolean',
    description: 'Enable debug mode',
  },
};

/**
 * Parse configuration value with type coercion
 */
function parseConfigValue(value, schema) {
  if (value === undefined || value === null || value === '') {
    return schema.default;
  }

  switch (schema.type) {
    case 'boolean':
      return value === 'true' || value === '1' || value === true;
    case 'number':
      return Number(value);
    case 'string':
      return String(value);
    default:
      return value;
  }
}

/**
 * Load and validate configuration
 */
function loadConfig() {
  const config = {};
  const errors = [];

  Object.entries(configSchema).forEach(([key, schema]) => {
    try {
      const envValue = process.env[schema.env];
      const value = parseConfigValue(envValue, schema);

      // Validate numeric ranges
      if (schema.type === 'number') {
        if (!Number.isFinite(value)) {
          errors.push(`${key}: Invalid number value`);
          return;
        }
      }

      config[key] = value;
    } catch (error) {
      errors.push(`${key}: ${error.message}`);
    }
  });

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    throw new Error('Configuration validation failed');
  }

  return config;
}

/**
 * Export configuration object
 */
export const config = loadConfig();

/**
 * Utility: Get masked config for logging (hides sensitive values)
 */
export function getMaskedConfig() {
  const masked = { ...config };
  Object.entries(configSchema).forEach(([key, schema]) => {
    if (schema.sensitive && masked[key]) {
      masked[key] = '••••••••';
    }
  });
  return masked;
}

/**
 * Utility: Validate required config for production
 */
export function validateProductionConfig() {
  const errors = [];
  const production = config.nodeEnv === 'production';

  if (production) {
    if (!config.apiToken) {
      errors.push('API_TOKEN is required in production');
    }
    if (!config.telegramBotToken) {
      errors.push('TELEGRAM_BOT_TOKEN is recommended in production');
    }
  }

  if (errors.length > 0) {
    console.warn('Production configuration warnings:');
    errors.forEach(e => console.warn(`  ⚠ ${e}`));
  }

  return errors;
}

/**
 * Utility: Print configuration summary
 */
export function printConfigSummary() {
  console.log('\n=== Configuration Summary ===');
  console.log(`Node Environment: ${config.nodeEnv}`);
  console.log(`Server: ${config.host}:${config.port}`);
  console.log(`Live Trading Enabled: ${config.liveTradeEnabled}`);
  console.log(`Max Daily Loss: ${config.maxDailyLossPercent}%`);
  console.log(`Risk Per Trade: ${config.riskPerTradePercent}%`);
  console.log(`Log Level: ${config.logLevel}`);
  console.log('===============================\n');
}

export default config;
