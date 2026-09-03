# Aifie AI Agent — Production 24/7 Cloud Container
FROM node:22-alpine

# Install production OS deps
RUN apk add --no-cache curl ca-certificates

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000
ENV HOST=0.0.0.0

# Copy package files first for better layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || npm install --ignore-scripts 2>/dev/null || true

# Copy application source (excluding .env, data/, sources/, node_modules via .dockerignore)
COPY . .

# Create persistent data directory
RUN mkdir -p data

# Expose Render-compatible port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/status || exit 1

# Run 24/7 perpetual agent server
CMD ["node", "server.mjs"]
