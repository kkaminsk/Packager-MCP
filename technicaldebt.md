# Technical Debt Report

Generated: 2026-01-20
Last Updated: 2026-01-21

This document tracks outdated dependencies, security vulnerabilities, and components that need attention.

## Resolved Items

### Security Vulnerabilities (Fixed 2026-01-21)
| Package | Previous | Fixed | Issue |
|---------|----------|-------|-------|
| `@modelcontextprotocol/sdk` | 1.24.3 | 1.25.3 | ReDoS vulnerability (GHSA-8r9q-7v3j-jr4g) |
| `qs` (transitive) | <6.14.1 | 6.14.1+ | DoS via memory exhaustion (GHSA-6rw7-vpxm-498p) |

### npm Dependencies (Updated 2026-01-21)
| Package | Previous | Updated |
|---------|----------|---------|
| `@modelcontextprotocol/sdk` | 1.24.3 | 1.25.3 |
| `@types/node` | 24.10.1 | 25.0.9 |
| `zod` | 4.1.13 | 4.3.5 |

### Package Structure (Fixed 2026-01-21)
- Moved `@types/adm-zip` from `dependencies` to `devDependencies`

### GitHub Actions (Updated 2026-01-21)
| Action | Previous | Updated |
|--------|----------|---------|
| `softprops/action-gh-release` | v1 | v2 |

### Node.js Versions (Updated 2026-01-21)
| Component | Previous | Updated |
|-----------|----------|---------|
| Dockerfile | node:21 (EOL) | node:24 (Active LTS) |
| MSI Installer default | 20.18.1 | 20.20.0 |

---

## Remaining Items

### Manual Verification Required
- [ ] Build MSI with new Node.js 20.20.0: `.\scripts\build-msi.ps1 -Clean`
- [ ] Test Docker build with Node.js 24: `docker build -t packager-mcp .`

### Known Test Failures (Pre-existing)
2 tests in `config-loader.test.ts` fail due to environment variable isolation issues:
- `should override transport port with TRANSPORT_PORT env var`
- `should override transport host with TRANSPORT_HOST env var`

These are test infrastructure issues, not security or functionality problems.

---

## Up-to-Date Components

| Component | Version | Status |
|-----------|---------|--------|
| PSADT Toolkit | 4.1.8 | Latest (released 2026-01-14) |
| WiX Toolset SDK | 6.0.2 | Latest |
| WixToolset.UI.wixext | 6.0.2 | Latest |
| WixToolset.Util.wixext | 6.0.2 | Latest |
| TypeScript | 5.9.3 | Current |
| Handlebars | 4.7.8 | Current |
| adm-zip | 0.5.16 | Current |
| yaml | 2.8.2 | Current |
| vitest | 4.0.15 | Current |
| @modelcontextprotocol/sdk | 1.25.3 | Current |
| zod | 4.3.5 | Current |
| @types/node | 25.0.9 | Current |

---

## References

- [Node.js Release Schedule](https://nodejs.org/en/about/previous-releases)
- [Node.js Security Releases](https://nodejs.org/en/blog/)
- [PSAppDeployToolkit Releases](https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases)
- [WiX Toolset Release Notes](https://wixtoolset.org/docs/releasenotes/)
- [npm audit documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
