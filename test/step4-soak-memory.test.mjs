// test/step4-soak-memory.test.mjs
// Verifies Step 4 (Sustained Ingestion Soak & Memory Leak Profiler)

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { SoakTestHarness } from "../src/benchmarks/soak-test-harness.mjs";

describe("Step 4: Sustained Ingestion Soak & Memory Profiler Harness", () => {
  it("Step 4.1: Executes high-frequency soak test and monitors V8 heap bounds", () => {
    const harness = new SoakTestHarness({ bufferCapacity: 5000 });

    // Ingest 5,000 synthetic ticks through Data Quality Sentinel and RingBuffer
    const result = harness.runSoakTest({ totalTicks: 5000, auditTicks: true });

    assert.equal(result.totalTicks, 5000);
    assert.equal(result.ingestedTicks, 5000);
    assert.ok(result.throughputTicksPerSec > 1000, `Throughput (${result.throughputTicksPerSec}) should exceed 1,000 ticks/sec`);

    // Latency Percentile Checks
    assert.ok(result.latenciesMs.p50 < 1.0, "p50 latency should be sub-millisecond");
    assert.ok(result.latenciesMs.p99 < 5.0, "p99 latency should remain under 5ms");

    // Memory Profiler Checks
    assert.equal(result.heapStatistics.isBounded, true, "Heap growth must remain bounded");
    assert.ok(result.heapStatistics.heapGrowthMb < 25.0, `Heap growth (${result.heapStatistics.heapGrowthMb} MB) must remain under 25MB ceiling`);

    // Event Loop Lag Checks (Tight synchronous burst)
    assert.ok(result.eventLoopLagMs.mean < 100.0, "Event loop lag mean must remain sub-100ms under tight burst load");
  });
});
