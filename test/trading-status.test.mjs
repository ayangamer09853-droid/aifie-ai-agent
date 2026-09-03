import test from "node:test";
import assert from "node:assert/strict";
import { getCurrentTradingStatus, setTradingStatus, evaluateAutomaticStatusTransition, TRADING_STATUSES } from "../src/trading-status-engine.mjs";

test("getCurrentTradingStatus returns active status metadata and history", () => {
  const status = getCurrentTradingStatus();
  assert.ok(status.statusKey);
  assert.ok(status.label);
  assert.ok(Array.isArray(status.availableStatuses));
  assert.ok(status.availableStatuses.length >= 8);
});

test("setTradingStatus transitions status state and records audit log", () => {
  const updated = setTradingStatus("SELF_OPTIMIZING", "Auto-tuning parameters");
  assert.equal(updated.statusKey, "SELF_OPTIMIZING");
  assert.equal(updated.rationale, "Auto-tuning parameters");
  assert.equal(updated.recentHistory[0].status, "SELF_OPTIMIZING");
});

test("setTradingStatus rejects invalid status keys", () => {
  assert.throws(() => {
    setTradingStatus("INVALID_STATUS_KEY");
  }, /Invalid status/);
});

test("evaluateAutomaticStatusTransition switches status based on risk and operational conditions", () => {
  const offlineStatus = evaluateAutomaticStatusTransition({ killSwitchActive: true });
  assert.equal(offlineStatus.statusKey, "OFFLINE");

  const newsShieldStatus = evaluateAutomaticStatusTransition({ killSwitchActive: false, isNewsShieldActive: true });
  assert.equal(newsShieldStatus.statusKey, "MACRO_NEWS_SHIELD");

  const liveStatus = evaluateAutomaticStatusTransition({ killSwitchActive: false, isNewsShieldActive: false, isLiveMode: true, isBotRunning: true });
  assert.equal(liveStatus.statusKey, "REAL_MONEY_LIVE");
});
