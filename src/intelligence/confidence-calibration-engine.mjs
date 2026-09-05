// src/intelligence/confidence-calibration-engine.mjs
// Confidence != Probability Calibration System.
// Tracks predicted probability vs realized outcome, computes Brier scores,
// produces decile calibration curves, and returns historically calibrated probabilities.

export class ConfidenceCalibrationEngine {
  constructor(config = {}) {
    this.predictions = [];
    this.minSamplesForCalibration = config.minSamplesForCalibration || 10;
  }

  /**
   * Log a prediction for future calibration.
   * @param {Object} entry
   * @param {string} entry.prediction - "BUY" | "SELL" | "HOLD"
   * @param {number} entry.predicted_probability - e.g. 0.72
   * @param {string} [entry.horizon] - "1D", "1H"
   * @param {string} [entry.regime] - "BULL", "BEAR"
   * @param {string} [entry.strategy] - "MOMENTUM", "MEAN_REVERSION"
   * @returns {string} predictionId
   */
  recordPrediction(entry) {
    const id = `pred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      prediction: entry.prediction || "BUY",
      predicted_probability: Number(entry.predicted_probability || 0.5),
      realized_outcome: null, // 1 for success, 0 for failure
      horizon: entry.horizon || "1D",
      regime: entry.regime || "DEFAULT",
      strategy: entry.strategy || "DEFAULT",
      timestamp: Date.now()
    };
    this.predictions.push(record);
    return id;
  }

  /**
   * Resolve an earlier prediction with actual outcome.
   * @param {string} predictionId
   * @param {number} realizedOutcome - 1 (profit/correct) or 0 (loss/incorrect)
   */
  resolveOutcome(predictionId, realizedOutcome) {
    const record = this.predictions.find(p => p.id === predictionId);
    if (!record) {
      return false;
    }
    record.realized_outcome = realizedOutcome === 1 ? 1 : 0;
    record.resolvedTimestamp = Date.now();
    return true;
  }

  /**
   * Calculate Brier Score: (1/N) * sum((predicted_prob - realized)^2)
   * Lower is better: 0.0 is perfect calibration, 0.25 is random guessing for 50/50 binary events.
   */
  calculateBrierScore() {
    const resolved = this.predictions.filter(p => p.realized_outcome !== null);
    if (resolved.length === 0) return 0.25;

    const squaredErrors = resolved.map(p => Math.pow(p.predicted_probability - p.realized_outcome, 2));
    const brierScore = squaredErrors.reduce((a, b) => a + b, 0) / resolved.length;
    return Number(brierScore.toFixed(4));
  }

  /**
   * Generate decile calibration curve:
   * Compares average predicted probability per decile bucket with actual hit rate.
   */
  generateCalibrationCurve() {
    const resolved = this.predictions.filter(p => p.realized_outcome !== null);
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      decile: i + 1,
      minProb: i * 0.1,
      maxProb: (i + 1) * 0.1,
      samples: 0,
      predictedSum: 0,
      outcomeSum: 0
    }));

    for (const item of resolved) {
      const idx = Math.min(9, Math.floor(item.predicted_probability * 10));
      buckets[idx].samples += 1;
      buckets[idx].predictedSum += item.predicted_probability;
      buckets[idx].outcomeSum += item.realized_outcome;
    }

    return buckets.map(b => ({
      decile: b.decile,
      range: `${(b.minProb * 100).toFixed(0)}-${(b.maxProb * 100).toFixed(0)}%`,
      sampleCount: b.samples,
      meanPredictedProb: b.samples > 0 ? Number((b.predictedSum / b.samples).toFixed(3)) : Number(((b.minProb + b.maxProb) / 2).toFixed(3)),
      empiricalHitRate: b.samples > 0 ? Number((b.outcomeSum / b.samples).toFixed(3)) : null
    }));
  }

  /**
   * Lookup calibrated probability given a raw confidence.
   * e.g., if when AI says 70%, empirical hit rate is only 58%, returns 0.58.
   * @param {number} rawConfidence
   * @returns {number} Calibrated probability
   */
  getCalibratedProbability(rawConfidence) {
    const prob = Math.max(0, Math.min(1, rawConfidence));
    const resolved = this.predictions.filter(p => p.realized_outcome !== null);

    if (resolved.length < this.minSamplesForCalibration) {
      // Not enough historical samples: apply conservative linear shrinkage toward 0.50
      return Number((prob * 0.75 + 0.50 * 0.25).toFixed(3));
    }

    const curve = this.generateCalibrationCurve();
    const bucketIdx = Math.min(9, Math.floor(prob * 10));
    const bucket = curve[bucketIdx];

    if (bucket && bucket.empiricalHitRate !== null && bucket.sampleCount >= 3) {
      return bucket.empiricalHitRate;
    }

    // Default shrinkage
    return Number((prob * 0.8 + 0.50 * 0.2).toFixed(3));
  }

  getMetrics() {
    const resolved = this.predictions.filter(p => p.realized_outcome !== null);
    const hitRate = resolved.length > 0 ? (resolved.filter(p => p.realized_outcome === 1).length / resolved.length) : 0;

    return {
      totalRecorded: this.predictions.length,
      totalResolved: resolved.length,
      brierScore: this.calculateBrierScore(),
      empiricalHitRate: Number(hitRate.toFixed(3)),
      calibrationCurve: this.generateCalibrationCurve()
    };
  }
}

export const confidenceCalibrationEngine = new ConfidenceCalibrationEngine();
