/**
 * Smart Critical Telegram Alert Filter v90.0
 * Prevents mobile notification spam by filtering high-frequency market noise
 * and delivering ONLY high-conviction, actionable, and critical risk alerts.
 */

const CRITICAL_EVENT_TYPES = new Set([
  "1_TAP_TRADE_SIGNAL",
  "BANK_PROFIT_SWEEP_EXECUTED",
  "CONSTITUTIONAL_RISK_STOP_TRIGGERED",
  "EMERGENCY_KILLSWITCH_ENGAGED",
  "BLACK_SWAN_DEFENSE_DEPLOYED"
]);

export function evaluateAlertPriority(eventType = "", data = {}) {
  const cleanType = String(eventType).toUpperCase().trim();

  if (CRITICAL_EVENT_TYPES.has(cleanType)) {
    return { priority: "CRITICAL_ACTIONABLE", shouldTransmit: true };
  }

  // Check drawdown threshold
  if (data.drawdownPct && Math.abs(data.drawdownPct) >= 2.5) {
    return { priority: "CRITICAL_RISK_WARNING", shouldTransmit: true };
  }

  // Everything else (routine tick, order slice, swarm heartbeat) is suppressed
  return { priority: "ROUTINE_NOISE_SUPPRESSED", shouldTransmit: false };
}

export async function sendSmartTelegramAlert({ eventType = "1_TAP_TRADE_SIGNAL", title = "", message = "", inlineButtons = [] } = {}) {
  const evalResult = evaluateAlertPriority(eventType);

  if (!evalResult.shouldTransmit) {
    return {
      transmitted: false,
      reason: "SUPPRESSED_BY_SMART_FILTER",
      priority: evalResult.priority,
      timestamp: new Date().toISOString()
    };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      transmitted: false,
      reason: "TELEGRAM_NOT_CONFIGURED",
      priority: evalResult.priority,
      timestamp: new Date().toISOString()
    };
  }

  const payload = {
    chat_id: chatId,
    text: `🚨 <b>${title}</b>\n──────────────────\n${message}`,
    parse_mode: "HTML"
  };

  if (Array.isArray(inlineButtons) && inlineButtons.length > 0) {
    payload.reply_markup = { inline_keyboard: inlineButtons };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "User-Agent": "AifieAI-Bot/1.0",
        "Connection": "close"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return {
      transmitted: res.ok,
      telegramMessageId: data.result?.message_id,
      priority: evalResult.priority,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      transmitted: false,
      error: err.message,
      priority: evalResult.priority,
      timestamp: new Date().toISOString()
    };
  }
}
