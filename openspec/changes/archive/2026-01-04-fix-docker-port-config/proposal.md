# Change: Fix Docker Port Configuration Inconsistency

## Why

There is a port mismatch between Docker configuration files and the actual server defaults:

| File | Port | Issue |
|------|------|-------|
| `Dockerfile` | EXPOSE 10101 | Incorrect |
| `docker-compose.yml` | 10101:10101 | Incorrect |
| `src/config/schema.ts` | Default 8081 | Correct |
| `DOCKER.md` | Documents 8081 | Correct |

Additionally, the Docker configuration is missing:
- `TRANSPORT_TYPE=http` environment variable (container defaults to stdio, won't listen on any port)
- `TRANSPORT_HOST=0.0.0.0` to bind to all interfaces inside container
- `.dockerignore` file to speed up builds

## What Changes

1. **Update Dockerfile** - Change `EXPOSE 10101` to `EXPOSE 8081`
2. **Update docker-compose.yml** - Change port mapping to `8081:8081` and add transport environment variables
3. **Add .dockerignore** - Exclude `node_modules`, `.git`, `dist`, etc. from build context

## Impact

- Affected files: `Dockerfile`, `docker-compose.yml`
- New file: `.dockerignore`
- No code changes required - configuration only
- Aligns Docker setup with documented and coded defaults

## Compatibility

- Breaking change for users who explicitly configured port 10101
- Aligns with all documentation (DOCKER.md, CLAUDE.md)
- Standard port 8081 is less likely to conflict with other services
