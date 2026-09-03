# 🚀 Complete Guide: Create Your Own Virtual Computer, Browser & Terminal Entirely on Cloud

This comprehensive guide walks you through deploying your own **24/7 Cloud Virtual Computer**, **Persistent Cloud Web Browser**, and **High-Speed Cloud Web Terminal** completely in the cloud on **Oracle Cloud Free Tier** (100% Free Forever) or any Linux VPS.

---

## 🏗️ System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │       Client (Phone / iPad / PC)        │
                               └────────────────────┬────────────────────┘
                                                    │
                                     HTTPS / WSS / WebSockets
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ORACLE CLOUD ALWAYS FREE TIER VPS                               │
│                   4 ARM OCPUs  •  24 GB RAM  •  200 GB SSD STORAGE                     │
├────────────────────────────────┬───────────────────────┬───────────────────────────────┤
│    🖥️ CLOUD VIRTUAL DESKTOP   │  💻 CLOUD WEB TERMINAL │  🤖 AIFIE AGENT & DASHBOARD   │
│         (Port 3000/3001)       │       (Port 7681)     │          (Port 8787)          │
│                                │                       │                               │
│ • Full Ubuntu XFCE GUI         │ • Instant Web Shell   │ • Quantitative Trading Engine │
│ • Google Chromium Browser      │ • Bash / Zsh / Root   │ • Integrated Terminal & Web   │
│ • PulseAudio Sound Streaming   │ • Low latency typing  │ • Real-time Market Feeds      │
│ • Runs 24/7 background tabs    │ • Tmux session support│ • Telegram Alerts & Bot       │
└────────────────────────────────┴───────────────────────┴───────────────────────────────┘
```

---

## ⚡ Step 1: Create Oracle Cloud Free Tier VPS (4 Cores, 24 GB RAM)

1. Sign up for [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
2. In the Oracle Cloud Console, navigate to **Compute** ➔ **Instances** ➔ **Create Instance**.
3. Set the following specifications:
   - **Name**: `AIFIE-CLOUD-PC`
   - **Image**: `Canonical Ubuntu 24.04` or `Ubuntu 22.04 LTS`
   - **Shape**: Click *Change Shape* ➔ Select **Ampere (ARM)** ➔ **VM.Standard.A1.Flex**.
   - **OCPUs**: Slide to `4 OCPUs`.
   - **Memory**: Slide to `24 GB RAM` *(100% Free Tier Eligible!)*.
   - **Storage**: Set boot volume to `100 GB` or `200 GB`.
4. **SSH Keys**: Download and save your `ssh-key.pem` to your local device.
5. Click **Create** and wait 60 seconds for the state to turn **RUNNING**.
6. Note down your **Public IP Address** (e.g. `129.150.x.x`).

---

## 🛡️ Step 2: Open Ingress Ports in Oracle Cloud Console

By default, Oracle Cloud blocks incoming web traffic. You must allow your ports:

1. In the Oracle Console, go to **Networking** ➔ **Virtual Cloud Networks (VCN)**.
2. Click on your VCN ➔ Click on **Security Lists** ➔ Select **Default Security List for...**.
3. Click **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80, 443, 3000, 3001, 7681, 8787`
   - **Description**: `Cloud Virtual Computer, Desktop, Terminal, and Aifie Dashboard`
4. Click **Add Ingress Rules**.

---

## ⚡ Step 3: Run the 1-Click Automated Installer

Connect to your VPS using your terminal or smartphone app (**Termius** / **JuiceSSH**):

```bash
ssh -i ssh-key.pem ubuntu@YOUR_VPS_PUBLIC_IP
```

Now run the single 1-click deployment command:

```bash
git clone https://github.com/YOUR_USERNAME/aifie-ai-agent.git AIFIE
cd AIFIE
chmod +x deploy-cloud-vcomputer.sh
sudo ./deploy-cloud-vcomputer.sh
```

The script automatically:
1. Installs Docker, Docker Compose, UFW, and dependencies.
2. Configures firewall rules and Oracle iptables bypass.
3. Spawns the **Ubuntu XFCE Desktop + Chromium** container on port 3000/3001.
4. Spawns the **Cloud Web Terminal (ttyd)** container on port 7681.
5. Launches the **Aifie AI Agent & Command Dashboard** on port 8787.
6. Generates your secure access credentials.

---

## 🖥️ Step 4: Accessing Your Cloud Computer

Once installation completes, open any web browser (on your phone, tablet, or laptop):

### 1. Cloud Virtual Desktop (Ubuntu GUI + Chromium Browser)
- **URL**: `http://YOUR_VPS_PUBLIC_IP:3000` (or `https://YOUR_VPS_PUBLIC_IP:3001`)
- **Username**: `aifie`
- **Password**: *(Displayed on terminal and saved in `.vcomputer-credentials`)*
- **What you get**:
  - Full graphical Ubuntu desktop streaming over WebSockets with zero lag.
  - Pre-installed **Chromium** browser running inside the cloud.
  - You can open 50+ tabs, start downloads, or run long tasks — they will keep running 24/7 even when you turn off your phone!

### 2. High-Speed Cloud Web Terminal (ttyd)
- **URL**: `http://YOUR_VPS_PUBLIC_IP:7681`
- **Username**: `aifie`
- **Password**: *(Displayed on terminal)*
- **What you get**:
  - Blazing fast web shell with full root and development tooling.
  - Supports `tmux`, `git`, `htop`, `docker`, `python`, `node`.
  - Responsive keyboard support designed for smartphones and touchscreens.

### 3. All-in-One Aifie Quant Command Center
- **URL**: `http://YOUR_VPS_PUBLIC_IP:8787`
- Click the **`9:CLOUD PC`** tab in the top navigation ribbon.
- **What you get**:
  - Real-time CPU, RAM, Disk, and load telemetry.
  - Built-in interactive terminal widget to run commands directly from the dashboard.
  - Cloud Web Browser viewer to inspect web pages and fetch live financial feeds.
  - 1-Click launcher to switch into full 4K desktop mode.

---

## 📱 Mobile Phone Setup (iOS Safari & Android Chrome)

You can use this cloud virtual computer as your daily pocket workstation:

1. **Add to Home Screen**:
   - Open `http://YOUR_VPS_PUBLIC_IP:3000` in **Safari** (iOS) or **Chrome** (Android).
   - Tap **Share** (iOS) or **Three Dots** (Android) ➔ Tap **"Add to Home Screen"**.
   - It will open like a native fullscreen app without browser address bars!
2. **Mobile Gestures**:
   - One-finger tap = Left Click.
   - Two-finger tap = Right Click.
   - Two-finger drag = Scroll.
   - Tap the side menu icon to bring up the on-screen keyboard or clipboard manager.

---

## 🔒 Optional: Free HTTPS Domain with Cloudflare Tunnel (Zero Open Ports)

If you don't want to expose raw IP ports or configure SSL certificates manually:

1. Install Cloudflare `cloudflared` on your VPS:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
   sudo dpkg -i cloudflared.deb
   ```
2. Authenticate and create a tunnel:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create aifie-vcomputer
   ```
3. Route your custom domain (e.g. `desktop.yourdomain.com` ➔ `localhost:3000`, `term.yourdomain.com` ➔ `localhost:7681`, `agent.yourdomain.com` ➔ `localhost:8787`).
4. Now you have enterprise-grade DDoS protection and automatic HTTPS without opening any firewall ports!

---

## 🛠️ Management & Maintenance Commands

| Action | Command |
| :--- | :--- |
| **Check container status** | `cd deploy && docker compose -f vcomputer-docker-compose.yml ps` |
| **View desktop logs** | `docker logs -f aifie-cloud-desktop` |
| **View terminal logs** | `docker logs -f aifie-cloud-terminal` |
| **Restart entire cloud PC** | `cd deploy && docker compose -f vcomputer-docker-compose.yml restart` |
| **Update / rebuild** | `cd deploy && docker compose -f vcomputer-docker-compose.yml pull && docker compose -f vcomputer-docker-compose.yml up -d` |
| **View your passwords** | `cat .vcomputer-credentials` |
| **Monitor CPU / RAM** | `htop` or `docker stats` |
