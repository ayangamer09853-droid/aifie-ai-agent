/**
 * Voice Audio Responder & Speech Synthesizer (Phase 7B)
 * Generates AI-synthesized verbal feedback for orders and speaks responses
 * across macOS (`say`) and Windows (PowerShell SAPI SpeechSynthesizer).
 */

import { spawn } from "node:child_process";

/**
 * Convert text to speech via local OS speech engine
 * @param {string} text - Message to speak aloud
 * @param {string} [voice="en-US-male"] - Voice persona
 * @param {object} [options={}] - mockSpeak boolean
 * @returns {Promise<boolean>}
 */
export async function speakResponse(text, voice = "en-US-male", options = {}) {
  if (!text || options.mockSpeak) {
    return true;
  }

  return new Promise((resolve) => {
    let proc;
    if (process.platform === "darwin") {
      proc = spawn("say", [text, "-v", voice]);
    } else if (process.platform === "win32") {
      // Use Windows SAPI SpeechSynthesizer safely
      const escaped = text.replace(/"/g, '`"').replace(/'/g, "''");
      proc = spawn("powershell", [
        "-NoProfile",
        "-Command",
        `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("${escaped}")`
      ]);
    } else {
      // Linux or other: try 'spd-say' or 'espeak' if available
      proc = spawn("spd-say", [text]);
    }

    // Never block process or reject on missing speaker devices
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));

    // Safety timeout: 4 seconds max
    setTimeout(() => {
      try { proc.kill(); } catch (_) {}
      resolve(true);
    }, 4000);
  });
}

/**
 * AI-generated verbal response to trading action
 * @param {object} orderResult - Order execution report
 * @param {object} [options={}]
 * @returns {Promise<string>} Spoken feedback sentence
 */
export async function generateVoiceResponse(orderResult, options = {}) {
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
  const fetchFn = options.fetchFn || globalThis.fetch;

  if (apiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs || 6000);
    try {
      const response = await fetchFn("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: `Given this order result, generate a brief professional verbal feedback (25 words max):
${JSON.stringify(orderResult)}`
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const verbal = data.content?.[0]?.text?.trim();
        if (verbal) {
          if (!options.silent) await speakResponse(verbal, "en-US-male", options);
          return verbal;
        }
      }
    } catch (_err) {
      // Fall through
    } finally {
      clearTimeout(timer);
    }
  }

  // Deterministic professional spoken feedback
  const symbol = orderResult?.order?.symbol || orderResult?.symbol || "asset";
  const side = orderResult?.order?.side || orderResult?.side || "executed";
  const qty = orderResult?.order?.quantity || orderResult?.quantity || 1;
  const price = orderResult?.fill?.price || orderResult?.price || 182.50;

  const verbalFeedback = `Order confirmed: ${side.toUpperCase()} ${qty} shares of ${symbol} at ${price} dollars. Risk fortress active.`;
  if (!options.silent) {
    await speakResponse(verbalFeedback, "en-US-male", options);
  }
  return verbalFeedback;
}
