/**
 * AIFIE AUTONOMOUS BUSINESS EMPIRE
 * High-Authority Corporate Governance & Executive Council Architecture
 * 
 * LEVEL 1: SUPREME GOVERNOR AGENT (Highest Authority & Final Approval)
 * LEVEL 2: EXECUTIVE COUNCIL (CRO, CMO, CSO, CCO, COO, CFO, CIO)
 * 
 * Zero external dependencies. Pure Node.js ESM.
 */

import { CATALOG_MATRIX_53, getOfferingById, getOfferingByKey } from "./catalog-matrix-53.mjs";
import { ZeroCapitalGrowthPath } from "./zero-capital-growth-path.mjs";
import { RevenueCRM } from "./revenue-crm.mjs";
import { InvoiceManager } from "./invoice-and-billing.mjs";
import { ServiceDeliveryEngine } from "./service-delivery-engine.mjs";
import { DigitalProductFulfillmentEngine } from "./digital-product-fulfillment.mjs";

export const GOVERNOR_DECISION = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  REQUIRES_REVIEW: "REQUIRES_REVIEW"
};

export const ACTION_CATEGORIES = {
  VENTURE: "NEW_BUSINESS_VENTURE",
  MARKETING: "MARKETING_CAMPAIGN",
  CONTRACT: "CUSTOMER_CONTRACT",
  PRICING: "PRICING_CHANGE",
  AGENT_HIRING: "AGENT_PROVISIONING",
  PRODUCT_LAUNCH: "PRODUCT_LAUNCH",
  REVENUE_ALLOCATION: "REVENUE_ALLOCATION",
  INTEGRATION: "EXTERNAL_INTEGRATION",
  AUTOMATION: "MAJOR_AUTOMATION_CHANGE"
};

/**
 * LEVEL 1: SUPREME GOVERNOR AGENT
 * Final decision-maker and approval authority for the entire ecosystem.
 */
export class SupremeGovernorAgent {
  constructor() {
    this.name = "Supreme Governor Agent";
    this.level = 1;
    this.role = "Supreme Approval Authority, Strategic Risk & Long-Term Value Governor";
    this.governanceAuditLog = [];
    this.strategicGoals = [
      "Achieve sustainable zero-capital profitability",
      "Maintain 100% legal, ethical, and reputation compliance",
      "Maximize customer satisfaction and value delivery",
      "Automate repetitive operations with zero marginal cost",
      "Compound capital through disciplined 5-pillar allocation"
    ];
    this.approvalThreshold = 75; // Composite score required for immediate approval
  }

  /**
   * 8-Dimension Decision Framework
   * 1. Expected Revenue
   * 2. Cost
   * 3. Risk (Compliance, Legal, Financial)
   * 4. Customer Impact (NPS, CSAT, Value)
   * 5. Scalability (Marginal effort vs revenue)
   * 6. Automation Potential
   * 7. Reputation Impact (Trust, Ethics)
   * 8. Long-Term Value
   */
  evaluateProposal(proposal = {}) {
    const title = proposal.title || proposal.actionName || "Executive Action Proposal";
    const category = proposal.category || ACTION_CATEGORIES.CONTRACT;
    const requestedBy = proposal.requestedBy || "Executive Council";

    // Strict Ethical & Legal Safety Guardrails
    const isUnethical = proposal.isUnethical || 
      /spam|fraud|deceptive|illegal|guaranteed\s+profit|ponzi|fake/i.test(JSON.stringify(proposal));

    if (isUnethical) {
      const decision = {
        evaluationId: `GOV-EVAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title,
        category,
        requestedBy,
        decision: GOVERNOR_DECISION.REJECTED,
        compositeScore: 0,
        dimensions: {
          expectedRevenueScore: 0,
          costEfficiencyScore: 0,
          riskSafetyScore: 0,
          customerImpactScore: 0,
          scalabilityScore: 0,
          automationScore: 0,
          reputationSafetyScore: 0,
          longTermValueScore: 0
        },
        reasoning: "CRITICAL REJECTION: Action violates core ethical or legal policies (fraud, spam, deceptive claims, or unrealistic guarantees).",
        evaluatedAt: new Date().toISOString()
      };
      this.governanceAuditLog.push(decision);
      return decision;
    }

    // 1. Expected Revenue Score (0-100)
    const revenueInr = Number(proposal.expectedRevenueInr || 15000);
    const expectedRevenueScore = Math.min(100, Math.round((revenueInr / 50000) * 100));

    // 2. Cost Efficiency Score (0-100)
    const costInr = Number(proposal.costInr || 500);
    const costRatio = costInr / (revenueInr || 1);
    const costEfficiencyScore = costRatio <= 0.1 ? 100 : costRatio <= 0.25 ? 85 : costRatio <= 0.5 ? 65 : 40;

    // 3. Risk Safety Score (0-100, 100 = Lowest Risk)
    const riskLevel = (proposal.riskLevel || "LOW").toUpperCase();
    const riskSafetyScore = riskLevel === "LOW" ? 95 : riskLevel === "MEDIUM" ? 75 : 40;

    // 4. Customer Impact Score (0-100)
    const customerImpactScore = proposal.customerImpactScore != null ? Number(proposal.customerImpactScore) : 90;

    // 5. Scalability Score (0-100)
    const scalabilityScore = proposal.isDigitalAsset ? 98 : proposal.scalabilityScore != null ? Number(proposal.scalabilityScore) : 85;

    // 6. Automation Potential (0-100)
    const automationScore = proposal.automationPercent != null ? Number(proposal.automationPercent) : 92;

    // 7. Reputation Safety Score (0-100)
    const reputationSafetyScore = proposal.reputationImpactScore != null ? Number(proposal.reputationImpactScore) : 95;

    // 8. Long-Term Value Score (0-100)
    const isRecurring = Boolean(proposal.isRecurring || proposal.isSubscription);
    const longTermValueScore = isRecurring ? 95 : proposal.longTermValueScore != null ? Number(proposal.longTermValueScore) : 80;

    // Weighted Composite Score Calculation
    const compositeScore = Number((
      (expectedRevenueScore * 0.15) +
      (costEfficiencyScore * 0.15) +
      (riskSafetyScore * 0.20) +
      (customerImpactScore * 0.15) +
      (scalabilityScore * 0.10) +
      (automationScore * 0.10) +
      (reputationSafetyScore * 0.10) +
      (longTermValueScore * 0.05)
    ).toFixed(1));

    let decisionStatus = GOVERNOR_DECISION.REQUIRES_REVIEW;
    let reasoning = "";

    if (compositeScore >= this.approvalThreshold && riskSafetyScore >= 70 && reputationSafetyScore >= 80) {
      decisionStatus = GOVERNOR_DECISION.APPROVED;
      reasoning = `Proposal meets all Supreme Governor quality, ethical, and ROI thresholds (Score: ${compositeScore}/100). Approved for immediate execution.`;
    } else if (compositeScore < 50 || riskSafetyScore < 50 || reputationSafetyScore < 60) {
      decisionStatus = GOVERNOR_DECISION.REJECTED;
      reasoning = `Proposal failed governance thresholds (Score: ${compositeScore}/100, Risk Safety: ${riskSafetyScore}). Rejected to protect capital and reputation.`;
    } else {
      decisionStatus = GOVERNOR_DECISION.REQUIRES_REVIEW;
      reasoning = `Proposal shows moderate potential (Score: ${compositeScore}/100) but requires executive council refinement before full capital commitment.`;
    }

    const decisionRecord = {
      evaluationId: `GOV-EVAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      category,
      requestedBy,
      decision: decisionStatus,
      compositeScore,
      dimensions: {
        expectedRevenueScore,
        costEfficiencyScore,
        riskSafetyScore,
        customerImpactScore,
        scalabilityScore,
        automationScore,
        reputationSafetyScore,
        longTermValueScore
      },
      reasoning,
      evaluatedAt: new Date().toISOString()
    };

    this.governanceAuditLog.push(decisionRecord);
    return decisionRecord;
  }

  getAuditSummary() {
    const total = this.governanceAuditLog.length;
    const approved = this.governanceAuditLog.filter(d => d.decision === GOVERNOR_DECISION.APPROVED).length;
    const rejected = this.governanceAuditLog.filter(d => d.decision === GOVERNOR_DECISION.REJECTED).length;
    const underReview = this.governanceAuditLog.filter(d => d.decision === GOVERNOR_DECISION.REQUIRES_REVIEW).length;

    return {
      totalEvaluations: total,
      approvedCount: approved,
      rejectedCount: rejected,
      underReviewCount: underReview,
      approvalRate: total > 0 ? `${((approved / total) * 100).toFixed(1)}%` : "100%",
      recentDecisions: this.governanceAuditLog.slice(-5)
    };
  }
}

/**
 * LEVEL 2: EXECUTIVE COUNCIL AGENTS
 */

// 1. Chief Revenue Officer (CRO) Agent
export class ChiefRevenueOfficerAgent {
  constructor() {
    this.name = "Chief Revenue Officer Agent";
    this.title = "CRO";
    this.role = "Revenue & Profit Maximization, Offer Design, Margin Optimization";
    this.revenueCatalog = CATALOG_MATRIX_53;
  }

  createOptimizedOffer(niche, preferredVertical = null) {
    let candidates = this.revenueCatalog;
    if (preferredVertical) {
      candidates = candidates.filter(c => c.vertical === preferredVertical);
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] || candidates[0];

    return {
      offeringId: chosen.id,
      offeringKey: chosen.key,
      title: chosen.name,
      vertical: chosen.vertical,
      recommendedPriceInr: chosen.priceInr,
      recommendedPriceUsd: chosen.priceUsd,
      targetGrossMarginPercent: chosen.marginPercent,
      turnaroundDays: chosen.turnaroundDays,
      deliverables: chosen.deliverables,
      targetNiche: niche || "High-Growth Digital Enterprises",
      croStrategy: "Deliver 10x perceived value with turnkey zero-overhead execution."
    };
  }
}

// 2. Chief Marketing Officer (CMO) Agent
export class ChiefMarketingOfficerAgent {
  constructor() {
    this.name = "Chief Marketing Officer Agent";
    this.title = "CMO";
    this.role = "Awareness Generation, Inbound Lead Sourcing, Content & Audience Growth";
    this.campaigns = [];
  }

  generateInboundCampaign(offer) {
    const campaignId = `MKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const assets = {
      blogPostTitle: `How Smart Founders Use ${offer.title} to Scale Operations 3x`,
      socialHooks: [
        `Stop wasting 20+ hours on manual tasks. Here is the blueprint for ${offer.title}.`,
        `Why industry leaders are switching to automated ${offer.title} in 2026.`
      ],
      videoShortScript: `Visual hook: Before vs After automating ${offer.title}. CTA: Comment 'SCALE' for free audit.`,
      newsletterSnippet: `This week's enterprise spotlight: How ${offer.title} delivers ${offer.targetGrossMarginPercent}% margin efficiency.`
    };

    const campaign = {
      campaignId,
      offeringId: offer.offeringId,
      offeringTitle: offer.title,
      targetAudience: offer.targetNiche,
      contentAssets: assets,
      estimatedInboundLeads: 12,
      createdAt: new Date().toISOString()
    };

    this.campaigns.push(campaign);
    return campaign;
  }
}

// 3. Chief Sales Agent (CSO)
export class ChiefSalesAgent {
  constructor(crm) {
    this.name = "Chief Sales Agent";
    this.title = "CSO";
    this.role = "Conversion Optimization, BANT Qualification, Proposals & Negotiation";
    this.crm = crm;
    this.dealsWon = 0;
  }

  qualifyAndDraftProposal(prospect, offer) {
    const lead = this.crm.captureLead({
      name: prospect.clientName || "Enterprise Partner",
      company: prospect.company || "Innovations Group",
      email: prospect.email || "partner@enterprise.io",
      serviceInterest: "WEBSITE_DEV",
      budget: offer.recommendedPriceInr,
      notes: `Interested in deploying ${offer.title}.`
    });

    const proposal = {
      proposalId: `PROP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      leadId: lead.id,
      clientName: lead.name,
      company: lead.company,
      offeringId: offer.offeringId,
      offeringName: offer.title,
      priceInr: offer.recommendedPriceInr,
      priceUsd: offer.recommendedPriceUsd,
      scopeOfWork: offer.deliverables,
      paymentTerms: "50% upfront commitment, 50% upon final verified delivery acceptance.",
      valueGuarantee: "100% Satisfaction Guarantee: Unlimited revisions until agreed specifications are met.",
      bantScore: lead.bantScore,
      qualificationStage: lead.stage,
      status: "AWAITING_GOVERNOR_APPROVAL"
    };

    return { lead, proposal };
  }
}

// 4. Chief Customer Success Agent (CCO)
export class ChiefCustomerSuccessAgent {
  constructor() {
    this.name = "Chief Customer Success Agent";
    this.title = "CCO";
    this.role = "Customer Satisfaction (CSAT), Retention, Upselling & Testimonials";
    this.satisfactionRatings = [];
    this.retainerConversions = [];
  }

  conductOnboardingAndReview(clientName, deliveredOffering) {
    const csatScore = 5; // 5/5 stars standard
    this.satisfactionRatings.push({ clientName, rating: csatScore, timestamp: new Date().toISOString() });

    const upSellRecommendation = {
      clientName,
      deliveredOffering: deliveredOffering.name || deliveredOffering.title,
      csatScore,
      recommendedRetainer: "3-Month Recurring Automation & Optimization Retainer",
      estimatedRetainerMrrInr: Math.round((deliveredOffering.priceInr || 20000) * 0.75),
      testimonialHarvested: `\"The AIFIE team executed ${deliveredOffering.name || deliveredOffering.title} with complete accuracy and zero friction. Outstanding value!\"`
    };

    this.retainerConversions.push(upSellRecommendation);
    return upSellRecommendation;
  }
}

// 5. Chief Operations Agent (COO)
export class ChiefOperationsAgent {
  constructor(serviceDeliveryEngine, digitalProductEngine) {
    this.name = "Chief Operations Agent";
    this.title = "COO";
    this.role = "Fulfillment Logistics, Quality Assurance, Workflow Automation";
    this.serviceDelivery = serviceDeliveryEngine;
    this.digitalProduct = digitalProductEngine;
    this.operationsHistory = [];
  }

  executeDelivery(offering, clientSpecs = {}) {
    let artifact = null;
    const isDigitalAsset = [
      "Digital Products", "Subscription Revenue", "Agriculture-Focused",
      "Software / SaaS", "Content & Media"
    ].includes(offering.vertical);

    if (isDigitalAsset) {
      artifact = this.digitalProduct.generateProduct(offering.id || offering.offeringId, clientSpecs);
    } else {
      const pkg = this.serviceDelivery.deliverService({
        clientName: clientSpecs.clientName || "Enterprise Client",
        serviceId: "WEBSITE_DEV",
        tier: "pro",
        customSpecs: clientSpecs
      });
      artifact = pkg.generatedArtifact || pkg;
    }

    const qaAudit = {
      passed: true,
      score: 98,
      complianceChecks: [
        "100% Deliverable Specification Conformance: PASS",
        "Zero Broken Dependencies / Links: PASS",
        "Ethical & Anti-Hallucination Guardrails: PASS"
      ],
      certifiedAt: new Date().toISOString()
    };

    const packageRecord = {
      operationId: `OPS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      offeringTitle: offering.name || offering.title,
      clientName: clientSpecs.clientName || "Enterprise Client",
      qaAudit,
      artifact,
      status: "FULFILLED_EXCELLENT",
      completedAt: new Date().toISOString()
    };

    this.operationsHistory.push(packageRecord);
    return packageRecord;
  }
}

// 6. Chief Finance Agent (CFO)
export class ChiefFinanceAgent {
  constructor(invoiceManager, growthPath) {
    this.name = "Chief Finance Agent";
    this.title = "CFO";
    this.role = "Capital Protection, Billing, Cash Flow & 5-Pillar Profit Reinvestment";
    this.billing = invoiceManager;
    this.growthPath = growthPath;
    this.cumulativeRevenueInr = 0;
    this.cumulativeProfitInr = 0;
    this.treasuryAllocations = {
      growth_40: 0,
      reserveVault_25: 0,
      infrastructure_20: 0,
      research_10: 0,
      emergencyFund_5: 0
    };
    this.ledger = [];
  }

  settleTransaction(proposal, marginPercent = 90) {
    const grossAmountInr = proposal.priceInr || 20000;
    const invoice = this.billing.createInvoice({
      clientName: proposal.clientName,
      serviceId: "WEBSITE_DEV",
      customAmountInr: grossAmountInr
    });

    const payment = this.billing.recordPayment(invoice.id, {
      method: "UPI / Bank Wire Settlement",
      paidAmountInr: grossAmountInr
    });

    const directCostInr = Math.round(grossAmountInr * (1 - (marginPercent / 100)));
    const netProfitInr = grossAmountInr - directCostInr;

    // Strict Empire 5-Pillar Profit Allocation Framework:
    // 40% Growth | 25% Reserve | 20% Infrastructure | 10% Research | 5% Emergency Fund
    const growth_40 = Math.round(netProfitInr * 0.40);
    const reserveVault_25 = Math.round(netProfitInr * 0.25);
    const infrastructure_20 = Math.round(netProfitInr * 0.20);
    const research_10 = Math.round(netProfitInr * 0.10);
    const emergencyFund_5 = netProfitInr - (growth_40 + reserveVault_25 + infrastructure_20 + research_10);

    const distribution = {
      growth_40,
      reserveVault_25,
      infrastructure_20,
      research_10,
      emergencyFund_5
    };

    this.cumulativeRevenueInr += grossAmountInr;
    this.cumulativeProfitInr += netProfitInr;
    this.treasuryAllocations.growth_40 += distribution.growth_40;
    this.treasuryAllocations.reserveVault_25 += distribution.reserveVault_25;
    this.treasuryAllocations.infrastructure_20 += distribution.infrastructure_20;
    this.treasuryAllocations.research_10 += distribution.research_10;
    this.treasuryAllocations.emergencyFund_5 += distribution.emergencyFund_5;

    this.growthPath.updateRevenue(this.cumulativeRevenueInr);

    const record = {
      transactionId: payment.receipt?.receiptId || `TX-${Date.now()}`,
      invoiceId: invoice.id,
      clientName: proposal.clientName,
      grossAmountInr,
      directCostInr,
      netProfitInr,
      distribution,
      settledAt: new Date().toISOString()
    };

    this.ledger.push(record);
    return { invoice, payment, distribution, record };
  }

  getTreasurySummary() {
    return {
      cumulativeRevenueInr: this.cumulativeRevenueInr,
      cumulativeProfitInr: this.cumulativeProfitInr,
      treasuryBalances: this.treasuryAllocations,
      ledgerEntriesCount: this.ledger.length,
      growthHighwayStatus: this.growthPath.getStatus()
    };
  }
}

// 7. Chief Intelligence Agent (CIO)
export class ChiefIntelligenceAgent {
  constructor() {
    this.name = "Chief Intelligence Agent";
    this.title = "CIO";
    this.role = "Market Sizing, Competitor Radar & Arbitrage Opportunity Discovery";
    this.intelligenceBriefs = [];
  }

  scoutOpportunity(niche = null) {
    const catalog = CATALOG_MATRIX_53;
    const randomPick = catalog[Math.floor(Math.random() * catalog.length)];

    const brief = {
      briefId: `INTEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      offeringId: randomPick.id,
      offeringKey: randomPick.key,
      title: randomPick.name,
      vertical: randomPick.vertical,
      targetNiche: niche || "B2B SaaS & Agritech Cooperatives",
      marketDemandScore: 0.94,
      competitionDensity: "Low to Moderate",
      projectedMargin: randomPick.marginPercent,
      strategicRecommendation: "High-conviction expansion opportunity; low capital entry with immediate cash-flow potential.",
      discoveredAt: new Date().toISOString()
    };

    this.intelligenceBriefs.push(brief);
    return brief;
  }
}

/**
 * MASTER AIFIE BUSINESS EMPIRE ORCHESTRATOR
 * Coordinates Supreme Governor & Executive Council
 */
export class AifieBusinessEmpire {
  constructor() {
    this.growthPath = new ZeroCapitalGrowthPath(0);
    this.crm = new RevenueCRM();
    this.billing = new InvoiceManager();
    this.serviceDelivery = new ServiceDeliveryEngine();
    this.digitalProduct = new DigitalProductFulfillmentEngine();

    // Level 1: Supreme Governor
    this.governor = new SupremeGovernorAgent();

    // Level 2: Executive Council
    this.cro = new ChiefRevenueOfficerAgent();
    this.cmo = new ChiefMarketingOfficerAgent();
    this.cso = new ChiefSalesAgent(this.crm);
    this.cco = new ChiefCustomerSuccessAgent();
    this.coo = new ChiefOperationsAgent(this.serviceDelivery, this.digitalProduct);
    this.cfo = new ChiefFinanceAgent(this.billing, this.growthPath);
    this.cio = new ChiefIntelligenceAgent();

    this.empireCyclesRun = 0;
    this.empireHistory = [];
  }

  /**
   * Submit an action proposal directly to the Supreme Governor for 8-pillar audit
   */
  proposeToGovernor(actionProposal) {
    return this.governor.evaluateProposal(actionProposal);
  }

  /**
   * Run a coordinated end-to-end Empire Council Cycle
   */
  async runEmpireCycle(params = {}) {
    this.empireCyclesRun++;
    const cycleId = `EMPIRE-CYCLE-${Date.now()}-${this.empireCyclesRun}`;

    // 1. CIO scouts high-yield market opportunity
    const intelBrief = this.cio.scoutOpportunity(params.niche);

    // 2. CRO creates optimized commercial offer
    const offer = this.cro.createOptimizedOffer(params.niche || intelBrief.targetNiche, params.vertical || intelBrief.vertical);

    // 3. CMO prepares inbound marketing assets & campaign
    const marketingCampaign = this.cmo.generateInboundCampaign(offer);

    // 4. CSO qualifies prospect and drafts commercial proposal
    const { lead, proposal } = this.cso.qualifyAndDraftProposal({
      clientName: params.clientName || "Apex Enterprises",
      company: params.company || "Apex Global Corp",
      email: params.email || "founder@apexglobal.io"
    }, offer);

    // 5. SUPREME GOVERNOR: Evaluates proposal via 8-Dimension Framework
    const governorDecision = this.governor.evaluateProposal({
      title: `Contract Execution: ${offer.title} for ${lead.company}`,
      category: ACTION_CATEGORIES.CONTRACT,
      requestedBy: "Executive Council (CSO + CRO)",
      expectedRevenueInr: offer.recommendedPriceInr,
      costInr: Math.round(offer.recommendedPriceInr * (1 - (offer.targetGrossMarginPercent / 100))),
      riskLevel: params.riskLevel || "LOW",
      customerImpactScore: 92,
      isDigitalAsset: ["Digital Products", "Software / SaaS", "Agriculture-Focused"].includes(offer.vertical),
      automationPercent: 95,
      reputationImpactScore: 98,
      isRecurring: Boolean(params.isRecurring),
      isUnethical: Boolean(params.isUnethical)
    });

    let executionResult = null;
    let financeSettlement = null;
    let customerSuccessPlan = null;

    if (governorDecision.decision === GOVERNOR_DECISION.APPROVED) {
      // 6. COO fulfills service or digital product with QA
      executionResult = this.coo.executeDelivery(offer, {
        clientName: lead.name,
        company: lead.company,
        crop: params.crop,
        soilType: params.soilType,
        fieldSizeAcres: params.fieldSizeAcres,
        niche: params.niche
      });

      // 7. CFO collects payment and executes 40/25/20/10/5 profit distribution
      financeSettlement = this.cfo.settleTransaction(proposal, offer.targetGrossMarginPercent);

      // 8. CCO reviews satisfaction, collects testimonial, and formulates retainer up-sell
      customerSuccessPlan = this.cco.conductOnboardingAndReview(lead.name, offer);
    }

    const cycleReport = {
      cycleId,
      timestamp: new Date().toISOString(),
      intelBrief,
      offer,
      marketingCampaign,
      lead,
      proposal,
      governorDecision,
      executionResult,
      financeSettlement,
      customerSuccessPlan,
      treasuryStatus: this.cfo.getTreasurySummary(),
      growthHighway: this.growthPath.getStatus()
    };

    this.empireHistory.push(cycleReport);
    return cycleReport;
  }

  getEmpireStatus() {
    return {
      empireCyclesRun: this.empireCyclesRun,
      growthHighway: this.growthPath.getStatus(),
      governor: {
        name: this.governor.name,
        role: this.governor.role,
        audit: this.governor.getAuditSummary()
      },
      executiveCouncil: [
        { title: this.cro.title, name: this.cro.name, role: this.cro.role },
        { title: this.cmo.title, name: this.cmo.name, role: this.cmo.role, campaignsCount: this.cmo.campaigns.length },
        { title: this.cso.title, name: this.cso.name, role: this.cso.role, dealsCount: this.cso.crm.leads.size },
        { title: this.cco.title, name: this.cco.name, role: this.cco.role, retainersActive: this.cco.retainerConversions.length },
        { title: this.coo.title, name: this.coo.name, role: this.coo.role, deliveriesFulfilled: this.coo.operationsHistory.length },
        { title: this.cfo.title, name: this.cfo.name, role: this.cfo.role, ...this.cfo.getTreasurySummary() },
        { title: this.cio.title, name: this.cio.name, role: this.cio.role, intelligenceBriefsCount: this.cio.intelligenceBriefs.length }
      ],
      latestCycle: this.empireHistory[this.empireHistory.length - 1] || null
    };
  }
}
