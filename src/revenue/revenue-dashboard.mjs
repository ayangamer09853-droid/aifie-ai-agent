/**
 * AIFIE Autonomous Revenue & Business Operating System - Web Dashboard
 * Rich, futuristic glassmorphic UI with real-time telemetry, 53-offering matrix,
 * 7-Agent Business Swarm grid, Zero-Capital Growth Highway, and instant product generator.
 * Zero external dependencies. Pure Node.js ESM.
 */

export const REVENUE_DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIFIE REVENUE AGENT — 53-Offering Matrix & 7-Agent Business Swarm</title>
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
      --neon-emerald: #059669;
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
      font-size: 13px;
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
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.5);
    }
    .btn-green {
      background: linear-gradient(135deg, #059669, #10b981);
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }
    .btn-purple {
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
    }
    .container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Highway Banner */
    .highway-banner {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9));
      border: 1px solid var(--border-card);
      border-radius: 14px;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .highway-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .highway-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--neon-cyan);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .highway-track {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }
    .highway-step {
      background: rgba(3, 7, 18, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .highway-step.active {
      border-color: var(--neon-green);
      background: rgba(16, 185, 129, 0.1);
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
    }
    .highway-step-num {
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--neon-amber);
      font-weight: 700;
    }
    .highway-step-name {
      font-size: 13px;
      font-weight: 700;
    }
    .highway-step-target {
      font-size: 11px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s ease;
    }
    .kpi-card:hover { transform: translateY(-2px); }
    .kpi-title {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 600;
    }
    .kpi-value {
      font-size: 26px;
      font-weight: 800;
      color: var(--neon-cyan);
      font-family: var(--font-mono);
    }
    .kpi-sub {
      font-size: 11px;
      color: var(--neon-green);
      font-family: var(--font-mono);
    }

    /* Section Cards */
    .section-card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 14px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 12px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Swarm Agents Grid */
    .swarm-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
    }
    .swarm-card {
      background: rgba(3, 7, 18, 0.65);
      border: 1px solid rgba(168, 85, 247, 0.25);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
    }
    .swarm-agent-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--neon-purple);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .swarm-agent-role {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.3;
    }
    .swarm-agent-metric {
      font-size: 18px;
      font-weight: 800;
      font-family: var(--font-mono);
      color: #fff;
    }

    /* Filters */
    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }
    .tab-btn {
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tab-btn.active, .tab-btn:hover {
      background: var(--neon-cyan);
      color: #000;
      border-color: var(--neon-cyan);
      font-weight: 700;
    }

    /* 53 Matrix Grid */
    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
      max-height: 520px;
      overflow-y: auto;
      padding-right: 6px;
    }
    .offering-card {
      background: rgba(3, 7, 18, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .offering-card:hover {
      border-color: var(--neon-cyan);
      transform: translateY(-2px);
    }
    .offering-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .offering-id {
      background: rgba(56, 189, 248, 0.15);
      color: var(--neon-cyan);
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .offering-title {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
    }
    .offering-price {
      font-size: 15px;
      font-weight: 800;
      color: var(--neon-green);
      font-family: var(--font-mono);
    }
    .offering-meta {
      font-size: 11px;
      color: var(--text-muted);
      font-family: var(--font-mono);
      display: flex;
      justify-content: space-between;
    }
    .offering-deliverables {
      font-size: 11px;
      color: #cbd5e1;
      line-height: 1.4;
      padding-left: 14px;
    }

    /* Generator Box */
    .generator-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 900px) {
      .generator-grid { grid-template-columns: 1fr; }
      .highway-track { grid-template-columns: 1fr; }
    }
    .gen-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .form-select, .form-input {
      background: rgba(3, 7, 18, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #fff;
      padding: 10px 12px;
      font-family: var(--font-ui);
      font-size: 13px;
    }
    .gen-output {
      background: rgba(3, 7, 18, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 14px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: #38bdf8;
      max-height: 280px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="brand">
      <div class="brand-badge">AIFIE 7-SWARM</div>
      <div>
        <div class="brand-title">Autonomous Revenue OS</div>
        <div class="brand-sub">53 Practical Revenue Offerings • Zero-Capital Highway • 7 Multi-Agent Swarm</div>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-purple" onclick="runSwarmCycle(event)">⚡ Run 7-Agent Swarm Cycle</button>
      <button class="btn btn-green" onclick="refreshAllTelemetry()">🔄 Refresh Live Telemetry</button>
    </div>
  </header>

  <main class="container">
    <!-- Zero-Capital Growth Highway Banner -->
    <div class="highway-banner">
      <div class="highway-header">
        <div class="highway-title">
          <span>🚀 Zero-Capital Practical Growth Highway</span>
          <span style="font-size: 12px; color: var(--neon-green); font-family: var(--font-mono);" id="highway-status-badge">Stage 1: Active</span>
        </div>
        <div style="font-size: 13px; font-family: var(--font-mono); color: var(--text-muted);">
          Progression Target: <span style="color: var(--neon-cyan); font-weight: 700;" id="highway-progress-txt">0%</span>
        </div>
      </div>
      <div class="highway-track" id="highway-track-container">
        <!-- Injected via JavaScript -->
      </div>
    </div>

    <!-- Live Performance KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Gross Revenue Collected</div>
        <div class="kpi-value" id="kpi-revenue">₹0</div>
        <div class="kpi-sub" id="kpi-revenue-usd">$0 USD Equivalent</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Swarm Cycles Completed</div>
        <div class="kpi-value" id="kpi-cycles">0</div>
        <div class="kpi-sub">7 Autonomous Stages</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Catalog Offerings</div>
        <div class="kpi-value">53</div>
        <div class="kpi-sub">Across 9 High-ROI Verticals</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Lead Conversion Rate</div>
        <div class="kpi-value" id="kpi-conversion">24.5%</div>
        <div class="kpi-sub">BANT Qualified Prospecting</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Customer Satisfaction</div>
        <div class="kpi-value">100%</div>
        <div class="kpi-sub">Zero-Defect QA Handoff</div>
      </div>
    </div>

    <!-- 7-Agent Business Swarm -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span>🐝 7-Agent Autonomous Business Swarm</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">
          Active Swarm Topology: Fully Operational
        </div>
      </div>
      <div class="swarm-grid" id="swarm-grid-container">
        <!-- Injected via JavaScript -->
      </div>
    </div>

    <!-- 53 Practical Revenue Offerings Matrix -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span>💎 53 Practical Revenue Offerings Matrix</span>
          <span style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted);" id="matrix-count-badge">53 Offerings Available</span>
        </div>
        <div class="filter-tabs" id="filter-tabs-container">
          <button class="tab-btn active" onclick="filterVertical('ALL')">All 53</button>
          <button class="tab-btn" onclick="filterVertical('Service-Based')">1. Services (1-10)</button>
          <button class="tab-btn" onclick="filterVertical('Lead Generation')">2. Lead Gen (11-15)</button>
          <button class="tab-btn" onclick="filterVertical('Digital Products')">3. Digital Products (16-22)</button>
          <button class="tab-btn" onclick="filterVertical('Subscription Revenue')">4. Subscriptions (23-27)</button>
          <button class="tab-btn" onclick="filterVertical('Agriculture-Focused')">5. AgriTech (28-33)</button>
          <button class="tab-btn" onclick="filterVertical('Software / SaaS')">6. Micro-SaaS (34-39)</button>
          <button class="tab-btn" onclick="filterVertical('Content & Media')">7. Media (40-44)</button>
          <button class="tab-btn" onclick="filterVertical('Marketplace & Freelance')">8. Freelance (45-48)</button>
          <button class="tab-btn" onclick="filterVertical('High-Leverage Asset Building')">9. High-Leverage Assets (49-53)</button>
        </div>
      </div>
      <div class="matrix-grid" id="matrix-grid-container">
        <!-- Injected via JavaScript -->
      </div>
    </div>

    <!-- Instant Product & AgriTech Deliverable Generator -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span>⚡ Instant Digital Product & AgriTech Fulfillment Generator</span>
        </div>
        <div style="font-size: 12px; color: var(--neon-cyan); font-family: var(--font-mono);">
          Zero Marginal Cost Delivery
        </div>
      </div>
      <div class="generator-grid">
        <div class="gen-form">
          <div class="form-group">
            <label class="form-label">Select Offering Type</label>
            <select class="form-select" id="gen-offering-select">
              <option value="16">16. Prompt Engineering Packs (Enterprise Vault)</option>
              <option value="17">17. Niche E-Book Publishing Engine</option>
              <option value="18">18. Responsive HTML/CSS Website Templates</option>
              <option value="19">19. Executive Business Analytics Dashboards</option>
              <option value="20">20. Autonomous AI Agent Templates</option>
              <option value="24">24. Agri Advisory: Comprehensive Schedule</option>
              <option value="28">28. Smart Irrigation Recommendation Schedule</option>
              <option value="29">29. Crop Disease Diagnostic Dossier</option>
              <option value="32">32. Fertilizer & N-P-K Nutrient Plan</option>
              <option value="33">33. Harvest Yield Forecast & Revenue Predictor</option>
              <option value="34">34. Micro-SaaS Invoicing Platform Spec</option>
              <option value="40">40. Viral Video Script & Hook Generator</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Client or Enterprise Name</label>
            <input class="form-input" id="gen-client-input" value="Kisan Agrotech & Retail Co." placeholder="e.g. Acme Innovations">
          </div>
          <div class="form-group">
            <label class="form-label">Crop / Niche / Topic (Optional)</label>
            <input class="form-input" id="gen-niche-input" value="Wheat / Mustard" placeholder="e.g. Wheat, Tomato, B2B SaaS">
          </div>
          <button class="btn btn-green" onclick="generateInstantProduct(event)">🛠️ Generate Commercial Deliverable</button>
        </div>
        <div>
          <div class="form-label" style="margin-bottom: 6px;">Generated Output Dossier</div>
          <div class="gen-output" id="gen-output-box">// Select an offering and click 'Generate Commercial Deliverable'...</div>
        </div>
      </div>
    </div>
  </main>

  <script>
    let allOfferings = [];
    let activeFilter = 'ALL';

    async function loadGrowthPath() {
      try {
        const res = await fetch('/api/revenue/growth-path');
        const data = await res.json();
        if (data.ok && data.growthStatus) {
          const s = data.growthStatus;
          document.getElementById('highway-status-badge').textContent = s.milestoneName;
          document.getElementById('highway-progress-txt').textContent = s.progressPercent;
          document.getElementById('kpi-revenue').textContent = '₹' + s.currentRevenueInr.toLocaleString();
          document.getElementById('kpi-revenue-usd').textContent = '$' + Math.round(s.currentRevenueInr / 83).toLocaleString() + ' USD Equivalent';

          const track = document.getElementById('highway-track-container');
          track.innerHTML = '';
          s.allMilestones.forEach(m => {
            const el = document.createElement('div');
            el.className = 'highway-step ' + (m.stage === s.currentMilestoneStage ? 'active' : '');
            el.innerHTML = \`
              <div class="highway-step-num">STAGE \${m.stage}</div>
              <div class="highway-step-name">\${m.name}</div>
              <div class="highway-step-target">Target: ₹\${m.targetRevenueInr.toLocaleString()}</div>
            \`;
            track.appendChild(el);
          });
        }
      } catch (e) { console.error('Growth path error', e); }
    }

    async function loadSwarmStatus() {
      try {
        const res = await fetch('/api/revenue/swarm/status');
        const data = await res.json();
        if (data.ok && data.swarm) {
          document.getElementById('kpi-cycles').textContent = data.swarm.totalCycles;
          const container = document.getElementById('swarm-grid-container');
          container.innerHTML = '';
          data.swarm.agents.forEach(a => {
            const card = document.createElement('div');
            card.className = 'swarm-card';
            const metricKey = Object.keys(a).find(k => k.includes('Count') || k.includes('Scouted') || k.includes('Outreach') || k.includes('Generated') || k.includes('Delivered') || k.includes('Active') || k.includes('totalInvoices'));
            const metricVal = metricKey ? a[metricKey] : 0;
            card.innerHTML = \`
              <div class="swarm-agent-name">🤖 \${a.name}</div>
              <div class="swarm-agent-role">\${a.role}</div>
              <div class="swarm-agent-metric">\${metricVal}</div>
            \`;
            container.appendChild(card);
          });
        }
      } catch (e) { console.error('Swarm status error', e); }
    }

    async function loadMatrix() {
      try {
        const res = await fetch('/api/revenue/matrix/53');
        const data = await res.json();
        if (data.ok && data.offerings) {
          allOfferings = data.offerings;
          renderMatrix();
        }
      } catch (e) { console.error('Matrix load error', e); }
    }

    function renderMatrix() {
      const container = document.getElementById('matrix-grid-container');
      container.innerHTML = '';
      const list = activeFilter === 'ALL' 
        ? allOfferings 
        : allOfferings.filter(o => o.vertical === activeFilter);

      document.getElementById('matrix-count-badge').textContent = list.length + ' Offerings Displayed';

      list.forEach(o => {
        const card = document.createElement('div');
        card.className = 'offering-card';
        card.innerHTML = \`
          <div class="offering-head">
            <span class="offering-id">#\${o.id}</span>
            <span class="offering-price">₹\${o.priceInr.toLocaleString()} ($ \${o.priceUsd})</span>
          </div>
          <div class="offering-title">\${o.name}</div>
          <div class="offering-meta">
            <span>\${o.vertical}</span>
            <span>Margin: \${o.marginPercent}% • \${o.turnaroundDays}d</span>
          </div>
          <ul class="offering-deliverables">
            \${o.deliverables.map(d => \`<li>\${d}</li>\`).join('')}
          </ul>
        \`;
        container.appendChild(card);
      });
    }

    function filterVertical(v) {
      activeFilter = v;
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.includes(v) || (v === 'ALL' && b.textContent.includes('All')));
      });
      renderMatrix();
    }

    async function generateInstantProduct(evt) {
      const btn = evt.target;
      btn.disabled = true;
      btn.textContent = '⚙️ Generating Deliverable...';
      const offeringId = document.getElementById('gen-offering-select').value;
      const clientName = document.getElementById('gen-client-input').value;
      const niche = document.getElementById('gen-niche-input').value;

      try {
        const res = await fetch('/api/revenue/products/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offeringId, clientName, crop: niche, topic: niche, niche })
        });
        const data = await res.json();
        if (data.ok) {
          document.getElementById('gen-output-box').textContent = JSON.stringify(data.product, null, 2);
        } else {
          document.getElementById('gen-output-box').textContent = 'Error: ' + data.error;
        }
      } catch (e) {
        document.getElementById('gen-output-box').textContent = 'Error: ' + e.message;
      } finally {
        btn.disabled = false;
        btn.textContent = '🛠️ Generate Commercial Deliverable';
      }
    }

    async function runSwarmCycle(evt) {
      const btn = evt.target;
      btn.disabled = true;
      btn.textContent = '⏳ Executing 7 Agents...';
      try {
        const res = await fetch('/api/revenue/swarm/cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: 'Agro & Digital Micro-Enterprise',
            targetNiche: 'Agricultural Cooperatives & Retailers'
          })
        });
        const data = await res.json();
        if (data.ok) {
          alert('Swarm Cycle #' + data.cycle.cycleId + ' complete! Gross collected: ₹' + data.cycle.financialSettlement.grossCollectedInr.toLocaleString());
          await refreshAllTelemetry();
        }
      } catch (e) {
        alert('Swarm execution error: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Run 7-Agent Swarm Cycle';
      }
    }

    async function refreshAllTelemetry() {
      await Promise.all([loadGrowthPath(), loadSwarmStatus(), loadMatrix()]);
    }

    // Initial boot
    refreshAllTelemetry();
    setInterval(refreshAllTelemetry, 15000);
  </script>
</body>
</html>`;
