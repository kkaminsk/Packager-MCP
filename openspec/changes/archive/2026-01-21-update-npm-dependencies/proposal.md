# Update npm Dependencies

## Summary

Update outdated npm dependencies to their latest compatible versions, improving stability and accessing bug fixes.

## Priority

**High** - Keeps dependencies current and reduces technical debt accumulation.

## Motivation

Several npm packages are behind their latest versions:

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `@modelcontextprotocol/sdk` | 1.24.3 | 1.25.3 | Core MCP functionality |
| `@types/node` | 24.10.1 | 25.0.9 | Type definitions (major bump) |
| `zod` | 4.1.13 | 4.3.5 | Schema validation library |

## Scope

- Update all outdated packages to latest compatible versions
- Review any breaking changes in major version updates (@types/node 24→25)
- Update `package.json` and `package-lock.json`
- Verify TypeScript compilation succeeds
- Run tests to ensure no regressions

## Impact

- **Medium risk**: `@types/node` has a major version bump (24→25)
- **Files affected**: `package.json`, `package-lock.json`
- **Testing**: Full test suite, TypeScript build verification

## Out of Scope

- Security vulnerabilities (covered in `fix-security-vulnerabilities` proposal)
- Node.js runtime version updates (covered in `update-nodejs-versions` proposal)

## Dependencies

Should be applied after `fix-security-vulnerabilities` to avoid duplicate work on MCP SDK.
