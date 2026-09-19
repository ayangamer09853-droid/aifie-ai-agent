/**
 * AIFIE AUTONOMOUS BUSINESS EMPIRE - Corporate Governance & Operations Dashboard
 * Level 1: Supreme Governor Agent (8-Pillar Decision Framework)
 * Level 2: Executive Council (CRO, CMO, CSO, CCO, COO, CFO 40/25/20/10/5, CIO)
 * 53 Practical Revenue Offerings • Zero-Capital Growth Highway • Instant Fulfillment
 * Zero external dependencies. Pure Node.js ESM.
 */

export const REVENUE_DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIFIE BUSINESS EMPIRE — Supreme Governor & Executive Council</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #030712;
      --bg-card: rgba(15, 23, 42, 0.75);
      --border-card: rgba(56, 189, 248, 0.2);
      --neon-cyan: #00f0ff;
      --neon-green: #10b981;
      --neon-purple: #a855f7;
      --neon-amber: #f59e0b;
      --neon-gold: #fbbf24;
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
      background: rgba(3, 7, 18, 0.9);
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
      background: linear-gradient(135deg, var(--neon-gold), var(--neon-purple));
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
    .btn-gold {
      background: linear-gradient(135deg, #d97706, #fbbf24);
      color: #000;
      font-weight: 800;
      box-shadow: 0 4px 14px rgba(251, 191, 36, 0.4);
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

    /* Governor Supreme Banner */
    .governor-banner {
      background: linear-gradient(135deg, rgba(30, 27, 75, 0.85), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(251, 191, 36, 0.35);
      border-radius: 14px;
      padding: 22px 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
    }
    .gov-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .gov-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--neon-gold);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .gov-badge {
      background: rgba(251, 191, 36, 0.2);
      border: 1px solid var(--neon-gold);
      color: var(--neon-gold);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 700;
    }
    .gov-framework-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }
    .gov-pillar {
      background: rgba(3, 7, 18, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .gov-pillar-num {
      font-size: 10px;
      color: var(--neon-cyan);
      font-family: var(--font-mono);
      font-weight: 700;
    }
    .gov-pillar-name {
      font-size: 12px;
      font-weight: 700;
      color: #fff;
    }

    /* Treasury 40/25/20/10/5 Bar */
    .treasury-box {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 12px;
      padding: 18px 22px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .treasury-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
      font-weight: 700;
      color: var(--neon-green);
    }
    .treasury-bars {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
    }
    @media (max-width: 900px) {
      .treasury-bars { grid-template-columns: 1fr; }
    }
    .tr-pillar {
      background: rgba(3, 7, 18, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tr-name { font-size: 11px; color: var(--text-muted); font-weight: 600; }
    .tr-val { font-size: 16px; font-weight: 800; color: var(--neon-cyan); font-family: var(--font-mono); }
    .tr-pct { font-size: 10px; color: var(--neon-green); font-family: var(--font-mono); }

    /* Executive Council Grid */
    .council-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .council-card {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(168, 85, 247, 0.3);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 0.2s ease;
    }
    .council-card:hover { transform: translateY(-2px); border-color: var(--neon-cyan); }
    .council-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .council-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--neon-purple);
    }
    .council-role {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.3;
    }

    /* Section & Matrix */
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
      font-size: 17px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
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
    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
      max-height: 480px;
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
    }
    .offering-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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
    .offering-price {
      font-size: 15px;
      font-weight: 800;
      color: var(--neon-green);
      font-family: var(--font-mono);
    }
    .offering-title {
      font-size: 14px;
      font-weight: 700;
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
      padding-left: 14px;
      line-height: 1.4;
    }

    /* Generator Box */
    .generator-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 900px) {
      .generator-grid { grid-template-columns: 1fr; }
    }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
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
      max-height: 260px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="brand">
      <div class="brand-badge">AIFIE 7-SWARM EMPIRE</div>
      <div>
        <div class="brand-title">AIFIE REVENUE AGENT — Autonomous Business Empire</div>
        <div class="brand-sub">Zero-Capital Business OS • Level 1: Supreme Governor • Level 2: Executive Council • 53 Matrix</div>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-gold" onclick="runEmpireCouncilCycle(event)">👑 Run Empire Council Cycle</button>
      <button class="btn btn-purple" onclick="runSwarmCycle(event)">⚡ Run Swarm Cycle</button>
      <button class="btn btn-green" onclick="refreshAllTelemetry()">🔄 Refresh Live Telemetry</button>
    </div>
  </header>

  <main class="container">
    <!-- Level 1: Supreme Governor Agent Banner -->
    <div class="governor-banner">
      <div class="gov-head">
        <div class="gov-title">
          <span>🏛️ Level 1: Supreme Governor Agent</span>
          <span class="gov-badge" id="gov-rate-badge">Approval Rate: 100%</span>
        </div>
        <div style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted);">
          Final Approval Authority • 8-Pillar Decision Framework
        </div>
      </div>
      <div class="gov-framework-grid">
        <div class="gov-pillar"><span class="gov-pillar-num">01. REVENUE</span><span class="gov-pillar-name">Expected ROI</span></div>
        <div class="gov-pillar"><span class="gov-pillar-num">02. COST</span><span class="gov-pillar-name">Capital Efficiency</span></div>
        <div class="gov-pillar"><span class="gov-pillar-num">03. RISK</span><span class="gov-pillar-name">Legal & Safety</span></div>
        <div class="gov-pillar"><span class="gov-pillar-num">04. CUSTOMER</span><span class="gov-pillar-name">Net Value Impact</span></div>
        <div class="gov-pillar"><span class="gov-pillar-num">05. SCALE</span><span class="gov-pillar-name">Marginal Effort</span></div>
        <div class="gov-pillar"><span class="gov-pillar-num">06. AUTO</span><span class="gov-pillar-name">Automation Potential</span></div>
        <div class="gov-pillar"><span class="gov-pillar-num">07. TRUST</span><span class="gov-pillar-name">Reputation Impact</span></div>
        <div class="gov-pillar"><span class="gov-pillar-num">08. VALUE</span><span class="gov-pillar-name">Long-Term Asset</span></div>
      </div>
    </div>

    <!-- Empire Treasury Allocation (40/25/20/10/5) -->
    <div class="treasury-box">
      <div class="treasury-header">
        <span>💰 Empire Capital Treasury & Reinvestment Allocation</span>
        <span style="font-size: 13px; font-family: var(--font-mono); color: var(--neon-cyan);" id="tr-total-rev">Collected: ₹0</span>
      </div>
      <div class="treasury-bars">
        <div class="tr-pillar">
          <div class="tr-name">Growth & Acquisition</div>
          <div class="tr-val" id="tr-growth">₹0</div>
          <div class="tr-pct">40% Allocation</div>
        </div>
        <div class="tr-pillar">
          <div class="tr-name">Reserve Vault</div>
          <div class="tr-val" id="tr-reserve">₹0</div>
          <div class="tr-pct">25% Allocation</div>
        </div>
        <div class="tr-pillar">
          <div class="tr-name">Infrastructure & Compute</div>
          <div class="tr-val" id="tr-infra">₹0</div>
          <div class="tr-pct">20% Allocation</div>
        </div>
        <div class="tr-pillar">
          <div class="tr-name">Research & Intelligence</div>
          <div class="tr-val" id="tr-research">₹0</div>
          <div class="tr-pct">10% Allocation</div>
        </div>
        <div class="tr-pillar">
          <div class="tr-name">Emergency Fund</div>
          <div class="tr-val" id="tr-emergency">₹0</div>
          <div class="tr-pct">5% Allocation</div>
        </div>
      </div>
    </div>

    <!-- Level 2: Executive Council Grid -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span>👔 Level 2: Executive Council (C-Suite Agents)</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">
          7 Reporting Autonomous Executives
        </div>
      </div>
      <div class="council-grid" id="council-grid-container">
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
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Select Offering</label>
            <select class="form-select" id="gen-offering-select">
              <option value="16">16. Prompt Engineering Packs (Enterprise Vault)</option>
              <option value="17">17. Niche E-Book Publishing Engine</option>
              <option value="18">18. Responsive HTML/CSS Website Templates</option>
              <option value="19">19. Executive Business Analytics Dashboards</option>
              <option value="20">20. Autonomous AI Agent Templates</option>
              <option value="28">28. Smart Irrigation Recommendation Schedule</option>
              <option value="29">29. Crop Disease Diagnostic Dossier</option>
              <option value="32">32. Fertilizer & N-P-K Nutrient Plan</option>
              <option value="33">33. Harvest Yield Forecast & Revenue Predictor</option>
              <option value="34">34. Micro-SaaS Invoicing Platform Spec</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Client or Enterprise Name</label>
            <input class="form-input" id="gen-client-input" value="Kisan Agrotech & Retail Co.">
          </div>
          <div class="form-group">
            <label class="form-label">Crop / Niche / Topic</label>
            <input class="form-input" id="gen-niche-input" value="Wheat / Mustard">
          </div>
          <button class="btn btn-green" onclick="generateInstantProduct(event)">🛠️ Generate Commercial Deliverable</button>
        </div>
        <div>
          <div class="form-label" style="margin-bottom: 6px;">Generated Output Dossier</div>
          <div class="gen-output" id="gen-output-box">// Output appears here...</div>
        </div>
      </div>
    </div>
  </main>

  <script>
    let allOfferings = [];
    let activeFilter = 'ALL';

    async function loadEmpireStatus() {
      try {
        const res = await fetch('/api/empire/status');
        const data = await res.json();
        if (data.ok && data.empire) {
          const emp = data.empire;
          if (emp.governor && emp.governor.audit) {
            document.getElementById('gov-rate-badge').textContent = 'Approval Rate: ' + emp.governor.audit.approvalRate;
          }
          const councilCont = document.getElementById('council-grid-container');
          councilCont.innerHTML = '';
          emp.executiveCouncil.forEach(c => {
            const card = document.createElement('div');
            card.className = 'council-card';
            card.innerHTML = \`
              <div class="council-head">
                <span class="council-title">\${c.title}</span>
                <span style="font-size: 10px; font-family: var(--font-mono); color: var(--neon-gold);">LEVEL 2</span>
              </div>
              <div style="font-weight: 700; font-size: 13px;">\${c.name}</div>
              <div class="council-role">\${c.role}</div>
            \`;
            councilCont.appendChild(card);
          });

          // CFO Treasury
          const cfo = emp.executiveCouncil.find(c => c.title === 'CFO');
          if (cfo && cfo.treasuryBalances) {
            const b = cfo.treasuryBalances;
            document.getElementById('tr-total-rev').textContent = 'Collected: ₹' + (cfo.cumulativeRevenueInr || 0).toLocaleString();
            document.getElementById('tr-growth').textContent = '₹' + (b.growth_40 || 0).toLocaleString();
            document.getElementById('tr-reserve').textContent = '₹' + (b.reserveVault_25 || 0).toLocaleString();
            document.getElementById('tr-infra').textContent = '₹' + (b.infrastructure_20 || 0).toLocaleString();
            document.getElementById('tr-research').textContent = '₹' + (b.research_10 || 0).toLocaleString();
            document.getElementById('tr-emergency').textContent = '₹' + (b.emergencyFund_5 || 0).toLocaleString();
          }
        }
      } catch (e) { console.error('Empire status error', e); }
    }

    async function loadMatrix() {
      try {
        const res = await fetch('/api/revenue/matrix/53');
        const data = await res.json();
        if (data.ok && data.offerings) {
          allOfferings = data.offerings;
          renderMatrix();
        }
      } catch (e) { console.error('Matrix error', e); }
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

    async function runEmpireCouncilCycle(evt) {
      const btn = evt.target;
      btn.disabled = true;
      btn.textContent = '⏳ Executive Council Running...';
      try {
        const res = await fetch('/api/empire/cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: 'Tata Agri & Global Innovations',
            company: 'Tata Enterprise Group',
            niche: 'AgriTech & Enterprise Automation'
          })
        });
        const data = await res.json();
        if (data.ok) {
          alert('Empire Cycle Complete! Governor Decision: ' + data.cycle.governorDecision.decision + ' (Score: ' + data.cycle.governorDecision.compositeScore + '/100)');
          await refreshAllTelemetry();
        }
      } catch (e) {
        alert('Empire execution error: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '👑 Run Empire Council Cycle';
      }
    }

    async function runSwarmCycle(evt) {
      const btn = evt.target;
      btn.disabled = true;
      btn.textContent = '⏳ Executing Swarm...';
      try {
        const res = await fetch('/api/revenue/swarm/cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.ok) {
          alert('Swarm Cycle complete! Gross collected: ₹' + data.cycle.financialSettlement.grossCollectedInr.toLocaleString());
          await refreshAllTelemetry();
        }
      } catch (e) { alert('Swarm error: ' + e.message); }
      finally {
        btn.disabled = false;
        btn.textContent = '⚡ Run Swarm Cycle';
      }
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

    async function refreshAllTelemetry() {
      await Promise.all([loadEmpireStatus(), loadMatrix()]);
    }

    refreshAllTelemetry();
    setInterval(refreshAllTelemetry, 15000);
  </script>
</body>
</html>`;
