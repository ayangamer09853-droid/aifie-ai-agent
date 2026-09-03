# 🚀 Aifie Apex 1-Click GitHub Repository Pusher for Render.com

param (
    [string]$RepoUrl = ""
)

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   AIFIE APEX v100 - GITHUB & RENDER DEPLOYMENT     " -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

if (-not $RepoUrl) {
    Write-Host "`n1. Go to https://github.com/new and create a new repository (e.g. 'aifie-ai-agent')." -ForegroundColor Green
    Write-Host "2. Copy the HTTPS repository URL (e.g. 'https://github.com/YourUsername/aifie-ai-agent.git').`n" -ForegroundColor Green
    $RepoUrl = Read-Host "Enter your GitHub Repository URL"
}

if (-not $RepoUrl) {
    Write-Host "[ERROR] Repository URL cannot be empty. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "`n[1/3] Setting git remote origin to: $RepoUrl" -ForegroundColor Cyan
git remote remove origin 2>$null
git remote add origin $RepoUrl

Write-Host "[2/3] Renaming current branch to main..." -ForegroundColor Cyan
git branch -M main

Write-Host "[3/3] Pushing Aifie Apex codebase to GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n====================================================" -ForegroundColor Green
    Write-Host " SUCCESS: CODE PUSHED TO GITHUB SUCCESSFULLY!      " -ForegroundColor Green
    Write-Host "====================================================" -ForegroundColor Green
    Write-Host "`nNOW DEPLOY ON RENDER IN 2 CLICKS:" -ForegroundColor Yellow
    Write-Host "1. Open: https://dashboard.render.com/select-repo?type=blueprint" -ForegroundColor Cyan
    Write-Host "2. Select your repository." -ForegroundColor Cyan
    Write-Host "3. Click 'Apply' (Render auto-reads render.yaml)." -ForegroundColor Cyan
    Write-Host "`nYour 24/7 Zero-PC-Dependency Cloud Agent will be live in 60 seconds!" -ForegroundColor Green
} else {
    Write-Host "`n[FAILED] Git push failed. Please check your GitHub credentials or repo URL." -ForegroundColor Red
}
