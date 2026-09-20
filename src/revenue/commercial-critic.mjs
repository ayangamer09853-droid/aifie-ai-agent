/**
 * AIFIE AUTONOMOUS BUSINESS EMPIRE - BREAKTHROUGH INNOVATION 2:
 * Commercial Adversarial Critic & Dual-Helix Falsifier
 * 
 * Fuses quantitative falsification rigor (inspired by quant PBO & regime stress-testing)
 * into commercial business ventures, digital products, and marketing campaigns.
 * 
 * Zero external dependencies. Pure Node.js ESM built-ins.
 */

export const FALSIFICATION_VERDICT = {
  PASS_ROBUST: "PASS_ROBUST",
  WARN_CONCERNS: "WARN_CONCERNS",
  REJECT_FRAGILE: "REJECT_FRAGILE"
};

export class CommercialCriticAgent {
  constructor() {
    this.name = "Commercial Adversarial Critic";
    this.role = "Adversarial Stress-Testing, Falsification & Anti-Fragility Verification";
    this.falsificationHistory = [];
  }

  /**
   * Rigorously stress-tests a commercial proposal across 4 adversarial vectors:
   * 1. Market Saturation Stress-Test
   * 2. CAC/LTV Decay Falsification
   * 3. Fulfillment Bottleneck Detection
   * 4. Regulatory & Policy Vulnerability Probe
   */
  falsifyProposal(proposal = {}, marketContext = {}) {
    const title = proposal.title || "Unnamed Commercial Action";
    const expectedRevenueInr = Number(proposal.expectedRevenueInr || proposal.priceInr || 0);
    const directCostInr = Number(proposal.costInr || 0);
    const grossMarginPercent = expectedRevenueInr > 0 
      ? Math.round(((expectedRevenueInr - directCostInr) / expectedRevenueInr) * 100)
      : 0;

    const vulnerabilities = [];
    const mitigations = [];

    // VECTOR 1: Market Saturation Stress-Test
    const targetNiche = (proposal.niche || proposal.targetNiche || "").toLowerCase();
    const isOvercrowded = /generic|basic\s+ai|crypto\s+hype|drop\s*shipping|generic\s+content/i.test(targetNiche);
    let saturationPenalty = 0;
    if (isOvercrowded) {
      saturationPenalty = 30;
      vulnerabilities.push("Niche exhibits high market saturation and low differentiation barriers.");
      mitigations.push("Pivot towards hyper-localized verticalization (e.g. AgriTech cooperatives, precision local business automation).");
    }

    // VECTOR 2: CAC/LTV Decay Falsification
    let cacLtvPenalty = 0;
    if (grossMarginPercent < 75) {
      cacLtvPenalty = 25;
      vulnerabilities.push(`Gross profit margin (${grossMarginPercent}%) is below the empire zero-capital target (>=80%).`);
      mitigations.push("Convert manual service steps into reusable digital assets or zero-marginal-cost templates.");
    }
    if (!proposal.isRecurring && expectedRevenueInr < 15000) {
      cacLtvPenalty += 10;
      vulnerabilities.push("Low one-off transaction value without recurring retainer conversion path.");
      mitigations.push("Bundle offering into a monthly maintenance retainer or continuous intelligence subscription.");
    }

    // VECTOR 3: Fulfillment Bottleneck Detection
    let bottleneckPenalty = 0;
    const turnaroundDays = Number(proposal.turnaroundDays || 1);
    if (turnaroundDays > 7 && !proposal.isDigitalAsset) {
      bottleneckPenalty = 20;
      vulnerabilities.push("Turnaround exceeds 7 days, risking client delivery friction and SLA breaches.");
      mitigations.push("Decompose deliverable into automated modular stages utilizing Level-3 parallel execution.");
    }

    // VECTOR 4: Regulatory & Policy Vulnerability Probe
    let compliancePenalty = 0;
    const proposalStr = JSON.stringify(proposal);
    if (/unsolicited|cold\s+blast|mass\s+scrape|guarantee|instant\s+rich/i.test(proposalStr)) {
      compliancePenalty = 45;
      vulnerabilities.push("Proposal borders on aggressive outreach or unrealistic guarantees.");
      mitigations.push("Enforce strict permission-first value engineering and 100% money-back satisfaction terms.");
    }

    // Calculate Adversarial Robustness Score (0 - 100)
    const baseScore = 100;
    const totalDeductions = saturationPenalty + cacLtvPenalty + bottleneckPenalty + compliancePenalty;
    const robustnessScore = Math.max(0, baseScore - totalDeductions);

    let verdict;
    if (robustnessScore >= 75) {
      verdict = FALSIFICATION_VERDICT.PASS_ROBUST;
    } else if (robustnessScore >= 50) {
      verdict = FALSIFICATION_VERDICT.WARN_CONCERNS;
    } else {
      verdict = FALSIFICATION_VERDICT.REJECT_FRAGILE;
    }

    const auditRecord = {
      auditId: `CRITIC-AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      robustnessScore,
      verdict,
      vulnerabilities,
      mitigations,
      dimensions: {
        marketSaturationScore: Math.max(0, 100 - (saturationPenalty * 3.33)),
        unitEconomicsScore: Math.max(0, 100 - (cacLtvPenalty * 2.85)),
        fulfillmentReliabilityScore: Math.max(0, 100 - (bottleneckPenalty * 5)),
        complianceSafetyScore: Math.max(0, 100 - (compliancePenalty * 2.22))
      },
      falsifiedAt: new Date().toISOString()
    };

    this.falsificationHistory.push(auditRecord);
    return auditRecord;
  }

  getAuditSummary() {
    const total = this.falsificationHistory.length;
    const passed = this.falsificationHistory.filter(h => h.verdict === FALSIFICATION_VERDICT.PASS_ROBUST).length;
    const warned = this.falsificationHistory.filter(h => h.verdict === FALSIFICATION_VERDICT.WARN_CONCERNS).length;
    const rejected = this.falsificationHistory.filter(h => h.verdict === FALSIFICATION_VERDICT.REJECT_FRAGILE).length;

    return {
      totalAudits: total,
      passedRobust: passed,
      warnedConcerns: warned,
      rejectedFragile: rejected,
      robustnessRate: total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : "100.0%",
      latestAudit: this.falsificationHistory[this.falsificationHistory.length - 1] || null
    };
  }
}
