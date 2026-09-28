# ==============================================================================
# SOL Global / US-DZ Airlift & Livestock Trace Platform
# Production Multi-Stage Dockerfile (Lightweight Alpine Base & Secure Non-Root)
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Leverage Docker layer caching for node_modules
COPY package.json ./
RUN npm install

# Copy application source code
COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src

# Compile production Vite bundle to /app/dist
RUN npm run build

# ==============================================================================
# Stage 2: Production Execution Runtime
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install curl for docker healthcheck probe and tzdata for Algerian/Texas timezone
RUN apk add --no-cache curl tzdata

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Africa/Algiers

# Copy package descriptors
COPY package.json ./

# Install runtime production dependencies and TypeScript execution engine
RUN npm install --omit=dev && \
    npm install tsx && \
    npm cache clean --force

# Copy compiled frontend assets from Stage 1
COPY --from=builder /app/dist ./dist

# Copy backend server entry point and supporting runtime modules
COPY server.ts ./
COPY src/services/mockData.ts ./src/services/mockData.ts
COPY src/services/iotEngine.ts ./src/services/iotEngine.ts
COPY src/types ./src/types

# Secure the filesystem: set ownership to unprivileged 'node' user
RUN chown -R node:node /app

# Switch to non-root user for security hardening
USER node

# Expose microservice API port
EXPOSE 3000

# Automated Docker Healthcheck Probe against /api/health
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start production server using tsx
CMD ["npm", "start"]
