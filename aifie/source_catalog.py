"""A deliberate map from downloaded research projects to Aifie capabilities."""

SOURCES = (
    ("TradingAgents", "agent_research", "Multi-agent financial research workflows."),
    ("Vibe-Trading", "agent_research", "Trading-oriented AI agent patterns."),
    ("worldmonitor", "market_intelligence", "World and market event monitoring."),
    ("OpenBB", "market_data", "Financial data and research platform."),
    ("paperclip", "operations", "Agent operations and coordination patterns."),
    ("Kronos", "forecasting", "Time-series forecasting research."),
    ("nautilus_trader", "execution", "Trading infrastructure and backtesting."),
    ("OpenAlice", "agent_research", "Financial AI research workflows."),
    ("MiroFish", "market_intelligence", "Scenario and event intelligence."),
    ("public-apis", "market_data", "Public API discovery."),
    ("munder-difflin", "developer_workflow", "Development workflow inspiration."),
    ("AI-Trader", "agent_research", "AI-driven market analysis."),
    ("ml-intern", "learning", "Machine-learning learning resources."),
    ("QuantDinger", "agent_research", "Quantitative research patterns."),
    ("reverse-skill", "learning", "Skill extraction and reuse patterns."),
    ("openclaw", "operations", "Autonomous agent operations."),
)


def as_dicts():
    return [
        {"repository": name, "capability": capability, "purpose": purpose}
        for name, capability, purpose in SOURCES
    ]
