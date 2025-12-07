## 1. Type Definitions
- [ ] 1.1 Create `types/validation.ts` with validation types (ValidationResult, Issue, Rule)
- [ ] 1.2 Add severity enum (error, warning, info)
- [ ] 1.3 Add category enum (structure, psadt, intune, security, best-practice)
- [ ] 1.4 Add input/output types for `validate_package` tool

## 2. Rule Definitions
- [ ] 2.1 Create rule definition format with id, severity, category, pattern, suggestion
- [ ] 2.2 Define structure rules (param-block, try-catch, syntax)
- [ ] 2.3 Define PSADT rules (import, initialize, complete, adt-prefix)
- [ ] 2.4 Define Intune rules (detection-possible, silent-install, no-ui)
- [ ] 2.5 Define security rules (hardcoded-paths, credentials, safe-execution)
- [ ] 2.6 Define best-practice rules (logging, error-messages, comments)

## 3. Validation Service
- [ ] 3.1 Create `services/validation.ts` service class
- [ ] 3.2 Implement `validatePackage()` main method
- [ ] 3.3 Implement rule matching engine (regex + string matching)
- [ ] 3.4 Implement line number detection for issues
- [ ] 3.5 Implement score calculation (100 - penalties)
- [ ] 3.6 Implement level filtering (basic, standard, strict)
- [ ] 3.7 Implement environment-specific rules (intune, sccm, standalone)

## 4. MCP Tool
- [ ] 4.1 Register `validate_package` tool in handlers
- [ ] 4.2 Implement tool handler with input validation
- [ ] 4.3 Return structured validation results

## 5. Output Formatting
- [ ] 5.1 Format issues with severity, category, message, line number, suggestion
- [ ] 5.2 Include passed checks in output
- [ ] 5.3 Include overall score and is_valid boolean

## 6. Testing
- [ ] 6.1 Unit tests for each rule category
- [ ] 6.2 Test with valid PSADT scripts (expect pass)
- [ ] 6.3 Test with intentionally broken scripts (expect failures)
- [ ] 6.4 Test score calculation
- [ ] 6.5 Test level filtering

## 7. Documentation
- [ ] 7.1 Document `validate_package` tool parameters
- [ ] 7.2 Document available validation rules and their meanings
- [ ] 7.3 Document severity levels and scoring
