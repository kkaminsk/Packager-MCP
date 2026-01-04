# Change: Add verify_psadt_functions MCP Tool

## Why

AI models have outdated PSADT function names in their training data that cause scripts to fail when deployed. Even though the `get_psadt_template` tool generates correct scripts, AI models sometimes modify or rewrite scripts using incorrect function names from training data (e.g., `Initialize-ADTDeployment` instead of `Open-ADTSession`).

A verification tool allows users and agents to validate that generated or modified scripts use only valid PSADT v4.1.7 function names before deployment.

## What Changes

- **New MCP Tool**: `verify_psadt_functions` - validates that a PSADT script file uses only valid v4.1.7 function names
- **New Knowledge File**: Reference list of all 135 valid PSADT v4.1.7 function names and known incorrect aliases
- **Extends existing validation**: Builds on the `validate_package` infrastructure but focused specifically on function name verification

### Key Features

1. **File-based input**: Accepts a file path to validate (e.g., `Invoke-AppDeployToolkit.ps1`)
2. **Comprehensive function list**: Uses authoritative list of 135 valid PSADT v4.1.7 functions
3. **Invalid function detection**: Identifies calls to non-existent functions with correct alternatives
4. **Parameter validation**: Checks for common incorrect parameters (e.g., `-Arguments` vs `-ArgumentList`)
5. **Clear output**: Returns list of valid functions used, invalid functions found, and specific corrections

## Impact

- **Affected specs**: `validation-service` (add new tool capability)
- **Affected code**:
  - `src/handlers/tools.ts` - Register new tool
  - `src/services/validation.ts` - Add function verification logic
  - `src/knowledge/reference/` - Add valid functions reference data
  - `src/types/validation.ts` - Add new types

### Use Cases

1. **Post-generation validation**: After `get_psadt_template` creates a package, verify the script
2. **Manual script review**: Verify scripts that users write or modify manually
3. **CI/CD integration**: Validate scripts before deployment to Intune
4. **Troubleshooting**: When scripts fail, quickly identify if incorrect function names are the cause
