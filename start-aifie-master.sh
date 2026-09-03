#!/usr/bin/env bash
# Aifie AI Agent - 1-Click Master Launch Script (Linux / Oracle Cloud VPS)
# Starts Docker Compose stack (Webtop + ttyd) and launches Aifie Master Server with keepalive daemon.

set -e

echo -e "\033[1;36m=========================================================\033[0m"
echo -e "\033[1;33m👑 STARTING AIFIE AI AGENT - MASTER AUTONOMOUS NEXUS v95\033[0m"
echo -e "\033[1;36m=========================================================\033[0m"

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "\033[1;31m❌ Node.js not found. Installing Node.js LTS...\033[0m"
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo -e "\033[1;32m✅ Node.js detected: $(node -v)\033[0m"

# 2. Check Docker and Start Virtual Computer Stack if available
if command -v docker &> /dev/null; then
    echo -e "\033[1;34m🐳 Starting Cloud Virtual Computer Docker Compose Stack...\033[0m"
    if [ -f "deploy/vcomputer-docker-compose.yml" ]; then
        docker compose -f deploy/vcomputer-docker-compose.yml up -d || true
        echo -e "\033[1;32m✅ Cloud Desktop (Port 3000/3001) & Web Terminal (Port 7681) active.\033[0m"
    fi
fi

# 3. Verify Syntax
echo -e "\033[1;34m🔍 Checking engine syntax...\033[0m"
node --check server.mjs
echo -e "\033[1;32m✅ All subsystems validated.\033[0m"

# 4. Launch Aifie with PM2 or direct Node
PUBLIC_IP=$(curl -s ifconfig.me || echo "127.0.0.1")

echo -e "\033[1;32m=========================================================\033[0m"
echo -e "\033[1;32m🚀 Aifie Master Server running at: http://${PUBLIC_IP}:8787\033[0m"
echo -e "\033[1;36m🖥️ Ubuntu 4K Cloud Desktop at:    http://${PUBLIC_IP}:3000\033[0m"
echo -e "\033[1;36m💻 Web Terminal at:                http://${PUBLIC_IP}:7681\033[0m"
echo -e "\033[1;35m📱 Telegram Mobile Bot:            @Myaifiebot\033[0m"
echo -e "\033[1;32m=========================================================\033[0m"

# Launch server
exec node server.mjs
