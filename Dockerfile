# Stage 1: Build
FROM node:21-bookworm-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build the project
RUN npm run build

# Stage 2: Production
FROM node:21-bookworm-slim AS runtime

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose MCP port
EXPOSE 10101

# Default command
CMD ["node", "dist/server.js"]
