/**
 * Omni-Cloud Platform Orchestrator v91.0
 * Sovereign 20-Platform Multi-Cloud Health Matrix & Failover Engine
 * Combines: Oracle Cloud, Cloudflare Workers, Deno Deploy, Fly.io, Koyeb,
 *           Railway, Render, GitHub Actions, HuggingFace Spaces,
 *           Google Cloud, AWS Lambda, Azure Functions, Replit, Vercel,
 *           Netlify, Glitch, Supabase, Firebase, PythonAnywhere, InfinityFree
 */

const PLATFORM_REGISTRY = [
  {
    id: "oracle_cloud",
    name: "Oracle Cloud Always Free",
    role: "PRIMARY_SERVER",
    tier: 1,
    type: "VPS",
    specs: "4 OCPU ARM | 24GB RAM | 200GB SSD | Always Free",
    envKey: "ORACLE_CLOUD_URL",
    defaultUrl: "http://0.0.0.0:8787",
    healthPath: "/api/status",
    freeForever: true,
    region: "Global"
  },
  {
    id: "cloudflare_workers",
    name: "Cloudflare Workers",
    role: "GLOBAL_CDN_EDGE_ROUTER",
    tier: 1,
    type: "EDGE_CDN",
    specs: "100K requests/day free | Global PoPs | <10ms latency",
    envKey: "CLOUDFLARE_WORKER_URL",
    defaultUrl: "",
    healthPath: "/health",
    freeForever: true,
    region: "Global Edge (200+ cities)"
  },
  {
    id: "fly_io",
    name: "Fly.io",
    role: "CONTAINER_BACKUP_PRIMARY",
    tier: 2,
    type: "CONTAINER",
    specs: "256MB RAM free | 3 free VMs | Docker native",
    envKey: "FLY_IO_URL",
    defaultUrl: "",
    healthPath: "/api/status",
    freeForever: true,
    region: "Multi-region"
  },
  {
    id: "koyeb",
    name: "Koyeb",
    role: "CONTAINER_BACKUP_SECONDARY",
    tier: 2,
    type: "CONTAINER",
    specs: "2 free services | Global edge deployment",
    envKey: "KOYEB_URL",
    defaultUrl: "",
    healthPath: "/api/status",
    freeForever: true,
    region: "US + EU"
  },
  {
    id: "railway",
    name: "Railway",
    role: "QUICK_FAILOVER_CONTAINER",
    tier: 2,
    type: "CONTAINER",
    specs: "$5/month credit free | GitHub deploy",
    envKey: "RAILWAY_URL",
    defaultUrl: "",
    healthPath: "/api/status",
    freeForever: false,
    region: "US"
  },
  {
    id: "render",
    name: "Render",
    role: "WEB_SERVICE_BACKUP",
    tier: 2,
    type: "WEB_SERVICE",
    specs: "Free web service | Auto-deploy from Git",
    envKey: "RENDER_URL",
    defaultUrl: "",
    healthPath: "/api/status",
    freeForever: true,
    region: "US"
  },
  {
    id: "vercel",
    name: "Vercel",
    role: "SERVERLESS_API_LAYER",
    tier: 3,
    type: "SERVERLESS",
    specs: "100GB bandwidth/month | Edge functions | Zero cold start",
    envKey: "VERCEL_URL",
    defaultUrl: "",
    healthPath: "/api/v91/vercel/status",
    freeForever: true,
    region: "Global Edge"
  },
  {
    id: "netlify",
    name: "Netlify",
    role: "SERVERLESS_BACKUP_API",
    tier: 3,
    type: "SERVERLESS",
    specs: "125K function calls/month free | Forms + Auth",
    envKey: "NETLIFY_URL",
    defaultUrl: "",
    healthPath: "/.netlify/functions/status",
    freeForever: true,
    region: "Global Edge"
  },
  {
    id: "deno_deploy",
    name: "Deno Deploy",
    role: "EDGE_FUNCTIONS",
    tier: 3,
    type: "SERVERLESS",
    specs: "100K req/day free | TypeScript native | V8 isolates",
    envKey: "DENO_DEPLOY_URL",
    defaultUrl: "",
    healthPath: "/status",
    freeForever: true,
    region: "Global Edge"
  },
  {
    id: "github_actions",
    name: "GitHub Actions",
    role: "GLOBAL_CRON_KEEPALIVE",
    tier: 1,
    type: "CRON_AUTOMATION",
    specs: "2000 min/month free | Cron schedules | Matrix builds",
    envKey: "GITHUB_REPO_URL",
    defaultUrl: "",
    healthPath: null,
    freeForever: true,
    region: "Global"
  },
  {
    id: "hugging_face",
    name: "Hugging Face Spaces",
    role: "AI_INFERENCE_ENGINE",
    tier: 3,
    type: "AI_COMPUTE",
    specs: "Free Gradio/Streamlit spaces | Gemma 2B inference | Public API",
    envKey: "HUGGINGFACE_SPACE_URL",
    defaultUrl: "",
    healthPath: "/",
    freeForever: true,
    region: "US + EU"
  },
  {
    id: "google_cloud",
    name: "Google Cloud Free Tier",
    role: "CLOUD_FUNCTIONS_GCP",
    tier: 3,
    type: "SERVERLESS",
    specs: "2M function calls/month free | Pub/Sub | Cloud Storage",
    envKey: "GCP_FUNCTION_URL",
    defaultUrl: "",
    healthPath: "/status",
    freeForever: true,
    region: "Global"
  },
  {
    id: "aws_free",
    name: "AWS Free Tier",
    role: "LAMBDA_FUNCTIONS",
    tier: 3,
    type: "SERVERLESS",
    specs: "1M Lambda calls/month free | DynamoDB 25GB | S3 5GB",
    envKey: "AWS_LAMBDA_URL",
    defaultUrl: "",
    healthPath: "/status",
    freeForever: true,
    region: "US-East-1"
  },
  {
    id: "azure_free",
    name: "Azure Free Account",
    role: "AZURE_FUNCTIONS_EU",
    tier: 3,
    type: "SERVERLESS",
    specs: "1M Function calls/month free | EU region redundancy",
    envKey: "AZURE_FUNCTION_URL",
    defaultUrl: "",
    healthPath: "/api/status",
    freeForever: true,
    region: "EU West"
  },
  {
    id: "replit",
    name: "Replit",
    role: "BACKUP_NODE_SERVER",
    tier: 2,
    type: "ALWAYS_ON",
    specs: "Always-on repls | Node.js + Python | Public URL",
    envKey: "REPLIT_URL",
    defaultUrl: "",
    healthPath: "/api/status",
    freeForever: true,
    region: "US"
  },
  {
    id: "glitch",
    name: "Glitch",
    role: "STATIC_MIRROR_KEEPALIVE",
    tier: 4,
    type: "STATIC_HOST",
    specs: "Free Node.js apps | Public URL | GitHub import",
    envKey: "GLITCH_URL",
    defaultUrl: "",
    healthPath: "/",
    freeForever: true,
    region: "US"
  },
  {
    id: "supabase",
    name: "Supabase",
    role: "PRIMARY_POSTGRESQL_DATABASE",
    tier: 1,
    type: "DATABASE",
    specs: "500MB PostgreSQL free | Realtime subscriptions | REST API",
    envKey: "SUPABASE_URL",
    defaultUrl: "",
    healthPath: "/rest/v1/",
    freeForever: true,
    region: "US East"
  },
  {
    id: "firebase",
    name: "Firebase",
    role: "REALTIME_DATABASE_DASHBOARD",
    tier: 1,
    type: "DATABASE",
    specs: "1GB Realtime DB free | 10GB Firestore free | Hosting",
    envKey: "FIREBASE_URL",
    defaultUrl: "",
    healthPath: "/.json",
    freeForever: true,
    region: "Global"
  },
  {
    id: "pythonanywhere",
    name: "PythonAnywhere",
    role: "PYTHON_AI_ANALYTICS_LAYER",
    tier: 3,
    type: "PYTHON_HOST",
    specs: "Free Python web app | Scheduled tasks | Jupyter notebooks",
    envKey: "PYTHONANYWHERE_URL",
    defaultUrl: "",
    healthPath: "/",
    freeForever: true,
    region: "UK"
  },
  {
    id: "infinityfree",
    name: "InfinityFree",
    role: "PHP_PING_RELAY_CRON",
    tier: 4,
    type: "PHP_HOST",
    specs: "Unlimited PHP hosting free | cPanel | MySQL | PHP cron",
    envKey: "INFINITYFREE_URL",
    defaultUrl: "",
    healthPath: "/ping.php",
    freeForever: true,
    region: "Global"
  }
];

const FAILOVER_PRIORITY = ["oracle_cloud", "fly_io", "koyeb", "render", "railway", "replit", "glitch"];

export function getOmniCloudStatus() {
  const platforms = PLATFORM_REGISTRY.map(p => ({
    ...p,
    configuredUrl: process.env[p.envKey] || p.defaultUrl || null,
    isConfigured: Boolean(process.env[p.envKey] && !process.env[p.envKey].includes("your_")),
    status: "REGISTERED_IN_MANIFEST"
  }));

  const serverPlatforms = platforms.filter(p => p.tier === 1 || p.tier === 2);
  const serverlessPlatforms = platforms.filter(p => p.type === "SERVERLESS");
  const databasePlatforms = platforms.filter(p => p.type === "DATABASE");
  const configuredCount = platforms.filter(p => p.isConfigured).length;

  return {
    status: "OMNI_CLOUD_ORCHESTRATOR_ONLINE",
    protocolVersion: "OMNI_V91_SOVEREIGN",
    totalPlatforms: PLATFORM_REGISTRY.length,
    configuredPlatforms: configuredCount,
    freeForeverCount: PLATFORM_REGISTRY.filter(p => p.freeForever).length,
    failoverPriority: FAILOVER_PRIORITY,
    serverPlatforms: serverPlatforms.length,
    serverlessPlatforms: serverlessPlatforms.length,
    databasePlatforms: databasePlatforms.length,
    platforms,
    timestamp: new Date().toISOString()
  };
}

export function getFailoverChain() {
  return FAILOVER_PRIORITY.map((id, idx) => {
    const platform = PLATFORM_REGISTRY.find(p => p.id === id);
    const url = process.env[platform.envKey] || platform.defaultUrl || null;
    return {
      priority: idx + 1,
      platformId: id,
      name: platform.name,
      url,
      isConfigured: Boolean(url && !String(url).includes("0.0.0.0")),
      role: platform.role
    };
  });
}

export async function runHealthCheckAllPlatforms() {
  const results = [];
  for (const p of PLATFORM_REGISTRY) {
    const url = process.env[p.envKey] || p.defaultUrl;
    if (!url || !p.healthPath) {
      results.push({ platformId: p.id, name: p.name, status: "NOT_CONFIGURED", latencyMs: null });
      continue;
    }
    const fullUrl = url.replace(/\/$/, "") + p.healthPath;
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(fullUrl, { signal: controller.signal });
      clearTimeout(timeout);
      results.push({
        platformId: p.id,
        name: p.name,
        status: res.ok ? "ONLINE" : "DEGRADED",
        httpStatus: res.status,
        latencyMs: Date.now() - start
      });
    } catch (_) {
      results.push({
        platformId: p.id,
        name: p.name,
        status: "OFFLINE_OR_NOT_DEPLOYED",
        latencyMs: Date.now() - start
      });
    }
  }

  const onlineCount = results.filter(r => r.status === "ONLINE").length;
  return {
    checkCompleted: true,
    timestamp: new Date().toISOString(),
    totalChecked: results.length,
    onlineCount,
    uptimeRatio: parseFloat((onlineCount / results.length).toFixed(3)),
    platforms: results
  };
}
