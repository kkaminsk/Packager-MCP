# Docker Deployment Guide

This guide covers containerized deployment of Packager-MCP.

## Quick Start

```bash
# Build the image
docker build -t packager-mcp .

# Run with required environment variable
docker run -p 10101:10101 -e GITHUB_TOKEN=your_token packager-mcp
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | Yes | - | GitHub Personal Access Token for Winget API access |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | No | `json` | Log format: `json` or `text` |

**Security Note:** Never bake secrets into Docker images. Always inject `GITHUB_TOKEN` via environment variables at runtime.

## Configuration

### Option 1: Environment Variables Only

```bash
docker run -p 10101:10101 \
  -e GITHUB_TOKEN=your_token \
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
```

Mount it into the container:

```bash
docker run -p 10101:10101 \
  -e GITHUB_TOKEN=your_token \
  -v $(pwd)/packager-mcp.yaml:/app/packager-mcp.yaml:ro \
  packager-mcp
```

## Docker Compose

Use `docker-compose.yml` for local development:

```bash
# Set your GitHub token
export GITHUB_TOKEN=your_token

# Start the service
docker compose up

# Run in background
docker compose up -d

# Stop the service
docker compose down
```

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

## Smoke Test

Verify the container builds and starts correctly:

```bash
# 1. Build the image
docker build -t packager-mcp:test .

# 2. Run the container (will exit since MCP uses stdio)
docker run --rm \
  -e GITHUB_TOKEN=test_token \
  packager-mcp:test node -e "console.log('Container OK')"

# 3. Verify the server starts (will wait for stdio input)
docker run --rm -it \
  -e GITHUB_TOKEN=your_real_token \
  packager-mcp:test
```

The server will start and wait for MCP protocol messages on stdin. Press `Ctrl+C` to exit.

## Port Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 10101 | TCP | MCP server connections |

## Troubleshooting

### Container exits immediately
The MCP server uses stdio transport by default. Without a connected client, it may appear to exit. Use `docker logs` to check for errors.

### GitHub API rate limits
Ensure `GITHUB_TOKEN` is set with a valid Personal Access Token to increase rate limits from 60 to 5000 requests/hour.

### Permission denied errors
The container runs as non-root user `appuser`. Ensure mounted volumes have appropriate read permissions.
