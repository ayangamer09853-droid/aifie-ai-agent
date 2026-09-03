# Replit Configuration v91.0
# Copy this repo to replit.com and run — provides always-on backup server

{ pkgs }: {
  deps = [
    pkgs.nodejs_22
  ];
  env = {
    PORT = "8787";
    HOST = "0.0.0.0";
    NODE_ENV = "production";
  };
  run = "node server.mjs";
}
