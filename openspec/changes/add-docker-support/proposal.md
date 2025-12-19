# Change: Add Docker support for Packager-MCP

## Why
Packager-MCP needs a reproducible containerized deployment path to simplify installs, ensure consistent Node runtimes, and support multi-architecture environments.

## What Changes
- Add a production `Dockerfile` using Debian with Node.js 21 and a multi-stage build that includes compiled artifacts.
- Add `docker-compose.yml` for local development and dependency wiring.
- Define runtime configuration via environment variables (including a required GitHub PAT) and optional mounted config files.
- Document a minimal container build/release workflow with multi-arch support.
- Add a container smoke-test procedure (`docker build` + `docker run`).

## Impact
- Affected specs: `docker-support`
- Affected code: deployment assets (Dockerfile, docker-compose, documentation, optional scripts)
