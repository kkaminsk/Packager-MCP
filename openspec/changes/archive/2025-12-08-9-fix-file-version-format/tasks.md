# Implementation Tasks

## 1. Version Format Utility

- [x] 1.1 Create `normalizeFileVersion()` function in detection service
  - Accept version string input
  - Pad to 4-part format if fewer parts provided (e.g., `7.13.0` → `7.13.0.0`)
  - Validate each part is numeric
  - Return normalized version string

- [x] 1.2 Create `isValidFileVersion()` validation function
  - Check format matches `X.X.X.X` pattern where X is a number
  - Return boolean with optional error message

## 2. Apply Validation to Detection Service

- [x] 2.1 Update `generateFileDetection()` method
  - Apply normalization to `detectionValue` when `detectionType` is `version`
  - Add warning to recommendations if version was auto-normalized

- [x] 2.2 Update `generateScriptDetection()` method
  - Apply same normalization for version comparisons in scripts

- [x] 2.3 Update PowerShell script generation
  - Use normalized version in generated scripts
  - Add comment about version format requirement

## 3. Update Tests

- [x] 3.1 Fix existing detection tests to use 4-part versions
  - Update test cases that use `2.0.0` to `2.0.0.0`
  - Update test cases that use `1.0.0` to `1.0.0.0`

- [x] 3.2 Add new test cases for version normalization
  - Test 3-part version is normalized to 4-part
  - Test 2-part version is normalized
  - Test already 4-part version passes through unchanged
  - Test invalid version formats rejected

## 4. Documentation

- [x] 4.1 Update knowledge base detection patterns documentation
  - Add note about Windows file version format requirement
