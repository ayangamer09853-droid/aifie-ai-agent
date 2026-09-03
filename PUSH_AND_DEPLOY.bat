@echo off
title Aifie - GitHub Push and Render Deploy
color 0A

echo.
echo ====================================================
echo   AIFIE AI AGENT - GITHUB PUSH + RENDER DEPLOY
echo ====================================================
echo.

:: Check if remote is already set
git remote get-url origin >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    FOR /F "tokens=*" %%i IN ('git remote get-url origin') DO SET CURRENT_REMOTE=%%i
    echo [INFO] Existing GitHub remote: %CURRENT_REMOTE%
    echo.
    set /p CHANGE="Change GitHub URL? (y/N): "
    IF /I "%CHANGE%"=="y" (
        set /p REPO_URL="Enter new GitHub HTTPS URL (e.g. https://github.com/username/aifie-ai-agent.git): "
        git remote set-url origin !REPO_URL!
    )
) ELSE (
    echo [SETUP] No GitHub remote found. Let's set one up.
    echo.
    echo 1. Go to: https://github.com/new
    echo 2. Create a repository named: aifie-ai-agent
    echo 3. DO NOT initialize with README
    echo 4. Copy the HTTPS URL shown after creation
    echo.
    set /p REPO_URL="Paste your GitHub Repository URL here: "
    git remote add origin %REPO_URL%
)

echo.
echo [1/2] Renaming branch to main...
git branch -M main

echo [2/2] Pushing all code to GitHub...
git push -u origin main

IF %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================
    echo   SUCCESS! CODE PUSHED TO GITHUB!
    echo ====================================================
    echo.
    echo NOW DEPLOY ON RENDER (FREE 24/7):
    echo.
    echo STEP 1: Open this URL in your browser:
    echo https://dashboard.render.com/select-repo?type=blueprint
    echo.
    echo STEP 2: Select 'aifie-ai-agent' repository
    echo.
    echo STEP 3: Click 'Apply'
    echo.
    echo STEP 4: In Render dashboard, go to Environment tab and add:
    echo   TELEGRAM_BOT_TOKEN = (your bot token)
    echo   TELEGRAM_CHAT_ID   = (your chat ID)
    echo.
    echo STEP 5: Your bot will be LIVE at:
    echo https://aifie-ai-agent-XXXX.onrender.com
    echo.
    start https://dashboard.render.com/select-repo?type=blueprint
) ELSE (
    echo.
    echo [FAILED] Push failed. Common fixes:
    echo.
    echo 1. GitHub credentials: Use Personal Access Token as password
    echo    Create at: https://github.com/settings/tokens/new
    echo    Scopes needed: repo (full)
    echo.
    echo 2. Or use GitHub CLI: winget install --id GitHub.cli
    echo    Then run: gh auth login
)

echo.
pause
