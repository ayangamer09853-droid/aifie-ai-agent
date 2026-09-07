import test from "node:test";
import assert from "node:assert/strict";
import { EmailNotificationService, emailNotificationService } from "../src/email-notification-service.mjs";
import { handleTradingSuiteCommand, userTradingStore } from "../src/telegram-trading-suite.mjs";
import { createServer } from "node:http";
import { app } from "../server.mjs";

test("EmailNotificationService: default configuration binds to user email", () => {
  const service = new EmailNotificationService();
  assert.equal(service.userEmail, "m69249661@gmail.com");
  assert.equal(service.enabled, true);
  
  const status = service.getStatus();
  assert.equal(status.primaryRecipient, "m69249661@gmail.com");
  assert.equal(status.service, "EmailNotificationService");
});

test("EmailNotificationService: setUserEmail updates recipient with validation", () => {
  const service = new EmailNotificationService();
  const res = service.setUserEmail("m69249661@gmail.com");
  assert.equal(res.success, true);
  assert.equal(service.userEmail, "m69249661@gmail.com");

  assert.throws(() => {
    service.setUserEmail("invalid-email-string");
  }, /Invalid email address/);
});

test("EmailNotificationService: sendAlert queues and records in outbox history", async () => {
  const service = new EmailNotificationService({ userEmail: "m69249661@gmail.com" });
  const alertRes = await service.sendAlert({
    subject: "Test Alert",
    body: "This is a test notification body for institutional dispatch.",
    category: "INFO"
  });

  assert.equal(alertRes.success, true);
  assert.equal(alertRes.recipient, "m69249661@gmail.com");
  assert.equal(alertRes.status, "DELIVERED");

  const status = service.getStatus();
  assert.equal(status.totalDispatched, 1);
  assert.equal(status.recentOutboxCount, 1);
  assert.equal(status.recentAlerts[0].subject, "Test Alert");
});

test("EmailNotificationService: specialized notification helpers dispatch with formatted payloads", async () => {
  const service = new EmailNotificationService({ userEmail: "m69249661@gmail.com" });

  const tradeRes = await service.sendTradeNotification({
    symbol: "BTCUSDT",
    side: "BUY",
    qty: 0.25,
    price: 68500,
    mode: "paper"
  });
  assert.equal(tradeRes.success, true);

  const swarmRes = await service.sendMiningSwarmReport({
    isMining: true,
    hashrateKh: 154.8,
    totalHashes: 1850000,
    activeNodesCount: 3,
    totalNodesCount: 3
  });
  assert.equal(swarmRes.success, true);

  const riskRes = await service.sendRiskBreachAlert({
    rule: "MAX_DRAWDOWN_LIMIT",
    message: "Portfolio simulated risk breach test",
    symbol: "ETHUSDT"
  });
  assert.equal(riskRes.success, true);

  const dailyRes = await service.sendDailyReport({
    equity: "105,420.50",
    todayPnl: "+5,420.50",
    winRate: 68,
    sharpe: 4.8,
    orderCount: 12
  });
  assert.equal(dailyRes.success, true);

  const status = service.getStatus();
  assert.equal(status.totalDispatched, 4);
});

test("Telegram Trading Suite: /email command displays linked email and outbox status", () => {
  const res = handleTradingSuiteCommand("/email", { symbol: "AAPL", quantity: 1 });
  assert.equal(res.handled, true);
  assert.match(res.response.text, /m69249661@gmail\.com/);
  assert.match(res.response.text, /INSTITUTIONAL EMAIL & DISPATCH GATEWAY/);
});

test("Telegram Trading Suite: /email_test dispatches instant test alert", () => {
  const res = handleTradingSuiteCommand("/email_test", { symbol: "AAPL", quantity: 1 });
  assert.equal(res.handled, true);
  assert.match(res.response.text, /INSTANT VERIFICATION ALERT DISPATCHED/);
  assert.match(res.response.text, /m69249661@gmail\.com/);
});

test("Server REST Gateway: /api/email endpoints respond correctly", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" ? address.port : 8787;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /api/email/status
    const statusRes = await fetch(`${baseUrl}/api/email/status`);
    assert.equal(statusRes.status, 200);
    const statusJson = await statusRes.json();
    assert.equal(statusJson.service, "EmailNotificationService");
    assert.equal(statusJson.primaryRecipient, "m69249661@gmail.com");

    // 2. POST /api/email/test
    const testRes = await fetch(`${baseUrl}/api/email/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: "REST Gateway Verification", body: "Testing /api/email/test" })
    });
    assert.equal(testRes.status, 200);
    const testJson = await testRes.json();
    assert.equal(testJson.success, true);
    assert.equal(testJson.recipient, "m69249661@gmail.com");
  } finally {
    server.close();
  }
});
