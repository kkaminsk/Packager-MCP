# Update GitHub Actions

## Summary

Update deprecated GitHub Action versions to their latest releases to ensure continued functionality and receive security fixes.

## Priority

**Medium** - Deprecated actions may stop working or have security issues.

## Motivation

The project uses an outdated GitHub Action:

| Action | Current | Latest | Location |
|--------|---------|--------|----------|
| `softprops/action-gh-release` | v1 | v2 | `.github/workflows/build-msi.yml:158` |

Using outdated action versions:
- May miss security patches
- May break when GitHub deprecates older Node.js runtimes
- Missing new features and improvements

## Scope

- Update `softprops/action-gh-release` from `@v1` to `@v2`
- Review changelog for any breaking changes
- Test release workflow (if possible without pushing a tag)

## Impact

- **Low risk**: `action-gh-release@v2` is backwards compatible
- **Files affected**: `.github/workflows/build-msi.yml`
- **Testing**: Manual review or test with a draft release

## Out of Scope

- Adding new GitHub Actions
- Workflow logic changes
- Node.js version changes in workflows (covered in `update-nodejs-versions`)
