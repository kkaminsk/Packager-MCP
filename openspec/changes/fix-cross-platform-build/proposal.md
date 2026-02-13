# Change: Fix Cross-Platform Build Script

## Why

The `npm run build` script uses `xcopy` (Windows-only) to copy templates and knowledge files into `dist/`. This breaks builds on Linux and macOS, including Docker builds. The version in `package.json` (`1.0.0`) also conflicts with the README's stated version (`v0.8 - Beta`).

## What Changes

- **FIX**: Replace `xcopy` commands in `package.json` build script with a cross-platform Node.js copy script
- **FIX**: Ensure Docker builds include templates and knowledge files in `dist/`
- **FIX**: Reconcile version mismatch between `package.json` and README
- **FIX**: Ensure `dist/` is fully excluded from git tracking

## Impact

- **Affected specs**: `mcp-server-core`
- **Affected code**:
  - `package.json` — build script and version field
  - `scripts/copy-assets.mjs` — new cross-platform copy script
  - `README.md` — version reference
  - `.gitignore` — ensure `dist/` is clean
