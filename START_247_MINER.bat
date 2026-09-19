@echo off
title Aifie AI Agent - 24/7 Crypto Mining Sentry
echo =======================================================
echo    AIFIE AI AGENT - 24/7 CRYPTO MINING STARTER
echo =======================================================
echo.
echo [1/3] Verifying Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    pause
    exit /b 1
)

echo [2/3] Initializing 24/7 Mining Supervisor Daemon...
echo - Stratum V1 Multi-Server Swarm (Binance Pool)
echo - Native 8-Core CPU Worker Threads
echo - Local ASIC Proxy on 0.0.0.0:3333
echo - Self-Healing 15s Watchdog Sentry
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-247-mining-supervisor.ps1"

echo.
echo =======================================================
echo  24/7 Mining Supervisor stopped.
echo =======================================================
pause
