/**
 * Centralized Logging Utility for Aifie AI Agent
 * Provides structured logging with levels, timestamps, and context
 */

import { config } from './config-central.mjs';

/**
 * Log levels in order of severity
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Get current log level from config
 */
function getLogLevel() {
  const level = (config?.logLevel || config?.debugMode ? 'DEBUG' : 'INFO').toUpperCase();
  return LOG_LEVELS[level] ?? LOG_LEVELS.INFO;
}

/**
 * Format log message with timestamp and context
 */
function formatMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0
    ? ` ${JSON.stringify(context)}`
    : '';
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

/**
 * Check if a log level should be printed
 */
function shouldLog(level) {
  return LOG_LEVELS[level] >= getLogLevel();
}

/**
 * Debug level logging
 */
export function debug(message, context = {}) {
  if (shouldLog('DEBUG')) {
    console.debug(formatMessage('DEBUG', message, context));
  }
}

/**
 * Info level logging
 */
export function info(message, context = {}) {
  if (shouldLog('INFO')) {
    console.log(formatMessage('INFO', message, context));
  }
}

/**
 * Warning level logging
 */
export function warn(message, context = {}) {
  if (shouldLog('WARN')) {
    console.warn(formatMessage('WARN', message, context));
  }
}

/**
 * Error level logging
 */
export function error(message, errorOrContext = {}, maybeContext = {}) {
  const isError = errorOrContext instanceof Error;
  const err = isError ? errorOrContext : null;
  const context = isError ? maybeContext : errorOrContext;

  if (shouldLog('ERROR')) {
    const errorMsg = err
      ? `${message}: ${err.message}\n${err.stack || ''}`
      : message;
    console.error(formatMessage('ERROR', errorMsg, context));
  }
}

/**
 * Create a namespaced logger for a specific module
 */
export function createLogger(namespace) {
  return {
    debug: (message, context = {}) => debug(`[${namespace}] ${message}`, context),
    info: (message, context = {}) => info(`[${namespace}] ${message}`, context),
    warn: (message, context = {}) => warn(`[${namespace}] ${message}`, context),
    error: (message, errOrContext = {}, maybeContext = {}) => {
      if (errOrContext instanceof Error) {
        error(`[${namespace}] ${message}`, errOrContext, maybeContext);
      } else {
        error(`[${namespace}] ${message}`, errOrContext);
      }
    },
  };
}

/**
 * Standardized API error response generator
 */
export function createErrorResponse(message, code = 'INTERNAL_ERROR', statusCode = 500) {
  return {
    error: message,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Standardized API success response generator
 */
export function createSuccessResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export default {
  debug,
  info,
  warn,
  error,
  createLogger,
  createErrorResponse,
  createSuccessResponse,
};