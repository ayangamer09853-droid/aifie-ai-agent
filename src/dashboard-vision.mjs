/**
 * Multimodal Vision & Voice Dashboard View (Phase 7C)
 * Generates interactive UI widgets for Chart Vision, Voice Control,
 * Market Sentiment, and Vision-Powered Order Placement.
 */

export function createVisionDashboard() {
  return `
    <div class="dashboard-grid vision-multimodal-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; padding: 16px;">
      <div class="chart-analysis-panel card" style="background: rgba(18,24,38,0.85); border: 1px solid #233554; border-radius: 12px; padding: 16px;">
        <h3 style="color: #64ffda; margin-top: 0; display: flex; align-items: center; gap: 8px;">
          <span>📸</span> Real-Time Chart Vision
        </h3>
        <div style="background: #0a0e17; height: 180px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px dashed #233554;">
          <canvas id="live-chart" width="300" height="160"></canvas>
        </div>
        <div id="vision-signals" style="margin-top: 12px; font-family: monospace; font-size: 12px; color: #ccd6f6;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1f293d;">
            <span>Detected Pattern:</span> <strong style="color: #64ffda;" id="pattern-text">Cup-and-Handle</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1f293d;">
            <span>Trend Direction:</span> <strong style="color: #52c41a;" id="trend-text">UPTREND (Strength: 8/10)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span>Key Support:</span> <strong style="color: #ffa940;" id="support-text">$178.25</strong>
          </div>
        </div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button id="capture-chart" style="background: #1f293d; color: #64ffda; border: 1px solid #64ffda; padding: 8px 12px; border-radius: 6px; cursor: pointer; flex: 1;">📸 Capture Frame</button>
          <button id="analyze-now" style="background: #0284c7; color: #fff; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; flex: 1;">🔍 Analyze Vision</button>
        </div>
      </div>

      <div class="voice-command-panel card" style="background: rgba(18,24,38,0.85); border: 1px solid #233554; border-radius: 12px; padding: 16px;">
        <h3 style="color: #38bdf8; margin-top: 0; display: flex; align-items: center; gap: 8px;">
          <span>🎤</span> Voice Trading Co-Pilot
        </h3>
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button id="start-listening" style="background: #059669; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer;">🎤 Start Listening</button>
          <button id="stop-listening" style="background: #dc2626; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer;">⏹️ Stop</button>
        </div>
        <div id="voice-transcript" style="background: #0a0e17; padding: 10px; border-radius: 6px; min-height: 48px; font-size: 13px; color: #94a3b8; font-style: italic;">
          "Say 'Buy 10 shares of AAPL at market'..."
        </div>
        <div id="voice-parsed" style="margin-top: 10px; font-size: 12px; font-family: monospace; background: #131c2e; padding: 8px; border-radius: 6px; color: #64ffda;">
          Status: Ready for voice input
        </div>
      </div>

      <div class="sentiment-panel card" style="background: rgba(18,24,38,0.85); border: 1px solid #233554; border-radius: 12px; padding: 16px;">
        <h3 style="color: #f59e0b; margin-top: 0; display: flex; align-items: center; gap: 8px;">
          <span>📰</span> Market Sentiment (Vision + News)
        </h3>
        <div id="sentiment-score" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1f293d;">
          <span style="color: #94a3b8;">Macro Sentiment:</span>
          <span style="background: #065f46; color: #34d399; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">BULLISH (78%)</span>
        </div>
        <div id="top-signals" style="margin-top: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
          <div>• Fed rate cut expectations bolstering equity liquidity</div>
          <div>• Tech sector relative strength breakout confirmed</div>
          <div>• Volatility index (VIX) suppressed below 14.5</div>
        </div>
      </div>

      <div class="execution-panel card" style="background: rgba(18,24,38,0.85); border: 1px solid #233554; border-radius: 12px; padding: 16px;">
        <h3 style="color: #ec4899; margin-top: 0; display: flex; align-items: center; gap: 8px;">
          <span>⚡</span> Vision-Powered Execution
        </h3>
        <p style="font-size: 12px; color: #94a3b8; margin: 0 0 12px 0;">
          Automatically extracts recommended entry, stop-loss, and take-profit targets directly from chart analysis.
        </p>
        <button id="order-from-chart-btn" style="width: 100%; background: #9333ea; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;">
          📊 Place Order from Chart
        </button>
        <div id="pending-orders" style="margin-top: 10px; font-family: monospace; font-size: 11px; color: #64ffda;">
          [Simulation Ready] No active chart orders pending
        </div>
      </div>
    </div>
  `;
}
