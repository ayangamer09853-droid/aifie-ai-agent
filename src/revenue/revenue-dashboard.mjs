/**
 * AIFIE Autonomous Revenue & Business Operating System - Web Dashboard
 * Rich, futuristic glassmorphic UI with real-time telemetry, 16-service catalog,
 * interactive CRM pipeline, 8-step autonomous cycle trigger, and daily business report.
 * Zero external dependencies. Pure Node.js ESM.
 */

export const REVENUE_DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIFIE REVENUE AGENT — Autonomous Zero-Capital Business OS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #030712;
      --bg-card: rgba(15, 23, 42, 0.75);
      --bg-card-hover: rgba(30, 41, 59, 0.85);
      --border-card: rgba(56, 189, 248, 0.2);
      --neon-cyan: #00f0ff;
      --neon-green: #10b981;
      --neon-purple: #a855f7;
      --neon-amber: #f59e0b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --font-mono: 'JetBrains Mono', monospace;
      --font-ui: 'Outfit', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-ui);
      min-height: 100vh;
      overflow-x: hidden;
      background-image: 
        radial-gradient(ellipse 80% 80% at 50% -20%, rgba(14, 165, 233, 0.15), rgba(255, 255, 255, 0)),
        linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
      background-size: 100% 100%, 36px 36px, 36px 36px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 32px;
      background: rgba(3, 7, 18, 0.85);
      border-bottom: 1px solid var(--border-card);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-badge {
      background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
      color: #000;
      font-weight: 900;
      font-size: 14px;
      padding: 6px 12px;
      border-radius: 8px;
      letter-spacing: 1px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 12px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.5);
    }
    .btn-green {
      background: linear-gradient(135deg, #059669, #10b981);
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }
    .btn-green:hover {
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
    }
    .container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    .banner {
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(168, 85, 247, 0.1));
      border: 1px solid var(--border-card);
      border-radius: 16px;
      padding: 24px 32px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      backdrop-filter: blur(12px);
    }
    .banner-title {
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 6px;
    }
    .banner-desc {
      color: var(--text-muted);
      font-size: 14px;
      max-width: 760px;
      line-height: 1.5;
    }
    /* METRICS GRID */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .metric-card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 14px;
      padding: 20px;
      backdrop-filter: blur(12px);
      transition: all 0.2s ease;
    }
    .metric-card:hover {
      border-color: rgba(56, 189, 248, 0.5);
      transform: translateY(-2px);
    }
    .metric-label {
      font-size: 11px;
      color: var(--text-muted);
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
    }
    .metric-val {
      font-size: 24px;
      font-weight: 800;
      font-family: var(--font-mono);
      color: #fff;
    }
    .metric-sub {
      font-size: 11px;
      color: var(--neon-green);
      margin-top: 6px;
      font-family: var(--font-mono);
    }
    /* MAIN TWO-COLUMN LAYOUT */
    .main-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    @media (max-width: 1024px) {
      .main-grid { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(12px);
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 12px;
    }
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
    }
    .service-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .service-box:hover {
      background: var(--bg-card-hover);
      border-color: var(--neon-cyan);
    }
    .service-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
      color: #fff;
    }
    .service-price {
      font-size: 13px;
      color: var(--neon-green);
      font-family: var(--font-mono);
      margin-bottom: 8px;
    }
    .service-desc {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    /* REPORT & REINVESTMENT */
    .report-box {
      background: #020617;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.6;
      color: #e2e8f0;
      max-height: 420px;
      overflow-y: auto;
    }
    .reinvest-bar {
      margin-bottom: 12px;
    }
    .reinvest-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 4px;
      font-family: var(--font-mono);
    }
    .progress-track {
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--neon-cyan), var(--neon-green));
      border-radius: 3px;
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--neon-green);
      box-shadow: 0 0 8px var(--neon-green);
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="brand">
      <div class="brand-badge">AIFIE</div>
      <div>
        <div class="brand-title">REVENUE & BUSINESS OS</div>
        <div class="brand-sub">AUTONOMOUS ₹0-CAPITAL VALUE CREATION ENGINE</div>
      </div>
    </div>
    <div class="header-actions">
      <span class="status-dot"></span>
      <span style="font-size: 12px; font-family: var(--font-mono); color: var(--neon-green); margin-right: 12px;">SYSTEM ONLINE</span>
      <button class="btn btn-green" onclick="runAutonomousCycle()">⚡ Run Autonomous Business Cycle</button>
    </div>
  </header>

  <div class="container">
    <div class="banner">
      <div>
        <div class="banner-title">100% Ethical, Legal & Zero-Capital Value Creation</div>
        <div class="banner-desc">AIFIE operates an autonomous 8-step business execution loop across 16 high-value digital services (AI agents, chatbots, website development, copywriting, SEO, and workflow automation). Every rupee generated is automatically tracked, audited, and reinvested into tools, marketing, and intelligence.</div>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); text-align: right;">BOOTSTRAP CAPITAL</div>
        <div style="font-size: 26px; font-weight: 800; color: var(--neon-cyan); font-family: var(--font-mono);">₹0.00</div>
      </div>
    </div>

    <!-- 10 DASHBOARD METRICS -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Total Revenue Collected</div>
        <div class="metric-val" id="m-revenue">₹0</div>
        <div class="metric-sub">100% Real Digital Sales</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Net Profit (After COGS)</div>
        <div class="metric-val" id="m-profit">₹0</div>
        <div class="metric-sub">~93% Average Margin</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Active Clients</div>
        <div class="metric-val" id="m-clients">0</div>
        <div class="metric-sub">In Good Standing</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Monthly Recurring (MRR)</div>
        <div class="metric-val" id="m-mrr">₹0/mo</div>
        <div class="metric-sub">Retainer Subscriptions</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Conversion Rate</div>
        <div class="metric-val" id="m-conversion">0%</div>
        <div class="metric-sub">Lead-to-Client Rate</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Customer Satisfaction</div>
        <div class="metric-val" id="m-csat">100%</div>
        <div class="metric-sub">5.0/5.0 CSAT Score</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Leads Generated</div>
        <div class="metric-val" id="m-leads">0</div>
        <div class="metric-sub">BANT Qualified</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Outreach Sent</div>
        <div class="metric-val" id="m-outreach">0</div>
        <div class="metric-sub">Permission & Value First</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Deals Closed</div>
        <div class="metric-val" id="m-deals">0</div>
        <div class="metric-sub">Commercial Contracts</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Service Delivery Score</div>
        <div class="metric-val" id="m-delivery">95/100</div>
        <div class="metric-sub">QA Audit Standard</div>
      </div>
    </div>

    <!-- MAIN TWO-COLUMN SECTION -->
    <div class="main-grid">
      <!-- 16 SERVICE CATEGORIES -->
      <div class="card">
        <div class="card-title">
          <span>Active Service Catalog (16 Categories)</span>
          <span style="font-size: 12px; font-family: var(--font-mono); color: var(--neon-cyan);">Fixed-Price Tiers in ₹ & $</span>
        </div>
        <div class="services-grid" id="services-container">
          <!-- Populated dynamically via JS -->
        </div>
      </div>

      <!-- RIGHT COLUMN: PROFIT REINVESTMENT & DAILY REPORT -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div class="card">
          <div class="card-title">
            <span>Profit Reinvestment Pool (5 Pillars)</span>
            <span style="font-size: 12px; font-family: var(--font-mono); color: var(--neon-green);">Auto-Allocated</span>
          </div>
          <div class="reinvest-bar">
            <div class="reinvest-header"><span>Better Tools & API Compute (25%)</span><span id="p-tools">₹0</span></div>
            <div class="progress-track"><div class="progress-fill" style="width: 25%;"></div></div>
          </div>
          <div class="reinvest-bar">
            <div class="reinvest-header"><span>Marketing & Organic Growth (25%)</span><span id="p-marketing">₹0</span></div>
            <div class="progress-track"><div class="progress-fill" style="width: 25%;"></div></div>
          </div>
          <div class="reinvest-bar">
            <div class="reinvest-header"><span>Automation & CI/CD Pipelines (20%)</span><span id="p-automation">₹0</span></div>
            <div class="progress-track"><div class="progress-fill" style="width: 20%;"></div></div>
          </div>
          <div class="reinvest-bar">
            <div class="reinvest-header"><span>Training & Intelligence Research (15%)</span><span id="p-training">₹0</span></div>
            <div class="progress-track"><div class="progress-fill" style="width: 15%;"></div></div>
          </div>
          <div class="reinvest-bar">
            <div class="reinvest-header"><span>Infrastructure & Reserve Vault (15%)</span><span id="p-infra">₹0</span></div>
            <div class="progress-track"><div class="progress-fill" style="width: 15%;"></div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Official Daily Business Report</span>
            <span style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted);" id="report-date">Today</span>
          </div>
          <div class="report-box" id="daily-report-view">Loading daily report...</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function fetchRevenueStatus() {
      try {
        const res = await fetch('/api/revenue/status');
        const data = await res.json();
        if (data.ok && data.metrics) {
          const m = data.metrics;
          document.getElementById('m-revenue').textContent = m.revenue;
          document.getElementById('m-profit').textContent = m.profit;
          document.getElementById('m-clients').textContent = m.activeClients;
          document.getElementById('m-mrr').textContent = m.monthlyRecurringRevenue;
          document.getElementById('m-conversion').textContent = m.conversionRate;
          document.getElementById('m-csat').textContent = m.customerSatisfaction;
          document.getElementById('m-leads').textContent = m.leadsGenerated;
          document.getElementById('m-outreach').textContent = m.outreachSent;
          document.getElementById('m-deals').textContent = m.dealsClosed;
          document.getElementById('m-delivery').textContent = m.serviceDeliveryScore;

          if (data.reinvestmentLedger) {
            const r = data.reinvestmentLedger;
            document.getElementById('p-tools').textContent = '₹' + (r.tools || 0).toLocaleString();
            document.getElementById('p-marketing').textContent = '₹' + (r.marketing || 0).toLocaleString();
            document.getElementById('p-automation').textContent = '₹' + (r.automation || 0).toLocaleString();
            document.getElementById('p-training').textContent = '₹' + (r.training || 0).toLocaleString();
            document.getElementById('p-infra').textContent = '₹' + (r.infrastructure || 0).toLocaleString();
          }
        }
      } catch (e) { console.error('Status fetch error', e); }
    }

    async function fetchServices() {
      try {
        const res = await fetch('/api/revenue/services');
        const data = await res.json();
        if (data.ok && data.services) {
          const container = document.getElementById('services-container');
          container.innerHTML = '';
          data.services.forEach(s => {
            const starter = s.pricingTiers.starter;
            const pro = s.pricingTiers.pro;
            const el = document.createElement('div');
            el.className = 'service-box';
            el.innerHTML = \`
              <div class="service-title">\${s.name}</div>
              <div class="service-price">Starter: ₹\${starter.inr.toLocaleString()} ($ \${starter.usd})</div>
              <div class="service-desc">\${s.description}</div>
              <div style="margin-top: 8px; font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">
                Margin: \${s.marginPercent}% | Pro: ₹\${pro.inr.toLocaleString()}
              </div>
            \`;
            container.appendChild(el);
          });
        }
      } catch (e) { console.error('Services fetch error', e); }
    }

    async function fetchDailyReport() {
      try {
        const res = await fetch('/api/revenue/report/daily');
        const data = await res.json();
        if (data.ok && data.dailyReport) {
          const r = data.dailyReport;
          document.getElementById('report-date').textContent = r.reportDate;
          document.getElementById('daily-report-view').innerHTML = \`
            <div style="color: var(--neon-cyan); margin-bottom: 8px; font-weight: 700;">DAILY EXECUTIVE BRIEFING</div>
            <div><strong>1. Revenue Today:</strong> \${r.section1_revenueGeneratedToday}</div>
            <div><strong>2. Leads Acquired:</strong> \${r.section2_newLeadsAcquired}</div>
            <div><strong>3. Customers Signed:</strong> \${r.section3_newCustomersSigned}</div>
            <div><strong>4. Services Delivered:</strong> \${r.section4_servicesDelivered}</div>
            <div><strong>5. Customer Feedback:</strong> \${r.section5_customerFeedback}</div>
            <div style="margin-top: 6px;"><strong>6. Business Improvements:</strong></div>
            <ul style="padding-left: 18px; margin-bottom: 6px;">
              \${r.section6_businessImprovements.map(i => \`<li>\${i}</li>\`).join('')}
            </ul>
            <div><strong>7. Profit Allocation:</strong> \${r.section7_profitAllocation.totalNetProfit} into 5 Pillars</div>
            <div style="margin-top: 6px;"><strong>8. Next-Day Action Plan:</strong></div>
            <ul style="padding-left: 18px;">
              \${r.section8_nextDayActionPlan.map(a => \`<li>\${a}</li>\`).join('')}
            </ul>
          \`;
        }
      } catch (e) { console.error('Report fetch error', e); }
    }

    async function runAutonomousCycle() {
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '⏳ Executing 8-Step Loop...';
      try {
        const res = await fetch('/api/revenue/cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.ok) {
          alert('Autonomous Business Cycle Complete! New client converted, service delivered, and profit allocated.');
          await fetchRevenueStatus();
          await fetchDailyReport();
        }
      } catch (e) { alert('Error: ' + e.message); }
      finally {
        btn.disabled = false;
        btn.textContent = '⚡ Run Autonomous Business Cycle';
      }
    }

    // Initial Load & Polling
    fetchRevenueStatus();
    fetchServices();
    fetchDailyReport();
    setInterval(fetchRevenueStatus, 10000);
  </script>
</body>
</html>`;
