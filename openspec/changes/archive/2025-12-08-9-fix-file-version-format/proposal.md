# Change: Fix File Version Format Validation

## Why

Windows file versions use a 4-part format: `major.minor.build.revision` (e.g., `7.13.0.0`). The current implementation accepts 3-part versions like `7.13.0` which are invalid for Intune file detection rules and will cause detection failures.

Intune's `win32LobAppFileSystemDetection` requires the `detectionValue` for version checks to be in the standard Windows version format with all four components.

## What Changes

- **FIX**: Add validation for file version format in `generate_intune_detection` tool
- **FIX**: Normalize 3-part versions to 4-part format (e.g., `7.13.0` → `7.13.0.0`)
- **FIX**: Update tests to use correct 4-part version format
- **NEW**: Add helpful error message when invalid version format is provided

## Impact

- **Affected specs**: `intune-detection` (modified requirement)
- **Affected code**:
  - `src/services/detection.ts` - Add version format validation/normalization
  - `src/handlers/tools.ts` - Potentially add schema validation
  - `src/__tests__/detection.test.ts` - Fix test cases
- **Breaking**: None - invalid versions will now be auto-corrected or rejected with clear error
