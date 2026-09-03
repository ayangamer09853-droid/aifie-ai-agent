import test from "node:test";
import assert from "node:assert/strict";
import {
  getAdminConfigStatus,
  updateAdminConfig,
  executeAdminCommand
} from "../src/admin-config-manager.mjs";

test("Admin Config Manager returns masked credentials and complete requirements checklist", () => {
  const config = getAdminConfigStatus();
  assert.equal(config.status, "ADMIN_CONFIG_ONLINE");
  assert.ok(config.coreSettings !== undefined);
  assert.ok(config.bankingRequirements !== undefined);
  assert.ok(config.telegramRequirements !== undefined);
  assert.ok(config.requirementsChecklist !== undefined);

  // Sensitive keys must be masked with dots/bullets
  if (config.telegramRequirements.TELEGRAM_BOT_TOKEN) {
    assert.ok(config.telegramRequirements.TELEGRAM_BOT_TOKEN.includes("••••"));
  }
});

test("Admin Config Manager safely updates and persists credentials in .env without leaking secrets", () => {
  const testUpi = "admin_test@upi";
  const res = updateAdminConfig({ BANK_UPI_ID: testUpi, MAX_DAILY_LOSS_PERCENT: "3.5" });

  assert.equal(res.success, true);
  assert.equal(process.env.BANK_UPI_ID, testUpi);
  assert.equal(process.env.MAX_DAILY_LOSS_PERCENT, "3.5");

  const refreshed = getAdminConfigStatus();
  assert.equal(refreshed.bankingRequirements.BANK_UPI_ID, testUpi);
  assert.equal(refreshed.coreSettings.MAX_DAILY_LOSS_PERCENT, 3.5);
});

test("Admin Command Dispatcher routes and executes operational actions seamlessly", () => {
  const swarmRes = executeAdminCommand("RUN_SWARM_TICK");
  assert.equal(swarmRes.success, true);
  assert.equal(swarmRes.command, "RUN_SWARM_TICK");
  assert.equal(swarmRes.result.totalAgentsExecuted, 100);

  const blackSwanRes = executeAdminCommand("RUN_BLACK_SWAN_REPLAY");
  assert.equal(blackSwanRes.success, true);
  assert.equal(blackSwanRes.command, "RUN_BLACK_SWAN_REPLAY");
  assert.equal(blackSwanRes.result.isConstitutionalCapRespected, true);
  assert.equal(blackSwanRes.result.overallSurvivalRatePct, 100);

  const resetKillRes = executeAdminCommand("RESET_KILLSWITCH");
  assert.equal(resetKillRes.success, true);
  assert.equal(resetKillRes.result.killSwitchEngaged, false);
});
