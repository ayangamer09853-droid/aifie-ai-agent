# Aifie AI Agent Windows Auto-Start Installer
# Automatically installs a silent auto-start shortcut into Windows Startup Folder

$ErrorActionPreference = "SilentlyContinue"
$projectDir = $PSScriptRoot
$vbsPath = Join-Path $projectDir "start-aifie-background.vbs"
$startupFolder = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Startup)
$shortcutPath = Join-Path $startupFolder "Aifie-AI-Agent-AutoStart.lnk"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   AIFIE AI AGENT - WINDOWS AUTO-START INSTALLER      " -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project Directory: $projectDir" -ForegroundColor Gray
Write-Host "VBS Script:        $vbsPath" -ForegroundColor Gray
Write-Host "Startup Folder:    $startupFolder" -ForegroundColor Gray
Write-Host ""

try {
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "wscript.exe"
    $shortcut.Arguments = "`"$vbsPath`""
    $shortcut.WorkingDirectory = $projectDir
    $shortcut.Description = "Aifie AI Agent 24/7 Autonomous Background Service"
    $shortcut.IconLocation = "shell32.dll,14"
    $shortcut.Save()

    Write-Host " SUCCESS! Auto-start shortcut installed." -ForegroundColor Green
    Write-Host "Shortcut created at: $shortcutPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Now, whenever your computer turns ON or restarts:" -ForegroundColor Yellow
    Write-Host "1. Aifie Agent will automatically start in the background." -ForegroundColor White
    Write-Host "2. No command prompt window will bother you." -ForegroundColor White
    Write-Host "3. Telegram Bot and Trading Engine will activate immediately." -ForegroundColor White
    Write-Host ""
    Write-Host "Note on Sleep/Shutdown:" -ForegroundColor Cyan
    Write-Host "If you want your computer to never sleep while trading, go to:" -ForegroundColor Gray
    Write-Host "Windows Settings -> System -> Power & Sleep -> Set 'Sleep' to 'Never'." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to create startup shortcut: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=======================================================" -ForegroundColor Cyan
