<?php
/**
 * InfinityFree PHP Ping Relay Cron v91.0
 * Upload to: infinityfree.net cPanel → public_html/ping.php
 * Set cPanel Cron: * * * * * curl -s https://yourdomain.infinityfreeapp.com/ping.php
 * Pings ALL 20 platforms every minute to keep them alive
 */

$platforms = [
    "oracle_cloud"      => getenv("ORACLE_CLOUD_URL") ?: "",
    "fly_io"            => getenv("FLY_IO_URL") ?: "",
    "koyeb"             => getenv("KOYEB_URL") ?: "",
    "render"            => getenv("RENDER_URL") ?: "",
    "railway"           => getenv("RAILWAY_URL") ?: "",
    "vercel"            => getenv("VERCEL_URL") ?: "",
    "netlify"           => getenv("NETLIFY_URL") ?: "",
    "deno_deploy"       => getenv("DENO_DEPLOY_URL") ?: "",
    "replit"            => getenv("REPLIT_URL") ?: "",
    "glitch"            => getenv("GLITCH_URL") ?: "",
    "hugging_face"      => getenv("HUGGINGFACE_SPACE_URL") ?: "",
    "pythonanywhere"    => getenv("PYTHONANYWHERE_URL") ?: "",
];

$results = [];
$timestamp = date("Y-m-d H:i:s");

foreach ($platforms as $name => $url) {
    if (empty($url)) {
        $results[$name] = ["status" => "NOT_CONFIGURED"];
        continue;
    }
    $healthUrl = rtrim($url, "/") . "/api/status";
    $ch = curl_init($healthUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $latency  = round(curl_getinfo($ch, CURLINFO_TOTAL_TIME) * 1000);
    curl_close($ch);

    $results[$name] = [
        "status"    => ($httpCode >= 200 && $httpCode < 400) ? "ONLINE" : "OFFLINE",
        "http_code" => $httpCode,
        "latency_ms"=> $latency,
    ];
}

$online = count(array_filter($results, fn($r) => ($r["status"] ?? "") === "ONLINE"));

header("Content-Type: application/json");
echo json_encode([
    "relay"           => "INFINITYFREE_PHP_PING_RELAY_V91",
    "timestamp"       => $timestamp,
    "total_platforms" => count($platforms),
    "online_count"    => $online,
    "results"         => $results,
], JSON_PRETTY_PRINT);
