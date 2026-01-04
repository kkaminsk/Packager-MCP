# Change: Remove PSADT v3 Support

## Why

PSADT v4 has been the standard for over a year and users should no longer need v3 migration assistance. Maintaining v3 support adds complexity, increases testing burden, and clutters the codebase with obsolete patterns. Removing v3 support streamlines the project to focus solely on current PSADT v4.1.7.

## What Changes

- **REMOVED**: `/convert-legacy` MCP prompt workflow that converts v3 scripts to v4
- **REMOVED**: `src/workflows/convert-legacy.ts` implementation file
- **REMOVED**: `src/knowledge/psadt/migration.md` - v3 to v4 migration guide
- **REMOVED**: v3 frontend files from `src/knowledge/v4github/PSAppDeployToolkit/Frontend/v3/` directory
- **REMOVED**: v3-related types from `src/types/prompts.ts` (`ConvertLegacyArguments`, `ConvertLegacyResult`, `FunctionMapping`, `VariableMapping`, `ManualReviewPoint`)
- **REMOVED**: v3 function detection/mapping in `src/services/validation.ts` (legacy function warnings will be removed)
- **REMOVED**: v3-related tests from `src/__tests__/prompts.test.ts`
- **REMOVED**: References to v3/migration in documentation files (CLAUDE.md, README.md, COPILOT.md, project.md)
- **MODIFIED**: `src/handlers/prompts.ts` - Remove convert-legacy prompt registration
- **MODIFIED**: `src/workflows/index.ts` - Remove convert-legacy exports

## Impact

- **Affected specs**: `mcp-prompts`, `psadt-service`
- **Affected code**:
  - `src/workflows/convert-legacy.ts` (delete entire file)
  - `src/handlers/prompts.ts` (remove convert-legacy registration)
  - `src/workflows/index.ts` (remove convert-legacy exports)
  - `src/types/prompts.ts` (remove v3-related types)
  - `src/services/validation.ts` (remove v3 legacy function warnings)
  - `src/knowledge/psadt/migration.md` (delete entire file)
  - `src/knowledge/v4github/PSAppDeployToolkit/Frontend/v3/` (delete entire directory)
  - `src/__tests__/prompts.test.ts` (remove convert-legacy tests)
  - `CLAUDE.md`, `README.md`, `COPILOT.md`, `openspec/project.md` (update documentation)
- **Breaking change**: Users relying on `/convert-legacy` prompt will no longer have this functionality
- **Migration path**: Users with v3 scripts should use external migration tools or manually convert before using this MCP server
