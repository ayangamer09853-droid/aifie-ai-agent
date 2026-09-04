/**
 * AI War Room Interactive Visual Canvas & Synaptic Telemetry Interface v105.0
 * Zero external framework dependencies - Pure modern HTML5/CSS3/Vanilla JavaScript
 */

export const WAR_ROOM_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aifie AI War Room — 360° Synaptic Multi-Agent Debate & Vector RAG</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #080a0f;
      --bg-card: rgba(14, 19, 31, 0.85);
      --bg-glass: rgba(20, 27, 45, 0.65);
      --border-cyan: rgba(0, 240, 255, 0.25);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --cyan: #00f0ff;
      --green: #00ff88;
      --purple: #b026ff;
      --amber: #ffaa00;
      --red: #ff3366;
      --text-main: #f0f4fc;
      --text-muted: #8a99b5;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at top right, #111b2e 0%, var(--bg-primary) 70%);
      color: var(--text-main);
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      overflow-x: hidden;
      padding-bottom: 60px;
    }

    header {
      border-bottom: 1px solid var(--border-subtle);
      background: rgba(8, 10, 15, 0.9);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 14px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--cyan), var(--purple));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
    }

    .brand-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(90deg, #fff, var(--cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid rgba(0, 255, 136, 0.3);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      color: var(--green);
      font-family: 'JetBrains Mono', monospace;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 10px var(--green);
      animation: pulseDot 1.6s infinite ease-in-out;
    }

    @keyframes pulseDot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.6; }
    }

    .main-grid {
      display: grid;
      grid-template-columns: 360px 1fr 380px;
      gap: 20px;
      padding: 24px 28px;
      max-width: 1800px;
      margin: 0 auto;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 20px;
      backdrop-filter: blur(20px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .card-title {
      font-size: 15px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--cyan);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Agent Pods */
    .agent-pod {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px;
      border-radius: 12px;
      background: var(--bg-glass);
      border: 1px solid var(--border-subtle);
      margin-bottom: 10px;
      transition: all 0.25s ease;
    }

    .agent-pod:hover, .agent-pod.speaking {
      border-color: var(--cyan);
      box-shadow: 0 0 18px rgba(0, 240, 255, 0.2);
      transform: translateX(4px);
    }

    .agent-avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
    }

    .agent-info { flex: 1; }
    .agent-name { font-weight: 600; font-size: 14px; }
    .agent-sub { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
    .agent-status-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
    .tag-online { background: rgba(0, 255, 136, 0.15); color: var(--green); }

    /* Center War Room Dialogue Terminal */
    .war-room-center {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .control-bar {
      display: flex;
      gap: 10px;
      align-items: center;
      background: var(--bg-card);
      padding: 14px 18px;
      border-radius: 14px;
      border: 1px solid var(--border-subtle);
    }

    .symbol-select {
      background: #0b0f19;
      border: 1px solid var(--border-cyan);
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      outline: none;
    }

    .action-btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .btn-debate {
      background: linear-gradient(135deg, #00f0ff, #0088ff);
      color: #000;
      box-shadow: 0 0 16px rgba(0, 240, 255, 0.35);
    }
    .btn-debate:hover { transform: translateY(-2px); box-shadow: 0 0 24px rgba(0, 240, 255, 0.6); }

    .btn-rag {
      background: rgba(176, 38, 255, 0.15);
      color: var(--purple);
      border: 1px solid rgba(176, 38, 255, 0.4);
    }
    .btn-rag:hover { background: rgba(176, 38, 255, 0.25); }

    .btn-learn {
      background: rgba(0, 255, 136, 0.12);
      color: var(--green);
      border: 1px solid rgba(0, 255, 136, 0.3);
    }
    .btn-learn:hover { background: rgba(0, 255, 136, 0.22); }

    .terminal-box {
      flex: 1;
      min-height: 480px;
      background: #06080d;
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 20px;
      overflow-y: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .debate-msg {
      padding: 12px 16px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      border-left: 3px solid var(--cyan);
      animation: fadeIn 0.3s ease;
    }

    .debate-msg.vision { border-color: var(--cyan); }
    .debate-msg.quant { border-color: var(--purple); }
    .debate-msg.critic { border-color: var(--amber); }
    .debate-msg.moderator { border-color: var(--green); background: rgba(0, 255, 136, 0.05); }

    .speaker-tag { font-weight: 700; margin-bottom: 4px; display: flex; justify-content: space-between; }
    .speaker-time { font-size: 10px; color: var(--text-muted); font-weight: 400; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* RAG & Metrics Column */
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 13px;
    }

    .metric-val { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #fff; }

    .rag-match-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 12px;
      margin-top: 10px;
      font-size: 12px;
    }

    .rag-match-title { font-weight: 600; color: var(--cyan); margin-bottom: 4px; }
    .rag-match-sub { color: var(--text-muted); font-size: 11px; margin-bottom: 6px; }

    .pulse-ticker {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(6, 8, 13, 0.95);
      border-top: 1px solid var(--border-subtle);
      padding: 10px 24px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text-muted);
      z-index: 100;
    }

    .pulse-text { color: var(--green); font-weight: 600; }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-logo">⚡</div>
      <div>
        <div class="brand-title">AIFIE SYNAPTIC AI WAR ROOM</div>
        <div style="font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono';">360° Cognitive Multi-Agent Mesh & Semantic Vector RAG</div>
      </div>
    </div>
    <div class="status-badge">
      <span class="status-dot"></span>
      <span id="headerStatus">ALL 10 AI NODES ONLINE (24/7)</span>
    </div>
  </header>

  <div class="main-grid">
    <!-- Column 1: AI Agent Personas -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">🤖 Active AI Personas</div>
        <span style="font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono';">5 Deliberators</span>
      </div>

      <div class="agent-pod" id="podVision">
        <div class="agent-avatar">👁️</div>
        <div class="agent-info">
          <div class="agent-name">VisionEye AI</div>
          <div class="agent-sub">Llama-3.2-Vision (NVIDIA NIM)</div>
        </div>
        <span class="agent-status-tag tag-online">ONLINE</span>
      </div>

      <div class="agent-pod" id="podQuant">
        <div class="agent-avatar">📊</div>
        <div class="agent-info">
          <div class="agent-name">QuantMath AI</div>
          <div class="agent-sub">Alpha#101 & CVD Delta Z-Score</div>
        </div>
        <span class="agent-status-tag tag-online">ONLINE</span>
      </div>

      <div class="agent-pod" id="podMacro">
        <div class="agent-avatar">🌍</div>
        <div class="agent-info">
          <div class="agent-name">MacroSentinel AI</div>
          <div class="agent-sub">WorldMonitor DEFCON 2 Sentinel</div>
        </div>
        <span class="agent-status-tag tag-online">ONLINE</span>
      </div>

      <div class="agent-pod" id="podCritic">
        <div class="agent-avatar">🛡️</div>
        <div class="agent-info">
          <div class="agent-name">SkepticCritic AI</div>
          <div class="agent-sub">Adversarial Devil's Advocate</div>
        </div>
        <span class="agent-status-tag tag-online">ONLINE</span>
      </div>

      <div class="agent-pod" id="podModerator">
        <div class="agent-avatar">👑</div>
        <div class="agent-info">
          <div class="agent-name">ExecutiveModerator</div>
          <div class="agent-sub">Collaborative Synthesis Engine</div>
        </div>
        <span class="agent-status-tag tag-online">ONLINE</span>
      </div>

      <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-subtle);">
        <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">24/7 LEARNING TELEMETRY</div>
        <div class="metric-row">
          <span>Continuous Daemon:</span>
          <span class="metric-val" style="color: var(--green);" id="telemetryDaemon">RUNNING_24_7</span>
        </div>
        <div class="metric-row">
          <span>Evolution Score:</span>
          <span class="metric-val" style="color: var(--cyan);" id="telemetryEvo">91.6 / 100</span>
        </div>
        <div class="metric-row">
          <span>Total Learning Cycles:</span>
          <span class="metric-val" id="telemetryCycles">156</span>
        </div>
      </div>
    </div>

    <!-- Column 2: Center Live Debate Terminal -->
    <div class="war-room-center">
      <div class="control-bar">
        <select class="symbol-select" id="targetAsset">
          <option value="NVDA">NVDA (NVIDIA Corp)</option>
          <option value="AAPL">AAPL (Apple Inc)</option>
          <option value="BTC/USDT">BTC/USDT (Bitcoin)</option>
          <option value="ETH/USDT">ETH/USDT (Ethereum)</option>
          <option value="TSLA">TSLA (Tesla Inc)</option>
        </select>
        <button class="action-btn btn-debate" id="btnDebate">⚔️ Start Peer Debate</button>
        <button class="action-btn btn-rag" id="btnRag">🧠 Query Vector RAG</button>
        <button class="action-btn btn-learn" id="btnLearnCycle">🔄 Run Learning Cycle</button>
      </div>

      <div class="terminal-box" id="debateTerminal">
        <div class="debate-msg moderator">
          <div class="speaker-tag" style="color: var(--green);">
            <span>👑 ExecutiveModerator</span>
            <span class="speaker-time">INITIALIZED</span>
          </div>
          <div>AI War Room Synaptic Matrix is armed. Select an asset and click <b>Start Peer Debate</b> to watch VisionEye, QuantMath, SkepticCritic and MacroSentinel collaborate on real trade setups.</div>
        </div>
      </div>
    </div>

    <!-- Column 3: Semantic Vector RAG & Knowledge Vault -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">🧠 Semantic Vector RAG</div>
        <span style="font-size: 11px; color: var(--purple); font-family: 'JetBrains Mono';">64-Dim k-NN</span>
      </div>

      <div class="metric-row">
        <span>Vector Search Latency:</span>
        <span class="metric-val" style="color: var(--green);">&lt; 1.8ms</span>
      </div>
      <div class="metric-row">
        <span>Indexed Setup Vectors:</span>
        <span class="metric-val" id="ragIndexedCount">5 Core Scenarios</span>
      </div>
      <div class="metric-row">
        <span>Knowledge Vault Axioms:</span>
        <span class="metric-val" style="color: var(--cyan);" id="vaultAxiomsCount">8 Axioms</span>
      </div>

      <div style="margin-top: 16px;">
        <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">CLOSEST HISTORICAL SIMILARITY:</div>
        <div id="ragResultsContainer">
          <div class="rag-match-card">
            <div class="rag-match-title">VEC-SETUP-001: 4H Liquidity Sweep</div>
            <div class="rag-match-sub">Match: 94.2% | Win Rate: 84.5% | NVDA</div>
            <div style="color: var(--text-muted);">"Wait for 5m CVD positive delta confirmation before entry to eliminate fakeout risk."</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-subtle);">
        <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">ACTIVE EXECUTION GATE</div>
        <div class="metric-row">
          <span>Auto-Trader Conviction:</span>
          <span class="metric-val" style="color: var(--green);" id="gateConviction">88% (APPROVED)</span>
        </div>
        <div class="metric-row">
          <span>Alpaca Portfolio Value:</span>
          <span class="metric-val">$99,780.81</span>
        </div>
      </div>
    </div>
  </div>

  <div class="pulse-ticker">
    <div>SYNAPSE FEED: <span class="pulse-text" id="synapseFeedText">NEURAL BUS SYNCHRONIZED — ALL 10 AI NODES INTERCONNECTED</span></div>
    <div>WS: <span style="color: var(--green);">CONNECTED (ws://localhost:8787)</span></div>
  </div>

  <script>
    const terminal = document.getElementById("debateTerminal");
    const targetAssetSelect = document.getElementById("targetAsset");

    function addMessage(agent, role, text, type = "vision") {
      const div = document.createElement("div");
      div.className = \`debate-msg \${type}\`;
      const timeStr = new Date().toLocaleTimeString();
      div.innerHTML = \`
        <div class="speaker-tag">
          <span>\${agent} (\${role})</span>
          <span class="speaker-time">\${timeStr}</span>
        </div>
        <div>\${text}</div>
      \`;
      terminal.appendChild(div);
      terminal.scrollTop = terminal.scrollHeight;
    }

    // Trigger AI Peer Debate
    document.getElementById("btnDebate").addEventListener("click", async () => {
      const symbol = targetAssetSelect.value;
      addMessage("👑 ExecutiveModerator", "Facilitator", \`Initiating multi-turn collaborative deliberation for \${symbol}...\`, "moderator");

      try {
        const res = await fetch("/api/ai/collaboration/dialogue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol })
        });
        const data = await res.json();
        if (data.success && data.dialogue) {
          const rounds = data.dialogue.rounds || [];
          for (const r of rounds) {
            for (const m of r.messages) {
              const type = m.agent.toLowerCase().includes("vision") ? "vision" :
                           m.agent.toLowerCase().includes("quant") ? "quant" :
                           m.agent.toLowerCase().includes("critic") ? "critic" : "moderator";
              addMessage(m.agent, m.role || "Specialist", m.text, type);
            }
          }
          const c = data.dialogue.consensus;
          document.getElementById("gateConviction").textContent = \`\${c.convictionScore}% (\${c.action})\`;
        }
      } catch (err) {
        addMessage("System Error", "Gateway", err.message, "critic");
      }
    });

    // Query Vector RAG
    document.getElementById("btnRag").addEventListener("click", async () => {
      const symbol = targetAssetSelect.value;
      try {
        const res = await fetch("/api/ai/vector-rag/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, queryText: "liquidity sweep breakout order block" })
        });
        const data = await res.json();
        if (data.success && data.result) {
          const cont = document.getElementById("ragResultsContainer");
          cont.innerHTML = "";
          for (const m of data.result.topMatches) {
            const card = document.createElement("div");
            card.className = "rag-match-card";
            card.innerHTML = \`
              <div class="rag-match-title">\${m.id}: \${m.title}</div>
              <div class="rag-match-sub">Similarity: \${m.similarityPercent} | Win Rate: \${m.historicalWinRate} | \${m.symbol}</div>
              <div style="color: var(--text-muted);">\${m.lessonsLearned}</div>
            \`;
            cont.appendChild(card);
          }
          addMessage("🧠 SemanticVectorRAG", "Knowledge RAG", data.result.ragGuidance, "quant");
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Run Learning Cycle
    document.getElementById("btnLearnCycle").addEventListener("click", async () => {
      try {
        const res = await fetch("/api/ai/continuous-learning/cycle-now", { method: "POST" });
        const data = await res.json();
        if (data.success && data.result) {
          document.getElementById("telemetryEvo").textContent = \`\${data.result.evolutionScore} / 100\`;
          document.getElementById("telemetryCycles").textContent = data.result.cycleNumber;
          addMessage("🔄 ContinuousLearningDaemon", "24/7 Engine", \`Cycle #\${data.result.cycleNumber} complete! Discovery: \${data.result.latestDiscovery}\`, "moderator");
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Refresh telemetry periodically
    async function updateTelemetry() {
      try {
        const res = await fetch("/api/ai/continuous-learning/status");
        const data = await res.json();
        if (data.evolutionScore) {
          document.getElementById("telemetryEvo").textContent = \`\${data.evolutionScore} / 100\`;
          document.getElementById("telemetryCycles").textContent = data.totalCyclesLifetime;
        }
      } catch (_) {}
    }
    setInterval(updateTelemetry, 10000);
  </script>
</body>
</html>
`;
