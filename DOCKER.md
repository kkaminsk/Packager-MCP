# Docker Deployment Guide

This guide covers containerized deployment of Packager-MCP.

## Quick Start

```bash
# Build the image
docker build -t packager-mcp .

# Run with HTTP transport (recommended for Docker)
docker run -p 8081:8081 \
  -e GITHUB_TOKEN=your_token \
  -e TRANSPORT_TYPE=http \
  -e TRANSPORT_HOST=0.0.0.0 \
  packager-mcp
```

## Image Details

The Dockerfile uses a multi-stage build for a minimal production image:

| Stage | Base Image | Purpose |
|-------|-----------|---------|
| `builder` | `node:24-bookworm-slim` | Install dependencies and compile TypeScript |
| `runtime` | `node:24-bookworm-slim` | Production-only dependencies and compiled output |

The runtime image runs as a non-root user (`appuser`) for security.

## Environment Variables

### Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | Yes | - | GitHub Personal Access Token for Winget API access |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | No | `json` | Log format: `json` or `text` |

### Transport

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRANSPORT_TYPE` | No | `stdio` | Transport mode: `stdio`, `http`, or `both` |
| `TRANSPORT_PORT` | No | `8081` | HTTP server port |
| `TRANSPORT_HOST` | No | `127.0.0.1` | HTTP server host binding |

> **Note:** `corsOrigin` and `sessionTimeoutMs` can only be configured via YAML config file, not environment variables.

### Azure / Intune Publishing (Optional)

These are only needed if you use the `publish_to_intune` tool:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_TENANT_ID` | Yes | - | Entra ID tenant GUID |
| `AZURE_CLIENT_ID` | Yes | - | Service principal application ID |
| `AZURE_CLIENT_CERTIFICATE_PATH` | Yes | - | Path to PFX or PEM certificate file |
| `AZURE_CLIENT_CERTIFICATE_PASSWORD` | No | - | Certificate password (for PFX files) |
| `INTUNE_MCP_CONFIG` | No | - | Path to Intune YAML config file (alternative to individual vars) |
| `INTUNE_CERT_PASSWORD` | No | - | Certificate password (used with YAML config) |

**Security Note:** Never bake secrets into Docker images. Always inject tokens and credentials via environment variables or mounted secrets at runtime.

## Configuration

### Option 1: Environment Variables Only

```bash
docker run -p 8081:8081 \
  -e GITHUB_TOKEN=your_token \
  -e TRANSPORT_TYPE=http \
  -e TRANSPORT_HOST=0.0.0.0 \
  -e LOG_LEVEL=debug \
  packager-mcp
```

### Option 2: Configuration File Mount

Create a `packager-mcp.yaml` file:

```yaml
name: intune-packaging-assistant
version: 1.0.0
cache:
  maxSize: 1000
  defaultTtlMs: 900000
  manifestTtlMs: 3600000
  searchTtlMs: 900000
logging:
  level: info
  format: json
github:
  rateLimitRetries: 3
transport:
  type: http              # 'stdio', 'http', or 'both'
  port: 8081              # HTTP server port
  host: 0.0.0.0           # Bind to all interfaces for Docker
  sessionTimeoutMs: 1800000  # 30 minutes (default)
  corsOrigin: http://localhost  # CORS allowed origin (default)
```

Mount it into the container:

```bash
docker run -p 8081:8081 \
  -e GITHUB_TOKEN=your_token \
  -v $(pwd)/packager-mcp.yaml:/app/packager-mcp.yaml:ro \
  packager-mcp
```

> **Note:** Environment variables for transport (`TRANSPORT_TYPE`, `TRANSPORT_PORT`, `TRANSPORT_HOST`) override values in the YAML config file. Other transport fields (`sessionTimeoutMs`, `corsOrigin`) are only configurable via YAML.

### Configuration File Search Order

The server searches for config files in this order:

1. `./packager-mcp.yaml`
2. `./packager-mcp.yml`
3. `./config.yaml`
4. `./config.yml`

## Docker Compose

A `docker-compose.yml` is included for local development:

```bash
# Set your GitHub token
export GITHUB_TOKEN=your_token

# Start the service
docker compose up

# Run in background
docker compose up -d

# View logs
docker compose logs -f

# Stop the service
docker compose down
```

The compose file includes a healthcheck that probes `/health` every 30 seconds with a 10-second start period:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

## HTTP Transport

When HTTP transport is enabled (`TRANSPORT_TYPE=http` or `TRANSPORT_TYPE=both`), the server uses the MCP Streamable HTTP protocol.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check — returns `status`, `version`, and `timestamp` |
| `/mcp` | GET | Initialize a new Streamable HTTP session |
| `/mcp` | POST | Send JSON-RPC messages (requires `mcp-session-id` header) |
| `/mcp` | DELETE | Terminate a session (requires `mcp-session-id` header) |

### Health Check Response

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-15T12:00:00.000Z"
}
```

### CORS

The server sets CORS headers for browser-based clients. The allowed origin defaults to `http://localhost` and can be changed via the `corsOrigin` field in the YAML config.

### Example

```bash
# Run with HTTP transport on port 8081
docker run -p 8081:8081 \
  -e GITHUB_TOKEN=your_token \
  -e TRANSPORT_TYPE=http \
  -e TRANSPORT_HOST=0.0.0.0 \
  packager-mcp

# Test health endpoint
curl http://localhost:8081/health
```

## Port Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 8081 | TCP | Default HTTP transport port (MCP Streamable HTTP) |

## Multi-Architecture Builds

Build images for both `linux/amd64` and `linux/arm64`:

```bash
# Create and use a buildx builder (one-time setup)
docker buildx create --name multiarch --use

# Build and push multi-arch image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/packager-mcp:latest \
  --push .

# Build for local testing (single platform)
docker buildx build \
  --platform linux/amd64 \
  -t packager-mcp:latest \
  --load .
```

## Graceful Shutdown

The server handles `SIGINT` and `SIGTERM` signals for graceful shutdown:

1. All active Streamable HTTP sessions are closed
2. The HTTP server stops accepting new connections
3. The MCP server is closed
4. The process exits

Docker sends `SIGTERM` on `docker stop` with a default 10-second grace period. The server's internal shutdown timeout is 5 seconds, which fits well within this window.

## Smoke Test

Verify the container builds and starts correctly:

```bash
# 1. Build the image
docker build -t packager-mcp:test .

# 2. Run a quick check inside the container
docker run --rm \
  -e GITHUB_TOKEN=test_token \
  packager-mcp:test node -e "console.log('Container OK')"

# 3. Start the server in HTTP mode and test the health endpoint
docker run --rm -d --name mcp-test \
  -p 8081:8081 \
  -e GITHUB_TOKEN=your_real_token \
  -e TRANSPORT_TYPE=http \
  -e TRANSPORT_HOST=0.0.0.0 \
  packager-mcp:test

curl http://localhost:8081/health

docker stop mcp-test
```

## Troubleshooting

### Container exits immediately
The MCP server defaults to stdio transport. Without a connected client sending MCP protocol messages, the process will wait for input. If using Docker, switch to HTTP transport with `TRANSPORT_TYPE=http`. Use `docker logs <container>` to check for startup errors.

### GitHub API rate limits
Ensure `GITHUB_TOKEN` is set with a valid Personal Access Token to increase rate limits from 60 to 5,000 requests/hour.

### Permission denied errors
The container runs as non-root user `appuser`. Ensure mounted volumes have appropriate read permissions.

### Health check fails in Docker Compose
The compose healthcheck uses `curl`, which is included in the `node:24-bookworm-slim` base image. If you use a custom base image, ensure `curl` is installed or switch to a different health probe method.
