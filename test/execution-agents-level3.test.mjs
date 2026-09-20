import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import { app } from "../server.mjs";
import {
  AifieBusinessEmpire,
  EmpireSafetyEngine,
  EmpireSelfImprovementSystem,
  EmpireSuccessMetricsTracker,
  WebsiteAgent,
  SeoAgent,
  ContentAgent,
  SocialMediaAgent,
  VideoAgent,
  GraphicDesignAgent,
  ResearchAgent,
  AutomationAgent,
  EmailAgent,
  WhatsAppAgent,
  CrmAgent,
  AnalyticsAgent,
  ReportingAgent,
  ChiefIntelligenceAgent
} from "../src/revenue/business-empire.mjs";

test("Level 3 Specialized Execution Agents & 10-Step Autonomous Business Loop Suite", async (t) => {
  const empire = new AifieBusinessEmpire();

  await t.test("1. Level 3 Execution Agents: Verifies all 13 specialized execution agents produce valid deliverables", () => {
    // 1. Website Agent
    const website = new WebsiteAgent().execute({ title: "AgriFlow SaaS", niche: "Smart Agriculture" });
    assert.strictEqual(website.deliverableType, "WEBSITE_TEMPLATE");
    assert.ok(website.artifact.codeSnippet.includes("<!DOCTYPE html>"));
    assert.strictEqual(website.artifact.hasDarkTheme, true);

    // 2. SEO Agent
    const seo = new SeoAgent().execute({ domain: "agriflow.io", niche: "AgriTech Advisory" });
    assert.strictEqual(seo.deliverableType, "SEO_TECHNICAL_STRATEGY");
    assert.ok(seo.targetKeywords.length >= 3);
    assert.ok(seo.metaOptimization.titleTag.length > 0);

    // 3. Content Agent
    const content = new ContentAgent().execute({ topic: "Automated Crop Diagnostics" });
    assert.strictEqual(content.deliverableType, "CONTENT_SUITE");
    assert.ok(content.article.outline.length >= 4);

    // 4. Social Media Agent
    const social = new SocialMediaAgent().execute({ brand: "AgriFlow" });
    assert.strictEqual(social.deliverableType, "SOCIAL_CALENDAR_AND_POSTS");
    assert.strictEqual(social.posts.length, 3);

    // 5. Video Agent
    const video = new VideoAgent().execute({ title: "Precision Irrigation in 60 Seconds", durationSec: 60 });
    assert.strictEqual(video.deliverableType, "VIDEO_PRODUCTION_SCRIPT");
    assert.strictEqual(video.format, "Short-Form (Reels / Shorts / TikTok)");
    assert.ok(video.scenes.length >= 4);

    // 6. Graphic Design Agent
    const design = new GraphicDesignAgent().execute({ assetType: "Dashboard UI Kit" });
    assert.strictEqual(design.deliverableType, "DESIGN_SPECIFICATION");
    assert.ok(design.designTokens.colorPalette.primaryAccent);

    // 7. Research Agent
    const research = new ResearchAgent().execute({ market: "AgriTech Telemetry" });
    assert.strictEqual(research.deliverableType, "MARKET_RESEARCH_DOSSIER");
    assert.ok(research.tamSamSom.tamInr);
    assert.ok(research.swot.strengths.length > 0);

    // 8. Automation Agent
    const auto = new AutomationAgent().execute({ workflowName: "Lead to Invoice Webhook Pipeline" });
    assert.strictEqual(auto.deliverableType, "AUTOMATION_PIPELINE_RUNBOOK");
    assert.ok(auto.steps.length >= 5);
    assert.ok(auto.reliabilityMetrics.expectedUptimePercent >= 99);

    // 9. Email Agent
    const email = new EmailAgent().execute({ recipientName: "Dr. Vikram Patel", company: "Kisan Agro Corp" });
    assert.strictEqual(email.deliverableType, "EMAIL_CAMPAIGN_SEQUENCE");
    assert.ok(email.complianceNotice.includes("CAN-SPAM"));
    assert.strictEqual(email.sequence.length, 2);

    // 10. WhatsApp Agent
    const whatsapp = new WhatsAppAgent().execute({ clientName: "Vikram Patel", orderRef: "ORD-9921" });
    assert.strictEqual(whatsapp.deliverableType, "WHATSAPP_CONVERSATION_TREE");
    assert.ok(whatsapp.greetingTemplate.includes("Welcome to Aifie"));
    assert.ok(whatsapp.autoResponderTree["1"]);

    // 11. CRM Agent
    const crm = new CrmAgent().execute({ leadCount: 20, activeDeals: 8 });
    assert.strictEqual(crm.deliverableType, "CRM_PIPELINE_HEALTH_REPORT");
    assert.ok(crm.pipelineSummary.totalLeadsTracked === 20);

    // 12. Analytics Agent
    const analytics = new AnalyticsAgent().execute({ visits: 5000, leads: 500, customers: 50 });
    assert.strictEqual(analytics.deliverableType, "FUNNEL_ANALYTICS_REPORT");
    assert.strictEqual(analytics.funnelTelemetry.leadConversionRatePercent, 10.0);
    assert.strictEqual(analytics.funnelTelemetry.customerConversionRatePercent, 10.0);

    // 13. Reporting Agent
    const reporting = new ReportingAgent().execute({ empireMetrics: { revenueInr: 100000, profitInr: 90000 } });
    assert.strictEqual(reporting.deliverableType, "EXECUTIVE_GOVERNANCE_BRIEF");
    assert.ok(reporting.executiveSummary.governanceComplianceStatus.includes("VERIFIED"));
  });

  await t.test("2. Chief Intelligence Agent (CIO): Executes Market Research, Competitor Monitoring, Trend Detection & Opportunity Scoring", () => {
    const cio = new ChiefIntelligenceAgent();

    // 1. Market Research
    const research = cio.conductMarketResearch("Precision Agriculture AI", "India Tier-2/Tier-3");
    assert.strictEqual(research.sector, "Precision Agriculture AI");
    assert.strictEqual(research.zeroCapitalFeasibility, "VERY HIGH");
    assert.ok(research.keyDrivers.length >= 3);

    // 2. Competitor Monitoring
    const competitors = cio.monitorCompetitors("AgriTech");
    assert.ok(competitors.length >= 3);
    assert.ok(competitors[0].vulnerabilities.length > 0);

    // 3. Trend Detection
    const trendResult = cio.detectTrends();
    assert.ok(trendResult.trends.length >= 4);           // structured object (REQ-10)
    assert.ok(trendResult.trends[0].momentumScore >= 80); // top trend quality
    assert.ok(trendResult.topTrend.length > 5);           // topTrend string populated
    assert.ok(trendResult.count >= 4);                    // count field present

    // 4. Opportunity Scoring
    const score = cio.scoreOpportunity({ name: "WhatsApp Advisory Micro-SaaS", marginPercent: 94, demandScore: 90, capitalRequired: 0 });
    assert.ok(score.compositeOpportunityScore >= 85);
    assert.strictEqual(score.priorityLevel, "P1_IMMEDIATE_EXECUTION");
    assert.strictEqual(score.recommendedEntryMode, "ZERO_CAPITAL_BOOTSTRAP");
  });

  await t.test("3. Empire Safety Rules Engine: Enforces NEVER and ALWAYS policies and blocks unethical actions", () => {
    const safety = new EmpireSafetyEngine();

    // Compliant action
    const safeAudit = safety.audit({ actionType: "SEO_AUDIT", domain: "ethical-business.org" }, { governorApproved: true });
    assert.strictEqual(safeAudit.passed, true);
    assert.strictEqual(safeAudit.violations.length, 0);
    assert.strictEqual(safeAudit.alwaysChecksPassed.deliversRealValue, true);

    // Non-compliant action: Fraud
    assert.throws(() => {
      safety.assertSafe({ actionType: "DEAL", description: "Guaranteed 100x profit ponzi investment" });
    }, /EMPIRE_SAFETY_BREACH/);

    // Non-compliant action: Spam
    assert.throws(() => {
      safety.assertSafe({ actionType: "OUTREACH", description: "Scrape unsolicited contacts for cold blast spam" });
    }, /EMPIRE_SAFETY_BREACH/);

    // Non-compliant action: Unauthorized access
    assert.throws(() => {
      safety.assertSafe({ actionType: "AUTH", description: "Bypass auth to steal creds" });
    }, /EMPIRE_SAFETY_BREACH/);
  });

  await t.test("4. Self-Improvement System: Executes Daily, Weekly, and Monthly cycles", () => {
    const selfImprovement = new EmpireSelfImprovementSystem();

    // Daily Review
    const daily = selfImprovement.runDailyReview({ dealsWon: 2 });
    assert.strictEqual(daily.period, "DAILY");
    assert.ok(daily.wins.length >= 3);
    assert.ok(daily.bottlenecks.length >= 2);
    assert.ok(daily.workflowImprovements.length >= 2);
    assert.ok(daily.conversionOptimizations.length >= 2);

    // Weekly Review
    const weekly = selfImprovement.runWeeklyReview();
    assert.strictEqual(weekly.period, "WEEKLY");
    assert.strictEqual(weekly.customerAnalysis.csatScore, 5.0);
    assert.ok(weekly.serviceEvaluation.length >= 3);

    // Monthly Review
    const monthly = selfImprovement.runMonthlyReview({ revenueInr: 200000, profitInr: 180000 });
    assert.strictEqual(monthly.period, "MONTHLY");
    assert.strictEqual(monthly.revenueAudit.grossRevenueInr, 200000);
    assert.strictEqual(monthly.revenueAudit.netProfitInr, 180000);
    // Exact Rupee Parity Check
    const allocations = monthly.revenueAudit.treasuryAllocations;
    const sumAlloc = allocations.growth40 + allocations.reserveVault25 + allocations.infrastructure20 + allocations.research10 + allocations.emergencyFund5;
    assert.strictEqual(sumAlloc, 180000);
  });

  await t.test("5. 10 Success Metrics Tracker: Records metrics and monitors business asset growth", () => {
    const tracker = new EmpireSuccessMetricsTracker();
    tracker.recordTransaction({ revenueInr: 50000, profitInr: 45000, isRecurring: true });

    const metrics = tracker.getMetrics();
    assert.strictEqual(metrics.revenueInr, 50000);
    assert.strictEqual(metrics.profitInr, 45000);
    assert.strictEqual(metrics.cashReserveInr, Math.round(45000 * 0.25));
    assert.strictEqual(metrics.activeClients, 1);
    assert.strictEqual(metrics.recurringRevenueInr, 50000);
    assert.strictEqual(metrics.customerSatisfactionScore, 5.0);
    assert.ok(metrics.automationCoveragePercent > 90);
    assert.ok(metrics.businessAssetGrowthCount >= 53);
  });

  await t.test("6. Master Orchestrator: Executes 10-Step Autonomous Business Loop end-to-end", async () => {
    const cycle = await empire.runAutonomousBusinessLoop({
      clientName: "Sanjay Deshmukh",
      company: "Deccan Agritech Federation",
      niche: "Agricultural Advisory & Precision Soil Sensors",
      crop: "Soybean & Cotton",
      isRecurring: true
    });

    assert.ok(cycle.cycleId);
    assert.strictEqual(cycle.stepsLog.length, 10);
    assert.strictEqual(cycle.stepsLog[0].name, "Discover Opportunities");
    assert.strictEqual(cycle.stepsLog[1].name, "Generate Offers");
    assert.strictEqual(cycle.stepsLog[2].name, "Acquire Leads");
    assert.strictEqual(cycle.stepsLog[3].name, "Convert Customers");
    assert.strictEqual(cycle.stepsLog[4].name, "Deliver Services");
    assert.strictEqual(cycle.stepsLog[5].name, "Collect Payments");
    assert.strictEqual(cycle.stepsLog[6].name, "Gather Feedback");
    assert.strictEqual(cycle.stepsLog[7].name, "Improve Systems");
    assert.strictEqual(cycle.stepsLog[8].name, "Reinvest Profits");
    assert.strictEqual(cycle.stepsLog[9].name, "Scale Operations");

    assert.strictEqual(cycle.governorDecision.decision, "APPROVED");
    assert.ok(["COMPLETED", "FULFILLED_EXCELLENT"].includes(cycle.executionResult.status));
    assert.ok(cycle.level3Deliverable);
    assert.strictEqual(cycle.customerSuccessPlan.csatScore, 5.0);
    assert.ok(cycle.successMetrics.revenueInr > 0);
  });

  await t.test("7. Server REST Routes: /api/empire/level3, /api/empire/level3/execute, /api/empire/loop/step, /api/empire/self-improvement, /api/empire/metrics", async () => {
    const server = http.createServer(app);
    await new Promise((res) => server.listen(0, "127.0.0.1", res));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 1. GET /api/empire/level3
      const l3Res = await fetch(`${baseUrl}/api/empire/level3`);
      assert.strictEqual(l3Res.status, 200);
      const l3Data = await l3Res.json();
      assert.strictEqual(l3Data.ok, true);
      assert.strictEqual(l3Data.agentsCount, 13);
      assert.strictEqual(l3Data.agents.length, 13);

      // 2. POST /api/empire/level3/execute
      const execRes = await fetch(`${baseUrl}/api/empire/level3/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentKey: "seo",
          params: { domain: "empire-test.local", niche: "AgriTech AI" }
        })
      });
      assert.strictEqual(execRes.status, 200);
      const execData = await execRes.json();
      assert.strictEqual(execData.ok, true);
      assert.strictEqual(execData.deliverable.agent, "SEO Agent");

      // 3. POST /api/empire/loop/step
      const loopRes = await fetch(`${baseUrl}/api/empire/loop/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: "Anand Agro Producer",
          company: "Anand Cooperative Ltd",
          niche: "Farm Equipment Telemetry"
        })
      });
      assert.strictEqual(loopRes.status, 200);
      const loopData = await loopRes.json();
      assert.strictEqual(loopData.ok, true);
      assert.strictEqual(loopData.cycle.stepsLog.length, 10);

      // 4. GET /api/empire/self-improvement
      const siRes = await fetch(`${baseUrl}/api/empire/self-improvement`);
      assert.strictEqual(siRes.status, 200);
      const siData = await siRes.json();
      assert.strictEqual(siData.ok, true);
      assert.ok(siData.selfImprovement.dailyReviews.length >= 1);

      // 5. POST /api/empire/self-improvement/run (Weekly)
      const runSiRes = await fetch(`${baseUrl}/api/empire/self-improvement/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cadence: "weekly" })
      });
      assert.strictEqual(runSiRes.status, 200);
      const runSiData = await runSiRes.json();
      assert.strictEqual(runSiData.ok, true);
      assert.strictEqual(runSiData.cadence, "weekly");
      assert.strictEqual(runSiData.review.period, "WEEKLY");

      // 6. GET /api/empire/metrics
      const metricsRes = await fetch(`${baseUrl}/api/empire/metrics`);
      assert.strictEqual(metricsRes.status, 200);
      const metricsData = await metricsRes.json();
      assert.strictEqual(metricsData.ok, true);
      assert.ok(metricsData.metrics.revenueInr >= 0);
      assert.strictEqual(metricsData.metrics.customerSatisfactionScore, 5.0);
    } finally {
      server.close();
    }
  });
});
