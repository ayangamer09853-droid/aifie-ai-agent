import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../server.mjs";

import {
  SupremeGovernorAgent,
  ChiefRevenueOfficerAgent,
  ChiefMarketingOfficerAgent,
  ChiefSalesAgent,
  ChiefCustomerSuccessAgent,
  ChiefOperationsAgent,
  ChiefFinanceAgent,
  ChiefIntelligenceAgent,
  AifieBusinessEmpire,
  GOVERNOR_DECISION,
  ACTION_CATEGORIES
} from "../src/revenue/business-empire.mjs";

import { RevenueCRM } from "../src/revenue/revenue-crm.mjs";
import { InvoiceManager } from "../src/revenue/invoice-and-billing.mjs";
import { ServiceDeliveryEngine } from "../src/revenue/service-delivery-engine.mjs";
import { DigitalProductFulfillmentEngine } from "../src/revenue/digital-product-fulfillment.mjs";
import { ZeroCapitalGrowthPath } from "../src/revenue/zero-capital-growth-path.mjs";

test("AIFIE Autonomous Business Empire & Supreme Governor Test Suite", async (t) => {

  await t.test("1. Supreme Governor Agent: Enforces 8-Dimension Decision Framework and Ethical Guardrails", () => {
    const governor = new SupremeGovernorAgent();

    // A. Compliant, high-ROI commercial proposal -> Should be APPROVED
    const goodProposal = {
      title: "Commercial AI Website Package",
      category: ACTION_CATEGORIES.CONTRACT,
      requestedBy: "CSO",
      expectedRevenueInr: 25000,
      costInr: 1500,
      riskLevel: "LOW",
      customerImpactScore: 95,
      isDigitalAsset: true,
      automationPercent: 95,
      reputationImpactScore: 98,
      isRecurring: true
    };

    const decisionA = governor.evaluateProposal(goodProposal);
    assert.strictEqual(decisionA.decision, GOVERNOR_DECISION.APPROVED);
    assert.ok(decisionA.compositeScore >= 75);
    assert.strictEqual(decisionA.dimensions.riskSafetyScore, 95);

    // B. Unethical proposal with fake promises or spam -> Should be strictly REJECTED
    const spamProposal = {
      title: "Guaranteed Profit Crypto Bot Blast",
      category: ACTION_CATEGORIES.MARKETING,
      requestedBy: "Rogue SDR",
      isUnethical: true
    };

    const decisionB = governor.evaluateProposal(spamProposal);
    assert.strictEqual(decisionB.decision, GOVERNOR_DECISION.REJECTED);
    assert.strictEqual(decisionB.compositeScore, 0);
    assert.ok(decisionB.reasoning.includes("CRITICAL REJECTION"));

    // C. Borderline high-risk action -> Should be REQUIRES_REVIEW
    const riskyProposal = {
      title: "Aggressive Cold Outreach Sprint",
      category: ACTION_CATEGORIES.MARKETING,
      expectedRevenueInr: 10000,
      costInr: 5000,
      riskLevel: "MEDIUM",
      customerImpactScore: 65,
      reputationImpactScore: 70
    };

    const decisionC = governor.evaluateProposal(riskyProposal);
    assert.strictEqual(decisionC.decision, GOVERNOR_DECISION.REQUIRES_REVIEW);

    // Verify Audit Summary
    const summary = governor.getAuditSummary();
    assert.strictEqual(summary.totalEvaluations, 3);
    assert.strictEqual(summary.approvedCount, 1);
    assert.strictEqual(summary.rejectedCount, 1);
    assert.strictEqual(summary.underReviewCount, 1);
  });

  await t.test("2. Executive Council (Level 2): Verifies all 7 C-Level Executive Agents", () => {
    // 1. CRO
    const cro = new ChiefRevenueOfficerAgent();
    const offer = cro.createOptimizedOffer("AgriTech Co-ops", "Agriculture-Focused");
    assert.strictEqual(offer.vertical, "Agriculture-Focused");
    assert.ok(offer.recommendedPriceInr > 0);
    assert.ok(offer.targetGrossMarginPercent >= 85);

    // 2. CMO
    const cmo = new ChiefMarketingOfficerAgent();
    const campaign = cmo.generateInboundCampaign(offer);
    assert.ok(campaign.campaignId);
    assert.ok(campaign.contentAssets.blogPostTitle);
    assert.ok(campaign.contentAssets.socialHooks.length >= 2);

    // 3. CSO
    const crm = new RevenueCRM();
    const cso = new ChiefSalesAgent(crm);
    const { lead, proposal } = cso.qualifyAndDraftProposal({
      clientName: "Punjab Farmers Producer Org",
      company: "Kisan Cooperative Ltd"
    }, offer);
    assert.ok(lead.id);
    assert.ok(proposal.proposalId);
    assert.strictEqual(proposal.status, "AWAITING_GOVERNOR_APPROVAL");

    // 4. CCO
    const cco = new ChiefCustomerSuccessAgent();
    const review = cco.conductOnboardingAndReview(lead.name, offer);
    assert.strictEqual(review.csatScore, 5);
    assert.ok(review.testimonialHarvested);
    assert.ok(review.estimatedRetainerMrrInr > 0);

    // 5. COO
    const deliveryEngine = new ServiceDeliveryEngine();
    const productEngine = new DigitalProductFulfillmentEngine();
    const coo = new ChiefOperationsAgent(deliveryEngine, productEngine);
    const opsPkg = coo.executeDelivery(offer, { clientName: lead.name });
    assert.strictEqual(opsPkg.qaAudit.passed, true);
    assert.strictEqual(opsPkg.status, "FULFILLED_EXCELLENT");

    // 6. CFO: Verifies 40% Growth, 25% Reserve, 20% Infra, 10% Research, 5% Emergency Fund
    const billing = new InvoiceManager();
    const growth = new ZeroCapitalGrowthPath(0);
    const cfo = new ChiefFinanceAgent(billing, growth);
    const settlement = cfo.settleTransaction(proposal, offer.targetGrossMarginPercent);

    assert.ok(settlement.invoice.id);
    assert.ok(settlement.distribution.growth_40 > 0);
    assert.ok(settlement.distribution.reserveVault_25 > 0);
    assert.ok(settlement.distribution.infrastructure_20 > 0);
    assert.ok(settlement.distribution.research_10 > 0);
    assert.ok(settlement.distribution.emergencyFund_5 > 0);

    const sumAllocations = settlement.distribution.growth_40 +
      settlement.distribution.reserveVault_25 +
      settlement.distribution.infrastructure_20 +
      settlement.distribution.research_10 +
      settlement.distribution.emergencyFund_5;
    assert.strictEqual(sumAllocations, settlement.record.netProfitInr);

    // 7. CIO
    const cio = new ChiefIntelligenceAgent();
    const brief = cio.scoutOpportunity("B2B AI Automation");
    assert.ok(brief.briefId);
    assert.ok(brief.marketDemandScore > 0.8);
  });

  await t.test("3. Master AifieBusinessEmpire: Orchestrates end-to-end Empire Cycle", async () => {
    const empire = new AifieBusinessEmpire();
    const statusInitial = empire.getEmpireStatus();
    assert.strictEqual(statusInitial.empireCyclesRun, 0);
    assert.strictEqual(statusInitial.executiveCouncil.length, 7);

    // Run Empire Cycle
    const cycle = await empire.runEmpireCycle({
      clientName: "Gujarat Dairy Federation",
      company: "Amul Milk Producers Co.",
      niche: "Agricultural Cold-Chain Logistics",
      vertical: "Agriculture-Focused"
    });

    assert.ok(cycle.cycleId);
    assert.ok(cycle.intelBrief);
    assert.ok(cycle.offer);
    assert.ok(cycle.marketingCampaign);
    assert.ok(cycle.proposal);
    assert.strictEqual(cycle.governorDecision.decision, GOVERNOR_DECISION.APPROVED);
    assert.strictEqual(cycle.executionResult.status, "FULFILLED_EXCELLENT");
    assert.ok(cycle.financeSettlement.distribution.growth_40 > 0);
    assert.strictEqual(cycle.customerSuccessPlan.csatScore, 5);

    const statusAfter = empire.getEmpireStatus();
    assert.strictEqual(statusAfter.empireCyclesRun, 1);
    assert.ok(statusAfter.growthHighway.currentRevenueInr > 0);
  });

  await t.test("4. Server REST Routes: /api/empire/status, /api/empire/propose, /api/empire/cycle, /api/empire/council, /api/empire/governor/audit", async () => {
    const server = http.createServer(app);
    await new Promise((res) => server.listen(0, "127.0.0.1", res));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // GET /api/empire/status
      const statusRes = await fetch(`${baseUrl}/api/empire/status`);
      assert.strictEqual(statusRes.status, 200);
      const statusData = await statusRes.json();
      assert.strictEqual(statusData.ok, true);
      assert.ok(statusData.empire.governor);
      assert.strictEqual(statusData.empire.executiveCouncil.length, 7);

      // POST /api/empire/propose (Submit to Supreme Governor)
      const proposeRes = await fetch(`${baseUrl}/api/empire/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Enterprise AI Scheduling SaaS Pilot",
          category: "PRODUCT_LAUNCH",
          expectedRevenueInr: 35000,
          costInr: 2000,
          riskLevel: "LOW",
          customerImpactScore: 92,
          isDigitalAsset: true,
          automationPercent: 95,
          reputationImpactScore: 95
        })
      });
      assert.strictEqual(proposeRes.status, 200);
      const proposeData = await proposeRes.json();
      assert.strictEqual(proposeData.ok, true);
      assert.strictEqual(proposeData.evaluation.decision, "APPROVED");

      // POST /api/empire/cycle (Run full Empire Cycle)
      const cycleRes = await fetch(`${baseUrl}/api/empire/cycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: "Bangalore Tech Cooperative",
          company: "Nexus AI Ventures",
          niche: "AI SaaS & Workflow Automation"
        })
      });
      assert.strictEqual(cycleRes.status, 200);
      const cycleData = await cycleRes.json();
      assert.strictEqual(cycleData.ok, true);
      assert.ok(cycleData.cycle.cycleId);
      assert.strictEqual(cycleData.cycle.governorDecision.decision, "APPROVED");

      // GET /api/empire/council
      const councilRes = await fetch(`${baseUrl}/api/empire/council`);
      assert.strictEqual(councilRes.status, 200);
      const councilData = await councilRes.json();
      assert.strictEqual(councilData.ok, true);
      assert.strictEqual(councilData.executiveCouncil.length, 7);

      // GET /api/empire/governor/audit
      const auditRes = await fetch(`${baseUrl}/api/empire/governor/audit`);
      assert.strictEqual(auditRes.status, 200);
      const auditData = await auditRes.json();
      assert.strictEqual(auditData.ok, true);
      assert.ok(auditData.audit.totalEvaluations >= 2);
    } finally {
      server.close();
    }
  });
});
