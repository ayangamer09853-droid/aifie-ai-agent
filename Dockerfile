# Aifie AI Agent — Production 24/7 Cloud Container
FROM node:22-alpine

# Install production OS deps, build tools, and native Chromium
RUN apk add --no-cache curl ca-certificates bash python3 make g++ chromium

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000
ENV HOST=0.0.0.0
ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy package files first for better layer caching
COPY package*.json ./

# Install production dependencies only with resilience
RUN npm install --omit=dev --no-audit --no-fund --legacy-peer-deps --ignore-scripts || npm install --no-audit --no-fund --ignore-scripts || true

# Copy application source (excluding .env, data/, sources/, node_modules via .dockerignore)
COPY . .

# Create persistent data directory
RUN mkdir -p data

# Expose Render-compatible port
EXPOSE 10000

# Health check using IPv4 localhost to prevent IPv6 Alpine resolution mismatches
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT}/api/status || exit 1

# Run 24/7 perpetual agent server
CMD ["node", "server.mjs"]
