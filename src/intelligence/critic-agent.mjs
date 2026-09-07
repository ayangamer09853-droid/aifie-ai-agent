// @ts-check
import { globalEventBus } from "../core/event-bus.mjs";
import { AifieAgent } from "../agent/agent-runtime.mjs";

/**
 * Adversarial Critic Agent for Aifie
 * Purpose: Actively searches for flaws and disproves proposed trade decisions.
 */
export class CriticAgent extends AifieAgent {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    super({
      id: options.id || "critic-agent-01",
      role: "CRITIC",
      ...options
    });
    this.totalCritiques = 0;
    this.totalRejections = 0;
  }

  /**
   * Critique a proposed trade intent
   * @param {Object} proposal
   * @param {string} proposal.strategy - Strategy identifier
   * @param {string} proposal.symbol - Asset symbol
   * @param {"BUY"|"SELL"|"LONG"|"SHORT"} proposal.direction - Trade direction
   * @param {number} proposal.confidence - Strategy confidence (0.0 to 1.0)
   * @param {Object} [context={}]
   * @param {string} [context.regime] - Current market regime (e.g. "TRENDING_BULL", "RANGE_CHOPPY", "HIGH_VOLATILITY")
   * @param {number} [context.spreadPercent] - Current market spread percentage
   * @param {number} [context.activeCorrelatedExposure] - Portfolio correlation exposure (0.0 to 1.0)
   * @param {boolean} [context.imminentHighImpactNews=false] - Macro economic risk event within horizon
   */
  async critiqueTradeProposal(proposal, context = {}) {
    this.totalCritiques++;
    const warnings = [];
    const reasonCodes = [];
    let rejectionConviction = 0.0;

    const symbol = String(proposal?.symbol || "UNKNOWN").toUpperCase();
    const direction = String(proposal?.direction || "BUY").toUpperCase();
    const confidence = Number(proposal?.confidence || 0.5);
    const regime = String(context?.regime || "NEUTRAL").toUpperCase();
    const spread = Number(context?.spreadPercent || 0.05);
    const correlatedExposure = Number(context?.activeCorrelatedExposure || 0.0);
    const hasNewsRisk = Boolean(context?.imminentHighImpactNews);

    // 1. Regime Mismatch Check
    if (regime.includes("CHOPPY") || regime.includes("RANGE")) {
      if (proposal.strategy?.includes("momentum") || proposal.strategy?.includes("breakout")) {
        warnings.push(`Regime mismatch: Momentum strategy deployed in choppy ranging market (${regime})`);
        reasonCodes.push("REGIME_MISMATCH_CHOPPY");
        rejectionConviction += 0.35;
      }
    } else if (regime.includes("HIGH_VOLATILITY") || regime.includes("TRENDING")) {
      if (proposal.strategy?.includes("meanrev") || proposal.strategy?.includes("reversion")) {
        warnings.push(`Regime mismatch: Mean reversion deployed in strong directional trending market (${regime})`);
        reasonCodes.push("REGIME_MISMATCH_TRENDING");
        rejectionConviction += 0.35;
      }
    }

    // 2. Spread & Liquidity Penalty
    if (spread > 0.2) {
      warnings.push(`Excessive spread penalty: Current spread is ${spread.toFixed(2)}%, eroding expected edge`);
      reasonCodes.push("EXCESSIVE_SPREAD_PENALTY");
      rejectionConviction += 0.30;
    }

    // 3. Imminent High-Impact News / Macro Event Horizon
    if (hasNewsRisk) {
      warnings.push(`High-impact macroeconomic event scheduled within trade horizon; volatility expansion imminent`);
      reasonCodes.push("IMMINENT_NEWS_VOLATILITY_RISK");
      rejectionConviction += 0.40;
    }

    // 4. Overfitting / Low Conviction Check
    if (confidence < 0.60) {
      warnings.push(`Marginal strategy confidence: Confidence score (${(confidence * 100).toFixed(1)}%) below significance threshold`);
      reasonCodes.push("MARGINAL_ALPHA_CONVICTION");
      rejectionConviction += 0.25;
    }

    // 5. Portfolio Correlation Crowding
    if (correlatedExposure > 0.40) {
      warnings.push(`Portfolio correlation crowding: Sector/correlated exposure at ${(correlatedExposure * 100).toFixed(1)}%`);
      reasonCodes.push("CORRELATION_CROWDING_EXPOSURE");
      rejectionConviction += 0.25;
    }

    // Normalization & Final Determination
    rejectionConviction = Math.min(1.0, rejectionConviction);
    const approved = rejectionConviction < 0.50;

    if (!approved) {
      this.totalRejections++;
    }

    const critiqueReport = {
      approved,
      rejectionConviction: Number(rejectionConviction.toFixed(3)),
      confidenceAdjustment: Number((confidence * (1 - rejectionConviction * 0.5)).toFixed(3)),
      symbol,
      direction,
      strategy: proposal.strategy,
      warnings,
      reasonCodes: reasonCodes.length > 0 ? reasonCodes : ["CRITIC_CLEARED_NOMINAL"],
      critiqueNotes: approved
        ? `Proposal passed adversarial scrutiny with ${warnings.length} mild warning(s).`
        : `Proposal REJECTED by Critic Agent: Conviction of failure (${(rejectionConviction * 100).toFixed(1)}%) exceeds safety threshold.`,
      evaluatedAt: new Date().toISOString()
    };

    globalEventBus.publish("CRITIC_EVALUATED", critiqueReport, {
      source: this.id,
      correlationId: context?.correlationId
    });

    return critiqueReport;
  }

  getStatus() {
    const parentStatus = super.getStatus();
    return {
      ...parentStatus,
      totalCritiques: this.totalCritiques,
      totalRejections: this.totalRejections,
      rejectionRatePercent: this.totalCritiques > 0 ? Number(((this.totalRejections / this.totalCritiques) * 100).toFixed(1)) : 0
    };
  }
}

export const globalCriticAgent = new CriticAgent();
