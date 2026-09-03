/**
 * Persistent Public Tunnel Daemon v87.0
 * Spawns and manages zero-install global HTTPS tunnel via OpenSSH and localhost.run.
 * Automatically synchronizes new public URLs to the gateway manager.
 */

import { spawn } from "node:child_process";
import { setPublicGatewayUrl } from "./public-gateway-manager.mjs";

let tunnelProcess = null;
let currentPublicUrl = "https://b75eedf45c5d3d.lhr.life";

export function startPersistentPublicTunnelDaemon({ port = 8787 } = {}) {
  if (tunnelProcess) return { status: "ALREADY_RUNNING", publicUrl: currentPublicUrl };

  const args = [
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=NUL",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=3",
    "-R", `80:127.0.0.1:${port}`,
    "nokey@localhost.run"
  ];

  try {
    tunnelProcess = spawn("ssh", args, { stdio: ["ignore", "pipe", "pipe"], shell: false });

    const handleData = (chunk) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9_.-]+\.(?:lhr\.life|lhr\.rocks|lhrtunnel\.com|a\.pinggy\.link|pinggy\.link)/i);
      if (match) {
        currentPublicUrl = match[0];
        setPublicGatewayUrl(currentPublicUrl);
        console.log(`\n========================================================`);
        console.log(`[PUBLIC_GATEWAY] GLOBAL INTERNET HTTPS URL ACTIVE!`);
        console.log(`👉 Open on any Phone/Tablet/PC: ${currentPublicUrl}`);
        console.log(`========================================================\n`);
        fetch(`http://127.0.0.1:${port}/api/v86/public/gateway/update?url=${encodeURIComponent(currentPublicUrl)}`, { method: "POST" }).catch(() => {});
      }
    };

    tunnelProcess.stdout.on("data", handleData);
    tunnelProcess.stderr.on("data", handleData);

    tunnelProcess.on("error", (err) => {
      tunnelProcess = null;
      console.warn(`[PUBLIC_GATEWAY_WARNING] OpenSSH client warning: ${err.message}. Local network gateway remains active.`);
    });

    tunnelProcess.on("exit", () => {
      tunnelProcess = null;
      // Auto reconnect after 10s if process exits
      const reconnectTimer = setTimeout(() => {
        startPersistentPublicTunnelDaemon({ port });
      }, 10000);
      reconnectTimer.unref?.();
    });

    return { status: "TUNNEL_SPAWNED", publicUrl: currentPublicUrl };
  } catch (err) {
    return { status: "TUNNEL_FAILED", error: err.message };
  }
}

export function getCurrentTunnelUrl() {
  return currentPublicUrl;
}
