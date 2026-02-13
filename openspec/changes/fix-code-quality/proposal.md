# Change: Fix Code Quality and Documentation Issues

## Why

Several low-to-medium priority code quality and documentation issues reduce maintainability: the Intune publisher has hardcoded timeouts, there are redundant documentation files, ad-hoc test directories, and no root-level CONTRIBUTING.md for code contributors.

## What Changes

- **REFACTOR**: Extract hardcoded polling timeouts in `intune-publisher.ts` into configurable constants or config values
- **FIX**: Remove redundant `Readme.txt` (duplicate of `README.md`)
- **FIX**: Consolidate AI agent instruction files (`AGENTS.md`, `CLAUDE.md`, `COPILOT.md`) — keep `AGENTS.md` as canonical, symlink or reference from others
- **NEW**: Add root-level `CONTRIBUTING.md` for code contributors
- **REFACTOR**: Move `applicationspecification.md` to `docs/` directory

## Impact

- **Affected specs**: `mcp-server-core`
- **Affected code**:
  - `src/services/intune-publisher.ts` — configurable timeouts
  - Root directory — file cleanup
  - `CONTRIBUTING.md` — new file
  - `docs/` — new directory for project documentation
