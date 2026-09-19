import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { unlinkSync, existsSync } from "node:fs";

import http from "node:http";
import { app } from "../server.mjs";
import { SERVICE_CATEGORIES, getAllServices, getServiceById } from "../src/revenue/service-catalog.mjs";
import { RevenueCRM, CRM_STAGES } from "../src/revenue/revenue-crm.mjs";
import { InvoiceManager, INVOICE_STATUS } from "../src/revenue/invoice-and-billing.mjs";
import { ServiceDeliveryEngine } from "../src/revenue/service-delivery-engine.mjs";
import { AifieRevenueAgent } from "../src/revenue/aifie-revenue-agent.mjs";

test("Revenue Agent Test Suite", async (t) => {
  const testCrmPath = resolve(process.cwd(), "data", "test-revenue-crm.json");
  const testInvPath = resolve(process.cwd(), "data", "test-revenue-invoices.json");
  const agentCrmPath = resolve(process.cwd(), "data", "test-revenue-agent-crm.json");
  const agentInvPath = resolve(process.cwd(), "data", "test-revenue-agent-inv.json");

  t.after(() => {
    if (existsSync(testCrmPath)) try { unlinkSync(testCrmPath); } catch {}
    if (existsSync(testInvPath)) try { unlinkSync(testInvPath); } catch {}
    if (existsSync(agentCrmPath)) try { unlinkSync(agentCrmPath); } catch {}
    if (existsSync(agentInvPath)) try { unlinkSync(agentInvPath); } catch {}
  });

  await t.test("1. Service Catalog: All 16 digital service categories configured with tiers and margins", () => {
    const services = getAllServices();
    assert.strictEqual(services.length, 16, "Expected exactly 16 service categories");

    const requiredKeys = [
      "AI_CHATBOT", "WEBSITE_DEV", "SOCIAL_MEDIA", "CONTENT_WRITING",
      "COPYWRITING", "SEO_OPTIMIZATION", "DATA_ANALYSIS", "RESEARCH_SERVICES",
      "GRAPHIC_DESIGN", "VIDEO_EDITING", "BUSINESS_AUTOMATION", "AGRITECH_CONSULTING",
      "AI_AGENT_DEV", "CUSTOMER_SUPPORT", "LEAD_GENERATION", "MARKET_RESEARCH"
    ];

    for (const key of requiredKeys) {
      const s = getServiceById(key);
      assert.ok(s, `Missing service category: ${key}`);
      assert.ok(s.name, `Missing name for ${key}`);
      assert.ok(s.marginPercent >= 80, `Margin should be >= 80% for ${key}`);
      assert.ok(s.pricingTiers.starter, `Missing starter tier for ${key}`);
      assert.ok(s.pricingTiers.pro, `Missing pro tier for ${key}`);
      assert.ok(s.pricingTiers.enterprise, `Missing enterprise tier for ${key}`);
      assert.ok(s.pricingTiers.starter.deliverables.length > 0, `Deliverables must be non-empty for ${key}`);
      assert.ok(s.pricingTiers.starter.inr > 0, `INR price must be positive for ${key}`);
    }
  });

  await t.test("2. CRM: Ingests lead, computes BANT score, and transitions stages", () => {
    const crm = new RevenueCRM(testCrmPath);

    const lead = crm.captureLead({
      name: "Ananya Roy",
      email: "ananya@fintechscale.com",
      company: "FintechScale Inc",
      serviceInterest: "AI_AGENT_DEV",
      tier: "pro",
      budget: 65000,
      urgency: "high",
      isDecisionMaker: true
    });

    assert.ok(lead.id.startsWith("LEAD-"), "Lead ID should have prefix");
    assert.strictEqual(lead.stage, CRM_STAGES.QUALIFIED, "High BANT lead should be QUALIFIED");
    assert.ok(lead.bantScore >= 75, "Expected high BANT score");

    // Generate Proposal
    const proposal = crm.generateProposal(lead.id);
    assert.strictEqual(proposal.leadId, lead.id);
    assert.strictEqual(lead.stage, CRM_STAGES.PROPOSAL_SENT);
    assert.ok(proposal.deliverables.length > 0);

    // Objection Handling
    const objection = crm.handleObjection("BUDGET_CONCERN");
    assert.ok(objection.script.includes("budget stewardship"));

    // Convert to Client
    const client = crm.convertLeadToClient(lead.id);
    assert.strictEqual(lead.stage, CRM_STAGES.CLOSED_WON);
    assert.ok(client.id.startsWith("CLI-"));
    assert.strictEqual(client.name, "Ananya Roy");

    const metrics = crm.getPipelineMetrics();
    assert.strictEqual(metrics.totalLeads, 1);
    assert.strictEqual(metrics.dealsClosed, 1);
    assert.strictEqual(metrics.conversionRatePercent, 100);
  });

  await t.test("3. Invoicing: Generates invoice, verifies payment, and logs revenue ledger", () => {
    const invMgr = new InvoiceManager(testInvPath);

    const inv = invMgr.createInvoice({
      clientId: "CLI-TEST-1",
      clientName: "Ananya Roy",
      clientEmail: "ananya@fintechscale.com",
      serviceId: "AI_AGENT_DEV",
      tier: "pro"
    });

    assert.ok(inv.id.startsWith("INV-"), "Invoice ID must start with INV-");
    assert.strictEqual(inv.status, INVOICE_STATUS.SENT);
    assert.strictEqual(inv.amountInr, 60000);

    const payment = invMgr.recordPayment(inv.id, {
      method: "UPI",
      transactionRef: "UPI-IND-8839201"
    });

    assert.strictEqual(payment.success, true);
    assert.strictEqual(payment.invoice.status, INVOICE_STATUS.PAID);
    assert.strictEqual(invMgr.totalCollectedInr, 60000);
    assert.ok(invMgr.totalProfitInr >= 50000, "Profit must reflect 97% margin");

    const summary = invMgr.getFinancialSummary();
    assert.strictEqual(summary.paidInvoicesCount, 1);
    assert.strictEqual(summary.totalCollectedRevenueInr, 60000);
  });

  await t.test("4. Service Delivery: Generates tangible deliverables with QA audit score", () => {
    const delivery = new ServiceDeliveryEngine();

    // Test SEO delivery
    const seoPackage = delivery.deliverService({
      clientId: "CLI-1",
      clientName: "Alpha Logistics",
      serviceId: "SEO_OPTIMIZATION",
      tier: "pro",
      customSpecs: { domain: "alphalogistics.in", keywords: ["fast cargo delhi", "b2b logistics"] }
    });

    assert.ok(seoPackage.deliveryId.startsWith("DELIV-"));
    assert.strictEqual(seoPackage.serviceId, "SEO_OPTIMIZATION");
    assert.ok(seoPackage.qaAudit.score >= 85, "QA score must pass standard");
    assert.ok(seoPackage.generatedArtifact.domain === "alphalogistics.in");

    // Test Copywriting delivery
    const copyPackage = delivery.deliverService({
      clientId: "CLI-2",
      clientName: "SolarScale",
      serviceId: "COPYWRITING",
      tier: "starter"
    });

    assert.ok(copyPackage.generatedArtifact.type.includes("COPY"));
    assert.ok(copyPackage.generatedArtifact.sections.length >= 3);

    const stats = delivery.getDeliveryStats();
    assert.strictEqual(stats.totalDeliveredCount, 2);
    assert.ok(stats.averageQaScore >= 85);
  });

  await t.test("5. AifieRevenueAgent: Executes end-to-end 8-step cycle, allocates profit, and creates Daily Report", () => {
    const agentCrmPath = resolve(process.cwd(), "data", "test-revenue-agent-crm.json");
    const agentInvPath = resolve(process.cwd(), "data", "test-revenue-agent-inv.json");
    try { if (existsSync(agentCrmPath)) unlinkSync(agentCrmPath); } catch {}
    try { if (existsSync(agentInvPath)) unlinkSync(agentInvPath); } catch {}

    const agent = new AifieRevenueAgent({
      crmPath: agentCrmPath,
      invoicePath: agentInvPath
    });

    const result = agent.runAutonomousBusinessCycle({
      sampleLead: {
        name: "Devendra Patel",
        email: "devendra@agroventures.co",
        company: "AgroVentures India",
        serviceInterest: "AGRITECH_CONSULTING",
        tier: "starter",
        urgency: "immediate"
      }
    });

    assert.ok(result.cycleId.startsWith("CYCLE-"));
    assert.strictEqual(result.steps.step1_marketScanning.status, "COMPLETED");
    assert.strictEqual(result.steps.step2_offerCreation.status, "COMPLETED");
    assert.strictEqual(result.steps.step3_customerAcquisition.status, "COMPLETED");
    assert.strictEqual(result.steps.step4_salesConversion.status, "COMPLETED");
    assert.strictEqual(result.steps.step5_serviceDelivery.status, "COMPLETED");
    assert.strictEqual(result.steps.step6_clientRetention.status, "COMPLETED");

    // Verify 5-pillar reinvestment allocation
    const reinvestment = result.steps.step7_profitReinvestment;
    assert.ok(reinvestment.tools > 0, "Tools allocation must be > 0");
    assert.ok(reinvestment.marketing > 0, "Marketing allocation must be > 0");
    assert.ok(reinvestment.automation > 0, "Automation allocation must be > 0");
    assert.ok(reinvestment.training > 0, "Training allocation must be > 0");
    assert.ok(reinvestment.infrastructure > 0, "Infrastructure allocation must be > 0");

    // Verify 10 Dashboard Metrics
    const m = result.dashboardMetrics;
    assert.ok(m.revenue.includes("₹15,000"), "Revenue must match starter agritech tier");
    assert.ok(m.profitNumeric > 0, "Profit must be positive");
    assert.strictEqual(m.activeClients, 1);
    assert.ok(m.conversionRate.includes("100%"));
    assert.ok(m.customerSatisfaction.includes("100%"));
    assert.ok(m.monthlyRecurringRevenue.includes("₹12,000/mo"));
    assert.ok(m.dealsClosed >= 1);
    assert.ok(m.serviceDeliveryScore.includes("/100"));

    // Verify official 8-section Daily Report
    const r = result.dailyReport;
    assert.ok(r.section1_revenueGeneratedToday.includes("₹15,000"));
    assert.ok(r.section2_newLeadsAcquired);
    assert.ok(r.section3_newCustomersSigned);
    assert.ok(r.section4_servicesDelivered);
    assert.ok(r.section5_customerFeedback.includes("CSAT"));
    assert.ok(r.section6_businessImprovements.length > 0);
    assert.ok(r.section7_profitAllocation.reinvestmentLedger);
    assert.ok(r.section8_nextDayActionPlan.length >= 3);
  });

  await t.test("6. Server REST API: /api/revenue/* routes respond with valid payloads", async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : 8787;

    try {
      // 1. GET /api/revenue/status
      const resStatus = await fetch(`http://127.0.0.1:${port}/api/revenue/status`);
      assert.strictEqual(resStatus.status, 200);
      const jsonStatus = await resStatus.json();
      assert.strictEqual(jsonStatus.ok, true);
      assert.ok(jsonStatus.metrics.serviceDeliveryScore);

      // 2. GET /api/revenue/services
      const resServices = await fetch(`http://127.0.0.1:${port}/api/revenue/services`);
      assert.strictEqual(resServices.status, 200);
      const jsonServices = await resServices.json();
      assert.strictEqual(jsonServices.count, 16);

      // 3. POST /api/revenue/leads
      const resLead = await fetch(`http://127.0.0.1:${port}/api/revenue/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Siddharth Rao",
          email: "siddharth@raomarketing.in",
          serviceInterest: "SEO_OPTIMIZATION",
          tier: "starter"
        })
      });
      assert.strictEqual(resLead.status, 201);
      const jsonLead = await resLead.json();
      assert.strictEqual(jsonLead.ok, true);
      assert.ok(jsonLead.lead.id.startsWith("LEAD-"));

      // 4. GET /api/revenue/report/daily
      const resReport = await fetch(`http://127.0.0.1:${port}/api/revenue/report/daily`);
      assert.strictEqual(resReport.status, 200);
      const jsonReport = await resReport.json();
      assert.strictEqual(jsonReport.ok, true);
      assert.ok(jsonReport.dailyReport.section1_revenueGeneratedToday);

      // 5. GET /revenue (Web Dashboard)
      const resDash = await fetch(`http://127.0.0.1:${port}/revenue`);
      assert.strictEqual(resDash.status, 200);
      const textDash = await resDash.text();
      assert.ok(textDash.includes("AIFIE REVENUE AGENT"));
      assert.ok(textDash.includes("Zero-Capital"));
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
