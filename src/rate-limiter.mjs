/**
 * Rate Limiter for Aifie AI Agent
 * Simple in-memory rate limiter to prevent DoS attacks
 */

import { config } from './config-central.mjs';

/**
 * Rate limit configuration for different endpoint types
 */
const RATE_LIMITS = {
  '/api/orders': { maxRequests: 10, windowMs: 60000 },      // 10 req/min
  '/api/tasks': { maxRequests: 5, windowMs: 60000 },         // 5 req/min
  '/api/replicas': { maxRequests: 3, windowMs: 60000 },      // 3 req/min
  '/api/terminal/exec': { maxRequests: 2, windowMs: 60000 }, // 2 req/min
  '/api/heartbeat': { maxRequests: 10, windowMs: 60000 },    // 10 req/min
  default: { maxRequests: 30, windowMs: 60000 },              // 30 req/min
};

/**
 * In-memory rate limit storage
 * Format: { 'endpoint:ip': [{ timestamp, count }] }
 */
const rateLimitStore = new Map();

/**
 * Clean up expired entries (runs every minute)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entries] of rateLimitStore) {
    const validEntries = entries.filter(e => now - e.timestamp < 60000);
    if (validEntries.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validEntries);
    }
  }
}, 60000);

/**
 * Get rate limit config for an endpoint
 */
function getRateLimitConfig(endpoint) {
  // Check for exact match first
  if (RATE_LIMITS[endpoint]) {
    return RATE_LIMITS[endpoint];
  }

  // Check for partial match (e.g., /api/terminal/exec matches /api/terminal)
  for (const [key, value] of Object.entries(RATE_LIMITS)) {
    if (endpoint.startsWith(key)) {
      return value;
    }
  }

  return RATE_LIMITS.default;
}

/**
 * Get client identifier (IP address)
 */
function getClientId(req) {
  // Check X-Forwarded-For header first (for proxied requests)
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Fall back to socket remote address
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(req) {
  const endpoint = req.url?.split('?')[0] || '/';
  const clientId = getClientId(req);
  const key = `${endpoint}:${clientId}`;

  const now = Date.now();
  const limitConfig = getRateLimitConfig(endpoint);

  // Get or initialize entries for this key
  let entries = rateLimitStore.get(key) || [];

  // Filter out old entries outside the window
  entries = entries.filter(e => now - e.timestamp < limitConfig.windowMs);

  // Count requests in current window
  const requestCount = entries.length;

  // Check if limit exceeded
  if (requestCount >= limitConfig.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: entries[0]?.timestamp
        ? entries[0].timestamp + limitConfig.windowMs - now
        : limitConfig.windowMs,
      limit: limitConfig.maxRequests,
    };
  }

  // Add new entry
  entries.push({ timestamp: now, count: 1 });
  rateLimitStore.set(key, entries);

  return {
    allowed: true,
    remaining: limitConfig.maxRequests - requestCount - 1,
    resetMs: limitConfig.windowMs,
    limit: limitConfig.maxRequests,
  };
}

/**
 * Create rate limit middleware for Express/fastify-style handlers
 */
export function createRateLimitMiddleware() {
  return (req, res, next) => {
    const result = checkRateLimit(req);

    // Set rate limit headers
    if (res.setHeader) {
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetMs / 1000));
    }

    if (!result.allowed) {
      return {
        statusCode: 429,
        body: {
          error: 'Too Many Requests',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded for this endpoint. Try again in ${Math.ceil(result.resetMs / 1000)} seconds.`,
          retryAfter: Math.ceil(result.resetMs / 1000),
          timestamp: new Date().toISOString(),
        },
      };
    }

    next();
  };
}

/**
 * Get current rate limit status for monitoring
 */
export function getRateLimitStatus() {
  let totalKeys = 0;
  let totalRequests = 0;

  for (const [key, entries] of rateLimitStore) {
    totalKeys++;
    totalRequests += entries.length;
  }

  return {
    activeEndpoints: totalKeys,
    totalRequestsInWindow: totalRequests,
    configuredLimits: RATE_LIMITS,
  };
}

export default {
  checkRateLimit,
  createRateLimitMiddleware,
  getRateLimitStatus,
};