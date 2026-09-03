/**
 * Telegram Notification System for Aifie AI Agent v37.0
 * Sends real-time alerts for BUY/SELL fills, Risk Vetoes, Black Swan events,
 * API failures, and Daily PnL summaries directly to Telegram.
 * Supports HTML formatting, interactive reply_markup keyboards, and robust ECONNRESET network retry logic.
 */

export async function sendTelegramAlert(text, { botToken = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID, parseMode = "HTML", replyMarkup = null } = {}) {
  if (!botToken || !chatId) {
    return {
      sent: false,
      reason: "TELEGRAM_NOT_CONFIGURED",
      details: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env to enable instant mobile alerts."
    };
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: parseMode
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "User-Agent": "AifieAI-Bot/1.0",
          "Connection": "close"
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { sent: false, reason: "TELEGRAM_API_ERROR", details: data.description || "Failed to send Telegram message" };
      }

      return { sent: true, messageId: data.result?.message_id, timestamp: new Date().toISOString() };
    } catch (err) {
      if (attempt === 2) {
        return { sent: false, reason: "NETWORK_ERROR", details: `Network connection reset: ${err.message}` };
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

export async function sendTradeAlert({ symbol, side, quantity, price, rationale, isPaper = true }) {
  const emoji = side.toUpperCase() === "BUY" ? "🟢" : "🔴";
  const modeTag = isPaper ? "PAPER SIMULATION" : "LIVE EXECUTION";

  const message = `${emoji} <b>AIFIE TRADE ALERT (${modeTag})</b>
──────────────────
<b>Asset:</b> ${symbol.toUpperCase()}
<b>Action:</b> ${side.toUpperCase()} ${quantity} Shares
<b>Fill Price:</b> ₹${price.toFixed(2)}
<b>Total Value:</b> ₹${(price * quantity).toFixed(2)}
──────────────────
<b>CEO Rationale:</b> ${rationale || "Parliament consensus achieved."}
──────────────────
<i>Executed via Aifie Multi-Agent Execution Engine.</i>`;

  return sendTelegramAlert(message);
}

export async function sendRiskAlert({ reason, type = "RISK_VETO" }) {
  const message = `🚨 <b>AIFIE RISK MANAGEMENT ALERT</b>
──────────────────
<b>Event Type:</b> ${type}
<b>Status:</b> TRADE REJECTED BY ABSOLUTE VETO POWER
──────────────────
<b>Risk Rationale:</b> ${reason}
──────────────────
<i>Aifie Absolute Risk Veto Power protected capital.</i>`;

  return sendTelegramAlert(message);
}

export async function sendDailyPnlReport({ totalRealizedPnl = 0, totalTrades = 0, winRatePercent = 100, activeRegime = "BULL_TREND" }) {
  const emoji = totalRealizedPnl >= 0 ? "💰" : "📉";

  const message = `${emoji} <b>AIFIE DAILY SUMMARY REPORT</b>
──────────────────
<b>Realized Net PnL:</b> ₹${totalRealizedPnl.toFixed(2)}
<b>Total Trades Executed:</b> ${totalTrades}
<b>Win Rate:</b> ${winRatePercent}%
<b>Active Market Regime:</b> ${activeRegime}
──────────────────
<i>Generated automatically at market close.</i>`;

  return sendTelegramAlert(message);
}
