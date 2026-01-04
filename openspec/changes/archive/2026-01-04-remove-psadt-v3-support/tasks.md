## 1. Remove v3 Knowledge Files
- [x] 1.1 Delete `src/knowledge/psadt/migration.md`
- [x] 1.2 Delete `src/knowledge/v4github/PSAppDeployToolkit/Frontend/v3/` directory and all contents

## 2. Remove Convert-Legacy Workflow
- [x] 2.1 Delete `src/workflows/convert-legacy.ts`
- [x] 2.2 Update `src/workflows/index.ts` to remove convert-legacy exports

## 3. Update Prompt Handler
- [x] 3.1 Remove convert-legacy prompt registration from `src/handlers/prompts.ts`
- [x] 3.2 Update prompt count comment (from 4 to 3)

## 4. Remove v3-Related Types
- [x] 4.1 Remove `ConvertLegacyArguments` interface from `src/types/prompts.ts`
- [x] 4.2 Remove `ConvertLegacyResult` interface from `src/types/prompts.ts`
- [x] 4.3 Remove `FunctionMapping` interface from `src/types/prompts.ts`
- [x] 4.4 Remove `VariableMapping` interface from `src/types/prompts.ts`
- [x] 4.5 Remove `ManualReviewPoint` interface from `src/types/prompts.ts`

## 5. Update Validation Service
- [x] 5.1 Remove v3 legacy function warnings from `uses-adt-prefix` rule in `src/services/validation.ts`
- [x] 5.2 Update rule description to remove v3 references

## 6. Update Tests
- [x] 6.1 Remove convert-legacy workflow tests from `src/__tests__/prompts.test.ts`
- [x] 6.2 Remove convert-legacy imports from test file

## 7. Update Documentation
- [x] 7.1 Update `CLAUDE.md` to remove v3/migration references
- [x] 7.2 Update `README.md` to remove v3/migration references
- [x] 7.3 Update `COPILOT.md` to remove v3/migration references
- [x] 7.4 Update `openspec/project.md` to remove v3/migration references
- [x] 7.5 Update prompt table to show 3 prompts instead of 4

## 8. Validation
- [x] 8.1 Run `npm run build` to verify no TypeScript errors
- [x] 8.2 Run `npm run test` to verify all tests pass (177 tests passing)
- [x] 8.3 Verify MCP server functionality retained
