import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../server.mjs";

import {
  CATALOG_MATRIX_53,
  REVENUE_VERTICALS,
  getOfferingById,
  getOfferingByKey,
  getOfferingsByVertical
} from "../src/revenue/catalog-matrix-53.mjs";

import { ZeroCapitalGrowthPath, GROWTH_MILESTONES } from "../src/revenue/zero-capital-growth-path.mjs";
import { DigitalProductFulfillmentEngine } from "../src/revenue/digital-product-fulfillment.mjs";
import { AutonomousBusinessSwarm } from "../src/revenue/business-swarm.mjs";

test("Revenue Swarm & 53 Offerings Matrix Test Suite", async (t) => {

  await t.test("1. Catalog Matrix 53: Exactly 53 offerings defined across 9 verticals with valid specs", () => {
    assert.strictEqual(CATALOG_MATRIX_53.length, 53, "Must contain exactly 53 numbered offerings");

    const expectedVerticals = [
      REVENUE_VERTICALS.SERVICES,
      REVENUE_VERTICALS.LEAD_GEN,
      REVENUE_VERTICALS.DIGITAL_PRODUCTS,
      REVENUE_VERTICALS.SUBSCRIPTIONS,
      REVENUE_VERTICALS.AGRITECH,
      REVENUE_VERTICALS.SAAS,
      REVENUE_VERTICALS.CONTENT_MEDIA,
      REVENUE_VERTICALS.FREELANCE,
      REVENUE_VERTICALS.HIGH_LEVERAGE_ASSETS
    ];

    for (const v of expectedVerticals) {
      const items = getOfferingsByVertical(v);
      assert.ok(items.length > 0, `Vertical ${v} should have at least one offering`);
    }

    // Verify each item from id 1 to 53
    for (let id = 1; id <= 53; id++) {
      const item = getOfferingById(id);
      assert.ok(item, `Offering with id ${id} must exist`);
      assert.strictEqual(item.id, id);
      assert.ok(item.key, `Offering #${id} must have a key`);
      assert.ok(item.name, `Offering #${id} must have a name`);
      assert.ok(item.priceInr > 0, `Offering #${id} INR price must be positive`);
      assert.ok(item.priceUsd > 0, `Offering #${id} USD price must be positive`);
      assert.ok(item.marginPercent >= 80, `Offering #${id} margin must be >= 80%`);
      assert.ok(item.turnaroundDays > 0, `Offering #${id} turnaround days must be positive`);
      assert.ok(Array.isArray(item.deliverables) && item.deliverables.length > 0, `Offering #${id} must have deliverables`);
    }

    // Lookup by key check
    const promptPack = getOfferingByKey("SELL_PROMPT_PACKS");
    assert.ok(promptPack);
    assert.strictEqual(promptPack.id, 16);

    const irrigation = getOfferingByKey("IRRIGATION_RECOMMENDATION_SERVICE");
    assert.ok(irrigation);
    assert.strictEqual(irrigation.id, 28);
  });

  await t.test("2. Zero-Capital Growth Path: Models progression from ₹0 to ₹1M+ across 5 stages", () => {
    const growth = new ZeroCapitalGrowthPath(0);
    assert.strictEqual(growth.getStatus().currentMilestoneStage, 1);
    assert.strictEqual(growth.getStatus().milestoneName, GROWTH_MILESTONES.STAGE_1_LEAD_GEN.name);

    growth.updateRevenue(30000);
    assert.strictEqual(growth.getStatus().currentMilestoneStage, 2);
    assert.strictEqual(growth.getStatus().milestoneName, GROWTH_MILESTONES.STAGE_2_SERVICES.name);

    growth.updateRevenue(150000);
    assert.strictEqual(growth.getStatus().currentMilestoneStage, 3);
    assert.strictEqual(growth.getStatus().milestoneName, GROWTH_MILESTONES.STAGE_3_RETAINERS.name);

    growth.updateRevenue(350000);
    assert.strictEqual(growth.getStatus().currentMilestoneStage, 4);
    assert.strictEqual(growth.getStatus().milestoneName, GROWTH_MILESTONES.STAGE_4_MICRO_SAAS.name);

    growth.updateRevenue(600000);
    assert.strictEqual(growth.getStatus().currentMilestoneStage, 5);
    assert.strictEqual(growth.getStatus().milestoneName, GROWTH_MILESTONES.STAGE_5_ASSETS_APIS.name);
  });

  await t.test("3. Digital Product Fulfillment: Generates instant assets for prompt packs, e-books, AgriTech, and SaaS", () => {
    const engine = new DigitalProductFulfillmentEngine();

    // 16: Prompt Packs
    const prompts = engine.generateProduct(16, { niche: "Real Estate SDR" });
    assert.ok(prompts.deliverable);
    assert.strictEqual(prompts.deliverable.type, "PROMPT_PACK_VAULT");
    assert.ok(prompts.deliverable.totalPrompts > 0);

    // 17: Niche E-Book
    const ebook = engine.generateProduct(17, { topic: "AI Automation for Local Kirana Stores" });
    assert.ok(ebook.deliverable);
    assert.strictEqual(ebook.deliverable.type, "NICHE_EBOOK");
    assert.ok(ebook.deliverable.tableOfContents.length >= 5);

    // 28: Irrigation Recommendation
    const irrigation = engine.generateProduct(28, { crop: "Wheat", fieldSizeAcres: 8 });
    assert.ok(irrigation.deliverable);
    assert.strictEqual(irrigation.deliverable.type, "AGRICULTURAL_IRRIGATION_SCHEDULE");
    assert.ok(irrigation.deliverable.recommendedSchedule.length >= 4);

    // 29: Crop Disease Detection
    const disease = engine.generateProduct(29, { crop: "Cotton", symptom: "Leaf curl and whitefly clusters" });
    assert.ok(disease.deliverable);
    assert.strictEqual(disease.deliverable.type, "CROP_DISEASE_DIAGNOSTIC_DOSSIER");
    assert.ok(disease.deliverable.confidenceScore > 0.8);

    // 32: Fertilizer Planning
    const fertilizer = engine.generateProduct(32, { crop: "Rice / Paddy", acreage: 5 });
    assert.ok(fertilizer.deliverable);
    assert.strictEqual(fertilizer.deliverable.type, "FERTILIZER_NPK_BALANCING_PLAN");
    assert.ok(fertilizer.deliverable.splitApplicationTimetable.length >= 3);

    // 33: Yield Prediction
    const yieldForecast = engine.generateProduct(33, { crop: "Soybean", areaAcres: 12 });
    assert.ok(yieldForecast.deliverable);
    assert.strictEqual(yieldForecast.deliverable.type, "YIELD_PREDICTION_ASSESSMENT");
    assert.ok(yieldForecast.deliverable.netRevenueEstimateInr.estTotalRevenueInr > 0);

    // 34: Micro-SaaS Runbook
    const saas = engine.generateProduct(34);
    assert.ok(saas.deliverable);
    assert.strictEqual(saas.deliverable.type, "SAAS_ARCHITECTURE_AND_RUNBOOK");
    assert.ok(saas.deliverable.systemBlueprint.backend);
  });

  await t.test("4. 7-Agent Business Swarm: Orchestrates Scout, Sales, Proposal, Delivery, Finance, Growth, Learning", async () => {
    const swarm = new AutonomousBusinessSwarm();
    const statusBefore = swarm.getSwarmStatus();
    assert.strictEqual(statusBefore.totalCycles, 0);
    assert.strictEqual(statusBefore.agents.length, 7);

    // Run cycle with specific AgriTech offering (28: Irrigation Recommendation)
    const cycle = await swarm.runSwarmCycle({
      offeringId: 28,
      clientName: "Punjab Agro Cooperative",
      company: "Kisan Farmer Producer Org",
      crop: "Wheat",
      soilType: "Clay Loam",
      fieldSizeAcres: 25
    });

    assert.ok(cycle.cycleId);
    assert.strictEqual(cycle.opportunity.offeringId, 28);
    assert.strictEqual(cycle.clientLead.clientName, "Punjab Agro Cooperative");
    assert.strictEqual(cycle.proposal.pricing.totalAmountInr, 8500);
    assert.strictEqual(cycle.delivery.qaPassed, true);
    assert.strictEqual(cycle.delivery.status, "READY_FOR_HANDOFF");
    assert.strictEqual(cycle.financialSettlement.grossCollectedInr, 8500);
    assert.ok(cycle.financialSettlement.reinvestment.allocations.cashReserve_20 > 0);
    assert.ok(cycle.expansionPlan.recommendedUpSells.length > 0);
    assert.ok(cycle.learningInsight.insightId);

    const statusAfter = swarm.getSwarmStatus();
    assert.strictEqual(statusAfter.totalCycles, 1);
    assert.ok(statusAfter.growthHighway.currentRevenueInr >= 8500);
  });

  await t.test("5. Server REST Routes: /revenue, /api/revenue/matrix/53, /api/revenue/swarm/*, /api/revenue/products/generate", async () => {
    const server = http.createServer(app);
    await new Promise((res) => server.listen(0, "127.0.0.1", res));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // GET /revenue dashboard HTML
      const dashRes = await fetch(`${baseUrl}/revenue`);
      assert.strictEqual(dashRes.status, 200);
      const dashHtml = await dashRes.text();
      assert.ok(dashHtml.includes("AIFIE 7-SWARM"));
      assert.ok(dashHtml.includes("53 Practical Revenue Offerings"));

      // GET /api/revenue/matrix/53 (all)
      const matrixRes = await fetch(`${baseUrl}/api/revenue/matrix/53`);
      assert.strictEqual(matrixRes.status, 200);
      const matrixData = await matrixRes.json();
      assert.strictEqual(matrixData.ok, true);
      assert.strictEqual(matrixData.count, 53);

      // GET /api/revenue/matrix/53?id=29 (Crop Disease)
      const itemRes = await fetch(`${baseUrl}/api/revenue/matrix/53?id=29`);
      assert.strictEqual(itemRes.status, 200);
      const itemData = await itemRes.json();
      assert.strictEqual(itemData.ok, true);
      assert.strictEqual(itemData.offering.key, "CROP_DISEASE_DETECTION");

      // GET /api/revenue/matrix/53?vertical=Agriculture-Focused
      const agriRes = await fetch(`${baseUrl}/api/revenue/matrix/53?vertical=Agriculture-Focused`);
      assert.strictEqual(agriRes.status, 200);
      const agriData = await agriRes.json();
      assert.strictEqual(agriData.ok, true);
      assert.strictEqual(agriData.count, 6);

      // GET /api/revenue/growth-path
      const growthRes = await fetch(`${baseUrl}/api/revenue/growth-path`);
      assert.strictEqual(growthRes.status, 200);
      const growthData = await growthRes.json();
      assert.strictEqual(growthData.ok, true);
      assert.ok(growthData.growthStatus.allMilestones.length === 5);

      // GET /api/revenue/swarm/status
      const swarmStatusRes = await fetch(`${baseUrl}/api/revenue/swarm/status`);
      assert.strictEqual(swarmStatusRes.status, 200);
      const swarmStatusData = await swarmStatusRes.json();
      assert.strictEqual(swarmStatusData.ok, true);
      assert.strictEqual(swarmStatusData.swarm.agents.length, 7);

      // POST /api/revenue/products/generate (Prompt Pack)
      const genRes = await fetch(`${baseUrl}/api/revenue/products/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offeringId: 16,
          clientName: "Alpha Lead Agency",
          niche: "High-Ticket B2B Consulting"
        })
      });
      assert.strictEqual(genRes.status, 200);
      const genData = await genRes.json();
      assert.strictEqual(genData.ok, true);
      assert.strictEqual(genData.product.offeringKey, "SELL_PROMPT_PACKS");

      // POST /api/revenue/swarm/cycle
      const cycleRes = await fetch(`${baseUrl}/api/revenue/swarm/cycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offeringId: 3,
          clientName: "Bengaluru Tech Hub",
          company: "Nexus AI Pvt Ltd"
        })
      });
      assert.strictEqual(cycleRes.status, 200);
      const cycleData = await cycleRes.json();
      assert.strictEqual(cycleData.ok, true);
      assert.strictEqual(cycleData.cycle.opportunity.offeringId, 3);
      assert.strictEqual(cycleData.cycle.delivery.qaPassed, true);
    } finally {
      server.close();
    }
  });
});
