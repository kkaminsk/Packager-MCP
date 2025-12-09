## 1. Type Definitions
- [x] 1.1 Create `types/validation.ts` with validation types (ValidationResult, Issue, Rule)
- [x] 1.2 Add severity enum (error, warning, info)
- [x] 1.3 Add category enum (structure, psadt, intune, security, best-practice)
- [x] 1.4 Add input/output types for `validate_package` tool

## 2. Rule Definitions
- [x] 2.1 Create rule definition format with id, severity, category, pattern, suggestion
- [x] 2.2 Define structure rules (param-block, try-catch, syntax)
- [x] 2.3 Define PSADT rules (import, initialize, complete, adt-prefix)
- [x] 2.4 Define Intune rules (detection-possible, silent-install, no-ui)
- [x] 2.5 Define security rules (hardcoded-paths, credentials, safe-execution)
- [x] 2.6 Define best-practice rules (logging, error-messages, comments)

## 3. Validation Service
- [x] 3.1 Create `services/validation.ts` service class
- [x] 3.2 Implement `validatePackage()` main method
- [x] 3.3 Implement rule matching engine (regex + string matching)
- [x] 3.4 Implement line number detection for issues
- [x] 3.5 Implement score calculation (100 - penalties)
- [x] 3.6 Implement level filtering (basic, standard, strict)
- [x] 3.7 Implement environment-specific rules (intune, sccm, standalone)

## 4. MCP Tool
- [x] 4.1 Register `validate_package` tool in handlers
- [x] 4.2 Implement tool handler with input validation
- [x] 4.3 Return structured validation results

## 5. Output Formatting
- [x] 5.1 Format issues with severity, category, message, line number, suggestion
- [x] 5.2 Include passed checks in output
- [x] 5.3 Include overall score and is_valid boolean

## 6. Testing
- [x] 6.1 Unit tests for each rule category
- [x] 6.2 Test with valid PSADT scripts (expect pass)
- [x] 6.3 Test with intentionally broken scripts (expect failures)
- [x] 6.4 Test score calculation
- [x] 6.5 Test level filtering

## 7. Documentation
- [x] 7.1 Document `validate_package` tool parameters
- [x] 7.2 Document available validation rules and their meanings
- [x] 7.3 Document severity levels and scoring
