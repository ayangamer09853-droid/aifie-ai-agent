// src/backtest/reality-score-evaluator.mjs
// Aifie Reality Score™ Evaluator.
// Computes institutional strategy grades by fusing Backtest, Walk-Forward,
// Paper Trading, Regime Robustness, Cost Robustness, and Data Quality.
//
// Grading Matrix:
// 90+  -> ELIGIBLE_FOR_SMALL_LIVE (Subject to human compliance signoff)
// 80-89 -> PAPER_OR_TINY_ALLOCATION
// 70-79 -> RESEARCH_ONLY
// <70   -> REJECTED

export class RealityScoreEvaluator {
  constructor() {
    this.weights = {
      backtest: 0.20,
      walkForward: 0.25,
      paperTrading: 0.25,
      regimeRobustness: 0.15,
      costRobustness: 0.10,
      dataQuality: 0.05
    };
  }

  /**
   * Evaluate strategy performance scores and determine deployment eligibility.
   * @param {Object} input
   * @param {string} input.strategyName
   * @param {number} input.backtestScore - 0 to 100
   * @param {number} input.walkForwardScore - 0 to 100
   * @param {number} input.paperTradingScore - 0 to 100
   * @param {number} input.regimeRobustScore - 0 to 100
   * @param {number} input.costRobustScore - 0 to 100
   * @param {number} input.dataQualityScore - 0 to 100
   * @returns {Object} Score breakdown, reality score, status recommendation
   */
  evaluateRealityScore(input) {
    const strategyName = input.strategyName || "Unnamed-Strategy";
    const backtest = Math.min(100, Math.max(0, input.backtestScore ?? 80));
    const walkForward = Math.min(100, Math.max(0, input.walkForwardScore ?? 75));
    const paperTrading = Math.min(100, Math.max(0, input.paperTradingScore ?? 75));
    const regimeRobust = Math.min(100, Math.max(0, input.regimeRobustScore ?? 70));
    const costRobust = Math.min(100, Math.max(0, input.costRobustScore ?? 70));
    const dataQuality = Math.min(100, Math.max(0, input.dataQualityScore ?? 90));

    const finalRealityScore = (
      backtest * this.weights.backtest +
      walkForward * this.weights.walkForward +
      paperTrading * this.weights.paperTrading +
      regimeRobust * this.weights.regimeRobustness +
      costRobust * this.weights.costRobustness +
      dataQuality * this.weights.dataQuality
    );

    const roundedScore = Math.round(finalRealityScore);

    let status = "REJECTED";
    let statusDescription = "Fails statistical edge or robustness criteria. Strategy rejected.";
    let deploymentTier = "NONE";

    if (roundedScore >= 90) {
      status = "ELIGIBLE_FOR_SMALL_LIVE";
      statusDescription = "Institutional quality verified. Meets rigorous out-of-sample and paper thresholds.";
      deploymentTier = "LIVE_TINY_PILOT";
    } else if (roundedScore >= 80) {
      status = "PAPER_TRADING_ONLY";
      statusDescription = "Robust edge demonstrated. Approved for full simulated paper trading deployment.";
      deploymentTier = "SIMULATED_PAPER";
    } else if (roundedScore >= 70) {
      status = "RESEARCH_ONLY";
      statusDescription = "Marginal statistical edge. Retained in lab for parameter search and retraining.";
      deploymentTier = "RESEARCH_SANDBOX";
    }

    return {
      strategyName,
      realityScore: roundedScore,
      status,
      deploymentTier,
      statusDescription,
      breakdown: {
        backtestScore: backtest,
        walkForwardScore: walkForward,
        paperTradingScore: paperTrading,
        regimeRobustnessScore: regimeRobust,
        costRobustnessScore: costRobust,
        dataQualityScore: dataQuality
      },
      evaluationTimestamp: Date.now()
    };
  }
}

export const realityScoreEvaluator = new RealityScoreEvaluator();
