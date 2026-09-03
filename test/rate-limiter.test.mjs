import test from "node:test";
import assert from "node:assert/strict";

import {
  checkRateLimit,
  createRateLimitMiddleware,
  getRateLimitStatus
} from "../src/rate-limiter.mjs";

test("checkRateLimit allows requests within limit", () => {
  const req = {
    url: "/api/orders",
    headers: {},
    socket: { remoteAddress: "127.0.0.1" }
  };

  const result = checkRateLimit(req);
  assert.equal(result.allowed, true);
  assert.ok(result.remaining >= 0);
  assert.equal(result.limit, 10);
});

test("checkRateLimit tracks requests per IP and endpoint", () => {
  const req = {
    url: "/api/test-endpoint",
    headers: {},
    socket: { remoteAddress: "192.168.1.1" }
  };

  const result1 = checkRateLimit(req);
  const result2 = checkRateLimit(req);

  assert.equal(result1.allowed, true);
  assert.equal(result2.allowed, true);
  assert.equal(result2.remaining, result1.remaining - 1);
});

test("checkRateLimit respects X-Forwarded-For header", () => {
  const req = {
    url: "/api/forwarded-test",
    headers: { "x-forwarded-for": "10.0.0.1, 192.168.1.1" },
    socket: { remoteAddress: "127.0.0.1" }
  };

  const result = checkRateLimit(req);
  assert.equal(result.allowed, true);
});

test("createRateLimitMiddleware creates working middleware", () => {
  const middleware = createRateLimitMiddleware();
  assert.equal(typeof middleware, "function");

  const req = {
    url: "/api/middleware-test",
    headers: {},
    socket: { remoteAddress: "127.0.0.1" }
  };

  let headerSet = false;
  const res = {
    setHeader: () => { headerSet = true; }
  };

  let nextCalled = false;
  const next = () => { nextCalled = true; };

  middleware(req, res, next);

  assert.equal(headerSet, true);
  assert.equal(nextCalled, true);
});

test("getRateLimitStatus returns monitoring info", () => {
  const status = getRateLimitStatus();

  assert.ok(status);
  assert.ok(typeof status.activeEndpoints === "number");
  assert.ok(typeof status.totalRequestsInWindow === "number");
  assert.ok(status.configuredLimits);
});
