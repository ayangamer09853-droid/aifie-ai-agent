// Deno Deploy Edge Worker v91.0
// Deploy at: https://dash.deno.com/new
// Import this file directly from GitHub — zero build step needed

const ORACLE_URL = Deno.env.get("ORACLE_CLOUD_URL") || "";
const FLY_URL = Deno.env.get("FLY_IO_URL") || "";

async function tryProxy(baseUrl: string, req: Request): Promise<Response | null> {
  if (!baseUrl) return null;
  try {
    const url = new URL(req.url);
    const target = baseUrl.replace(/\/$/, "") + url.pathname + url.search;
    const res = await fetch(target, {
      method: req.method,
      headers: req.headers,
      body: req.method !== "GET" ? req.body : undefined,
    });
    if (res.status < 500) {
      return new Response(res.body, {
        status: res.status,
        headers: { ...Object.fromEntries(res.headers), "X-Deno-Proxy": "true" },
      });
    }
  } catch (_) {}
  return null;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/status" || url.pathname === "/api/v91/deno/status") {
    return Response.json({
      status: "DENO_DEPLOY_EDGE_ONLINE",
      platform: "Deno Deploy",
      runtime: "Deno " + Deno.version.deno,
      timestamp: new Date().toISOString(),
    });
  }

  // Try Oracle first, then Fly.io
  for (const upstream of [ORACLE_URL, FLY_URL]) {
    const res = await tryProxy(upstream, req);
    if (res) return res;
  }

  return Response.json(
    { error: "No upstream available", timestamp: new Date().toISOString() },
    { status: 503 }
  );
});
