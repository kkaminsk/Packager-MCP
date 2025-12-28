# Change: Add Intune Win32 App Publishing

## Why

Enterprise IT administrators need an end-to-end workflow for packaging applications for Intune. Currently, packager-mcp helps create PSADT packages and detection rules, but users must manually upload to Intune via the portal. This creates friction and breaks the automated packaging workflow.

## What Changes

- **NEW**: `publish_to_intune` MCP tool that uploads .intunewin packages via Microsoft Graph API
- **NEW**: Certificate-based service principal authentication for Entra ID
- **NEW**: Auto-population of app metadata (name, version, vendor, commands, detection rules) from packaging workflow
- **NEW**: Web search integration for application descriptions (≤10,000 chars)
- **NEW**: Optional logo fetching via web search (256x256 PNG/JPEG)
- **NEW**: `/publish-to-intune` MCP prompt workflow for guided publishing

## Scope

This feature will:
- Use existing .intunewin files (not create them)
- Upload packages via Graph API
- Auto-assign "best fit" category
- Set x64 architecture and Windows 10 1607+ requirements
- Skip publishing, dependencies, and superseded settings

## Impact

- **Affected specs**: New `intune-publisher` capability spec
- **Affected code**:
  - `src/services/intune-publisher.ts` - New service for Graph API
  - `src/services/graph-auth.ts` - Certificate-based auth
  - `src/handlers/tools.ts` - New tool handler
  - `src/handlers/prompts.ts` - New prompt workflow
  - `src/types/intune.ts` - Intune app types

## Non-Goals

- Creating .intunewin packages (user provides pre-built package)
- Interactive browser authentication
- Device code flow authentication
- Setting app assignments (groups)
- Managing dependencies or supersedence relationships
- Publishing to store (only internal Win32 apps)
