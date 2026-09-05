/**
 * Sub-Millisecond End-to-End Latency Pipeline Profiler v100.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Mandated by Ayan Solanki:
 * "Measure the complete latency pipeline:
 * Tick -> Ingestion -> Feature -> Model -> Consensus -> Risk -> Execution -> Broker ACK.
 * Create a telemetry metric: Decision-to-Execution Latency.
 * Monitor: p50, p90, p95, p99, p99.9, max.
 * Separate: CPU latency vs network latency vs broker latency."
 */

const LATENCY_BUFFER_SIZE = 2000;

class LatencyPipelineProfiler {
  constructor() {
    this.stageTimers = new Map(); // traceId -> { stages: {}, startMs }
    this.completedTraces = 0;

    // Circular buffers for each stage (pre-allocated Float64Array)
    this.stageBuffers = {
      ingestion: new Float64Array(LATENCY_BUFFER_SIZE),
      featureGen: new Float64Array(LATENCY_BUFFER_SIZE),
      modelInference: new Float64Array(LATENCY_BUFFER_SIZE),
      agentConsensus: new Float64Array(LATENCY_BUFFER_SIZE),
      riskAudit: new Float64Array(LATENCY_BUFFER_SIZE),
      executionSlicing: new Float64Array(LATENCY_BUFFER_SIZE),
      brokerAck: new Float64Array(LATENCY_BUFFER_SIZE),
      decisionToExecution: new Float64Array(LATENCY_BUFFER_SIZE),
      totalEndToEnd: new Float64Array(LATENCY_BUFFER_SIZE)
    };

    this.bufferIndices = {
      ingestion: 0,
      featureGen: 0,
      modelInference: 0,
      agentConsensus: 0,
      riskAudit: 0,
      executionSlicing: 0,
      brokerAck: 0,
      decisionToExecution: 0,
      totalEndToEnd: 0
    };

    this.sampleCounts = {
      ingestion: 0,
      featureGen: 0,
      modelInference: 0,
      agentConsensus: 0,
      riskAudit: 0,
      executionSlicing: 0,
      brokerAck: 0,
      decisionToExecution: 0,
      totalEndToEnd: 0
    };
  }

  /**
   * Starts a new pipeline trace
   */
  startTrace(traceId = `tr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`) {
    const start = performance.now();
    this.stageTimers.set(traceId, {
      traceId,
      start,
      timestamps: { start },
      durations: {}
    });
    return traceId;
  }

  /**
   * Records completion of a stage in the trace
   * Stages: 'ingestion' | 'featureGen' | 'modelInference' | 'agentConsensus' | 'riskAudit' | 'executionSlicing' | 'brokerAck'
   */
  recordStage(traceId, stageName, explicitDurationMs = null) {
    const trace = this.stageTimers.get(traceId);
    if (!trace) return 0;

    const now = performance.now();
    let durationMs = 0;

    if (explicitDurationMs !== null && Number.isFinite(explicitDurationMs)) {
      durationMs = explicitDurationMs;
    } else {
      const lastKey = Object.keys(trace.timestamps)[Object.keys(trace.timestamps).length - 1];
      const prevTime = trace.timestamps[lastKey];
      durationMs = Math.max(0, now - prevTime);
    }

    trace.durations[stageName] = durationMs;
    trace.timestamps[stageName] = now;

    // Store in circular buffer
    this.addSample(stageName, durationMs);
    return durationMs;
  }

  /**
   * Ends a trace and records decision-to-execution & total end-to-end metrics
   */
  endTrace(traceId) {
    const trace = this.stageTimers.get(traceId);
    if (!trace) return null;

    const totalMs = Math.max(0, performance.now() - trace.start);
    this.addSample("totalEndToEnd", totalMs);

    // Decision-to-Execution: from model inference through execution slicing
    const decisionToExecMs = (trace.durations.modelInference || 0) +
      (trace.durations.agentConsensus || 0) +
      (trace.durations.riskAudit || 0) +
      (trace.durations.executionSlicing || 0);

    this.addSample("decisionToExecution", decisionToExecMs);

    this.completedTraces++;
    this.stageTimers.delete(traceId);

    // CPU vs Network breakdown
    const cpuLatencyMs = (trace.durations.featureGen || 0) +
      (trace.durations.modelInference || 0) +
      (trace.durations.agentConsensus || 0) +
      (trace.durations.riskAudit || 0);

    const networkAndBrokerLatencyMs = (trace.durations.ingestion || 0) +
      (trace.durations.brokerAck || 0);

    return {
      traceId,
      totalDurationMs: Number(totalMs.toFixed(3)),
      decisionToExecutionMs: Number(decisionToExecMs.toFixed(3)),
      cpuLatencyMs: Number(cpuLatencyMs.toFixed(3)),
      networkAndBrokerLatencyMs: Number(networkAndBrokerLatencyMs.toFixed(3)),
      stageDurations: trace.durations
    };
  }

  addSample(stage, valueMs) {
    const buf = this.stageBuffers[stage];
    if (!buf) return;
    const idx = this.bufferIndices[stage];
    buf[idx] = Math.max(0, valueMs);
    this.bufferIndices[stage] = (idx + 1) % LATENCY_BUFFER_SIZE;
    if (this.sampleCounts[stage] < LATENCY_BUFFER_SIZE) {
      this.sampleCounts[stage]++;
    }
  }

  /**
   * Computes p50, p90, p95, p99, p99.9, max for a stage
   */
  getPercentiles(stageName) {
    const count = this.sampleCounts[stageName] || 0;
    if (count === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0, p99_9: 0, max: 0, average: 0, samples: 0 };
    }

    const buf = this.stageBuffers[stageName];
    const sorted = new Float64Array(count);
    for (let i = 0; i < count; i++) sorted[i] = buf[i];
    sorted.sort();

    let sum = 0;
    for (let i = 0; i < count; i++) sum += sorted[i];

    return {
      p50: Number((sorted[Math.floor(count * 0.50)] || 0).toFixed(3)),
      p90: Number((sorted[Math.floor(count * 0.90)] || 0).toFixed(3)),
      p95: Number((sorted[Math.floor(count * 0.95)] || 0).toFixed(3)),
      p99: Number((sorted[Math.floor(count * 0.99)] || 0).toFixed(3)),
      p99_9: Number((sorted[Math.floor(count * 0.999)] || 0).toFixed(3)),
      max: Number((sorted[count - 1] || 0).toFixed(3)),
      average: Number((sum / count).toFixed(3)),
      samples: count
    };
  }

  /**
   * Returns comprehensive pipeline telemetry status
   */
  getTelemetryReport() {
    const stages = {};
    for (const key of Object.keys(this.stageBuffers)) {
      stages[key] = this.getPercentiles(key);
    }

    return {
      engine: "LATENCY_PIPELINE_PROFILER_v100",
      totalTracesCompleted: this.completedTraces,
      activeTracesCount: this.stageTimers.size,
      decisionToExecutionMetrics: stages.decisionToExecution,
      totalEndToEndMetrics: stages.totalEndToEnd,
      stageBreakdown: stages,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    this.stageTimers.clear();
    this.completedTraces = 0;
    for (const k of Object.keys(this.stageBuffers)) {
      this.stageBuffers[k].fill(0);
      this.bufferIndices[k] = 0;
      this.sampleCounts[k] = 0;
    }
  }
}

// Global Singleton Instance
export const latencyProfiler = new LatencyPipelineProfiler();

export function startPipelineTrace(traceId) {
  return latencyProfiler.startTrace(traceId);
}

export function recordPipelineStage(traceId, stage, duration) {
  return latencyProfiler.recordStage(traceId, stage, duration);
}

export function endPipelineTrace(traceId) {
  return latencyProfiler.endTrace(traceId);
}

export function getPipelineLatencyTelemetry() {
  return latencyProfiler.getTelemetryReport();
}

export function resetLatencyProfiler() {
  latencyProfiler.reset();
}
