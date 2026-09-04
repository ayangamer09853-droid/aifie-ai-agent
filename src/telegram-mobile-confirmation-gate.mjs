/**
 * Telegram 1-Tap Mobile Confirmation Gate - Phase 6 Sovereign Automation
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Features:
 * 1. dispatchMobileSignalAlert - Dispatches high-conviction trade proposal with interactive inline keyboard
 * 2. processMobileConfirmationCallback - Handles 1-tap mobile execution or veto with timelock validation
 * 3. getPendingSignalAlerts - In-flight signals awaiting user tap confirmation
 * 4. getMobileConfirmationGateStatus - Diagnostic telemetry
 */

import { recordLedgerTransaction } from "./accounting-ledger.mjs";
import { placePaperOrder } from "./paper-engine.mjs";

const pendingSignals = new Map();
const processedSignals = new Map();

/**
 * Dispatches a high-conviction trade proposal alert with interactive mobile buttons
 */
export function dispatchMobileSignalAlert({
  symbol = "AAPL",
  side = "BUY",
  quantity = 10,
  estimatedPriceUSD = 150.00,
  convictionScore = 94,
  strategy = "SMC_CONVERGENCE_V100",
  expirySeconds = 120
} = {}) {
  const signalId = `SIG_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const expiresAt = Date.now() + (expirySeconds * 1000);

  const signal = {
    signalId,
    symbol,
    side,
    quantity,
    estimatedPriceUSD,
    convictionScore,
    strategy,
    status: "PENDING_CONFIRMATION",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    expiresAtTimestamp: expiresAt
  };

  pendingSignals.set(signalId, signal);

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: `⚡ EXECUTE ${side} ${quantity} ${symbol}`, callback_data: `EXEC_${signalId}` },
        { text: `❌ VETO / CANCEL`, callback_data: `VETO_${signalId}` }
      ]
    ]
  };

  const alertText = `🔔 <b>HIGH-CONVICTION TRADE PROPOSAL</b>\n` +
    `──────────────────\n` +
    `<b>Asset:</b> <b>${symbol}</b> (${side})\n` +
    `<b>Quantity:</b> ${quantity} units @ ~$${estimatedPriceUSD.toFixed(2)}\n` +
    `<b>Conviction:</b> <b>${convictionScore} / 100</b> (Multi-Agent Consensus)\n` +
    `<b>Strategy:</b> ${strategy}\n` +
    `<b>Expires In:</b> ${expirySeconds}s\n` +
    `──────────────────\n` +
    `<i>Tap below to authorize execution or veto from your phone:</i>`;

  return {
    success: true,
    signalId,
    signal,
    alertText,
    replyMarkup: inlineKeyboard,
    timestamp: new Date().toISOString()
  };
}

/**
 * Processes user inline keyboard tap callback
 */
export function processMobileConfirmationCallback({
  callbackData = "",
  chatId = null,
  userId = null,
  paperState = null
} = {}) {
  if (!callbackData) {
    return { success: false, error: "callbackData is required" };
  }

  const isExec = callbackData.startsWith("EXEC_");
  const isVeto = callbackData.startsWith("VETO_");

  if (!isExec && !isVeto) {
    return { success: false, error: "unrecognized callback format" };
  }

  const signalId = callbackData.replace("EXEC_", "").replace("VETO_", "");

  // Check if already processed (idempotency guard)
  if (processedSignals.has(signalId)) {
    const prior = processedSignals.get(signalId);
    return {
      success: false,
      error: "SIGNAL_ALREADY_PROCESSED",
      signalId,
      priorStatus: prior.status,
      processedAt: prior.processedAt
    };
  }

  // Check if signal exists in pending
  const signal = pendingSignals.get(signalId);
  if (!signal) {
    return { success: false, error: "SIGNAL_NOT_FOUND_OR_EXPIRED", signalId };
  }

  // Timelock expiration check
  if (Date.now() > signal.expiresAtTimestamp) {
    signal.status = "EXPIRED";
    pendingSignals.delete(signalId);
    processedSignals.set(signalId, { ...signal, processedAt: new Date().toISOString() });
    return { success: false, error: "TIMELOCK_EXPIRED_SIGNAL_INVALID", signalId };
  }

  pendingSignals.delete(signalId);

  if (isVeto) {
    signal.status = "VETOED_BY_USER";
    processedSignals.set(signalId, { ...signal, processedAt: new Date().toISOString(), vetoedBy: userId });
    return {
      success: true,
      action: "VETO_CONFIRMED",
      signalId,
      symbol: signal.symbol,
      message: `❌ Trade proposal ${signal.symbol} ${signal.side} successfully VETOED by user.`,
      status: "VETOED_BY_USER",
      timestamp: new Date().toISOString()
    };
  }

  // If EXECUTE
  signal.status = "EXECUTED_CONFIRMED";
  let fill = null;

  if (paperState) {
    fill = placePaperOrder(paperState, {
      symbol: signal.symbol,
      side: signal.side,
      quantity: signal.quantity,
      price: signal.estimatedPriceUSD
    });
  } else {
    fill = {
      orderId: `SIM_ORD_${Date.now()}`,
      symbol: signal.symbol,
      side: signal.side,
      quantity: signal.quantity,
      filledPrice: signal.estimatedPriceUSD,
      status: "FILLED"
    };
  }

  const ledgerEntry = recordLedgerTransaction({
    symbol: signal.symbol,
    side: signal.side,
    quantity: signal.quantity,
    price: signal.estimatedPriceUSD,
    venue: "MOBILE_1TAP_TELEGRAM_GATE"
  });

  const processedRecord = {
    ...signal,
    processedAt: new Date().toISOString(),
    authorizedBy: userId,
    fill,
    ledgerId: ledgerEntry.id
  };
  processedSignals.set(signalId, processedRecord);

  return {
    success: true,
    action: "EXECUTION_AUTHORIZED",
    signalId,
    symbol: signal.symbol,
    side: signal.side,
    quantity: signal.quantity,
    price: signal.estimatedPriceUSD,
    fill,
    ledger: ledgerEntry,
    message: `⚡ Trade ${signal.side} ${signal.quantity} ${signal.symbol} executed and recorded in accounting ledger.`,
    status: "EXECUTED_CONFIRMED",
    timestamp: new Date().toISOString()
  };
}

/**
 * Returns all currently in-flight signals awaiting tap confirmation
 */
export function getPendingSignalAlerts() {
  const active = [];
  const now = Date.now();

  for (const [id, sig] of pendingSignals.entries()) {
    if (now <= sig.expiresAtTimestamp) {
      active.push({ ...sig });
    } else {
      pendingSignals.delete(id);
    }
  }

  return active;
}

/**
 * Diagnostic Telemetry
 */
export function getMobileConfirmationGateStatus() {
  return {
    module: "telegram-mobile-confirmation-gate",
    status: "ACTIVE",
    pendingAlertsCount: pendingSignals.size,
    processedCount: processedSignals.size,
    timelockProtectionSeconds: 120,
    idempotencyGuard: true
  };
}
