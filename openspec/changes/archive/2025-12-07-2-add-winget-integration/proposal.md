# Change: Add Winget Integration Service

## Why
Users need to look up application metadata (installer URLs, silent install parameters, version info) from the Winget package repository without manual research. This is a core value proposition of the MCP server.

## What Changes
- Add `search_winget` MCP tool for querying the Winget repository
- Add `get_silent_install_args` MCP tool for retrieving silent install parameters
- Add Winget service for GitHub API integration with `microsoft/winget-pkgs`
- Add Winget manifest parsing and type definitions
- Integrate with caching layer from Proposal 1

## Impact
- Affected specs: `winget-service` (new capability)
- Affected code: `src/services/winget.ts`, `src/handlers/tools.ts`, `src/types/winget.ts`

## Dependencies
- **Requires**: Proposal 1 (MCP Server Foundation) - needs server, cache, config, and handler infrastructure

## Sequence
**Proposal 2 of 6** - Must be implemented after Proposal 1. Can be implemented in parallel with Proposal 3 if teams allow.
