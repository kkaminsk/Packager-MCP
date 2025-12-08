## 1. Type Definitions
- [x] 1.1 Create `types/prompts.ts` with prompt argument types
- [x] 1.2 Add workflow result types
- [x] 1.3 Add prompt registration types

## 2. Prompt Handler Framework
- [x] 2.1 Update `handlers/prompts.ts` to register all prompts
- [x] 2.2 Implement argument parsing for prompt invocations
- [x] 2.3 Create workflow dispatcher

## 3. Package App Workflow
- [x] 3.1 Create `workflows/package-app.ts`
- [x] 3.2 Implement Winget lookup step
- [x] 3.3 Implement installer type detection
- [x] 3.4 Implement PSADT script generation step
- [x] 3.5 Implement detection rule generation step
- [x] 3.6 Implement validation step
- [x] 3.7 Implement output formatting
- [x] 3.8 Support `--quick` and `--no-validate` flags

## 4. Convert Legacy Workflow
- [x] 4.1 Create `workflows/convert-legacy.ts`
- [x] 4.2 Implement v3 script analysis
- [x] 4.3 Implement deprecated function detection
- [x] 4.4 Implement v3-to-v4 function mapping
- [x] 4.5 Implement script conversion
- [x] 4.6 Implement manual review point highlighting
- [x] 4.7 Implement validation of converted script

## 5. Troubleshoot Workflow
- [x] 5.1 Create `workflows/troubleshoot.ts`
- [x] 5.2 Implement log file analysis
- [x] 5.3 Implement error code lookup (from ref://exit-codes)
- [x] 5.4 Implement cause identification logic
- [x] 5.5 Implement fix suggestion generation

## 6. Bulk Lookup Workflow
- [x] 6.1 Create `workflows/bulk-lookup.ts`
- [x] 6.2 Implement application list parsing
- [x] 6.3 Implement parallel Winget lookups
- [x] 6.4 Implement CSV output format
- [x] 6.5 Implement JSON output format
- [x] 6.6 Implement Markdown output format

## 7. Testing
- [x] 7.1 Unit tests for argument parsing
- [x] 7.2 Integration tests for `/package-app` workflow
- [x] 7.3 Integration tests for `/convert-legacy` workflow
- [x] 7.4 Integration tests for `/troubleshoot` workflow
- [x] 7.5 Integration tests for `/bulk-lookup` workflow
- [x] 7.6 Test with Claude CLI prompt invocation

## 8. Documentation
- [x] 8.1 Document `/package-app` usage and arguments
- [x] 8.2 Document `/convert-legacy` usage and arguments
- [x] 8.3 Document `/troubleshoot` usage and arguments
- [x] 8.4 Document `/bulk-lookup` usage and arguments
- [x] 8.5 Add examples for each prompt
