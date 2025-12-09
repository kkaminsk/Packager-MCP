# Change: Add PSADT Knowledge Base and Template Generation

## Why
Users need expert guidance on PSADT v4 best practices and production-ready templates tailored to their specific application types. This eliminates the steep learning curve and ensures consistent, high-quality packages.

## What Changes
- Add `get_psadt_template` MCP tool for generating deployment scripts
- Add PSADT v4 knowledge base as MCP resources
- Add PSADT service for template generation and customization
- Add embedded documentation for PSADT functions, variables, and patterns
- Add installer-type-specific guides as MCP resources

## Impact
- Affected specs: `psadt-service` (new capability)
- Affected code: `src/services/psadt.ts`, `src/handlers/tools.ts`, `src/handlers/resources.ts`, `src/knowledge/psadt/`, `src/knowledge/installers/`

## Dependencies
- **Requires**: Proposal 1 (MCP Server Foundation) - needs server, handlers, and resource infrastructure

## Sequence
**Proposal 3 of 6** - Must be implemented after Proposal 1. Can be implemented in parallel with Proposal 2.
