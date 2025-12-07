# Change: Add Package Validation Engine

## Why
Users need automated quality assurance to catch common packaging mistakes before deployment. Manual review is error-prone and time-consuming. Validation ensures packages meet enterprise standards and work reliably in Intune.

## What Changes
- Add `validate_package` MCP tool for checking PSADT scripts
- Add validation service with configurable rule engine
- Add validation rules for PSADT compliance, Intune requirements, and security
- Support multiple validation levels (basic, standard, strict)
- Support target environment configuration (Intune, SCCM, standalone)

## Impact
- Affected specs: `validation-service` (new capability)
- Affected code: `src/services/validation.ts`, `src/handlers/tools.ts`, `src/types/validation.ts`

## Dependencies
- **Requires**: Proposal 1 (MCP Server Foundation) - needs server and handler infrastructure
- **Requires**: Proposal 3 (PSADT Templates) - needs PSADT knowledge base for rule definitions

## Sequence
**Proposal 4 of 6** - Must be implemented after Proposals 1 and 3.
