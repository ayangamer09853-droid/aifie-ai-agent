/**
 * AIFIE Revenue Agent - Zero-Capital Practical Growth Highway
 * Practical progression from ₹0:
 * Lead Generation ➔ Website/AI Services ➔ Monthly Retainers ➔ Micro-SaaS ➔ High-Leverage Assets
 * Zero external dependencies. Pure Node.js ESM.
 */

export const GROWTH_MILESTONES = {
  STAGE_1_LEAD_GEN: {
    stage: 1,
    id: "STAGE_1_LEAD_GEN",
    name: "Lead Generation & Outbound Prospecting",
    capitalRequirementInr: 0,
    targetRevenueInr: 25000,
    description: "Start with ₹0. Trade skills, curiosity, and research time to provide verified prospect lists and appointment setting for local businesses.",
    recommendedOfferingIds: [11, 12, 14, 15]
  },
  STAGE_2_SERVICES: {
    stage: 2,
    id: "STAGE_2_SERVICES",
    name: "Turnkey AI & Website Automation Services",
    capitalRequirementInr: 5000, // Reinvested from Stage 1
    targetRevenueInr: 100000,
    description: "Deploy high-margin services: small business AI websites, chatbot setup, copywriting, and SEO audits.",
    recommendedOfferingIds: [1, 2, 3, 6, 9, 10]
  },
  STAGE_3_RETAINERS: {
    stage: 3,
    id: "STAGE_3_RETAINERS",
    name: "Monthly Client Retainers (MRR Stabilization)",
    capitalRequirementInr: 15000, // Reinvested from Stage 2
    targetRevenueInr: 250000,
    description: "Convert one-off service clients into recurring monthly retainers (continuous SEO, social management, chatbot maintenance, AgriTech advisory).",
    recommendedOfferingIds: [23, 24, 26, 27, 28, 30]
  },
  STAGE_4_MICRO_SAAS: {
    stage: 4,
    id: "STAGE_4_MICRO_SAAS",
    name: "Productized Micro-SaaS & Automation Tools",
    capitalRequirementInr: 35000, // Reinvested from Stage 3
    targetRevenueInr: 500000,
    description: "Deploy self-hosted micro-tools: invoicing platforms, CRM automation pipelines, and WhatsApp business bots with zero marginal delivery cost.",
    recommendedOfferingIds: [34, 35, 36, 37, 38]
  },
  STAGE_5_ASSETS_APIS: {
    stage: 5,
    id: "STAGE_5_ASSETS_APIS",
    name: "High-Leverage Subscription Assets & Public APIs",
    capitalRequirementInr: 75000, // Reinvested from Stage 4
    targetRevenueInr: 1000000,
    description: "Compound into digital assets: niche media websites with programmatic ads, specialized professional copilots, and metered usage APIs.",
    recommendedOfferingIds: [49, 50, 51, 52, 53]
  }
};

export class ZeroCapitalGrowthPath {
  constructor(currentCumulativeRevenueInr = 0) {
    this.currentRevenueInr = currentCumulativeRevenueInr;
    this.completedMilestones = [];
    this.currentMilestone = this.evaluateCurrentMilestone(currentCumulativeRevenueInr);
  }

  updateRevenue(revenueInr) {
    this.currentRevenueInr = revenueInr;
    this.currentMilestone = this.evaluateCurrentMilestone(revenueInr);
    return this.getStatus();
  }

  evaluateCurrentMilestone(revenueInr) {
    if (revenueInr < 25000) return GROWTH_MILESTONES.STAGE_1_LEAD_GEN;
    if (revenueInr < 100000) return GROWTH_MILESTONES.STAGE_2_SERVICES;
    if (revenueInr < 250000) return GROWTH_MILESTONES.STAGE_3_RETAINERS;
    if (revenueInr < 500000) return GROWTH_MILESTONES.STAGE_4_MICRO_SAAS;
    return GROWTH_MILESTONES.STAGE_5_ASSETS_APIS;
  }

  getStatus() {
    const current = this.currentMilestone;
    const progressPercent = Math.min(100, Number(((this.currentRevenueInr / current.targetRevenueInr) * 100).toFixed(1)));

    return {
      currentRevenueInr: this.currentRevenueInr,
      currentMilestoneStage: current.stage,
      milestoneName: current.name,
      description: current.description,
      targetRevenueInr: current.targetRevenueInr,
      progressPercent: `${progressPercent}%`,
      recommendedOfferingIds: current.recommendedOfferingIds,
      allMilestones: Object.values(GROWTH_MILESTONES)
    };
  }
}
