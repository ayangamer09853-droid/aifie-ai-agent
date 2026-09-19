/**
 * AIFIE Revenue Agent - CRM & Customer Acquisition Engine
 * Zero external dependencies. Pure Node.js ESM.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { SERVICE_CATEGORIES, getServiceById } from "./service-catalog.mjs";

const DEFAULT_CRM_PATH = resolve(process.cwd(), "data", "revenue-crm.json");

export const CRM_STAGES = {
  NEW_LEAD: "NEW_LEAD",
  QUALIFIED: "QUALIFIED",
  PROPOSAL_SENT: "PROPOSAL_SENT",
  NEGOTIATION: "NEGOTIATION",
  CLOSED_WON: "CLOSED_WON",
  DELIVERY_ACTIVE: "DELIVERY_ACTIVE",
  COMPLETED: "COMPLETED",
  RETAINER: "RETAINER",
  CLOSED_LOST: "CLOSED_LOST"
};

export class RevenueCRM {
  constructor(storagePath = DEFAULT_CRM_PATH) {
    this.storagePath = storagePath;
    this.leads = new Map();
    this.clients = new Map();
    this.proposals = new Map();
    this.outreachCampaigns = [];
    this.loadState();
  }

  loadState() {
    try {
      if (existsSync(this.storagePath)) {
        const raw = readFileSync(this.storagePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.leads)) {
          for (const l of data.leads) this.leads.set(l.id, l);
        }
        if (Array.isArray(data.clients)) {
          for (const c of data.clients) this.clients.set(c.id, c);
        }
        if (Array.isArray(data.proposals)) {
          for (const p of data.proposals) this.proposals.set(p.id, p);
        }
        if (Array.isArray(data.outreachCampaigns)) {
          this.outreachCampaigns = data.outreachCampaigns;
        }
      }
    } catch {
      // Fallback to in-memory state
    }
  }

  saveState() {
    try {
      const dir = dirname(this.storagePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const data = {
        updatedAt: new Date().toISOString(),
        leads: Array.from(this.leads.values()),
        clients: Array.from(this.clients.values()),
        proposals: Array.from(this.proposals.values()),
        outreachCampaigns: this.outreachCampaigns
      };
      writeFileSync(this.storagePath, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // Best-effort atomic write
    }
  }

  /**
   * Capture a new prospective lead
   */
  captureLead({
    name,
    email,
    company = "Independent",
    serviceInterest = "AI_CHATBOT",
    tier = "starter",
    budget = null,
    urgency = "normal",
    isDecisionMaker = true,
    notes = ""
  }) {
    const leadId = `LEAD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const category = getServiceById(serviceInterest) || SERVICE_CATEGORIES.AI_CHATBOT;
    const tierConfig = category.pricingTiers[tier] || category.pricingTiers.starter;

    const statedBudget = budget || tierConfig.inr;
    const score = this.calculateBantScore({
      budget: statedBudget,
      tierInr: tierConfig.inr,
      isDecisionMaker,
      urgency,
      hasClearNeed: Boolean(serviceInterest)
    });

    const lead = {
      id: leadId,
      name,
      email,
      company,
      serviceInterest: category.id,
      serviceName: category.name,
      tier,
      statedBudget,
      stage: score >= 60 ? CRM_STAGES.QUALIFIED : CRM_STAGES.NEW_LEAD,
      bantScore: score,
      isDecisionMaker,
      urgency,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.leads.set(leadId, lead);
    this.saveState();
    return lead;
  }

  /**
   * Score lead using BANT Framework (0-100)
   */
  calculateBantScore({ budget, tierInr, isDecisionMaker, urgency, hasClearNeed }) {
    let score = 0;
    // 1. Budget (25 pts)
    if (budget >= tierInr) score += 25;
    else if (budget >= tierInr * 0.7) score += 15;
    else score += 5;

    // 2. Authority (25 pts)
    if (isDecisionMaker) score += 25;
    else score += 10;

    // 3. Need (25 pts)
    if (hasClearNeed) score += 25;
    else score += 10;

    // 4. Timeline / Urgency (25 pts)
    if (urgency === "immediate" || urgency === "high") score += 25;
    else if (urgency === "normal") score += 20;
    else score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate tailored ethical proposal for a qualified lead
   */
  generateProposal(leadId) {
    const lead = this.leads.get(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const service = getServiceById(lead.serviceInterest) || SERVICE_CATEGORIES.AI_CHATBOT;
    const tier = service.pricingTiers[lead.tier] || service.pricingTiers.starter;

    const proposalId = `PROP-${Date.now().toString(36).toUpperCase()}`;
    const proposal = {
      id: proposalId,
      leadId: lead.id,
      clientName: lead.name,
      company: lead.company,
      serviceId: service.id,
      serviceName: service.name,
      tierName: tier.name,
      pricing: {
        inr: tier.inr,
        usd: tier.usd
      },
      turnaroundDays: tier.turnaroundDays,
      deliverables: tier.deliverables,
      expectedMarginPercent: service.marginPercent,
      guaranteePolicy: "100% Value Guarantee: Milestone reviews, zero spam, and unlimited polish until SLA targets are fulfilled.",
      validityDays: 14,
      createdAt: new Date().toISOString(),
      status: "ACTIVE"
    };

    lead.stage = CRM_STAGES.PROPOSAL_SENT;
    lead.updatedAt = new Date().toISOString();

    this.proposals.set(proposalId, proposal);
    this.saveState();
    return proposal;
  }

  /**
   * Handle common prospect objections with structured consultative responses
   */
  handleObjection(objectionType, customContext = {}) {
    const responses = {
      BUDGET_CONCERN: {
        headline: "Phased Milestone Implementation & Transparent ROI",
        script: "We completely respect your budget stewardship. Rather than taking on an expansive project at once, we can begin with our Starter Tier or break implementation into verifiable milestone phases. Each phase self-funds the next through measured efficiency and new customer acquisition.",
        suggestedAction: "OFFER_STARTER_TIER_OR_SPLIT_PAYMENT"
      },
      BUILD_IN_HOUSE: {
        headline: "Opportunity Cost & Specialized Velocity",
        script: "Internal teams certainly can build this, but engineering specialized AI systems or content pipelines pulls your best talent away from core revenue activities. Aifie delivers turnkey, fully documented assets in days rather than months, saving substantial internal salary hours.",
        suggestedAction: "OFFER_TECHNICAL_AUDIT_OR_HYBRID_INTEGRATION"
      },
      TIMING_NOT_RIGHT: {
        headline: "Zero-Disruption Async Deployment",
        script: "Our implementation is 100% async and requires under 30 minutes of your team's time for kickoff. Starting today ensures your competitor doesn't capture the organic search rank or market share in the upcoming quarter.",
        suggestedAction: "OFFER_RESERVATION_WITH_NEXT_MONTH_KICKOFF"
      },
      PROOF_OF_WORK: {
        headline: "Verifiable Work Samples & Milestone Verification",
        script: "We operate on full transparency. Every project includes structured sample artifacts, live demonstration runbooks, and client sign-off gates before final delivery invoices are approved.",
        suggestedAction: "SEND_SERVICE_BLUEPRINT_AND_CASE_STUDY"
      }
    };

    return responses[objectionType] || {
      headline: "Consultative Value Alignment",
      script: "We tailor our deliverables to directly solve your primary operational bottleneck.",
      suggestedAction: "SCHEDULE_DISCOVERY_ALIGNMENT"
    };
  }

  /**
   * Convert lead into an active paying client
   */
  convertLeadToClient(leadId, agreedAmountInr = null) {
    const lead = this.leads.get(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const clientId = `CLI-${Date.now().toString(36).toUpperCase()}`;
    const service = getServiceById(lead.serviceInterest) || SERVICE_CATEGORIES.AI_CHATBOT;
    const tier = service.pricingTiers[lead.tier] || service.pricingTiers.starter;
    const finalAmount = agreedAmountInr || tier.inr;

    const client = {
      id: clientId,
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      serviceId: service.id,
      serviceName: service.name,
      tier: lead.tier,
      tierName: tier.name,
      contractValueInr: finalAmount,
      totalPaidInr: 0,
      activeProjectsCount: 1,
      isRetainer: false,
      satisfactionScore: 100, // 0-100 default
      onboardedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    lead.stage = CRM_STAGES.CLOSED_WON;
    lead.clientId = clientId;
    lead.updatedAt = new Date().toISOString();

    this.clients.set(clientId, client);
    this.saveState();
    return client;
  }

  /**
   * Record permission-based value-first outreach campaign
   */
  recordOutreachCampaign({
    campaignName,
    serviceId,
    targetAudience,
    channel = "LINKEDIN_ORGANIC",
    messagesSent = 25,
    responsesReceived = 4
  }) {
    const campaign = {
      id: `CAMP-${Date.now().toString(36).toUpperCase()}`,
      campaignName,
      serviceId,
      targetAudience,
      channel,
      messagesSent,
      responsesReceived,
      responseRate: Number(((responsesReceived / Math.max(1, messagesSent)) * 100).toFixed(1)),
      ethicalCompliance: "STRICT_PERMISSION_VALUE_FIRST_NO_SPAM",
      createdAt: new Date().toISOString()
    };

    this.outreachCampaigns.push(campaign);
    this.saveState();
    return campaign;
  }

  /**
   * Get CRM pipeline stats
   */
  getPipelineMetrics() {
    const leadsArr = Array.from(this.leads.values());
    const clientsArr = Array.from(this.clients.values());

    const totalLeads = leadsArr.length;
    const qualifiedLeads = leadsArr.filter(l => l.stage !== CRM_STAGES.CLOSED_LOST && l.bantScore >= 60).length;
    const closedWon = leadsArr.filter(l => l.stage === CRM_STAGES.CLOSED_WON).length;
    const conversionRate = totalLeads > 0 ? Number(((closedWon / totalLeads) * 100).toFixed(1)) : 0;

    const totalOutreachSent = this.outreachCampaigns.reduce((acc, c) => acc + (c.messagesSent || 0), 0);

    return {
      totalLeads,
      qualifiedLeads,
      activeClientsCount: clientsArr.length,
      dealsClosed: closedWon,
      conversionRatePercent: conversionRate,
      totalOutreachSent,
      campaignsCount: this.outreachCampaigns.length
    };
  }
}
