## 1. Type Definitions
- [ ] 1.1 Create `types/prompts.ts` with prompt argument types
- [ ] 1.2 Add workflow result types
- [ ] 1.3 Add prompt registration types

## 2. Prompt Handler Framework
- [ ] 2.1 Update `handlers/prompts.ts` to register all prompts
- [ ] 2.2 Implement argument parsing for prompt invocations
- [ ] 2.3 Create workflow dispatcher

## 3. Package App Workflow
- [ ] 3.1 Create `workflows/package-app.ts`
- [ ] 3.2 Implement Winget lookup step
- [ ] 3.3 Implement installer type detection
- [ ] 3.4 Implement PSADT script generation step
- [ ] 3.5 Implement detection rule generation step
- [ ] 3.6 Implement validation step
- [ ] 3.7 Implement output formatting
- [ ] 3.8 Support `--quick` and `--no-validate` flags

## 4. Convert Legacy Workflow
- [ ] 4.1 Create `workflows/convert-legacy.ts`
- [ ] 4.2 Implement v3 script analysis
- [ ] 4.3 Implement deprecated function detection
- [ ] 4.4 Implement v3-to-v4 function mapping
- [ ] 4.5 Implement script conversion
- [ ] 4.6 Implement manual review point highlighting
- [ ] 4.7 Implement validation of converted script

## 5. Troubleshoot Workflow
- [ ] 5.1 Create `workflows/troubleshoot.ts`
- [ ] 5.2 Implement log file analysis
- [ ] 5.3 Implement error code lookup (from ref://exit-codes)
- [ ] 5.4 Implement cause identification logic
- [ ] 5.5 Implement fix suggestion generation

## 6. Bulk Lookup Workflow
- [ ] 6.1 Create `workflows/bulk-lookup.ts`
- [ ] 6.2 Implement application list parsing
- [ ] 6.3 Implement parallel Winget lookups
- [ ] 6.4 Implement CSV output format
- [ ] 6.5 Implement JSON output format
- [ ] 6.6 Implement Markdown output format

## 7. Testing
- [ ] 7.1 Unit tests for argument parsing
- [ ] 7.2 Integration tests for `/package-app` workflow
- [ ] 7.3 Integration tests for `/convert-legacy` workflow
- [ ] 7.4 Integration tests for `/troubleshoot` workflow
- [ ] 7.5 Integration tests for `/bulk-lookup` workflow
- [ ] 7.6 Test with Claude CLI prompt invocation

## 8. Documentation
- [ ] 8.1 Document `/package-app` usage and arguments
- [ ] 8.2 Document `/convert-legacy` usage and arguments
- [ ] 8.3 Document `/troubleshoot` usage and arguments
- [ ] 8.4 Document `/bulk-lookup` usage and arguments
- [ ] 8.5 Add examples for each prompt
