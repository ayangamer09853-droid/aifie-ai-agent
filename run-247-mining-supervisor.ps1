# Aifie AI Agent - 24/7 Autonomous Crypto Mining Supervisor Daemon
# Runs continuously, monitors server & mining cluster health, and auto-restarts on crash.

param (
    [int]$Port = 8787,
    [int]$RestartDelaySec = 3,
    [switch]$HideWindow
)

$ErrorActionPreference = "Continue"
$projectDir = $PSScriptRoot
Set-Location $projectDir

$logDir = Join-Path $projectDir "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$logFile = Join-Path $logDir "mining-247-supervisor.log"

function Write-SupervisorLog {
    param([string]$Message)
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$timestamp] [24/7-SUPERVISOR] $Message"
    Write-Host $line -ForegroundColor Cyan
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

Write-Host "=======================================================" -ForegroundColor Yellow
Write-Host "   AIFIE AI AGENT - 24/7 CRYPTO MINING SUPERVISOR      " -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Yellow
Write-Host "Project Directory: $projectDir"
Write-Host "Listening Port:    $Port"
Write-Host "Log Output:        $logFile"
Write-Host "Mining Pool 1:     sha256.poolbinance.com:443"
Write-Host "Mining Pool 2:     btc.poolbinance.com:1800"
Write-Host "Mining Pool 3:     bs.poolbinance.com:3333"
Write-Host "Local ASIC Proxy:  0.0.0.0:3333"
Write-Host "=======================================================" -ForegroundColor Yellow
Write-Host ""

$env:MINING_AUTOSTART_247 = "true"
$env:MINING_CLUSTER_ENABLED = "true"
$env:PORT = "$Port"

$restartCount = 0

while ($true) {
    Write-SupervisorLog "Launching Aifie 24/7 Node Server (Run #$($restartCount + 1))..."

    $startTime = Get-Date

    try {
        $process = Start-Process -FilePath "node" `
            -ArgumentList "server.mjs" `
            -WorkingDirectory $projectDir `
            -NoNewWindow `
            -PassThru `
            -Wait

        $exitCode = $process.ExitCode
        $duration = (Get-Date) - $startTime

        if ($exitCode -eq 0) {
            Write-SupervisorLog "Aifie Server stopped cleanly (Exit code 0). Terminating supervisor."
            break
        } else {
            $restartCount++
            Write-SupervisorLog "WARNING: Aifie Server exited unexpectedly with code $exitCode after $($duration.TotalSeconds)s."
            Write-SupervisorLog "Self-Healing Watchdog: Auto-restarting server in $RestartDelaySec seconds (Total Restarts: $restartCount)..."
            Start-Sleep -Seconds $RestartDelaySec
        }
    } catch {
        $restartCount++
        Write-SupervisorLog "ERROR during process launch: $($_.Exception.Message)"
        Start-Sleep -Seconds $RestartDelaySec
    }
}
