@echo off
title AIFIE AI AGENT - INSTANT PUBLIC HTTPS TUNNEL
echo ========================================================
echo  AIFIE AI AGENT - 1-CLICK PUBLIC HTTPS TUNNEL
echo ========================================================
echo Starting OpenSSH reverse tunnel for port 8787...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-public-tunnel.ps1"
pause
