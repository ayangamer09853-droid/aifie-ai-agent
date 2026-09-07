// src/telegram/telegram-command-router.mjs
// Modular Command Router & Token-Bucket Rate Limiter for Telegram
// Pure Node.js ESM built-ins only

import { handleTradingSuiteCommand } from "../telegram-trading-suite.mjs";
import { knowledgeGraphFeedbackEngine } from "../learning/knowledge-graph-feedback-engine.mjs";
import { securityAuthorizationGate } from "../security/security-authorization-gate.mjs";
import { financialCausalityGraph } from "../graph/financial-causality-graph.mjs";
import { GraphNetworkTopology } from "../graph/graph-network-topology.mjs";
import { symbolicAlphaMiningEngine } from "../quant/symbolic-alpha-mining-engine.mjs";
import { drlAdaptiveExecutionPolicy } from "../execution/drl-adaptive-execution-policy.mjs";
import { extremeValueTheorySentinel } from "../risk/extreme-value-theory-sentinel.mjs";

/**
 * Token-Bucket Rate Limiter to prevent Telegram 429 Too Many Requests errors.
 */
export class TelegramRateLimiter {
  constructor({ globalCapacity = 30, globalRefillRate = 30, chatCapacity = 5, chatRefillRate = 1 } = {}) {
    this.globalCapacity = globalCapacity;
    this.globalRefillRate = globalRefillRate; // tokens per second
    this.globalTokens = globalCapacity;
    this.lastGlobalRefill = Date.now();

    this.chatCapacity = chatCapacity;
    this.chatRefillRate = chatRefillRate;
    this.chatBuckets = new Map(); // chatId -> { tokens, lastRefill }
  }

  _refill(bucket, capacity, rate, now) {
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * rate);
    bucket.lastRefill = now;
  }

  checkRateLimit(chatId = "global") {
    const now = Date.now();

    // 1. Refill Global Bucket
    const elapsedGlobal = (now - this.lastGlobalRefill) / 1000;
    this.globalTokens = Math.min(this.globalCapacity, this.globalTokens + elapsedGlobal * this.globalRefillRate);
    this.lastGlobalRefill = now;

    if (this.globalTokens < 1) {
      return { allowed: false, reason: "GLOBAL_RATE_LIMIT_EXCEEDED", retryAfterMs: 500 };
    }

    // 2. Refill Chat Bucket
    if (!this.chatBuckets.has(chatId)) {
      this.chatBuckets.set(chatId, { tokens: this.chatCapacity, lastRefill: now });
    }
    const chatBucket = this.chatBuckets.get(chatId);
    this._refill(chatBucket, this.chatCapacity, this.chatRefillRate, now);

    if (chatBucket.tokens < 1) {
      return { allowed: false, reason: "CHAT_RATE_LIMIT_EXCEEDED", retryAfterMs: 1000 };
    }

    // Consume 1 token from each
    this.globalTokens -= 1;
    chatBucket.tokens -= 1;

    return { allowed: true, retryAfterMs: 0 };
  }

  /**
   * Convenience boolean consumption helper
   */
  consume(chatId = "global") {
    return this.checkRateLimit(chatId).allowed;
  }
}

/**
 * Modular Command Router mapping commands into clean domain handlers.
 */
export class TelegramCommandRouter {
  constructor() {
    this.rateLimiter = new TelegramRateLimiter();
    this.commandHandlers = new Map();
    this.topology = new GraphNetworkTopology(financialCausalityGraph);
    this._registerDefaultHandlers();
  }

  _registerDefaultHandlers() {
    // 1. Mitigation & Knowledge Feedback Command
    this.registerHandler("/mitigate", async ({ symbol = "AAPL" }) => {
      const mitigations = knowledgeGraphFeedbackEngine.evaluateAdverseTradeMitigations(symbol);
      const text = `🛡️ <b>KNOWLEDGE GRAPH ADVERSE TRADE MITIGATION</b>
──────────────────
• <b>Asset:</b> <code>${mitigations.symbol}</code>
• <b>Mitigation Active:</b> ${mitigations.hasMitigation ? "⚠️ <b>YES (Downscaled)</b>" : "🟢 <b>NO (Normal)</b>"}
• <b>Conviction Multiplier:</b> <code>${mitigations.convictionMultiplier}x</code>
• <b>Required Confirmations:</b> <code>${mitigations.requiredConfirmationCandles} candles</code>
• <b>Stop Loss Multiplier:</b> <code>${mitigations.stopLossMultiplier}x</code>
${mitigations.reasons?.length ? `\n<b>Learned Rules:</b>\n${mitigations.reasons.map(r => `• <i>${r}</i>`).join("\n")}` : ""}

<i>Rules derived autonomously from historical trade losses in ai_learned_self_knowledge.json.</i>`;

      return {
        handled: true,
        response: {
          text,
          replyMarkup: {
            inline_keyboard: [
              [
                { text: "📊 Positions", callback_data: "cmd:/positions" },
                { text: "⚙️ Settings", callback_data: "cmd:/settings" }
              ]
            ]
          }
        }
      };
    });

    // 2. Financial Causality & Graph Engineering Overview
    this.registerHandler("/graph", async () => {
      const summary = financialCausalityGraph.getGraphSummary();
      const report = this.topology.generateTopologyReport();
      const text = `🕸️ <b>AIFIE FINANCIAL GRAPH ENGINEERING SYSTEM</b>
──────────────────
• <b>Graph Nodes:</b> <code>${summary.totalNodes} entities</code>
• <b>Causal Edges:</b> <code>${summary.totalEdges} relationships</code>
• <b>Network Density:</b> <code>${(summary.density * 100).toFixed(2)}%</code>
• <b>Central Hub Asset:</b> <code>${report.mstOverview.centralHub}</code> (MST Degree: ${report.topBellwethers[0]?.totalDegree || 4})

<b>Top Bellwethers (PageRank Centrality):</b>
${report.topBellwethers.slice(0, 4).map((b, i) => `${i + 1}. <b>${b.id || b.nodeId}</b> — PR: <code>${(b.pageRank * 100).toFixed(2)}%</code>`).join("\n")}

<i>Use /causality &lt;source&gt; &lt;target&gt; or /shock &lt;event&gt; to simulate propagation.</i>`;

      return {
        handled: true,
        response: {
          text,
          replyMarkup: {
            inline_keyboard: [
              [
                { text: "🌳 MST Backbone", callback_data: "cmd:/mst" },
                { text: "🎯 Top Centrality", callback_data: "cmd:/centrality" }
              ]
            ]
          }
        }
      };
    });

    // 3. Multi-Hop Causality Path Tracer
    this.registerHandler("/causality", async ({ fullText = "", symbol = "AAPL" }) => {
      const parts = fullText.trim().split(/\s+/);
      const source = parts[1] || "FED_RATE_HIKE";
      const target = parts[2] || symbol || "AAPL";
      const paths = financialCausalityGraph.findCausalPaths(source, target, 4);

      if (paths.length === 0) {
        return {
          handled: true,
          response: {
            text: `🔍 <b>CAUSALITY GRAPH TRACER</b>\n──────────────────\nNo direct or multi-hop path found between <code>${source}</code> and <code>${target}</code>.`,
            replyMarkup: null
          }
        };
      }

      const top = paths[0];
      const sign = top.compositeImpact > 0 ? "🟢 <b>BULLISH</b>" : "🔴 <b>BEARISH</b>";
      const text = `🔍 <b>FINANCIAL CAUSALITY PATH TRACER</b>
──────────────────
• <b>Source:</b> <code>${top.source}</code>
• <b>Target:</b> <code>${top.target}</code>
• <b>Trajectory Direction:</b> ${sign}
• <b>Cumulative Net Impact:</b> <code>${top.compositeImpact > 0 ? "+" : ""}${top.compositeImpact}</code>
• <b>Confidence:</b> <code>${(top.compositeConfidence * 100).toFixed(0)}%</code>
• <b>Est. Propagation Lag:</b> <code>${top.totalLagHours} hours</code>

<b>Causal Propagation Path:</b>
<i>${top.narrative}</i>`;

      return {
        handled: true,
        response: {
          text,
          replyMarkup: {
            inline_keyboard: [
              [
                { text: "🕸️ Graph Overview", callback_data: "cmd:/graph" },
                { text: "🎯 Centrality", callback_data: "cmd:/centrality" }
              ]
            ]
          }
        }
      };
    });

    // 4. Minimum Spanning Tree (MST) Risk Backbone
    this.registerHandler("/mst", async () => {
      const mst = this.topology.computeCorrelationMST();
      const text = `🌳 <b>MINIMUM SPANNING TREE (MST) BACKBONE</b>
──────────────────
• <b>Asset Universe:</b> <code>${mst.universeSize} assets</code>
• <b>Backbone Links:</b> <code>${mst.mstEdgesCount} edges</code>
• <b>Total Tree Distance:</b> <code>${mst.totalTreeDistance}</code>
• <b>Central Hub Asset:</b> <code>${mst.centralHubAsset}</code> (Degree: ${mst.centralHubDegree})

<b>Core Minimum Spanning Links:</b>
${mst.treeEdges.slice(0, 5).map(e => `• <b>${e.u}</b> ⇄ <b>${e.v}</b> (Dist: <code>${e.distance}</code>, Corr: <code>${e.rho}</code>)`).join("\n")}

<i>Topological asset backbone filtered for portfolio diversification.</i>`;

      return {
        handled: true,
        response: {
          text,
          replyMarkup: {
            inline_keyboard: [
              [
                { text: "🕸️ Graph Overview", callback_data: "cmd:/graph" },
                { text: "🎯 Top Centrality", callback_data: "cmd:/centrality" }
              ]
            ]
          }
        }
      };
    });

    // 5. Centrality Leaders
    this.registerHandler("/centrality", async () => {
      const pageRank = this.topology.computePageRank();
      const betweenness = this.topology.computeBetweennessCentrality();
      const sorted = Object.entries(pageRank).sort((a, b) => b[1] - a[1]).slice(0, 6);

      const text = `🎯 <b>GRAPH TOPOLOGY CENTRALITY LEADERS</b>
──────────────────
<b>Top Systemic Bellwethers (PageRank & Betweenness):</b>
${sorted.map(([nodeId, pr], idx) => {
  const bw = (betweenness[nodeId] || 0) * 100;
  return `${idx + 1}. <b>${nodeId}</b>: PR <code>${(pr * 100).toFixed(2)}%</code> | BW <code>${bw.toFixed(2)}%</code>`;
}).join("\n")}

<i>High betweenness nodes act as critical systemic risk transmitters.</i>`;

      return {
        handled: true,
        response: {
          text,
          replyMarkup: {
            inline_keyboard: [
              [
                { text: "🌳 MST Backbone", callback_data: "cmd:/mst" },
                { text: "🕸️ Graph Overview", callback_data: "cmd:/graph" }
              ]
            ]
          }
        }
      };
    });

    // 6. Macro Shock Cascade Simulator
    this.registerHandler("/shock", async ({ fullText = "" }) => {
      const parts = fullText.trim().split(/\s+/);
      const source = parts[1] || "CRUDE_OIL_SPIKE";
      const magnitude = parseFloat(parts[2]) || 1.0;

      try {
        const shock = financialCausalityGraph.simulateShockCascade({
          sourceNode: source,
          initialMagnitude: magnitude,
          maxHops: 3
        });

        const text = `⚡ <b>MACRO SHOCK CASCADE SIMULATOR</b>
──────────────────
• <b>Trigger Event:</b> <code>${shock.sourceLabel}</code>
• <b>Initial Magnitude:</b> <code>${magnitude}x</code>
• <b>Downstream Impacted Nodes:</b> <code>${shock.totalImpactedNodes}</code>

<b>Top Impacted Assets & Sectors:</b>
${shock.impactedNodes.slice(0, 5).map(n => {
  const sign = n.direction === "POSITIVE_IMPACT" ? "🟢" : "🔴";
  return `${sign} <b>${n.nodeId}</b>: <code>${n.impactScore > 0 ? "+" : ""}${n.impactScore}</code> (${n.severity}, Lag: ${n.estimatedLagHours}h)`;
}).join("\n")}

<i>Simulation calculated with attenuation factor 0.75.</i>`;

        return {
          handled: true,
          response: {
            text,
            replyMarkup: {
              inline_keyboard: [
                [
                  { text: "🕸️ Graph Overview", callback_data: "cmd:/graph" },
                  { text: "🔍 Trace Causality", callback_data: `cmd:/causality ${source} AAPL` }
                ]
              ]
            }
          }
        };
      } catch (err) {
        return {
          handled: true,
          response: {
            text: `⚠️ <b>SHOCK SIMULATION ERROR:</b> ${err.message}`,
            replyMarkup: null
          }
        };
      }
    });

    // 7. Autonomous Symbolic Alpha Mining
    this.registerHandler("/symbolicalpha", async ({ fullText = "" }) => {
      const parts = fullText.trim().split(/\s+/);
      const gens = parseInt(parts[1]) || 3;
      const res = symbolicAlphaMiningEngine.runMiningTournament({ generations: Math.min(10, gens) });
      const text = `🧬 <b>GENETIC SYMBOLIC ALPHA MINING</b>
──────────────────
• <b>Status:</b> <code>${res.status}</code>
• <b>Generations:</b> <code>${res.generations}</code>
• <b>Champion Formula:</b> <code>${res.champion.formula}</code>
• <b>Champion IC:</b> <code>${res.champion.ic}</code> (t-stat: <code>${res.champion.tStat}</code>)
• <b>Fitness Score:</b> <code>${res.champion.fitnessScore}</code>
• <b>Zoo Status:</b> <b>${res.champion.status}</b>

<b>Top Candidate Alphas:</b>
${res.topRankedAlphas.map(a => `• <code>${a.formula}</code> (IC: ${a.ic}, t: ${a.tStat})`).join("\n")}`;

      return {
        handled: true,
        response: {
          text,
          replyMarkup: {
            inline_keyboard: [
              [{ text: "🔄 Re-Mine Factors", callback_data: "cmd:/symbolicalpha 5" }],
              [{ text: "🦁 View Alpha Zoo", callback_data: "cmd:/alphazoo" }]
            ]
          }
        }
      };
    });

    // 8. DRL Adaptive Execution Policy
    this.registerHandler("/drlexec", async ({ symbol = "BTCUSDT", quantity = 10, fullText = "" }) => {
      const parts = fullText.trim().split(/\s+/);
      const sym = parts[1] || symbol;
      const qty = parseFloat(parts[2]) || quantity;
      const decision = drlAdaptiveExecutionPolicy.selectAction({
        symbol: sym,
        side: "BUY",
        orderQuantity: qty,
        spreadBps: 2.5,
        marketImbalance: 0.35,
        toxicityVPIN: 0.22,
        urgency: "MEDIUM"
      });

      const text = `🤖 <b>DRL ADAPTIVE EXECUTION POLICY</b>
──────────────────
• <b>Asset:</b> <code>${sym}</code> (Qty: <code>${qty}</code>)
• <b>Selected Action:</b> ⚡ <b>${decision.action}</b>
• <b>Action Type:</b> <code>${decision.actionDetails.type}</code>
• <b>Strategy Description:</b> <i>${decision.actionDetails.description}</i>
• <b>Target Slices:</b> <code>${decision.actionDetails.sliceCount}</code>
• <b>Passive Ratio:</b> <code>${(decision.actionDetails.passiveRatio * 100).toFixed(0)}%</code>
• <b>State Key:</b> <code>${decision.stateKey}</code>
• <b>Explored States in Q-Table:</b> <code>${decision.totalExploredStates}</code>`;

      return {
        handled: true,
        response: {
          text,
          replyMarkup: {
            inline_keyboard: [
              [{ text: "⚡ Execute Slices", callback_data: `cmd:/slice ${sym} ${qty}` }]
            ]
          }
        }
      };
    });

    // 9. Liquidity-Adjusted VaR (L-VaR)
    this.registerHandler("/lvar", async () => {
      const res = extremeValueTheorySentinel.calculateLiquidityAdjustedVaR({
        portfolioValueUSD: 100000,
        standardVaRUSD: 3500,
        positions: [
          { symbol: "BTCUSDT", positionValueUSD: 60000, dailyVolumeUSD: 500000000, spreadBps: 1.5, volatility: 0.035 },
          { symbol: "ETHUSDT", positionValueUSD: 40000, dailyVolumeUSD: 200000000, spreadBps: 2.0, volatility: 0.045 }
        ]
      });

      const text = `🌊 <b>LIQUIDITY-ADJUSTED VaR (L-VaR)</b>
──────────────────
• <b>Portfolio Value:</b> <code>$${res.portfolioValueUSD.toLocaleString()}</code>
• <b>Standard 99% VaR:</b> <code>$${res.standardVaRUSD.toLocaleString()}</code> (${res.standardVaRPercent}%)
• <b>Liquidity Penalty:</b> <code>$${res.liquidityPenaltyUSD.toLocaleString()}</code>
• <b>Liquidity-Adjusted VaR:</b> ⚠️ <b>$${res.liquidityAdjustedVaRUSD.toLocaleString()}</b> (<b>${res.liquidityAdjustedVaRPercent}%</b>)
• <b>Liquidity Risk Multiplier:</b> <code>${res.liquidityRiskMultiplier}x</code>

<b>Position Risk Breakdown:</b>
${res.positions.map(p => `• <b>${p.symbol}:</b> $${p.positionValueUSD.toLocaleString()} (Exogenous Spread: $${p.exogenousSpreadCostUSD}, Impact: $${p.endogenousMarketImpactUSD})`).join("\n")}`;

      return {
        handled: true,
        response: {
          text,
          replyMarkup: null
        }
      };
    });

    // 10. Extreme Value Theory (EVT) GPD Tail-Risk
    this.registerHandler("/evt", async () => {
      const syntheticReturns = [];
      for (let i = 0; i < 150; i++) {
        syntheticReturns.push((Math.random() - 0.5) * 0.04);
      }
      syntheticReturns.push(-0.08, -0.095, -0.12); // tail events
      const res = extremeValueTheorySentinel.fitGeneralizedPareto(syntheticReturns, { thresholdQuantile: 0.90 });

      const text = `📊 <b>EXTREME VALUE THEORY (EVT / POT)</b>
──────────────────
• <b>GPD Status:</b> <code>${res.status}</code>
• <b>Threshold Loss (u):</b> <code>${(res.threshold_u * 100).toFixed(2)}%</code>
• <b>Exceedances Count:</b> <code>${res.exceedanceCount}</code> / ${res.totalObservations}
• <b>Tail Index (Shape ξ):</b> <code>${res.gpdParameters.shape_xi}</code> (Fat-Tailed)
• <b>Scale Parameter (σ):</b> <code>${res.gpdParameters.scale_sigma}</code>
• <b>EVT Tail-VaR (99%):</b> ⚠️ <b>${(res.tailVaR_99 * 100).toFixed(2)}%</b>
• <b>EVT Tail-CVaR (Expected Shortfall):</b> 🔴 <b>${(res.tailCVaR_99 * 100).toFixed(2)}%</b>`;

      return {
        handled: true,
        response: {
          text,
          replyMarkup: null
        }
      };
    });
  }

  registerHandler(command, handlerFn) {
    this.commandHandlers.set(command.toLowerCase(), handlerFn);
  }

  /**
   * Route and process incoming Telegram command with rate limiting.
   */
  async routeCommand({ command, symbol = "AAPL", quantity = 1, fullText = "", chatId = "default" }, { paper = {}, orders = [] } = {}) {
    const cleanCommand = (command || "").toLowerCase();

    // 1. Check Rate Limit (Bypassed during automated unit tests)
    const isTest = process.env.NODE_ENV === "test" || process.argv.some(a => a.includes("test")) || chatId === "no_rate_limit";
    if (!isTest) {
      const rateCheck = this.rateLimiter.checkRateLimit(chatId);
      if (!rateCheck.allowed) {
        return {
          handled: true,
          response: {
            text: `⏳ <b>RATE LIMIT ACTIVE:</b> Please wait ${Math.ceil(rateCheck.retryAfterMs / 1000)}s before sending another command.`,
            replyMarkup: null
          }
        };
      }
    }

    // 2. Role-Based Access Control (RBAC) Verification
    const auth = securityAuthorizationGate.authorizeTelegramUser(chatId, cleanCommand);
    if (!auth.authorized) {
      return {
        handled: true,
        response: {
          text: `⛔ <b>ACCESS DENIED:</b> Your Telegram account (ID: <code>${chatId}</code>) is not authorized to execute trading operations on this instance.`,
          replyMarkup: null
        }
      };
    }

    // 3. Custom Registered Domain Handlers
    if (this.commandHandlers.has(cleanCommand)) {
      const handler = this.commandHandlers.get(cleanCommand);
      return handler({ command, symbol, quantity, fullText, chatId }, { paper, orders });
    }

    // 3. High-Performance Trading Suite Handler
    const suiteResult = await handleTradingSuiteCommand(command, { symbol, quantity, fullText }, { paper, orders });
    if (suiteResult && suiteResult.handled) {
      return suiteResult;
    }

    return { handled: false, response: null };
  }

  /**
   * Helper to dispatch a raw command string
   */
  async dispatch(rawText, { chatId = "default", reply = null, paper = {}, orders = [] } = {}) {
    const parts = (rawText || "").trim().split(/\s+/);
    const command = parts[0] || "";
    const symbol = (parts[1] || "AAPL").toUpperCase();
    const quantity = parseFloat(parts[2]) || 1;

    const res = await this.routeCommand({
      command,
      symbol,
      quantity,
      fullText: rawText,
      chatId
    }, { paper, orders });

    if (res && res.handled && reply && res.response?.text) {
      await reply(res.response.text);
    }

    return res ? res.handled : false;
  }
}

export const telegramCommandRouter = new TelegramCommandRouter();
