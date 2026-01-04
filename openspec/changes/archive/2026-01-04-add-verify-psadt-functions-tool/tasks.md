# Tasks: Add verify_psadt_functions MCP Tool

## 1. Create Reference Data

- [x] 1.1 Create `src/knowledge/reference/psadt-functions.json` with complete list of 135 valid PSADT v4.1.7 function names
- [x] 1.2 Add mapping of known incorrect functions to their correct alternatives (e.g., `Initialize-ADTDeployment` -> `Open-ADTSession`)
- [x] 1.3 Add list of invalid parameter names (e.g., `-Arguments` -> `-ArgumentList`)

## 2. Implement Verification Logic

- [x] 2.1 Add `verifyPsadtFunctions` method to `src/services/validation.ts`
- [x] 2.2 Implement PowerShell function name extraction using regex patterns
- [x] 2.3 Implement validation against known function list
- [x] 2.4 Implement parameter name validation for key functions (`Start-ADTProcess`)
- [x] 2.5 Add types to `src/types/validation.ts` for verification input/output

## 3. Register MCP Tool

- [x] 3.1 Define Zod schema for `verify_psadt_functions` tool in `src/handlers/tools.ts`
- [x] 3.2 Register tool handler with MCP server
- [x] 3.3 Implement file reading logic (accept file path as input)

## 4. Testing & Documentation

- [x] 4.1 Test with valid PSADT script (all functions should pass)
- [x] 4.2 Test with invalid script containing `Initialize-ADTDeployment` (should report error with correction)
- [x] 4.3 Test with script using `-Arguments` parameter (should report error)
- [x] 4.4 Update CLAUDE.md with new tool usage guidance
