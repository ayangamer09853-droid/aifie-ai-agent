// src/learning/knowledge-graph-feedback-engine.mjs
// Self-Adaptive Knowledge Graph Feedback & Adverse Trade Mitigation Engine
// Connects ai_learned_self_knowledge.json directly into live trading conviction & risk gates
// Pure Node.js ESM built-ins only

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export class KnowledgeGraphFeedbackEngine {
  constructor(knowledgeFilePath = join(process.cwd(), "ai_learned_self_knowledge.json")) {
    this.knowledgeFilePath = knowledgeFilePath;
    this.axioms = [];
    this.rulesBySymbol = new Map();
    this.rulesByTopic = new Map();
    this.reloadKnowledge();
  }

  /**
   * Load and index learned rules from the JSON knowledge store.
   */
  reloadKnowledge() {
    if (!existsSync(this.knowledgeFilePath)) {
      this.axioms = [];
      return;
    }

    try {
      const raw = readFileSync(this.knowledgeFilePath, "utf-8");
      const data = JSON.parse(raw);
      this.axioms = Array.isArray(data.axioms) ? data.axioms : [];

      this.rulesBySymbol.clear();
      this.rulesByTopic.clear();

      for (const axiom of this.axioms) {
        // Index by symbol
        const symbol = axiom.condition?.symbol?.toUpperCase();
        if (symbol) {
          if (!this.rulesBySymbol.has(symbol)) {
            this.rulesBySymbol.set(symbol, []);
          }
          this.rulesBySymbol.get(symbol).push(axiom);
        }

        // Index by topic
        const topic = axiom.topic;
        if (topic) {
          if (!this.rulesByTopic.has(topic)) {
            this.rulesByTopic.set(topic, []);
          }
          this.rulesByTopic.get(topic).push(axiom);
        }
      }
    } catch (err) {
      console.error(`[KNOWLEDGE_FEEDBACK] Error loading knowledge file: ${err.message}`);
    }
  }

  /**
   * Query applicable adverse mitigation rules for an asset before order placement.
   */
  evaluateAdverseTradeMitigations(symbol, baseConviction = 1.0) {
    const normSymbol = (symbol || "").trim().toUpperCase();
    const symbolRules = this.rulesBySymbol.get(normSymbol) || [];

    if (symbolRules.length === 0) {
      return {
        symbol: normSymbol,
        hasMitigation: false,
        adjustedConviction: baseConviction,
        convictionMultiplier: 1.0,
        requiredConfirmationCandles: 1,
        stopLossMultiplier: 1.0,
        appliedAxiomIds: [],
        rulesSummary: "No historical adverse loss patterns found."
      };
    }

    let convictionMultiplier = 1.0;
    let requiredConfirmationCandles = 1;
    let stopLossMultiplier = 1.0;
    const appliedAxiomIds = [];
    const reasons = [];

    for (const rule of symbolRules) {
      if (rule.topic?.includes("ADVERSE_TRADE_MITIGATION") || rule.condition?.priorLossMitigation) {
        appliedAxiomIds.push(rule.id);
        const ruleConviction = Number(rule.convictionModifier) || 0.7;
        convictionMultiplier = Math.min(convictionMultiplier, ruleConviction);
        requiredConfirmationCandles = Math.max(requiredConfirmationCandles, 2);
        stopLossMultiplier = 1.25; // 25% wider stop loss to avoid premature liquidation
        reasons.push(`${rule.id}: ${rule.rule}`);
      }
    }

    const adjustedConviction = Number((baseConviction * convictionMultiplier).toFixed(3));

    return {
      symbol: normSymbol,
      hasMitigation: appliedAxiomIds.length > 0,
      hasAdversePattern: appliedAxiomIds.length > 0,
      adjustedConviction,
      convictionMultiplier: Number(convictionMultiplier.toFixed(3)),
      requiredConfirmationCandles,
      confirmationTicksRequired: requiredConfirmationCandles,
      stopLossMultiplier,
      stopLossBufferMultiplier: stopLossMultiplier,
      appliedAxiomIds,
      rules: reasons,
      reasons,
      rulesSummary: reasons.join(" | ")
    };
  }

  /**
   * Calibrate rule accuracy following a completed trade outcome.
   */
  calibrateRuleOutcome(axiomId, isProfitable) {
    const axiom = this.axioms.find(a => a.id === axiomId || a.axiomId === axiomId);
    if (!axiom) {
      return { success: false, reason: `Axiom ${axiomId} not found` };
    }

    axiom.appliedCount = (axiom.appliedCount || 0) + 1;
    if (isProfitable) {
      axiom.successCount = (axiom.successCount || 0) + 1;
    }

    const successRatio = axiom.appliedCount > 0 ? (axiom.successCount / axiom.appliedCount) * 100 : 0;
    axiom.accuracyRate = `${successRatio.toFixed(1)}%`;
    axiom.lastCalibratedAt = new Date().toISOString();

    // Persist calibration
    this._persistKnowledge();

    return {
      success: true,
      axiomId,
      appliedCount: axiom.appliedCount,
      successCount: axiom.successCount,
      accuracyRate: axiom.accuracyRate
    };
  }

  /**
   * Add a newly learned adverse trade mitigation rule.
   */
  recordAdverseRule({ symbol, lossAmountUSD, lossPercent, triggerReason = "STOP_LOSS_AUTO" }) {
    const normSymbol = symbol.toUpperCase();
    const nextNum = this.axioms.length + 1;
    const axiomId = `SK-AXIOM-${String(nextNum).padStart(3, "0")}`;

    const newAxiom = {
      id: axiomId,
      topic: `ADVERSE_TRADE_MITIGATION_${normSymbol}`,
      rule: `Observed loss of $${Math.abs(lossAmountUSD)} (${lossPercent}%) on ${normSymbol} (${triggerReason}). Restrict entry size and require 2 confirmation candles before re-entering.`,
      condition: {
        symbol: normSymbol,
        priorLossMitigation: true
      },
      convictionModifier: 0.7,
      action: "TRIM_RISK_REQUIRE_CONFIRMATION",
      appliedCount: 1,
      successCount: 0,
      accuracyRate: "0.0%",
      createdAt: new Date().toISOString()
    };

    this.axioms.unshift(newAxiom);
    this._persistKnowledge();
    this.reloadKnowledge();

    return newAxiom;
  }

  _persistKnowledge() {
    try {
      const payload = { axioms: this.axioms };
      writeFileSync(this.knowledgeFilePath, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.error(`[KNOWLEDGE_FEEDBACK] Error saving knowledge file: ${err.message}`);
    }
  }

  getTelemetry() {
    return {
      totalAxioms: this.axioms.length,
      indexedSymbols: Array.from(this.rulesBySymbol.keys()),
      indexedTopics: Array.from(this.rulesByTopic.keys()),
      lastUpdated: new Date().toISOString()
    };
  }
}

export const knowledgeGraphFeedbackEngine = new KnowledgeGraphFeedbackEngine();
