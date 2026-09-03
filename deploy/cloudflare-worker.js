// Cloudflare Worker — Smart Multi-Platform Router v91.0
// Deploy at: https://dash.cloudflare.com/workers
// 100,000 free requests/day | Global edge routing | <10ms latency

const UPSTREAMS = [
  { name: "Oracle Cloud", url: globalThis.ORACLE_CLOUD_URL || "" },
  { name: "Fly.io", url: globalThis.FLY_IO_URL || "" },
  { name: "Koyeb", url: globalThis.KOYEB_URL || "" },
  { name: "Render", url: globalThis.RENDER_URL || "" },
  { name: "Railway", url: globalThis.RAILWAY_URL || "" },
  { name: "Replit", url: globalThis.REPLIT_URL || "" }
].filter(u => u.url);

async function probeUpstream(url, timeout = 3000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url + "/api/status", { signal: ctrl.signal, method: "GET" });
    clearTimeout(timer);
    return res.ok;
  } catch (_) {
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    // Use env variables in worker (set via CF dashboard or wrangler secrets)
    const upstreams = [
      env.ORACLE_CLOUD_URL,
      env.FLY_IO_URL,
      env.KOYEB_URL,
      env.RENDER_URL,
      env.RAILWAY_URL,
      env.REPLIT_URL
    ].filter(Boolean);

    const url = new URL(request.url);

    // Health route returns CF worker status
    if (url.pathname === "/health" || url.pathname === "/api/v91/cf/status") {
      return Response.json({
        status: "CLOUDFLARE_WORKER_ONLINE",
        platform: "Cloudflare Workers",
        edge: request.cf?.colo || "unknown",
        country: request.cf?.country || "unknown",
        upstreamsConfigured: upstreams.length,
        timestamp: new Date().toISOString()
      });
    }

    // Try each upstream in priority order
    for (const upstream of upstreams) {
      try {
        const proxyUrl = upstream + url.pathname + url.search;
        const proxyReq = new Request(proxyUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null
        });
        const res = await fetch(proxyReq);
        if (res.ok || res.status < 500) {
          return new Response(res.body, {
            status: res.status,
            headers: {
              ...Object.fromEntries(res.headers),
              "X-Served-By": upstream,
              "X-Aifie-Edge": "Cloudflare-Worker-v91"
            }
          });
        }
      } catch (_) {
        continue;
      }
    }

    return Response.json({ error: "All upstreams unavailable", timestamp: new Date().toISOString() }, { status: 503 });
  }
};
