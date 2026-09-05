// src/benchmarks/soak-test-harness.mjs
// Sustained Ingestion Soak & Memory Leak Profiler Harness
// Verifies bounded heap memory, event-loop lag, and p99.9 latency under high-frequency load.

import v8 from "node:v8";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { RingBuffer } from "../timeseries-market-store.mjs";
import { auditMarketTick } from "../data-quality-sentinel.mjs";
import { aifieEventBus } from "../core/event-bus-replay.mjs";

export class SoakTestHarness {
  constructor(options = {}) {
    this.bufferCapacity = options.bufferCapacity || 10000;
    this.ringBuffer = new RingBuffer(this.bufferCapacity);
    this.symbols = options.symbols || ["BTCUSDT", "ETHUSDT", "SOLUSDT", "NVDA", "AAPL"];
  }

  /**
   * Executes a high-frequency soak test simulating sustained ingestion.
   * @param {Object} [params={}]
   * @param {number} [params.totalTicks=10000] - Total tick count to ingest
   * @param {boolean} [params.auditTicks=true] - Whether to route through Data Quality Sentinel
   * @returns {Object} Soak test telemetry report
   */
  runSoakTest({ totalTicks = 10000, auditTicks = true } = {}) {
    // 1. Initial V8 Heap and Event Loop Delay baseline
    const heapBefore = v8.getHeapStatistics();
    const eventLoopMonitor = monitorEventLoopDelay({ resolution: 10 });
    eventLoopMonitor.enable();

    const latencies = [];
    let rejectedCount = 0;
    let sequenceCounter = 0;

    const startTime = performance.now();

    for (let i = 0; i < totalTicks; i++) {
      sequenceCounter++;
      const tickStart = performance.now();
      const symbol = this.symbols[i % this.symbols.length];
      const basePrice = symbol === "BTCUSDT" ? 65000 : symbol === "ETHUSDT" ? 3500 : 150;
      const price = basePrice + (Math.sin(i / 100) * 10) + ((i % 7) * 0.1);
      const volume = 0.1 + (i % 5);
      const timestamp = Date.now();

      // Data Quality Gate
      if (auditTicks) {
        const quality = auditMarketTick({ symbol, price, volume, timestamp, venue: "BINANCE" });
        if (!quality.valid) {
          rejectedCount++;
          continue;
        }
      }

      // RingBuffer Direct Ingestion
      this.ringBuffer.push({
        seq: sequenceCounter,
        symbol,
        price,
        volume,
        timestamp
      });

      const tickDuration = performance.now() - tickStart;
      latencies.push(tickDuration);
    }

    const endTime = performance.now();
    eventLoopMonitor.disable();

    const totalDurationMs = endTime - startTime;
    const heapAfter = v8.getHeapStatistics();

    // Memory growth delta
    const heapGrowthBytes = heapAfter.used_heap_size - heapBefore.used_heap_size;
    const heapGrowthMb = Number((heapGrowthBytes / (1024 * 1024)).toFixed(3));

    // Sort latencies for percentiles
    latencies.sort((a, b) => a - b);
    const getPercentile = (p) => {
      const idx = Math.min(latencies.length - 1, Math.floor(latencies.length * p));
      return Number(latencies[idx].toFixed(4));
    };

    const throughputTicksPerSec = Math.round((totalTicks / (totalDurationMs / 1000)));

    return Object.freeze({
      totalTicks,
      ingestedTicks: this.ringBuffer.length,
      rejectedCount,
      durationMs: Number(totalDurationMs.toFixed(2)),
      throughputTicksPerSec,
      latenciesMs: {
        p50: getPercentile(0.50),
        p95: getPercentile(0.95),
        p99: getPercentile(0.99),
        p999: getPercentile(0.999),
        max: Number(latencies[latencies.length - 1]?.toFixed(4) || 0)
      },
      eventLoopLagMs: {
        mean: Number.isNaN(eventLoopMonitor.mean) ? 0 : Number((eventLoopMonitor.mean / 1e6).toFixed(4)),
        p99: Number.isNaN(eventLoopMonitor.percentile(99)) ? 0 : Number((eventLoopMonitor.percentile(99) / 1e6).toFixed(4)),
        max: Number.isNaN(eventLoopMonitor.max) ? 0 : Number((eventLoopMonitor.max / 1e6).toFixed(4))
      },
      heapStatistics: {
        usedHeapBeforeMb: Number((heapBefore.used_heap_size / (1024 * 1024)).toFixed(2)),
        usedHeapAfterMb: Number((heapAfter.used_heap_size / (1024 * 1024)).toFixed(2)),
        heapGrowthMb,
        isBounded: heapGrowthMb < 25.0 // Bounded growth condition
      }
    });
  }
}
