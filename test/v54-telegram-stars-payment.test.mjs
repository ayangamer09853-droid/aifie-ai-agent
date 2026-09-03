import test from "node:test";
import assert from "node:assert/strict";
import { getTelegramStarsStatus, createTelegramStarsInvoice, collectTelegramStars, convertStarsToBank } from "../src/telegram-stars-payment-engine.mjs";

test("getTelegramStarsStatus reports active Telegram Stars Payment Gateway & Star Vault", () => {
  const status = getTelegramStarsStatus();
  assert.equal(status.starsEngineStatus, "TELEGRAM_STARS_PAYMENT_GATEWAY_ONLINE");
  assert.equal(status.protocolVersion, "TELEGRAM_STARS_FRAGMENT_V69");
  assert.ok(status.totalStarsBalance.includes("Stars"));
  assert.ok(status.supportedPayoutMethods.length >= 3);
});

test("createTelegramStarsInvoice generates valid Telegram Stars invoice link", () => {
  const invoice = createTelegramStarsInvoice({
    title: "Enterprise AI Bot Sub",
    starAmount: 500
  });

  assert.equal(invoice.invoiceStatus, "TELEGRAM_STARS_INVOICE_CREATED");
  assert.equal(invoice.currency, "XTR");
  assert.equal(invoice.starAmount, "⭐ 500 Stars");
  assert.equal(invoice.usdEquivalent, "$6.50 USD");
  assert.ok(invoice.invoiceLink.startsWith("https://t.me/Myaifiebot"));
});

test("collectTelegramStars ingests stars into Star Vault balance", () => {
  const res = collectTelegramStars({
    starAmount: 0,
    fromUserId: "TG_USER_123"
  });

  assert.equal(res.collectionStatus, "TELEGRAM_STARS_COLLECTED_SUCCESS");
  assert.equal(res.collectedStars, "⭐ 0 Stars");
  assert.equal(res.usdGained, "$0.00 USD");
  assert.ok(res.collectionTxHash.startsWith("0xSTAR_COLLECT_"));
});

test("convertStarsToBank converts Telegram Stars via Fragment and pays out to Bank UPI", () => {
  const res = convertStarsToBank({
    starAmountToConvert: 0,
    targetUpiId: "user@upi"
  });

  assert.equal(res.conversionStatus, "TELEGRAM_STARS_SIMULATION_ZERO_CONVERTED");
  assert.equal(res.convertedStars, "⭐ 0 Stars");
  assert.equal(res.usdPayoutAmount, "$0.00");
  assert.equal(res.inrPayoutAmount, "₹0.00");
  assert.equal(res.targetDestination, "user@upi");
  assert.ok(res.fragmentPayoutTxHash.startsWith("0xFRAGMENT_TON_"));
});
