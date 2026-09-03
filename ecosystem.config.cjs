module.exports = {
  apps: [
    {
      name: "AIFIE-SERVER",
      script: "server.mjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 8787,
        HOST: "0.0.0.0"
      },
      error_file: "logs/aifie-error.log",
      out_file: "logs/aifie-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true
    }
  ]
};
