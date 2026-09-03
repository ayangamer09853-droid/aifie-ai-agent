import test from "node:test";
import assert from "node:assert/strict";

// Set test config before importing
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "DEBUG";

import {
  debug,
  info,
  warn,
  error,
  createLogger,
  createErrorResponse,
  createSuccessResponse
} from "../src/logging-utility.mjs";

test("debug logs when log level is DEBUG", () => {
  let logged = false;
  const original = console.debug;
  console.debug = () => { logged = true; };

  debug("Test debug message");

  console.debug = original;
  assert.equal(logged, true);
});

test("info logs at INFO level", () => {
  let logged = false;
  const original = console.log;
  console.log = () => { logged = true; };

  info("Test info message");

  console.log = original;
  assert.equal(logged, true);
});

test("warn logs at WARN level", () => {
  let logged = false;
  const original = console.warn;
  console.warn = () => { logged = true; };

  warn("Test warning message");

  console.warn = original;
  assert.equal(logged, true);
});

test("error logs at ERROR level", () => {
  let logged = false;
  const original = console.error;
  console.error = () => { logged = true; };

  error("Test error message");

  console.error = original;
  assert.equal(logged, true);
});

test("error handles Error objects", () => {
  let logged = false;
  const original = console.error;
  console.error = () => { logged = true; };

  const err = new Error("Test error");
  error("Error occurred", err);

  console.error = original;
  assert.equal(logged, true);
});

test("createLogger creates namespaced logger", () => {
  const logger = createLogger("TestModule");

  assert.equal(typeof logger.debug, "function");
  assert.equal(typeof logger.info, "function");
  assert.equal(typeof logger.warn, "function");
  assert.equal(typeof logger.error, "function");
});

test("createErrorResponse generates standardized error response", () => {
  const response = createErrorResponse("Something went wrong", "VALIDATION_ERROR", 400);

  assert.equal(response.error, "Something went wrong");
  assert.equal(response.code, "VALIDATION_ERROR");
  assert.equal(response.statusCode, 400);
  assert.ok(response.timestamp);
});

test("createSuccessResponse generates standardized success response", () => {
  const data = { symbol: "AAPL", price: 150 };
  const response = createSuccessResponse(data, "Order placed");

  assert.equal(response.success, true);
  assert.equal(response.message, "Order placed");
  assert.deepEqual(response.data, data);
  assert.ok(response.timestamp);
});

test("logging includes context when provided", () => {
  let output = "";
  const original = console.log;
  console.log = (msg) => { output = msg; };

  info("Test message", { symbol: "AAPL" });

  console.log = original;
  assert.ok(output.includes("AAPL"));
});
