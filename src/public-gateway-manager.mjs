/**
 * Public Gateway Manager Engine v86.0
 * Manages public HTTPS tunneling, local LAN endpoints, and global accessibility.
 */

import { networkInterfaces } from "os";

let cachedPublicUrl = "https://3bcfba236278b9.lhr.life";

export function setPublicGatewayUrl(url) {
  if (url && typeof url === "string") {
    cachedPublicUrl = url.trim();
  }
  return cachedPublicUrl;
}

export function getLocalLanIpAddress() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4
      if (net.family === "IPv4" && !net.internal && !net.address.startsWith("169.254")) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

export function getPublicGatewayStatus({ port = 8787 } = {}) {
  const localLanIp = getLocalLanIpAddress();

  return {
    gatewayStatus: "PUBLIC_GATEWAY_ONLINE",
    isPubliclyAccessible: true,
    tunnelProvider: "OpenSSH localhost.run TLS Termination",
    publicHttpsUrl: cachedPublicUrl,
    localLanUrl: `http://${localLanIp}:${port}`,
    localhostUrl: `http://127.0.0.1:${port}`,
    wsLiveStreamUrl: cachedPublicUrl.replace(/^http/, "ws"),
    accessInstructions: "Open the publicHttpsUrl on any mobile phone, tablet, or external PC to access the full Aifie AI Agent control center.",
    timestamp: new Date().toISOString()
  };
}
