## 1. Update Templates

- [x] 1.1 Update `src/templates/partials/initialize.hbs` - Replace `Initialize-ADTDeployment` with `Open-ADTSession` pattern
- [x] 1.2 Update `src/templates/partials/error-handling.hbs` - Replace `Complete-ADTDeployment` with `Close-ADTSession`
- [x] 1.3 Update `src/templates/exe-basic.hbs` - Fix all incorrect function names
- [x] 1.4 Update `src/templates/exe-standard.hbs` - Fix all incorrect function names
- [x] 1.5 Update `src/templates/exe-advanced.hbs` - Fix all incorrect function names
- [x] 1.6 Update `src/templates/msi-basic.hbs` - Fix all incorrect function names
- [x] 1.7 Update `src/templates/msi-standard.hbs` - Fix all incorrect function names
- [x] 1.8 Update `src/templates/msi-advanced.hbs` - Fix all incorrect function names
- [x] 1.9 Update `src/templates/msix.hbs` - Fix all incorrect function names
- [x] 1.10 Update `src/templates/zip.hbs` - Fix all incorrect function names

## 2. Update Services

- [x] 2.1 Update `src/services/validation.ts` - Replace validation rules to check for correct v4.1.7 functions:
  - Change `Initialize-ADTDeployment` check to `Open-ADTSession`
  - Change `Complete-ADTDeployment` check to `Close-ADTSession`
  - Add check for incorrect function usage (warn if old names detected)

## 3. Update Workflows

- [x] 3.1 Update `src/workflows/convert-legacy.ts` - Fix function mapping table:
  - Change `Exit-Script` target from `Complete-ADTDeployment` to `Close-ADTSession`
  - Change `Get-InstalledApplication` target from `Get-ADTInstalledApplication` to `Get-ADTApplication`
  - Fix validation checks to use correct function names
  - Update generated script template

## 4. Update Knowledge Base

- [x] 4.1 Update `src/knowledge/installers/exe.md` - Fix example scripts
- [x] 4.2 Update `src/knowledge/installers/msi.md` - Fix example scripts
- [x] 4.3 Update `src/knowledge/reference/exit-codes.md` - Fix example code snippets

## 5. Update Tests

- [x] 5.1 Update `src/__tests__/validation.test.ts` - Fix test cases to use correct function names
- [x] 5.2 Update `src/__tests__/prompts.test.ts` - Fix test cases to use correct function names

## 6. Update OpenSpec and Project Documentation

- [x] 6.1 Update `openspec/project.md` - Fix PSADT v4 section:
  - Change `Initialize-ADTDeployment` to `Open-ADTSession`
  - Change `Complete-ADTDeployment` to `Close-ADTSession`
  - Change `$ADTSession` to `$adtSession` (lowercase)

## 7. Verification

- [x] 7.1 Run `npm run build` to ensure TypeScript compiles
- [x] 7.2 Run `npm run test` to ensure all tests pass
- [x] 7.3 Manually test template generation with MCP server
