// @ts-check
import { randomUUID } from "node:crypto";

/**
 * Strategy Evolution & Hypothesis Engine
 * Proposes candidate parameter and feature variations without mutating production source code.
 */
export class StrategyEvolver {
  constructor() {
    this.experimentsCount = 0;
    this.candidates = [];
  }

  /**
   * Generate an evolutionary experiment candidate
   * @param {Object} params
   * @param {string} params.parentStrategy - e.g. "momentum-v3"
   * @param {string} params.parentVersion - e.g. "3.2.0"
   * @param {Object} params.baseParameters - e.g. { emaFast: 20, emaSlow: 50, rsiPeriod: 14 }
   * @param {string} [params.hypothesis]
   */
  generateCandidate({
    parentStrategy,
    parentVersion,
    baseParameters = {},
    hypothesis = "Parameter perturbation to adapt to rising market volatility"
  }) {
    this.experimentsCount++;
    const experimentId = `EXP-${String(this.experimentsCount).padStart(6, "0")}`;

    // Apply bounded perturbations (+/- 10-20%)
    const mutatedParameters = { ...baseParameters };
    for (const [key, val] of Object.entries(baseParameters)) {
      if (typeof val === "number") {
        const factor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1 multiplier
        mutatedParameters[key] = Number((val * factor).toFixed(2));
      }
    }

    const candidate = {
      experimentId,
      strategy: parentStrategy,
      parentVersion,
      newVersion: `${parentVersion}-exp.${randomUUID().slice(0, 4)}`,
      hypothesis,
      changes: mutatedParameters,
      status: "CANDIDATE_QUEUED",
      dataset: "BTC-2024-2026-SYNTHETIC",
      createdAt: new Date().toISOString()
    };

    this.candidates.push(candidate);
    return candidate;
  }

  getCandidates() {
    return this.candidates;
  }

  getStatus() {
    return {
      service: "StrategyEvolver",
      totalExperimentsGenerated: this.experimentsCount,
      queuedCandidatesCount: this.candidates.filter(c => c.status === "CANDIDATE_QUEUED").length
    };
  }
}

export const globalStrategyEvolver = new StrategyEvolver();
