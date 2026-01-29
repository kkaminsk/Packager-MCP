# Fix Package.json Structure

## Summary

Move `@types/adm-zip` from `dependencies` to `devDependencies` as type definitions are only needed at compile time.

## Priority

**Low** - Housekeeping change, no functional impact.

## Motivation

The `@types/adm-zip` package is incorrectly placed in `dependencies`:

```json
// Current (incorrect)
"dependencies": {
  "@types/adm-zip": "^0.5.7",
  "adm-zip": "^0.5.16",
  ...
}
```

Type definition packages (`@types/*`) are only used during TypeScript compilation and are not needed at runtime. They should be in `devDependencies` to:

1. **Reduce production install size**: `npm ci --only=production` won't install dev dependencies
2. **Follow npm conventions**: Type packages are development tools
3. **Match project conventions**: Other type packages (`@types/node`) are already in devDependencies

## Scope

- Move `@types/adm-zip` from `dependencies` to `devDependencies` in `package.json`
- Run `npm install` to update `package-lock.json`
- Verify build still works

## Impact

- **No risk**: This is a metadata-only change with no runtime impact
- **Files affected**: `package.json`, `package-lock.json`
- **Testing**: Verify `npm run build` succeeds

## Out of Scope

- Other package.json restructuring
- Adding new type definitions
