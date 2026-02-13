# Change: Add File Path Sanitization for Tool Inputs

## Why

The `output_directory` parameter in `get_psadt_template` and `file_path` in `verify_psadt_functions` accept arbitrary file system paths with no validation. A misconfigured or adversarial MCP client could write files to system directories, read sensitive files, or traverse paths with `..` segments.

## What Changes

- **NEW**: Path validation utility that rejects path traversal (`..`) and optionally restricts to allowed base directories
- **NEW**: Configurable `allowedOutputDirs` in server config (optional — if unset, only traversal is blocked)
- **MODIFIED**: `get_psadt_template` handler validates `output_directory` before writing
- **MODIFIED**: `verify_psadt_functions` handler validates `file_path` before reading
- **MODIFIED**: `intune-publisher` validates `intunewin_path` and `logo_path`

## Impact

- **Affected specs**: `mcp-server-core`, `psadt-service`, `validation-service`
- **Affected code**:
  - `src/utils/path-validation.ts` — new utility
  - `src/handlers/tools.ts` — add validation calls
  - `src/config/schema.ts` — optional `allowedOutputDirs`
