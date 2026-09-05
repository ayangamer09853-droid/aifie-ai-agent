$repos = @(
  @{ name = 'browser-use'; url = 'https://github.com/browser-use/browser-use.git' },
  @{ name = 'agentmemory'; url = 'https://github.com/rohitg00/agentmemory.git' },
  @{ name = 'scientific-agent-skills'; url = 'https://github.com/K-Dense-AI/scientific-agent-skills.git' },
  @{ name = 'Anthropic-Cybersecurity-Skills'; url = 'https://github.com/mukul975/Anthropic-Cybersecurity-Skills.git' },
  @{ name = 'rakazo'; url = 'https://github.com/elie222/rakazo.git' },
  @{ name = 'OpenMausBot'; url = 'https://github.com/milind-soni/OpenMausBot.git' },
  @{ name = 'ponytail'; url = 'https://github.com/DietrichGebert/ponytail.git' },
  @{ name = '500-AI-Agents-Projects'; url = 'https://github.com/ashishpatel26/500-AI-Agents-Projects.git' },
  @{ name = 'FinceptTerminal'; url = 'https://github.com/Fincept-Corporation/FinceptTerminal.git' },
  @{ name = 'ai-berkshire'; url = 'https://github.com/xbtlin/ai-berkshire.git' },
  @{ name = 'tushare'; url = 'https://github.com/waditu/tushare.git' },
  @{ name = 'OpenStock'; url = 'https://github.com/Open-Dev-Society/OpenStock.git' },
  @{ name = 'valuecell'; url = 'https://github.com/ValueCell-ai/valuecell.git' },
  @{ name = 'a-stock-data'; url = 'https://github.com/simonlin1212/a-stock-data.git' },
  @{ name = 'Stock-Prediction-Models'; url = 'https://github.com/huseinzol05/Stock-Prediction-Models.git' },
  @{ name = 'financial-machine-learning'; url = 'https://github.com/firmai/financial-machine-learning.git' },
  @{ name = 'FinanceDatabase'; url = 'https://github.com/JerBouma/FinanceDatabase.git' },
  @{ name = 'awesome-ai-in-finance'; url = 'https://github.com/georgezouq/awesome-ai-in-finance.git' },
  @{ name = 'ticker'; url = 'https://github.com/achannarasappa/ticker.git' },
  @{ name = 'tradingview-mcp'; url = 'https://github.com/atilaahmettaner/tradingview-mcp.git' },
  @{ name = 'zvt'; url = 'https://github.com/zvtvz/zvt.git' },
  @{ name = 'Finance'; url = 'https://github.com/shashankvemuri/Finance.git' },
  @{ name = 'TradeMaster'; url = 'https://github.com/TradeMaster-NTU/TradeMaster.git' },
  @{ name = 'exchange-core'; url = 'https://github.com/exchange-core/exchange-core.git' },
  @{ name = 'stocksight'; url = 'https://github.com/shirosaidev/stocksight.git' },
  @{ name = 'awesome-investing'; url = 'https://github.com/mr-karan/awesome-investing.git' },
  @{ name = 'free-stockdb'; url = 'https://github.com/hello245m/free-stockdb.git' },
  @{ name = 'hummingbot'; url = 'https://github.com/hummingbot/hummingbot.git' },
  @{ name = 'eliza'; url = 'https://github.com/elizaOS/eliza.git' },
  @{ name = 'ai-agents-from-scratch'; url = 'https://github.com/pguso/ai-agents-from-scratch.git' },
  @{ name = 'awesome-ai-agents'; url = 'https://github.com/e2b-dev/awesome-ai-agents.git' },
  @{ name = 'ai-agent-tools-catalog'; url = 'https://github.com/GetStream/ai-agent-tools-catalog.git' },
  @{ name = 'awesome-ai-apps'; url = 'https://github.com/Arindam200/awesome-ai-apps.git' },
  @{ name = 'PraisonAI'; url = 'https://github.com/MervinPraison/PraisonAI.git' }
)

Write-Host "Starting shallow clone of $($repos.Count) repositories into sources/..."
$count = 0
foreach ($r in $repos) {
  $count++
  $target = Join-Path "sources" $r.name
  if (-not (Test-Path $target)) {
    Write-Host "[$count/$($repos.Count)] Cloning $($r.name)..."
    try {
      git clone --depth 1 $r.url $target
    } catch {
      Write-Host "Failed to clone $($r.name): $_"
    }
  } else {
    Write-Host "[$count/$($repos.Count)] $($r.name) already exists."
  }
}
Write-Host "All repository clones completed."
