# Aifie AI Agent - 1-Click Public HTTPS Tunnel Launcher
# Exposes your local server (http://127.0.0.1:8787) to a public HTTPS URL worldwide.
# Zero installation, zero npm packages, powered by built-in Windows OpenSSH.

param(
    [int]$LocalPort = 8787,
    [string]$Server = "localhost.run"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 AIFIE AI AGENT - INSTANT PUBLIC HTTPS TUNNEL LAUNCHER" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Local Port:     http://127.0.0.1:$LocalPort" -ForegroundColor Yellow
Write-Host "Tunnel Gateway: $Server" -ForegroundColor Yellow
Write-Host "Starting secure reverse tunnel via Windows OpenSSH..." -ForegroundColor White
Write-Host ""
Write-Host "Once connected, your live public HTTPS link will appear below." -ForegroundColor Green
Write-Host "Open that link on your smartphone to view the Revenue Dashboard," -ForegroundColor Green
Write-Host "scan the UPI QR code, and test digital product checkouts!" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the tunnel at any time." -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Server -eq "localhost.run") {
    ssh -R 80:localhost:$LocalPort -o StrictHostKeyChecking=no nokey@localhost.run
} elseif ($Server -eq "serveo.net") {
    ssh -R 80:localhost:$LocalPort -o StrictHostKeyChecking=no serveo.net
} else {
    ssh -R 80:localhost:$LocalPort -o StrictHostKeyChecking=no $Server
}
