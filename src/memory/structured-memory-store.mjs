// src/memory/structured-memory-store.mjs
// Structured Domain Memory Architecture for Aifie.
// Provides dedicated domain memory banks:
// 1. strategy-memory
// 2. market-memory
// 3. regime-memory
// 4. failure-memory
// 5. trade-memory
// 6. agent-memory
// 7. system-memory

import EventEmitter from "node:events";

export class StructuredMemoryStore extends EventEmitter {
  constructor() {
    super();
    this.stores = {
      strategyMemory: new Map(),
      marketMemory: new Map(),
      regimeMemory: [],
      failureMemory: [],
      tradeMemory: new Map(),
      agentMemory: new Map(),
      systemMemory: []
    };
  }

  /**
   * Store structured institutional trade memory.
   * Enables: "Have I seen this market condition before?" pattern retrieval.
   * @param {Object} record
   */
  recordTradeMemory(record) {
    const tradeId = record.trade_id || `TRADE-${Date.now()}`;
    const structuredEntry = {
      trade_id: tradeId,
      timestamp: Date.now(),
      decision: record.decision || "BUY",
      symbol: record.symbol,
      reason: record.reason || [],
      agents: record.agents || {},
      risk: record.risk || {},
      execution: record.execution || {},
      result: record.result || {},
      lesson: record.lesson || {},
      regime: record.regime || {}
    };

    this.stores.tradeMemory.set(tradeId, structuredEntry);
    this.emit("trade_remembered", structuredEntry);
    return structuredEntry;
  }

  recordFailure(failureEvent) {
    const entry = {
      id: `fail_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      type: failureEvent.type || "COMPONENT_FAILURE",
      source: failureEvent.source || "system",
      details: failureEvent.details || {},
      recoveryActionTaken: failureEvent.recoveryAction || null
    };
    this.stores.failureMemory.push(entry);
    this.emit("failure_remembered", entry);
    return entry;
  }

  recordRegimeShift(fromRegime, toRegime, triggerFeatures) {
    const shift = {
      timestamp: Date.now(),
      fromRegime,
      toRegime,
      triggerFeatures
    };
    this.stores.regimeMemory.push(shift);
    return shift;
  }

  recordAgentInteraction(agentId, observation) {
    if (!this.stores.agentMemory.has(agentId)) {
      this.stores.agentMemory.set(agentId, []);
    }
    const agentLog = this.stores.agentMemory.get(agentId);
    agentLog.push({ timestamp: Date.now(), ...observation });
    return agentLog.length;
  }

  /**
   * Retrieve similar historical trade contexts by regime and symbol.
   */
  queryHistoricalTrades(symbol, regimeName) {
    const trades = Array.from(this.stores.tradeMemory.values());
    return trades.filter(t => {
      const matchSymbol = !symbol || t.symbol === symbol.toUpperCase();
      const matchRegime = !regimeName || (t.regime && t.regime.name === regimeName);
      return matchSymbol && matchRegime;
    });
  }

  getStoreStats() {
    return {
      totalTradesStored: this.stores.tradeMemory.size,
      totalFailuresLogged: this.stores.failureMemory.length,
      regimeShiftsTracked: this.stores.regimeMemory.length,
      trackedAgents: this.stores.agentMemory.size,
      systemEventsLogged: this.stores.systemMemory.length
    };
  }
}

export const structuredMemoryStore = new StructuredMemoryStore();
