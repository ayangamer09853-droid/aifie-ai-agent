// src/research/probability-calibrator.mjs
// Probability Calibration Engine
// Replaces static confidence with calibrated empirical probabilities (Brier Score, Reliability Diagrams, ECE).

export class ProbabilityCalibrator {
  /**
   * Calculates the Brier Score: Mean squared error of probabilistic forecasts.
   * BS = (1 / N) * sum((p_i - o_i)^2)
   * A lower score (closer to 0.0) represents superior calibration; 0.25 is random guessing.
   * @param {number[]} predictions - Array of predicted probabilities [0.0 to 1.0]
   * @param {number[]} outcomes - Array of binary outcomes (1 for win/true, 0 for loss/false)
   * @returns {number} Brier score
   */
  static computeBrierScore(predictions, outcomes) {
    if (!predictions || !outcomes || predictions.length === 0 || predictions.length !== outcomes.length) {
      throw new Error("Predictions and outcomes must be non-empty arrays of identical length");
    }

    let sumSquaredError = 0;
    for (let i = 0; i < predictions.length; i++) {
      const p = Math.max(0, Math.min(1, predictions[i]));
      const o = outcomes[i] ? 1 : 0;
      sumSquaredError += Math.pow(p - o, 2);
    }

    return Number((sumSquaredError / predictions.length).toFixed(6));
  }

  /**
   * Generates a 10-bin Reliability Diagram and Expected Calibration Error (ECE).
   * @param {number[]} predictions
   * @param {number[]} outcomes
   * @param {number} [numBins=10]
   * @returns {Object} Reliability report with bins and ECE
   */
  static generateReliabilityDiagram(predictions, outcomes, numBins = 10) {
    if (!predictions || !outcomes || predictions.length === 0 || predictions.length !== outcomes.length) {
      throw new Error("Predictions and outcomes must be non-empty arrays of identical length");
    }

    const binSize = 1.0 / numBins;
    const bins = Array.from({ length: numBins }, (_, i) => ({
      binIndex: i,
      minProb: Number((i * binSize).toFixed(2)),
      maxProb: Number(((i + 1) * binSize).toFixed(2)),
      count: 0,
      predictedSum: 0,
      outcomeSum: 0,
      meanPredicted: 0,
      empiricalFrequency: 0,
      calibrationGap: 0
    }));

    const totalSamples = predictions.length;

    for (let i = 0; i < totalSamples; i++) {
      const p = Math.max(0, Math.min(0.99999, predictions[i]));
      const o = outcomes[i] ? 1 : 0;
      const binIdx = Math.min(numBins - 1, Math.floor(p / binSize));

      bins[binIdx].count++;
      bins[binIdx].predictedSum += p;
      bins[binIdx].outcomeSum += o;
    }

    let weightedCalibrationError = 0;

    for (const bin of bins) {
      if (bin.count > 0) {
        bin.meanPredicted = Number((bin.predictedSum / bin.count).toFixed(4));
        bin.empiricalFrequency = Number((bin.outcomeSum / bin.count).toFixed(4));
        bin.calibrationGap = Number(Math.abs(bin.meanPredicted - bin.empiricalFrequency).toFixed(4));
        weightedCalibrationError += (bin.count / totalSamples) * bin.calibrationGap;
      }
    }

    const brier = this.computeBrierScore(predictions, outcomes);

    return Object.freeze({
      totalSamples,
      numBins,
      expectedCalibrationError: Number(weightedCalibrationError.toFixed(4)),
      brierScore: brier,
      bins: bins.map(b => Object.freeze(b))
    });
  }

  /**
   * Calibrates raw model confidence using empirical isotonic bin mappings.
   * Prevents raw overconfident models (e.g. 0.85) from masquerading as 85% probability
   * when historical reality was only 61%.
   * @param {number} rawConfidence - Raw output from model [0.0 - 1.0]
   * @param {Array<{ minProb: number, maxProb: number, empiricalFrequency: number, count: number }>} calibrationBins
   * @returns {number} Calibrated probability
   */
  static calibrateProbability(rawConfidence, calibrationBins) {
    const clamped = Math.max(0, Math.min(1, rawConfidence));
    if (!calibrationBins || calibrationBins.length === 0) {
      return clamped;
    }

    const targetBin = calibrationBins.find(b => clamped >= b.minProb && clamped <= b.maxProb);
    if (!targetBin || targetBin.count < 5) {
      // Fallback: apply conservative shrinkage towards prior mean 0.50
      return Number(((clamped * 0.7) + 0.15).toFixed(4));
    }

    // Blend empirical frequency with raw score based on sample size credibility
    const credibility = Math.min(1.0, targetBin.count / 50);
    const calibrated = (targetBin.empiricalFrequency * credibility) + (clamped * (1 - credibility));
    return Number(Math.max(0.01, Math.min(0.99, calibrated)).toFixed(4));
  }
}
