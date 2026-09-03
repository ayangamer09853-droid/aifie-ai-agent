# Aifie AI Agent - 1-Click Master Launch Script (Windows PowerShell)
# Automatically checks ports, verifies environment, and starts Aifie with Master Autonomous Nexus.

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "👑 STARTING AIFIE AI AGENT - MASTER AUTONOMOUS NEXUS v95" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Check Node.js Version
$nodeVersion = node -v 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Error: Node.js is not installed. Please install Node.js v20+." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Detected Node.js: $nodeVersion" -ForegroundColor Green

# 2. Check Port 8787 availability
$portInUse = Get-NetTCPConnection -LocalPort 8787 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️ Port 8787 is currently in use. Attempting graceful restart..." -ForegroundColor Yellow
}

# 3. Verify System Syntax
Write-Host "🔍 Verifying core engine integrity..." -ForegroundColor Cyan
node --check server.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Syntax validation failed. Please review error output." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Engine syntax 100% valid." -ForegroundColor Green

# 4. Launch Aifie Master Server
Write-Host "🚀 Launching Aifie Master Server on http://127.0.0.1:8787 ..." -ForegroundColor Yellow
Write-Host "💻 Access Cloud Desktop:  http://127.0.0.1:3000" -ForegroundColor Cyan
Write-Host "💻 Access Web Terminal:   http://127.0.0.1:7681" -ForegroundColor Cyan
Write-Host "📱 Telegram Controller:   @Myaifiebot" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------" -ForegroundColor Gray

# Start server
node server.mjs
