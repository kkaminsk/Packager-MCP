# Change: Add MCP Server Foundation

## Why
The Intune Packaging Assistant requires a foundational MCP server that can communicate with Claude CLI and other MCP-compatible clients. This is the core infrastructure upon which all tools, resources, and prompts will be built.

## What Changes
- Add MCP server entry point with stdio transport
- Add configuration management system (YAML-based)
- Add handler layer for routing MCP protocol messages
- Add caching infrastructure (LRU cache)
- Add logging and error handling foundation
- Add TypeScript type definitions for MCP protocol

## Impact
- Affected specs: `mcp-server-core` (new capability)
- Affected code: Creates `src/` directory structure, `server.ts`, `handlers/`, `cache/`, `config/`, `types/`

## Dependencies
- None (this is the first proposal)

## Sequence
**Proposal 1 of 6** - Must be implemented first as all other proposals depend on this foundation.
