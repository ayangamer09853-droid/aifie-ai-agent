/**
 * Source Quality Scoring & Automated Quarantine Engine v100.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Mandated by Ayan Solanki:
 * "Don't add more repositories yet. Quality > Quantity.
 * Give every source a measurable Source Quality Score:
 * Source Score = Accuracy (30%) + Freshness (20%) + Reliability (20%) + Uniqueness (15%) + Maintenance (15%).
 * Then automatically quarantine poor-performing sources (Score < 60)."
 */

import { EXTENDED_SOURCE_REPOSITORIES } from "./extended-sources-universe.mjs";

const MIN_ACCEPTABLE_SOURCE_SCORE = 60;

class SourceQualityEvaluator {
  constructor() {
    this.sourceScores = new Map();
    this.quarantinedSources = new Set();
    this.auditLog = [];

    // Initialize scoring for all 36 extended sources + baseline
    this.initializeScores();
  }

  initializeScores() {
    for (const s of EXTENDED_SOURCE_REPOSITORIES) {
      this.evaluateSource(s.repository, {
        accuracy: 85,
        freshness: 90,
        reliability: 88,
        uniqueness: 80,
        maintenance: 85
      });
    }
  }

  /**
   * Evaluates a source repository across the 5 quantitative pillars
   */
  evaluateSource(repoName, {
    accuracy = 80,
    freshness = 85,
    reliability = 85,
    uniqueness = 75,
    maintenance = 80,
    notes = "Periodic automated audit"
  } = {}) {
    const cleanRepo = String(repoName || "").trim();

    // Weighted composite score
    const scoreAccuracy = Math.max(0, Math.min(100, Number(accuracy))) * 0.30;
    const scoreFreshness = Math.max(0, Math.min(100, Number(freshness))) * 0.20;
    const scoreReliability = Math.max(0, Math.min(100, Number(reliability))) * 0.20;
    const scoreUniqueness = Math.max(0, Math.min(100, Number(uniqueness))) * 0.15;
    const scoreMaintenance = Math.max(0, Math.min(100, Number(maintenance))) * 0.15;

    const totalScore = Math.round(scoreAccuracy + scoreFreshness + scoreReliability + scoreUniqueness + scoreMaintenance);
    const isQuarantined = totalScore < MIN_ACCEPTABLE_SOURCE_SCORE;

    if (isQuarantined && !this.quarantinedSources.has(cleanRepo)) {
      this.quarantinedSources.add(cleanRepo);
      this.auditLog.push(`[QUARANTINED] Source ${cleanRepo} scored ${totalScore} < ${MIN_ACCEPTABLE_SOURCE_SCORE}`);
    } else if (!isQuarantined && this.quarantinedSources.has(cleanRepo)) {
      this.quarantinedSources.delete(cleanRepo);
      this.auditLog.push(`[RESTORED] Source ${cleanRepo} recovered to score ${totalScore}`);
    }

    const record = {
      repository: cleanRepo,
      totalScore,
      isQuarantined,
      grade: totalScore >= 85 ? "GRADE_A_PRIME" : totalScore >= 70 ? "GRADE_B_STANDARD" : totalScore >= 60 ? "GRADE_C_PROBATIONARY" : "GRADE_F_QUARANTINED",
      breakdown: {
        accuracy: Number(accuracy),
        freshness: Number(freshness),
        reliability: Number(reliability),
        uniqueness: Number(uniqueness),
        maintenance: Number(maintenance)
      },
      notes,
      updatedAt: new Date().toISOString()
    };

    this.sourceScores.set(cleanRepo, record);
    return record;
  }

  isSourceQuarantined(repoName) {
    const s = String(repoName || "").trim();
    return this.quarantinedSources.has(s);
  }

  getStatus() {
    const all = Array.from(this.sourceScores.values());
    const quarantined = all.filter(s => s.isQuarantined);
    const healthy = all.filter(s => !s.isQuarantined);

    let sumScore = 0;
    for (const s of all) sumScore += s.totalScore;
    const avgScore = all.length > 0 ? Number((sumScore / all.length).toFixed(1)) : 0;

    return {
      evaluatorStatus: "SOURCE_QUALITY_EVALUATOR_ONLINE",
      totalSourcesMonitored: all.length,
      averageQualityScore: avgScore,
      healthySourcesCount: healthy.length,
      quarantinedSourcesCount: quarantined.length,
      quarantinedList: quarantined.map(q => ({ repository: q.repository, score: q.totalScore })),
      minAcceptableScore: MIN_ACCEPTABLE_SOURCE_SCORE,
      recentAuditLog: this.auditLog.slice(-5),
      timestamp: new Date().toISOString()
    };
  }
}

// Global Singleton Instance
export const sourceQualityEvaluator = new SourceQualityEvaluator();

export function evaluateSourceQuality(repo, metrics) {
  return sourceQualityEvaluator.evaluateSource(repo, metrics);
}

export function isSourceEligibleForConsensus(repo) {
  return !sourceQualityEvaluator.isSourceQuarantined(repo);
}

export function getSourceQualityStatus() {
  return sourceQualityEvaluator.getStatus();
}
