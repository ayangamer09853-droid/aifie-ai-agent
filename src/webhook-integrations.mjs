/**
 * Multi-Channel Outgoing Webhooks Broadcaster for Aifie AI Agent v6.0
 * Broadcasts real-time trading signals and risk alerts to Discord, Slack, and Telegram.
 */

import { sendTelegramAlert } from "./telegram-notifier.mjs";

export async function broadcastMultiChannelAlert({ title = "AIFIE AGENT ALERT", text = "", discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL, slackWebhookUrl = process.env.SLACK_WEBHOOK_URL }) {
  const results = {
    telegram: await sendTelegramAlert(`<b>${title}</b>\n${text}`),
    discord: { sent: false, reason: "DISCORD_NOT_CONFIGURED" },
    slack: { sent: false, reason: "SLACK_NOT_CONFIGURED" }
  };

  if (discordWebhookUrl) {
    try {
      const res = await fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: `**${title}**\n${text}` })
      });
      results.discord = { sent: res.ok, status: res.status };
    } catch (err) {
      results.discord = { sent: false, error: err.message };
    }
  }

  if (slackWebhookUrl) {
    try {
      const res = await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `*${title}*\n${text}` })
      });
      results.slack = { sent: res.ok, status: res.status };
    } catch (err) {
      results.slack = { sent: false, error: err.message };
    }
  }

  return {
    broadcastAt: new Date().toISOString(),
    results
  };
}
