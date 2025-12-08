# Change: Add MCP Prompts and Guided Workflows

## Why
Users need guided workflows that orchestrate multiple tools into coherent packaging experiences. Prompts provide step-by-step guidance, reduce cognitive load, and ensure consistent results across the packaging process.

## What Changes
- Add `/package-app` prompt for end-to-end package creation
- Add `/convert-legacy` prompt for PSADT v3 to v4 migration
- Add `/troubleshoot` prompt for diagnosing failed packages
- Add `/bulk-lookup` prompt for retrieving info on multiple applications
- Implement prompt workflow handlers in MCP server

## Impact
- Affected specs: `mcp-prompts` (new capability)
- Affected code: `src/handlers/prompts.ts`, `src/workflows/`

## Dependencies
- **Requires**: Proposal 1 (MCP Server Foundation) - needs server and prompt handler infrastructure
- **Requires**: Proposal 2 (Winget Integration) - `/package-app` uses Winget lookups
- **Requires**: Proposal 3 (PSADT Templates) - `/package-app` generates scripts, `/convert-legacy` uses v4 knowledge
- **Requires**: Proposal 4 (Validation) - `/package-app` validates output
- **Requires**: Proposal 5 (Intune Detection) - `/package-app` generates detection rules

## Sequence
**Proposal 6 of 6** - Must be implemented last as it orchestrates all other capabilities.
