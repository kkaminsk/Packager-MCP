## 1. Type Definitions
- [x] 1.1 Create `types/intune.ts` with detection rule types
- [x] 1.2 Add DetectionType enum (file, registry, msi, script)
- [x] 1.3 Add Operator enum (equal, notEqual, greaterThan, etc.)
- [x] 1.4 Add Intune JSON schema types for each detection method
- [x] 1.5 Add input/output types for `generate_intune_detection` tool

## 2. Detection Service
- [x] 2.1 Create `services/detection.ts` service class
- [x] 2.2 Implement `generateFileDetection()` method
- [x] 2.3 Implement `generateRegistryDetection()` method
- [x] 2.4 Implement `generateMsiDetection()` method
- [x] 2.5 Implement `generateScriptDetection()` method
- [x] 2.6 Implement `toIntuneJson()` for Intune API format
- [x] 2.7 Implement `recommendDetectionType()` helper

## 3. Script Templates
- [x] 3.1 Create file detection PowerShell template
- [x] 3.2 Create registry detection PowerShell template
- [x] 3.3 Create version comparison PowerShell template
- [x] 3.4 Create multi-check detection PowerShell template

## 4. MCP Tool
- [x] 4.1 Register `generate_intune_detection` tool in handlers
- [x] 4.2 Implement tool handler with input validation
- [x] 4.3 Return both Intune JSON and PowerShell script output

## 5. Testing
- [x] 5.1 Unit tests for file detection generation
- [x] 5.2 Unit tests for registry detection generation
- [x] 5.3 Unit tests for MSI detection generation
- [x] 5.4 Unit tests for script detection generation
- [x] 5.5 Validate JSON output matches Intune schema
- [x] 5.6 Validate PowerShell scripts are syntactically valid

## 6. Documentation
- [x] 6.1 Document `generate_intune_detection` tool parameters
- [x] 6.2 Document detection type recommendations
- [x] 6.3 Document how to use output in Intune portal
