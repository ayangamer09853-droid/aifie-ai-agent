// src/intelligence/ai-risk-officer.mjs
// Dedicated AI Risk Officer Agent whose primary imperative is risk contrarianism and vetoes.
// Audits agent proposals for overconfidence, conflicting signals, volatility anomalies,
// regime mismatches, and data quality degradation.

export class AIRiskOfficer {
  constructor(config = {}) {
    this.name = "AI-Risk-Officer";
    this.maxConfidenceThreshold = config.maxConfidenceThreshold || 0.88; // Flags suspicious overconfidence (>88%)
    this.disagreementThreshold = config.disagreementThreshold || 0.35; // Flags high agent dissent
  }

  /**
   * Evaluate proposed agent decision and market context for hidden risks.
   * @param {Object} proposal
   * @param {string} proposal.symbol
   * @param {string} proposal.action - "BUY" | "SELL" | "HOLD"
   * @param {number} proposal.confidence - 0 to 1
   * @param {number} proposal.expectedReturn - e.g. 0.05
   * @param {Array<Object>} proposal.agentViews - Specialist views
   * @param {Object} context - { market, regime, volatilityZScore, dataQualityScore }
   * @returns {{ veto: boolean, downscaleFactor: number, reasons: string[], riskAudit: Object }}
   */
  evaluateProposal(proposal, context = {}) {
    const reasons = [];
    let veto = false;
    let downscaleFactor = 1.0;

    const { confidence = 0.5, action = "HOLD", agentViews = [] } = proposal;
    const { regime = "UNKNOWN", volatilityZScore = 0, dataQualityScore = 100 } = context;

    // 1. Overconfidence Penalty
    if (confidence > this.maxConfidenceThreshold) {
      reasons.push(`EXCESSIVE_OVERCONFIDENCE: Agent confidence ${(confidence * 100).toFixed(1)}% exceeds prudence ceiling ${(this.maxConfidenceThreshold * 100).toFixed(1)}%`);
      downscaleFactor *= 0.75;
    }

    // 2. High Volatility Regime Veto / Downscale
    if (regime === "HIGH_VOLATILITY" || regime === "BEAR") {
      if (action === "BUY") {
        reasons.push(`REGIME_MISMATCH: Proposing aggressive long position during adverse regime [${regime}]`);
        downscaleFactor *= 0.5;
        if (volatilityZScore > 2.5) {
          veto = true;
          reasons.push("HIGH_VOLATILITY_VETO: Volatility Z-score too elevated for long risk-taking");
        }
      }
    }

    // 3. Agent Disagreement Check
    if (agentViews.length >= 2) {
      const buyCount = agentViews.filter(v => v.stance === "BULL").length;
      const bearCount = agentViews.filter(v => v.stance === "BEAR").length;
      const total = buyCount + bearCount;
      if (total > 0) {
        const dissent = Math.min(buyCount, bearCount) / total;
        if (dissent >= this.disagreementThreshold) {
          reasons.push(`SPECIALIST_DISSENT: High disagreement ratio ${(dissent * 100).toFixed(1)}% among specialist agents`);
          downscaleFactor *= 0.7;
        }
      }
    }

    // 4. Data Quality Degradation
    if (dataQualityScore < 80) {
      reasons.push(`DATA_INTEGRITY_COMPROMISED: Market data quality score ${dataQualityScore}/100 is below safe threshold 80`);
      if (dataQualityScore < 60) {
        veto = true;
        reasons.push("DATA_DEGRADATION_VETO: Trading blocked due to unreliable data feeds");
      } else {
        downscaleFactor *= 0.5;
      }
    }

    return {
      veto,
      downscaleFactor: Number(downscaleFactor.toFixed(2)),
      reasons,
      riskAudit: {
        timestamp: Date.now(),
        regime,
        dataQualityScore,
        vetoTriggered: veto
      }
    };
  }
}

export const aiRiskOfficer = new AIRiskOfficer();
