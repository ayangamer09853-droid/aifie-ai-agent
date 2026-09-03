#!/usr/bin/env bash
# ==============================================================================
# 🚀 1-CLICK ALL-IN-ONE CLOUD VIRTUAL COMPUTER, BROWSER & TERMINAL INSTALLER
# Optimized for Oracle Cloud Free Tier (4 ARM OCPUs, 24 GB RAM, 200 GB SSD)
# Compatible with Ubuntu 22.04 / 24.04 LTS (ARM64 aarch64 & x86_64 AMD)
# ==============================================================================

set -e

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo -e "${CYAN}${BOLD}"
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║       🚀 AIFIE CLOUD VIRTUAL COMPUTER & WORKSPACE INSTALLER          ║"
echo "║      Linux Desktop (XFCE) + Cloud Chromium Browser + Web Terminal     ║"
echo "║          100% Free Forever on Oracle Cloud Always Free Tier           ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for root / sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script with sudo or as root: sudo ./deploy-cloud-vcomputer.sh${NC}"
  exit 1
fi

# Detect Architecture
ARCH=$(uname -m)
echo -e "${CYAN}[1/7] Detecting System Architecture...${NC}"
echo -e "      Architecture: ${BOLD}${ARCH}${NC}"
if [ "$ARCH" = "aarch64" ]; then
  echo -e "      ${GREEN}✓ Oracle Ampere A1 ARM64 Detected (Optimal 24GB RAM Profile)${NC}"
elif [ "$ARCH" = "x86_64" ]; then
  echo -e "      ${GREEN}✓ AMD/Intel x86_64 Architecture Detected${NC}"
else
  echo -e "      ${YELLOW}! Generic Architecture: ${ARCH}${NC}"
fi

# Detect Public IP
PUBLIC_IP=$(curl -s -4 https://ifconfig.me || curl -s https://api.ipify.org || echo "YOUR_VPS_PUBLIC_IP")
echo -e "      Public IPv4: ${BOLD}${PUBLIC_IP}${NC}"

# Step 2: System Update & Essential Tooling
echo -e "\n${CYAN}[2/7] Updating Base System Packages...${NC}"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  curl wget git ufw iptables iptables-persistent \
  ca-certificates gnupg lsb-release htop tmux net-tools jq

# Step 3: Install Docker & Docker Compose
echo -e "\n${CYAN}[3/7] Setting up Docker Engine & Compose Plugin...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "      Installing official Docker engine..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo -e "      ${GREEN}✓ Docker installed successfully.${NC}"
else
  echo -e "      ${GREEN}✓ Docker already installed: $(docker --version)${NC}"
fi

# Step 4: Configure Firewall & Oracle Cloud Local Ingress
echo -e "\n${CYAN}[4/7] Opening Ingress Firewall Ports (80, 443, 3000, 3001, 7681, 8787)...${NC}"
# Oracle Cloud Ubuntu includes strict default iptables rules that drop incoming traffic
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT 2>/dev/null || true
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 7681 -j ACCEPT 2>/dev/null || true
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8787 -j ACCEPT 2>/dev/null || true
netfilter-persistent save 2>/dev/null || true

# Also configure UFW if enabled
ufw allow 22/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 3000/tcp 2>/dev/null || true
ufw allow 3001/tcp 2>/dev/null || true
ufw allow 7681/tcp 2>/dev/null || true
ufw allow 8787/tcp 2>/dev/null || true
echo -e "      ${GREEN}✓ Local VPS Firewall ports open.${NC}"

# Step 5: Directory Structure & Credentials
echo -e "\n${CYAN}[5/7] Preparing Cloud Workspace & Persistent Storage...${NC}"
mkdir -p data/vcomputer-desktop-config
mkdir -p sources

# Generate or reuse secure credentials
VCOMP_USER="aifie"
if [ -f ".vcomputer-credentials" ]; then
  VCOMP_PASS=$(grep "PASSWORD=" .vcomputer-credentials | cut -d'=' -f2)
else
  VCOMP_PASS="AifieCloud_$(openssl rand -hex 4)"
  echo "USER=${VCOMP_USER}" > .vcomputer-credentials
  echo "PASSWORD=${VCOMP_PASS}" >> .vcomputer-credentials
  chmod 600 .vcomputer-credentials
fi

# Step 6: Generate Production Environment file
echo -e "\n${CYAN}[6/7] Configuring Docker Services...${NC}"
cat <<EOF > deploy/.env.vcomputer
VCOMP_USER=${VCOMP_USER}
VCOMP_PASSWORD=${VCOMP_PASS}
TZ=Etc/UTC
HOST_IP=${PUBLIC_IP}
EOF

# Step 7: Launch Cloud Virtual Computer Stack
echo -e "\n${CYAN}[7/7] Launching Cloud Virtual Computer Containers...${NC}"
cd deploy
docker compose -f vcomputer-docker-compose.yml up -d
cd ..

echo -e "\n${GREEN}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}🎉 CLOUD VIRTUAL COMPUTER IS FULLY ACTIVE AND RUNNING 24/7! 🎉${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "${BOLD}🖥️  1. FULL CLOUD VIRTUAL DESKTOP (GUI + CHROMIUM BROWSER):${NC}"
echo -e "    URL:      ${CYAN}http://${PUBLIC_IP}:3000${NC} (or https://${PUBLIC_IP}:3001)"
echo -e "    Username: ${YELLOW}${VCOMP_USER}${NC}"
echo -e "    Password: ${YELLOW}${VCOMP_PASS}${NC}"
echo -e "    Features: Full 4K Ubuntu Desktop, Hardware Audio, Persistent Chrome Tabs,"
echo -e "              runs 24/7 in cloud even after closing your smartphone browser."
echo -e ""
echo -e "${BOLD}💻  2. HIGH-SPEED CLOUD WEB TERMINAL (ttyd):${NC}"
echo -e "    URL:      ${CYAN}http://${PUBLIC_IP}:7681${NC}"
echo -e "    Username: ${YELLOW}${VCOMP_USER}${NC}"
echo -e "    Password: ${YELLOW}${VCOMP_PASS}${NC}"
echo -e "    Features: Zero-latency bash/zsh shell, tmux, full root and dev tooling."
echo -e ""
echo -e "${BOLD}🤖  3. AIFIE AUTONOMOUS AGENT & QUANT COMMAND OS:${NC}"
echo -e "    URL:      ${CYAN}http://${PUBLIC_IP}:8787${NC}"
echo -e "    Features: Full Institutional Trading Command Center, Real-Time WebSockets,"
echo -e "              Embedded Terminal, Cloud Browser Inspector, and Telegram Bot."
echo -e ""
echo -e "${PURPLE}${BOLD}📱 MOBILE ACCESS (iPhone / Android):${NC}"
echo -e "Open Safari or Chrome on your phone and navigate to any of the 3 links above."
echo -e "No apps needed! Everything renders natively in your mobile browser."
echo -e ""
echo -e "${YELLOW}${BOLD}⚠️  IMPORTANT ORACLE CLOUD STEP:${NC}"
echo -e "Remember to add Ingress Rules in your Oracle Cloud Console:"
echo -e "Networking ➔ VCN ➔ Security Lists ➔ Default Security List ➔ Add Ingress Rule:"
echo -e "Source CIDR: 0.0.0.0/0 | Destination Ports: 80, 443, 3000, 3001, 7681, 8787"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}"
