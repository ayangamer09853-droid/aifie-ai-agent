# 🚀 Oracle Cloud Free VPS + AIFIE Agent 24/7 Setup Guide

This guide details the **16-step professional deployment** of Aifie AI Agent onto Oracle Cloud Free Tier VPS for 24/7 continuous autonomous trading and smartphone control via Telegram & Dashboard.

---

## 📌 STEP-BY-STEP DEPLOYMENT BLUEPRINT

### Step 1: Create Oracle Cloud Free Tier Account
1. Visit [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
2. Complete identity verification and log into Oracle Cloud Console.
3. Oracle Free Tier provides: **4 ARM OCPUs**, **24 GB RAM**, and **200 GB Storage**.

### Step 2: Launch VPS Instance
1. Go to **Compute** ➔ **Instances** ➔ **Create Instance**.
2. **Name**: `AIFIE-SERVER`
3. **Image**: `Ubuntu 24.04 LTS`
4. **Shape**: `VM.Standard.A1.Flex` (4 OCPUs, 24 GB RAM)
5. **SSH Key**: Download `ssh-key.pem` and save securely on your device.
6. Click **Create**.

### Step 3: Connect via Smartphone (Termius / JuiceSSH)
1. Open **Termius** or **JuiceSSH** on Android/iOS.
2. **Host**: `YOUR_VPS_PUBLIC_IP`
3. **User**: `ubuntu`
4. **Private Key**: Import `ssh-key.pem`.
5. Tap **Connect**.

### Step 4 & 5 & 6: Run One-Click Auto Installer
Run this single command on your VPS terminal:

```bash
git clone https://github.com/YOUR_USERNAME/aifie-ai-agent.git AIFIE
cd AIFIE
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Step 7: Launch Cloud Virtual Computer (Ubuntu Desktop + Chromium + Web Terminal)
To activate the full 4K Web Desktop, Cloud Browser, and Web Terminal on your VPS:

```bash
sudo ./deploy-cloud-vcomputer.sh
```

- **Cloud Desktop URL**: `http://YOUR_VPS_PUBLIC_IP:3000` (User: `aifie` | Password in `.vcomputer-credentials`)
- **Cloud Terminal URL**: `http://YOUR_VPS_PUBLIC_IP:7681`
- **Aifie Quant Command**: `http://YOUR_VPS_PUBLIC_IP:8787` (Tab: `💻 CLOUD PC`)

---

## 📱 STEP 15: CONNECT TELEGRAM MOBILE ALERTS & COMMAND BOT

1. Open Telegram app and search for `@BotFather`.
2. Send `/newbot` and follow prompts to receive your `TELEGRAM_BOT_TOKEN`.
3. Search for `@userinfobot` to get your numeric `TELEGRAM_CHAT_ID`.
4. Add credentials to `.env`:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyZ
TELEGRAM_CHAT_ID=987654321
```

5. Restart PM2 process:

```bash
pm2 restart AIFIE-SERVER
```

---

## 🎮 TELEGRAM INTERACTIVE MOBILE COMMAND MENU

Control Aifie directly from Telegram chat on your phone:

- `/status` -> View account balance, cash, active regime, and health score.
- `/buy AAPL 2` -> Execute paper buy order for 2 shares of AAPL.
- `/sell AAPL 2` -> Execute paper sell order for 2 shares of AAPL.
- `/report` -> Receive instant PnL & trade performance report.
- `/kill` -> Activate emergency kill switch.

---

## ⚡ PM2 COMMAND CHEATSHEET

- Check status: `pm2 status`
- Monitor CPU/RAM: `pm2 monit`
- View live logs: `pm2 logs AIFIE-SERVER`
- Restart server: `pm2 restart AIFIE-SERVER`
