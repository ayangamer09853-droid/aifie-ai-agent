export const integrationManifest = [
  ["TradingAgents", "research_orchestration"],
  ["Vibe-Trading", "research_orchestration"],
  ["worldmonitor", "market_intelligence"],
  ["OpenBB", "market_data"],
  ["paperclip", "agent_operations"],
  ["Kronos", "forecasting"],
  ["nautilus_trader", "backtesting_execution"],
  ["OpenAlice", "research_orchestration"],
  ["MiroFish", "market_intelligence"],
  ["public-apis", "provider_discovery"],
  ["munder-difflin", "developer_workflow"],
  ["AI-Trader", "research_orchestration"],
  ["ml-intern", "learning_resources"],
  ["QuantDinger", "quant_research"],
  ["reverse-skill", "capability_design"],
  ["openclaw", "agent_operations"],
  ["semantica", "semantic_reasoning"],
  ["TradingView-API", "charting_signals"],
  ["ccxt", "crypto_execution"],
  ["questdb", "time_series_db"],
  ["FinanceToolkit", "fundamental_analytics"],
  ["openalgo", "algo_trading_hub"],
  ["hermes-agent", "autonomous_reasoning"],
  ["vercel-skills", "agent_skills"]
].map(([repository, role]) => ({
  repository,
  role,
  state: "connected_active_adapter",
  liveOrderAuthority: false
}));

