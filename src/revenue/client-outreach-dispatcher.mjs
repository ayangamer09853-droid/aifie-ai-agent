/**
 * AIFIE Autonomous Client Outreach Dispatcher & Deal CRM Engine
 * 
 * Closes high-ticket client contracts (₹58,000 to ₹1,50,000) by converting
 * compiled Lead Swarm proposals with working PoC code prototypes into
 * actionable, multi-channel outreach assets:
 * 
 * 1. 1-Click Mailto Deep Link Generator (Pre-filled Subject, Proposal, PoC & CTA)
 * 2. Platform-Specific Copy Assets (Upwork Enterprise, Freelancer, LinkedIn InMail)
 * 3. Deal Pipeline CRM & Lifecycle State Machine
 * 4. Automatic Commercial Invoice & Live UPI QR Bridging
 * 
 * Pure Node.js ESM. Zero external dependencies.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { globalLeadSwarm, LIVE_MULTI_PLATFORM_FEED } from "./high-velocity-lead-swarm.mjs";
import { InvoiceManager, LEDGER_MODE } from "./invoice-and-billing.mjs";

const DEFAULT_CRM_PATH = resolve(process.cwd(), "data", "outreach-crm.json");

export const OUTREACH_STAGES = {
  SCOUTED: "SCOUTED",
  PITCH_PREPARED: "PITCH_PREPARED",
  DISPATCHED: "DISPATCHED",
  IN_CONVERSATION: "IN_CONVERSATION",
  INVOICE_SENT: "INVOICE_SENT",
  PAID_WON: "PAID_WON",
  REJECTED: "REJECTED"
};

export class ClientOutreachDispatcher {
  constructor(storagePath = DEFAULT_CRM_PATH, invoiceManager = null) {
    this.storagePath = storagePath;
    this.invoiceManager = invoiceManager || new InvoiceManager();
    this.deals = new Map();
    this.dispatchLogs = [];
    this.loadState();
  }

  loadState() {
    try {
      if (existsSync(this.storagePath)) {
        const raw = readFileSync(this.storagePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.deals)) {
          data.deals.forEach(deal => this.deals.set(deal.id, deal));
        }
        if (Array.isArray(data.dispatchLogs)) {
          this.dispatchLogs = data.dispatchLogs;
        }
      }
    } catch {
      // Fallback
    }

    // Auto-seed deals from high-ticket opportunities if CRM is fresh
    if (this.deals.size === 0) {
      this.syncFromLeadFeed();
    }
  }

  saveState() {
    try {
      const dir = dirname(this.storagePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      const data = {
        updatedAt: new Date().toISOString(),
        totalDeals: this.deals.size,
        totalPipelineValueInr: this.computeTotalPipelineValue(),
        deals: Array.from(this.deals.values()),
        dispatchLogs: this.dispatchLogs.slice(-200)
      };
      writeFileSync(this.storagePath, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // Best effort
    }
  }

  syncFromLeadFeed() {
    const opps = LIVE_MULTI_PLATFORM_FEED;
    for (const opp of opps) {
      if (!this.deals.has(opp.id)) {
        this.deals.set(opp.id, {
          id: opp.id,
          clientName: opp.clientName,
          title: opp.title,
          sourcePlatform: opp.sourcePlatform,
          budgetInr: opp.budgetInr,
          budgetUsd: opp.budgetUsd,
          matchedOfferingId: opp.matchedOfferingId,
          winProbability: opp.winProbability,
          estimatedHours: opp.estimatedHours,
          urgency: opp.urgency,
          stage: OUTREACH_STAGES.PITCH_PREPARED,
          stageUpdatedAt: new Date().toISOString(),
          dispatchedAt: null,
          dispatchedChannel: null,
          invoiceId: null,
          invoiceUrl: null,
          upiIntentUri: null,
          lastActivityNote: "Tailored pitch and working PoC prototype assembled."
        });
      }
    }
    this.saveState();
  }

  computeTotalPipelineValue() {
    let total = 0;
    for (const deal of this.deals.values()) {
      if (deal.stage !== OUTREACH_STAGES.REJECTED) {
        total += deal.budgetInr || 0;
      }
    }
    return total;
  }

  getPipelineSummary() {
    const dealsList = Array.from(this.deals.values());
    const totalPipelineValueInr = this.computeTotalPipelineValue();
    const totalPipelineValueUsd = Number((totalPipelineValueInr / 83.5).toFixed(2));

    const stageCounts = {
      [OUTREACH_STAGES.SCOUTED]: 0,
      [OUTREACH_STAGES.PITCH_PREPARED]: 0,
      [OUTREACH_STAGES.DISPATCHED]: 0,
      [OUTREACH_STAGES.IN_CONVERSATION]: 0,
      [OUTREACH_STAGES.INVOICE_SENT]: 0,
      [OUTREACH_STAGES.PAID_WON]: 0,
      [OUTREACH_STAGES.REJECTED]: 0
    };

    let totalWonInr = 0;
    for (const d of dealsList) {
      if (stageCounts[d.stage] !== undefined) stageCounts[d.stage]++;
      if (d.stage === OUTREACH_STAGES.PAID_WON) totalWonInr += d.budgetInr || 0;
    }

    return {
      status: "ACTIVE_PIPELINE",
      totalDeals: dealsList.length,
      totalPipelineValueInr,
      totalPipelineValueUsd,
      totalWonInr,
      stageCounts,
      deals: dealsList,
      recentDispatches: this.dispatchLogs.slice(-10)
    };
  }

  getDeal(jobId) {
    return this.deals.get(jobId) || null;
  }

  /**
   * Generates a complete multi-channel dispatch packet with embedded working code
   */
  getDispatchPacket(jobId) {
    const deal = this.deals.get(jobId);
    if (!deal) throw new Error(`Deal ${jobId} not found in CRM`);

    // Compile bid with prototype from Lead Swarm
    const bid = globalLeadSwarm.compileTailoredBidWithPoc(jobId);
    const poc = globalLeadSwarm.generateProofOfConceptPrototype(jobId);

    // 1. Email Channel
    const clientHandle = deal.clientName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const emailRecipient = `${clientHandle}@business-inquiries.internal`;
    const emailSubject = `[Proposal] ${deal.title} - Working Architecture Prototype Attached`;
    const emailBody = `Hi ${deal.clientName},\n\nI noticed your requirement for "${deal.title}" and assembled a working Proof-of-Concept prototype for your immediate review.\n\n==================================================\n⚡ WORKING CODE DELIVERABLE PREVIEW:\n${poc.title}\n==================================================\n${poc.preview}\n==================================================\n\nFixed Turnkey Investment: ₹${deal.budgetInr.toLocaleString("en-IN")} ($${deal.budgetUsd} USD)\nTimeline: 3 Business Days with 100% test coverage\nPayment Terms: Escrow / Milestone settlement upon delivery\n\nIf you would like to test this live on staging or review the repository, let me know!\n\nBest regards,\nAifie Enterprise Solutions\nhttps://aifie.internal`;
    
    const mailtoUrl = `mailto:${encodeURIComponent(emailRecipient)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    // 2. Upwork / Freelancer Bid Channel
    const upworkProposal = bid.pitchText;

    // 3. LinkedIn / Twitter InMail Hook
    const linkedInHook = `Hi ${deal.clientName.split(" ")[0]} — saw your team's opening for "${deal.title.slice(0, 50)}...". Rather than sending generic credentials, I wrote a working prototype specifically addressing this requirement (${poc.title}).\n\nWould you be open to a 2-minute look at the code before interviewing other candidates?`;

    return {
      dealId: deal.id,
      clientName: deal.clientName,
      title: deal.title,
      budgetInr: deal.budgetInr,
      budgetUsd: deal.budgetUsd,
      winProbability: deal.winProbability,
      currentStage: deal.stage,
      poc: {
        title: poc.title,
        pocType: poc.pocType,
        preview: poc.preview,
        estimatedSpeedup: poc.estimatedSpeedup
      },
      channels: {
        email: {
          recipient: emailRecipient,
          subject: emailSubject,
          body: emailBody,
          mailtoUrl
        },
        upwork: {
          bidId: bid.id,
          proposalText: upworkProposal,
          milestones: [
            { description: "Working Prototype & Core Engine Delivery", amountInr: Math.round(deal.budgetInr * 0.6) },
            { description: "Unit Tests, Deployment & Documentation", amountInr: Math.round(deal.budgetInr * 0.4) }
          ]
        },
        linkedIn: {
          inMailHook: linkedInHook
        }
      }
    };
  }

  /**
   * Records that a pitch was dispatched to a client
   */
  recordDispatch(jobId, { channel = "EMAIL", recipient = null, notes = "" } = {}) {
    const deal = this.deals.get(jobId);
    if (!deal) throw new Error(`Deal ${jobId} not found in CRM`);

    const now = new Date().toISOString();
    deal.stage = OUTREACH_STAGES.DISPATCHED;
    deal.stageUpdatedAt = now;
    deal.dispatchedAt = now;
    deal.dispatchedChannel = channel;
    deal.lastActivityNote = `Dispatched via ${channel}${recipient ? ` to ${recipient}` : ""}. ${notes}`.trim();

    const logEntry = {
      id: `DISPATCH-${Date.now().toString(36).toUpperCase()}`,
      jobId: deal.id,
      clientName: deal.clientName,
      channel,
      recipient: recipient || deal.clientName,
      timestamp: now,
      budgetInr: deal.budgetInr
    };

    this.dispatchLogs.push(logEntry);
    this.saveState();

    return {
      success: true,
      deal,
      logEntry
    };
  }

  /**
   * Updates deal stage along the pipeline
   */
  updateDealStage(jobId, newStage, { notes = "" } = {}) {
    const deal = this.deals.get(jobId);
    if (!deal) throw new Error(`Deal ${jobId} not found in CRM`);

    if (!OUTREACH_STAGES[newStage]) {
      throw new Error(`Invalid outreach stage: ${newStage}`);
    }

    const now = new Date().toISOString();
    deal.stage = newStage;
    deal.stageUpdatedAt = now;
    if (notes) deal.lastActivityNote = notes;

    this.saveState();
    return { success: true, deal };
  }

  /**
   * Automatically bridges deal to an official commercial invoice with real UPI QR
   */
  generateClientInvoice(jobId, { customAmountInr = null, customNotes = null } = {}) {
    const deal = this.deals.get(jobId);
    if (!deal) throw new Error(`Deal ${jobId} not found in CRM`);

    const amountInr = customAmountInr || deal.budgetInr;
    const clientHandle = deal.clientName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const clientEmail = `${clientHandle}@client-billing.internal`;

    const invoice = this.invoiceManager.createInvoice({
      clientId: deal.id,
      clientName: deal.clientName,
      clientEmail,
      serviceId: "WEBSITE_DEV",
      customAmountInr: amountInr,
      notes: customNotes || `Milestone payment for ${deal.title}. Turnkey delivery with 100% test coverage.`,
      mode: LEDGER_MODE.PRODUCTION_REAL
    });

    deal.stage = OUTREACH_STAGES.INVOICE_SENT;
    deal.stageUpdatedAt = new Date().toISOString();
    deal.invoiceId = invoice.id;
    deal.invoiceUrl = `/api/billing/invoice/${invoice.id}/html`;
    deal.upiIntentUri = invoice.upiIntentUri;
    deal.lastActivityNote = `Official commercial invoice ${invoice.id} generated with live UPI QR for ₹${amountInr.toLocaleString("en-IN")}.`;

    this.saveState();

    return {
      success: true,
      deal,
      invoice: {
        id: invoice.id,
        amountInr: invoice.amountInr,
        amountUsd: invoice.amountUsd,
        upiIntentUri: invoice.upiIntentUri,
        qrSvg: invoice.qrSvg,
        qrCodeSvg: invoice.qrSvg,
        invoiceHtmlUrl: deal.invoiceUrl
      }
    };
  }
}

export const globalOutreachDispatcher = new ClientOutreachDispatcher();
