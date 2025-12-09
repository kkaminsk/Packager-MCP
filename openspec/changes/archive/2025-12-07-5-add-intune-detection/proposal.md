# Change: Add Intune Detection Rule Generation

## Why
Every Intune Win32 app requires detection rules to determine if the application is installed. Creating these manually is error-prone and repetitive. Automated generation ensures correct detection logic and saves significant time.

## What Changes
- Add `generate_intune_detection` MCP tool for creating detection rules
- Support four detection types: file, registry, MSI product code, and PowerShell script
- Generate Intune-compatible JSON configuration for API integration
- Generate equivalent PowerShell detection scripts

## Impact
- Affected specs: `intune-detection` (new capability)
- Affected code: `src/services/detection.ts`, `src/handlers/tools.ts`, `src/types/intune.ts`

## Dependencies
- **Requires**: Proposal 1 (MCP Server Foundation) - needs server and handler infrastructure
- **Optional**: Proposal 2 (Winget Integration) - can use package metadata for MSI product codes

## Sequence
**Proposal 5 of 6** - Must be implemented after Proposal 1. Can be implemented in parallel with Proposals 2-4.
