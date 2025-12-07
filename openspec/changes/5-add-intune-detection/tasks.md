## 1. Type Definitions
- [ ] 1.1 Create `types/intune.ts` with detection rule types
- [ ] 1.2 Add DetectionType enum (file, registry, msi, script)
- [ ] 1.3 Add Operator enum (equal, notEqual, greaterThan, etc.)
- [ ] 1.4 Add Intune JSON schema types for each detection method
- [ ] 1.5 Add input/output types for `generate_intune_detection` tool

## 2. Detection Service
- [ ] 2.1 Create `services/detection.ts` service class
- [ ] 2.2 Implement `generateFileDetection()` method
- [ ] 2.3 Implement `generateRegistryDetection()` method
- [ ] 2.4 Implement `generateMsiDetection()` method
- [ ] 2.5 Implement `generateScriptDetection()` method
- [ ] 2.6 Implement `toIntuneJson()` for Intune API format
- [ ] 2.7 Implement `recommendDetectionType()` helper

## 3. Script Templates
- [ ] 3.1 Create file detection PowerShell template
- [ ] 3.2 Create registry detection PowerShell template
- [ ] 3.3 Create version comparison PowerShell template
- [ ] 3.4 Create multi-check detection PowerShell template

## 4. MCP Tool
- [ ] 4.1 Register `generate_intune_detection` tool in handlers
- [ ] 4.2 Implement tool handler with input validation
- [ ] 4.3 Return both Intune JSON and PowerShell script output

## 5. Testing
- [ ] 5.1 Unit tests for file detection generation
- [ ] 5.2 Unit tests for registry detection generation
- [ ] 5.3 Unit tests for MSI detection generation
- [ ] 5.4 Unit tests for script detection generation
- [ ] 5.5 Validate JSON output matches Intune schema
- [ ] 5.6 Validate PowerShell scripts are syntactically valid

## 6. Documentation
- [ ] 6.1 Document `generate_intune_detection` tool parameters
- [ ] 6.2 Document detection type recommendations
- [ ] 6.3 Document how to use output in Intune portal
