/**
 * Real-Time Feature Drift & Data Distribution Sentinel v1.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Quantitative Statistical Drift Detectors:
 * 1. Two-Sample Kolmogorov-Smirnov (K-S) Non-Parametric Statistic ($D_{KS} = \sup_x |F_1(x) - F_2(x)|$).
 * 2. Population Stability Index (PSI = \sum (Actual% - Expected%) \times \ln(Actual% / Expected%)).
 * 3. 1D Wasserstein / Earth Mover's Distance ($W_1(P, Q)$).
 * 4. Real-Time Feature Quarantine & Alpha Weight Attenuation.
 */

export class FeatureDriftSentinel {
  constructor(options = {}) {
    this.psiThreshold = options.psiThreshold || 0.25; // PSI > 0.25 indicates significant shift
    this.ksThreshold = options.ksThreshold || 0.15; // KS statistic threshold
    this.monitoredFeatures = new Map(); // featureName -> { baseline: [], window: [], status }
    this.quarantinedFeatures = new Set();
    this.driftAuditHistory = [];
  }

  /**
   * Registers or updates reference baseline for a quantitative feature
   */
  setFeatureBaseline(featureName, values = []) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("Baseline values must be a non-empty array of numbers");
    }
    const clean = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    this.monitoredFeatures.set(featureName, {
      baseline: clean,
      recentWindow: [],
      lastAudit: null,
      isQuarantined: false
    });
    return {
      feature: featureName,
      baselineSamples: clean.length,
      status: "BASELINE_REGISTERED"
    };
  }

  /**
   * Ingests real-time streaming observations for a feature
   */
  recordObservation(featureName, value) {
    if (!this.monitoredFeatures.has(featureName)) {
      this.setFeatureBaseline(featureName, [Number(value) || 0]);
    }
    const record = this.monitoredFeatures.get(featureName);
    record.recentWindow.push(Number(value));
    if (record.recentWindow.length > 500) record.recentWindow.shift();
  }

  /**
   * Computes Two-Sample Kolmogorov-Smirnov (K-S) Statistic
   * @param {number[]} sample1 - sorted array
   * @param {number[]} sample2 - sorted array
   */
  calculateKsStatistic(sample1, sample2) {
    const s1 = [...sample1].sort((a, b) => a - b);
    const s2 = [...sample2].sort((a, b) => a - b);
    const n1 = s1.length;
    const n2 = s2.length;

    if (n1 === 0 || n2 === 0) return { statistic: 0, isDriftDetected: false };

    let i1 = 0;
    let i2 = 0;
    let maxDiff = 0;

    while (i1 < n1 && i2 < n2) {
      const v1 = s1[i1];
      const v2 = s2[i2];
      const val = Math.min(v1, v2);

      while (i1 < n1 && s1[i1] <= val) i1++;
      while (i2 < n2 && s2[i2] <= val) i2++;

      const cdf1 = i1 / n1;
      const cdf2 = i2 / n2;
      const diff = Math.abs(cdf1 - cdf2);
      if (diff > maxDiff) maxDiff = diff;
    }

    const statistic = Number(maxDiff.toFixed(4));
    // Asymptotic Critical value at alpha = 0.05 is 1.36 * sqrt((n1 + n2) / (n1 * n2))
    const criticalValue = Math.min(0.85, Math.max(this.ksThreshold, Number((1.36 * Math.sqrt((n1 + n2) / (n1 * n2))).toFixed(4))));
    return {
      statistic,
      criticalValue,
      isDriftDetected: statistic >= criticalValue,
      threshold: this.ksThreshold
    };
  }

  /**
   * Computes Population Stability Index (PSI) with 10 quantiles
   */
  calculatePsi(baseline, actual) {
    if (baseline.length === 0 || actual.length === 0) {
      return { psi: 0, driftStatus: "NO_DATA" };
    }

    const sortedBase = [...baseline].sort((a, b) => a - b);
    const numBins = Math.min(10, Math.max(3, Math.floor(sortedBase.length / 5)));
    const quantiles = [];
    for (let i = 1; i < numBins; i++) {
      const idx = Math.floor((i / numBins) * sortedBase.length);
      quantiles.push(sortedBase[idx]);
    }

    // Helper to count distribution in bins
    const getCounts = (arr) => {
      const counts = new Array(numBins).fill(0);
      for (const v of arr) {
        let placed = false;
        for (let b = 0; b < quantiles.length; b++) {
          if (v <= quantiles[b]) {
            counts[b]++;
            placed = true;
            break;
          }
        }
        if (!placed) counts[numBins - 1]++;
      }
      return counts;
    };

    const baseCounts = getCounts(sortedBase);
    const actCounts = getCounts(actual);

    let psi = 0;
    for (let i = 0; i < numBins; i++) {
      const basePct = (baseCounts[i] + 1) / (sortedBase.length + numBins);
      const actPct = (actCounts[i] + 1) / (actual.length + numBins);
      psi += (actPct - basePct) * Math.log(actPct / basePct);
    }

    const roundedPsi = Number(Math.max(0, psi).toFixed(4));
    let driftStatus = "NO_DRIFT";
    if (roundedPsi >= this.psiThreshold) driftStatus = "SIGNIFICANT_DRIFT_ACTION_REQUIRED";
    else if (roundedPsi >= 0.10) driftStatus = "MODERATE_DRIFT_WARNING";

    return {
      psi: roundedPsi,
      driftStatus,
      threshold: this.psiThreshold
    };
  }

  /**
   * Computes 1D Wasserstein / Earth Mover's Distance
   */
  calculateWassersteinDistance(sample1, sample2) {
    const s1 = [...sample1].sort((a, b) => a - b);
    const s2 = [...sample2].sort((a, b) => a - b);
    const n = Math.min(s1.length, s2.length);
    if (n === 0) return 0;

    let totalDist = 0;
    for (let i = 0; i < n; i++) {
      totalDist += Math.abs(s1[Math.floor((i / n) * s1.length)] - s2[Math.floor((i / n) * s2.length)]);
    }
    return Number((totalDist / n).toFixed(4));
  }

  /**
   * Audits a feature against its reference baseline
   */
  auditFeature(featureName, recentSamples = null) {
    if (!this.monitoredFeatures.has(featureName)) {
      throw new Error(`Feature '${featureName}' is not registered in drift sentinel`);
    }

    const record = this.monitoredFeatures.get(featureName);
    const window = recentSamples && Array.isArray(recentSamples) ? recentSamples : record.recentWindow;

    if (window.length < 5) {
      return {
        feature: featureName,
        status: "INSUFFICIENT_SAMPLES",
        sampleCount: window.length,
        isQuarantined: record.isQuarantined
      };
    }

    const ks = this.calculateKsStatistic(record.baseline, window);
    const psi = this.calculatePsi(record.baseline, window);
    const emd = this.calculateWassersteinDistance(record.baseline, window);

    const isBreached = ks.isDriftDetected || psi.driftStatus === "SIGNIFICANT_DRIFT_ACTION_REQUIRED";

    if (isBreached) {
      record.isQuarantined = true;
      this.quarantinedFeatures.add(featureName);
    } else {
      record.isQuarantined = false;
      this.quarantinedFeatures.delete(featureName);
    }

    const auditResult = {
      feature: featureName,
      ksStatistic: ks.statistic,
      psiScore: psi.psi,
      wassersteinDistance: emd,
      driftStatus: psi.driftStatus,
      isQuarantined: record.isQuarantined,
      recommendedAction: record.isQuarantined ? "QUARANTINE_AND_RECALIBRATE_MODEL" : "MAINTAIN_CURRENT_WEIGHT",
      sampleCount: window.length,
      timestamp: new Date().toISOString()
    };

    record.lastAudit = auditResult;
    this.driftAuditHistory.unshift(auditResult);
    if (this.driftAuditHistory.length > 200) this.driftAuditHistory.pop();

    return auditResult;
  }

  /**
   * Returns comprehensive system drift report across all registered features
   */
  getDriftReport() {
    const features = [];
    for (const [name, data] of this.monitoredFeatures.entries()) {
      features.push({
        name,
        baselineSize: data.baseline.length,
        recentWindowSize: data.recentWindow.length,
        isQuarantined: data.isQuarantined,
        lastAudit: data.lastAudit
      });
    }

    return {
      status: "FEATURE_DRIFT_SENTINEL_ONLINE",
      totalMonitoredFeatures: this.monitoredFeatures.size,
      totalQuarantined: this.quarantinedFeatures.size,
      quarantinedFeatureList: Array.from(this.quarantinedFeatures),
      features,
      timestamp: new Date().toISOString()
    };
  }
}

// Global Singleton Instance
export const featureDriftSentinel = new FeatureDriftSentinel();
