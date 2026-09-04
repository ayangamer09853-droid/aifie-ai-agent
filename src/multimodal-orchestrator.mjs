/**
 * Real-Time Multimodal Fusion Orchestrator (Phase 7C)
 * Fuses autonomous continuous chart vision streams with incoming
 * voice command signals for cross-validated trade execution.
 */

import { EventEmitter } from "node:events";
import { analyzeChartWithVision } from "./chart-vision-advanced.mjs";
import { executeVoiceCommand } from "./voice-transcriber.mjs";
import { generateVoiceResponse } from "./voice-responder.mjs";
import { captureChart } from "./chart-capture-engine.mjs";

export class MultimodalOrchestrator extends EventEmitter {
  constructor(paper = null, orders = []) {
    super();
    this.paper = paper;
    this.orders = orders;
    this.latestChartAnalysis = null;
    this.pendingVoiceConfirmations = [];
    this.isRunning = false;
    this.captureTimer = null;
  }

  async start(options = {}) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start periodic background chart analysis (every intervalMs)
    const intervalMs = options.intervalMs || 10000;
    this.captureTimer = setInterval(async () => {
      try {
        const frame = await captureChart("https://tradingview.com/chart/AAPL", "1h");
        const analysis = await analyzeChartWithVision(frame, { timeframe: "1h" }, options);
        this.latestChartAnalysis = analysis;
        this.emit("vision:update", analysis);
      } catch (_err) {
        // Suppress background capture errors
      }
    }, intervalMs);

    if (typeof this.captureTimer.unref === "function") {
      this.captureTimer.unref();
    }

    this.setupFusionEngine(options);
    return { status: "orchestrator_online", intervalMs };
  }

  stop() {
    this.isRunning = false;
    if (this.captureTimer) {
      clearInterval(this.captureTimer);
      this.captureTimer = null;
    }
  }

  setupFusionEngine(options = {}) {
    this.on("voice:command", async (command) => {
      await this.processFusionCommand(command, options);
    });
  }

  async processFusionCommand(command, options = {}) {
    let analysis = this.latestChartAnalysis;
    if (!analysis) {
      const frame = await captureChart("https://tradingview.com/chart/" + (command.symbol || "AAPL"), "1h");
      analysis = await analyzeChartWithVision(frame, { timeframe: "1h" }, options);
      this.latestChartAnalysis = analysis;
    }

    const commandAction = String(command.action || "BUY").toUpperCase();
    const chartSignal = String(analysis.signal || "HOLD").toUpperCase();
    const aligned = (commandAction === "BUY" && chartSignal === "BUY") || (commandAction === "SELL" && chartSignal === "SELL");

    if (aligned && !command.requires_confirmation) {
      // High confidence confluence: execute directly
      const execResult = await executeVoiceCommand(command, this.paper);
      const voiceFeedback = await generateVoiceResponse(execResult, { silent: options.silent !== false });

      this.emit("fusion:executed", {
        command,
        analysis,
        execution: execResult,
        feedback: voiceFeedback,
        confidence: analysis.confidence
      });
      return { status: "executed", execution: execResult, feedback: voiceFeedback };
    } else {
      // Requires user confirmation
      const confirmationReq = {
        id: `CONFIRM_${Date.now()}`,
        command,
        analysis,
        reason: !aligned ? `Divergence: Voice requested ${commandAction} but chart indicates ${chartSignal}` : "Large order quantity requiring manual approval",
        timestamp: new Date().toISOString()
      };
      this.pendingVoiceConfirmations.push(confirmationReq);
      this.emit("fusion:confirmation_required", confirmationReq);
      return { status: "confirmation_required", confirmationReq };
    }
  }
}
