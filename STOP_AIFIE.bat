@echo off
title Aifie AI Agent - Safe Stopper
echo =======================================================
echo           STOPPING AIFIE AI AGENT SERVICE
echo =======================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 8787 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host 'Stopped Aifie process on port 8787 (PID: ' $_.OwningProcess ')' }"
echo.
echo =======================================================
echo Aifie AI Agent has been safely stopped.
echo You can restart it anytime by running: START_AIFIE.bat
echo =======================================================
pause
