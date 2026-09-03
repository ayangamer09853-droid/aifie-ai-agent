# Hugging Face Spaces — Aifie AI Reasoning Engine v91.0
# Deploy at: https://huggingface.co/spaces (new Space → Gradio → Python)
# SDK: gradio | License: apache-2.0

import gradio as gr
import os
import json
import urllib.request
import urllib.parse
from datetime import datetime

ORACLE_URL = os.getenv("ORACLE_CLOUD_URL", "")
FLY_URL = os.getenv("FLY_IO_URL", "")

def call_aifie_api(endpoint: str) -> dict:
    """Call primary or fallback Aifie API."""
    for base in [ORACLE_URL, FLY_URL]:
        if not base:
            continue
        try:
            url = base.rstrip("/") + endpoint
            with urllib.request.urlopen(url, timeout=5) as r:
                return json.loads(r.read())
        except Exception:
            continue
    return {"error": "All upstreams offline", "timestamp": datetime.utcnow().isoformat()}

def get_system_status():
    data = call_aifie_api("/api/status")
    return json.dumps(data, indent=2)

def get_binance_ticker(symbol: str):
    sym = (symbol or "BTCUSDT").upper().replace("/", "")
    data = call_aifie_api(f"/api/v90/binance/ticker?symbol={sym}")
    return f"💰 {sym}: ${data.get('price', 'N/A')} | Source: {data.get('source', 'N/A')}"

def get_agent_fleet():
    data = call_aifie_api("/api/v85/fleet/query")
    return json.dumps(data, indent=2)

def run_swarm_tick():
    try:
        req = urllib.request.Request(
            ORACLE_URL.rstrip("/") + "/api/admin/command",
            data=json.dumps({"command": "RUN_SWARM_TICK"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.dumps(json.loads(r.read()), indent=2)
    except Exception as e:
        return f"Error: {str(e)}"

with gr.Blocks(title="Aifie AI Agent — HuggingFace Space v91.0", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🤖 Aifie Sovereign AI Agent — HuggingFace Space v91.0")
    gr.Markdown("Live interface to the Aifie 20-Platform Omni-Cloud AI trading agent.")

    with gr.Tab("🌐 System Status"):
        status_btn = gr.Button("🔄 Refresh System Status")
        status_out = gr.Code(language="json", label="System Status")
        status_btn.click(get_system_status, outputs=status_out)

    with gr.Tab("📈 Live Crypto Tickers"):
        symbol_in = gr.Textbox(value="BTCUSDT", label="Symbol (e.g. BTCUSDT, ETHUSDT)")
        ticker_btn = gr.Button("📡 Fetch Live Price from Binance")
        ticker_out = gr.Textbox(label="Live Price")
        ticker_btn.click(get_binance_ticker, inputs=symbol_in, outputs=ticker_out)

    with gr.Tab("🤖 100-Agent Fleet"):
        fleet_btn = gr.Button("⚡ Query Agent Fleet Status")
        fleet_out = gr.Code(language="json", label="Fleet Status")
        fleet_btn.click(get_agent_fleet, outputs=fleet_out)

    with gr.Tab("🔧 Admin Commands"):
        swarm_btn = gr.Button("⚡ Run 100-Agent Swarm Tick")
        swarm_out = gr.Code(language="json", label="Swarm Result")
        swarm_btn.click(run_swarm_tick, outputs=swarm_out)

demo.launch()
