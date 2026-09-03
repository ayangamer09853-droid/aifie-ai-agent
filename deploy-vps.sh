#!/usr/bin/env bash
# ==============================================================================
# AIFIE AI AGENT - ONE-CLICK ORACLE CLOUD FREE VPS DEPLOYMENT SCRIPT
# Target OS: Ubuntu 24.04 LTS / Ubuntu 22.04 LTS (ARM flex / x86_64)
# ==============================================================================

set -e

echo "🚀 Starting AIFIE AI Agent 24/7 VPS Setup..."

# Step 1: System Update & Essential Tools
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip build-essential ufw software-properties-common

# Step 2: Install Node.js 22 LTS & PM2
echo "🟢 Installing Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
echo "Node Version: $(node -v)"
echo "NPM Version: $(npm -v)"

echo "⚡ Installing PM2 Process Manager..."
sudo npm install -g pm2

# Step 3: Configure UFW Firewall
echo "🛡️ Configuring Firewall rules (Ports 22, 80, 443, 3000, 3001, 7681, 8787)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 7681/tcp
sudo ufw allow 8787/tcp
sudo ufw --force enable

# Oracle Cloud local iptables bypass for incoming traffic
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 7681 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8787 -j ACCEPT 2>/dev/null || true

# Step 4: Install Dependencies & Prepare Log Directory
echo "📥 Installing AIFIE Project Dependencies..."
mkdir -p logs
npm install

# Step 5: Start AIFIE Agent via PM2
echo "🤖 Starting AIFIE Agent daemon under PM2..."
pm2 start ecosystem.config.cjs
pm2 save

# Setup PM2 auto-start on system reboot
echo "🔄 Setting up PM2 systemd startup hook..."
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME || true

# Step 6: Install Nginx Reverse Proxy & Certbot SSL
echo "🌐 Installing Nginx Web Server & Certbot SSL..."
sudo apt install -y nginx certbot python3-certbot-nginx

# Step 7: Make Cloud Virtual Computer installer executable
if [ -f "deploy-cloud-vcomputer.sh" ]; then
  chmod +x deploy-cloud-vcomputer.sh
fi

echo ""
echo "=============================================================================="
echo "✅ AIFIE AI AGENT & CLOUD VIRTUAL WORKSPACE SETUP COMPLETE!"
echo "=============================================================================="
echo "🌐 Local Control Panel URL : http://localhost:8787"
echo "📱 Mobile Dashboard Access : http://$(hostname -I | awk '{print $1}'):8787"
echo "🖥️ Cloud Virtual Desktop   : http://$(hostname -I | awk '{print $1}'):3000"
echo "💻 Cloud Web Terminal      : http://$(hostname -I | awk '{print $1}'):7681"
echo "⚡ Start Full Cloud PC     : sudo ./deploy-cloud-vcomputer.sh"
echo "⚡ PM2 Status Command      : pm2 status"
echo "📊 PM2 Live Telemetry      : pm2 monit"
echo "=============================================================================="
