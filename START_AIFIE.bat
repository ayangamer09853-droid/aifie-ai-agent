@echo off
title Aifie AI Agent - 1-Click Starter
echo =======================================================
echo    AIFIE AI AGENT - 24/7 BACKGROUND SYSTEM LAUNCHER
echo =======================================================
echo.
echo [1/3] Launching Aifie in the background...
wscript.exe "%~dp0start-aifie-background.vbs"
echo [2/3] Waiting for server initialization...
timeout /t 2 /nobreak >nul
echo [3/3] Opening Dashboard at http://localhost:8787 ...
start http://localhost:8787
echo.
echo =======================================================
echo  Aifie AI Agent is now running in the background!
echo  - Web Dashboard: http://localhost:8787
echo  - Telegram Bot:  Active on @Myaifiebot
echo  - Auto-Trading:  Active (24/7 scanning)
echo.
echo  To stop the agent, run: STOP_AIFIE.bat
echo =======================================================
timeout /t 5
