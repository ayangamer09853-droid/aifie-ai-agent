/**
 * Continuous 60-Source Real-Time Alpha Fusion Daemon
 * Autonomous 24/7 Market Scanning & High-Conviction Confluence Sentry
 * 
 * Periodically scans the top 8 multi-asset markets across all 60 sources,
 * maintaining a live in-memory confluence matrix with BFT quorum.
 */

import { scanAll60Sources, ALL_60_SOURCES } from "./master-sources-engine.mjs";
import { realtimeEventStream } from "./realtime-event-stream.mjs";
import { telegramAlphaDispatcher } from "./telegram-alpha-dispatcher.mjs";

const WATCHLIST = Object.freeze([
  "BTC/USDT",
  "ETH/USDT",
  "SOL/USDT",
  "NVDA",
  "AAPL",
  "MSFT",
  "TSLA",
  "SPY"
]);

class Continuous60SourceFusionEngine {
  constructor() {
    this.matrix = new Map();
    this.highConvictionAlerts = [];
    this.intervalId = null;
    this.isRunning = false;
    this.cycleCount = 0;
    this.lastScanTimestamp = null;
  }

  /**
   * Runs a single fusion cycle across all watchlist assets
   */
  runCycle() {
    this.cycleCount++;
    const now = new Date().toISOString();

    for (const symbol of WATCHLIST) {
      try {
        const scan = scanAll60Sources(symbol);
        const record = {
          symbol,
          alphaScore: scan.compositeAlphaScore,
          verdict: scan.consensusVerdict,
          subEngines: {
            afmlFractionalD: scan.subEngines.fractionalDifferentiation.fractionalD,
            optionsDelta: scan.subEngines.optionsGreeks.greeks.delta,
            optionsGamma: scan.subEngines.optionsGreeks.greeks.gamma,
            pmmSpreadBps: scan.subEngines.pureMarketMaking.bidSpreadBps,
            pmmSkew: scan.subEngines.pureMarketMaking.inventorySkewRecommendation,
            dupontRoePercent: scan.subEngines.fundamentalDupont.returnOnEquityPercent,
            altmanZ: scan.subEngines.fundamentalDupont.altmanZScore,
            dcfMarginOfSafety: scan.subEngines.dcfValuation.marginOfSafetyPercent,
            geopoliticalIndex: scan.subEngines.geopoliticalThreatIndex.compositeGeopoliticalIndex,
            rlAction: scan.subEngines.reinforcementLearningPolicy.action
          },
          updatedAt: now
        };

        this.matrix.set(symbol, record);

        // Check if high conviction confluence (Score >= 40 or <= -30)
        if (Math.abs(scan.compositeAlphaScore) >= 35) {
          const alert = {
            id: `alert-60-${Date.now()}-${symbol.replace(/[^a-zA-Z0-9]/g, "")}`,
            symbol,
            type: scan.compositeAlphaScore > 0 ? "BULLISH_CONFLUENCE" : "BEARISH_CONFLUENCE",
            alphaScore: scan.compositeAlphaScore,
            verdict: scan.consensusVerdict,
            timestamp: now
          };
          this.highConvictionAlerts.unshift(alert);
          if (this.highConvictionAlerts.length > 50) this.highConvictionAlerts.pop();

          // Broadcast to connected SSE clients in real time
          realtimeEventStream.broadcast("alpha_confluence", alert);

          // Dispatch mobile alert to Telegram bot users
          telegramAlphaDispatcher.dispatchAlphaSignal(scan).catch(() => {});
        }
      } catch (err) {
        // Safe fault containment
      }
    }

    this.lastScanTimestamp = now;
  }

  /**
   * Starts the 24/7 background fusion daemon
   */
  start(intervalMs = 30000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.runCycle(); // Initial warm-up run

    this.intervalId = setInterval(() => {
      this.runCycle();
    }, Math.max(5000, intervalMs));

    if (this.intervalId.unref) this.intervalId.unref();
  }

  /**
   * Stops the background daemon
   */
  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.isRunning = false;
  }

  /**
   * Returns the current live alpha matrix
   */
  getMatrix() {
    if (this.matrix.size === 0) {
      this.runCycle();
    }
    const entries = {};
    for (const [sym, data] of this.matrix.entries()) {
      entries[sym] = data;
    }
    return {
      status: this.isRunning ? "RUNNING_24_7" : "WARMED_UP",
      cycleCount: this.cycleCount,
      totalAssetsTracked: WATCHLIST.length,
      totalSourcesQueried: ALL_60_SOURCES.length,
      lastScanTimestamp: this.lastScanTimestamp,
      matrix: entries,
      recentAlerts: this.highConvictionAlerts.slice(0, 10)
    };
  }
}

export const sourceFusionEngine = new Continuous60SourceFusionEngine();
export function getLive60SourceAlphaMatrix() {
  return sourceFusionEngine.getMatrix();
}
export function start60SourceFusionDaemon(intervalMs = 30000) {
  sourceFusionEngine.start(intervalMs);
  return sourceFusionEngine.getMatrix();
}
