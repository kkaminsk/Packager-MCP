## 1. Implementation
- [ ] 1.1 Add a Debian-based Node.js 21 multi-stage `Dockerfile` that builds and ships `dist/` artifacts.
- [ ] 1.2 Add `docker-compose.yml` for local development with port 10101 exposure and config/env wiring.
- [ ] 1.3 Document required runtime environment variables (including `GITHUB_TOKEN`) and config mount paths.
- [ ] 1.4 Add a minimal build/release note for multi-arch image creation (linux/amd64 + linux/arm64).
- [ ] 1.5 Add a container smoke test command sequence (`docker build` + `docker run`).
