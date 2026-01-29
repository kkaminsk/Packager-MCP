# Fix Security Vulnerabilities

## Summary

Address two high-severity security vulnerabilities identified in npm dependencies by updating affected packages.

## Priority

**Critical** - Security vulnerabilities should be addressed immediately.

## Motivation

The project has two known high-severity vulnerabilities:

1. **@modelcontextprotocol/sdk (ReDoS)** - [GHSA-8r9q-7v3j-jr4g](https://github.com/advisories/GHSA-8r9q-7v3j-jr4g)
   - Current: 1.24.3
   - Fixed in: 1.25.2+
   - Impact: Regular expression denial of service

2. **qs (DoS via memory exhaustion)** - [GHSA-6rw7-vpxm-498p](https://github.com/advisories/GHSA-6rw7-vpxm-498p)
   - Current: <6.14.1 (transitive dependency)
   - Fixed in: 6.14.1+
   - Impact: Denial of service via memory exhaustion

## Scope

- Update `@modelcontextprotocol/sdk` to latest version (1.25.3)
- Run `npm audit fix` to resolve transitive dependency vulnerabilities
- Verify build and tests pass after updates
- Update `package-lock.json`

## Impact

- **Low risk**: These are patch/minor version updates with security fixes
- **Files affected**: `package.json`, `package-lock.json`
- **Testing**: Run `npm test` and verify MCP server starts correctly

## Out of Scope

- Major version upgrades
- Feature changes
- Other dependency updates (covered in separate proposal)
