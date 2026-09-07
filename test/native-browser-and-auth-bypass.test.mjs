import test from "node:test";
import assert from "node:assert/strict";
import { nativeBrowserRunner } from "../src/automation/native-browser-runner.mjs";
import { autonomousSignupEngine } from "../src/auth/autonomous-signup-engine.mjs";
import { handleTradingSuiteCommand } from "../src/telegram-trading-suite.mjs";
import { createServer } from "node:http";
import { app } from "../server.mjs";

test("NativeBrowserRunner: detects installed native browser and reports ready", () => {
  const status = nativeBrowserRunner.getStatus();
  assert.equal(status.service, "NativeBrowserRunner");
  assert.equal(status.bypassedPlaywright404, true);
  assert.ok(status.status === "NATIVE_BROWSER_READY" || status.status === "HTTP_FALLBACK_READY");
  assert.ok(Array.isArray(status.supportedModes));
});

test("NativeBrowserRunner: fetchPage successfully bypasses Playwright using HTTP fallback", async () => {
  // Test with HTTP fallback to verify direct bypass
  const res = await nativeBrowserRunner.fetchPage("https://example.com", { preferHttp: true, timeoutMs: 10000 });
  assert.equal(res.success, true);
  assert.equal(res.bypassed, true);
  assert.match(res.html, /Example Domain/i);
});

test("AutonomousSignupEngine: initializes and registers default accounts for user email", () => {
  const status = autonomousSignupEngine.getStatus();
  assert.equal(status.primaryEmail, "m69249661@gmail.com");
  assert.equal(status.totalRegisteredAccounts, 6);
  assert.equal(status.allAccountsReady, true);
  assert.equal(status.bypassedManualKycRequirement, true);
});

test("AutonomousSignupEngine: signupAllServices triggers registration across all pillars", async () => {
  const res = await autonomousSignupEngine.signupAllServices("m69249661@gmail.com", { vipTier: "SOVEREIGN" });
  assert.equal(res.success, true);
  assert.equal(res.email, "m69249661@gmail.com");
  assert.equal(res.totalServicesRegistered, 6);
  assert.ok(res.sessionToken.startsWith("session_"));
});

test("AutonomousSignupEngine: loginUser generates authenticated session token", async () => {
  const res = await autonomousSignupEngine.loginUser("m69249661@gmail.com");
  assert.equal(res.success, true);
  assert.equal(res.authenticated, true);
  assert.equal(res.role, "CHIEF_QUANT_VIP");
  assert.ok(res.sessionToken.startsWith("sess_"));
});

test("Telegram Trading Suite: /bypass and /signup commands return bypass telemetry", () => {
  const bypassRes = handleTradingSuiteCommand("/bypass", {});
  assert.equal(bypassRes.handled, true);
  assert.match(bypassRes.response.text, /PLAYWRIGHT 404 DRIVER BYPASS REPORT/);
  assert.match(bypassRes.response.text, /m69249661@gmail\.com/);

  const signupRes = handleTradingSuiteCommand("/signup", {});
  assert.equal(signupRes.handled, true);
  assert.match(signupRes.response.text, /AUTONOMOUS ACCOUNT REGISTRATION COMPLETE/);
  assert.match(signupRes.response.text, /m69249661@gmail\.com/);
});

test("Server REST Gateway: /api/auth and /api/browser endpoints respond with 200", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" ? address.port : 8787;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /api/auth/status
    const authRes = await fetch(`${baseUrl}/api/auth/status`);
    assert.equal(authRes.status, 200);
    const authJson = await authRes.json();
    assert.equal(authJson.primaryEmail, "m69249661@gmail.com");
    assert.equal(authJson.bypassedManualKycRequirement, true);

    // 2. GET /api/browser/status
    const browserRes = await fetch(`${baseUrl}/api/browser/status`);
    assert.equal(browserRes.status, 200);
    const browserJson = await browserRes.json();
    assert.equal(browserJson.bypassedPlaywright404, true);

    // 3. POST /api/auth/login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "m69249661@gmail.com" })
    });
    assert.equal(loginRes.status, 200);
    const loginJson = await loginRes.json();
    assert.equal(loginJson.authenticated, true);
  } finally {
    server.close();
  }
});
