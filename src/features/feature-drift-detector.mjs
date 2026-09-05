// src/features/feature-drift-detector.mjs
// Feature Drift Detection Engine
// Quantifies distribution shifts using Population Stability Index (PSI).
// Automatically flags models as DEGRADED when input feature distributions shift beyond statistical thresholds.

export class FeatureDriftDetector {
  /**
   * Calculates the Population Stability Index (PSI) between a baseline (expected)
   * and current (actual) sample distribution.
   *
   * PSI = sum( (Actual_i - Expected_i) * ln(Actual_i / Expected_i) )
   *
   * Thresholds:
   * - PSI < 0.10: Stable (No shift)
   * - 0.10 <= PSI < 0.25: Moderate Shift (Warning)
   * - PSI >= 0.25: Significant Drift (Action required: Demote model to DEGRADED)
   *
   * @param {number[]} baseline - Baseline feature samples (from training/validation)
   * @param {number[]} current - Current live production feature samples
   * @param {number} [numBuckets=10]
   * @returns {Object} PSI evaluation result
   */
  static computePSI(baseline, current, numBuckets = 10) {
    if (!baseline || !current || baseline.length < 10 || current.length < 10) {
      return { psi: 0, status: "INSUFFICIENT_DATA", buckets: [] };
    }

    // Determine global min and max across both sets
    const minVal = Math.min(...baseline, ...current);
    const maxVal = Math.max(...baseline, ...current);

    if (minVal === maxVal) {
      return { psi: 0, status: "ZERO_VARIANCE", buckets: [] };
    }

    const bucketWidth = (maxVal - minVal) / numBuckets;
    const epsilon = 0.0001; // Avoid log(0) and division by zero

    const expectedCounts = new Array(numBuckets).fill(0);
    const actualCounts = new Array(numBuckets).fill(0);

    // Bin baseline (expected)
    for (const val of baseline) {
      const idx = Math.min(numBuckets - 1, Math.floor((val - minVal) / bucketWidth));
      expectedCounts[idx]++;
    }

    // Bin current (actual)
    for (const val of current) {
      const idx = Math.min(numBuckets - 1, Math.floor((val - minVal) / bucketWidth));
      actualCounts[idx]++;
    }

    const baselineTotal = baseline.length;
    const currentTotal = current.length;

    let totalPSI = 0;
    const bucketDetails = [];

    for (let i = 0; i < numBuckets; i++) {
      const expectedPct = (expectedCounts[i] / baselineTotal) || epsilon;
      const actualPct = (actualCounts[i] / currentTotal) || epsilon;

      const bucketPSI = (actualPct - expectedPct) * Math.log(actualPct / expectedPct);
      totalPSI += bucketPSI;

      bucketDetails.push({
        bucketIndex: i,
        range: [Number((minVal + i * bucketWidth).toFixed(4)), Number((minVal + (i + 1) * bucketWidth).toFixed(4))],
        expectedPct: Number(expectedPct.toFixed(4)),
        actualPct: Number(actualPct.toFixed(4)),
        psi: Number(bucketPSI.toFixed(6))
      });
    }

    totalPSI = Number(totalPSI.toFixed(4));

    let status = "STABLE";
    let action = "NONE";

    if (totalPSI >= 0.25) {
      status = "SIGNIFICANT_DRIFT";
      action = "DEMOTE_TO_DEGRADED";
    } else if (totalPSI >= 0.10) {
      status = "MODERATE_DRIFT";
      action = "MONITOR_CLOSELY";
    }

    return Object.freeze({
      psi: totalPSI,
      status,
      action,
      numBuckets,
      sampleSizes: { baseline: baselineTotal, current: currentTotal },
      buckets: bucketDetails
    });
  }

  /**
   * Evaluates feature drift across a dictionary of features for a model.
   * If any critical feature exceeds PSI >= 0.25, recommends model status transition.
   * @param {string} modelId
   * @param {Record<string, number[]>} baselineFeatures - e.g. { "vpin": [...], "hurst": [...] }
   * @param {Record<string, number[]>} currentFeatures - e.g. { "vpin": [...], "hurst": [...] }
   * @returns {Object} Comprehensive model drift diagnosis
   */
  static evaluateModelFeatures(modelId, baselineFeatures, currentFeatures) {
    const featureNames = Object.keys(baselineFeatures);
    const results = {};
    let maxPSI = 0;
    let worstFeature = null;
    let severeDriftCount = 0;

    for (const name of featureNames) {
      if (currentFeatures[name]) {
        const report = this.computePSI(baselineFeatures[name], currentFeatures[name]);
        results[name] = report;
        if (report.psi > maxPSI) {
          maxPSI = report.psi;
          worstFeature = name;
        }
        if (report.psi >= 0.25) {
          severeDriftCount++;
        }
      }
    }

    const driftDetected = severeDriftCount > 0;
    const recommendedStatus = driftDetected ? "DEGRADED" : "HEALTHY";

    return Object.freeze({
      modelId,
      driftDetected,
      recommendedStatus,
      maxPSI,
      worstFeature,
      severeDriftCount,
      evaluatedAt: Date.now(),
      features: results
    });
  }
}
