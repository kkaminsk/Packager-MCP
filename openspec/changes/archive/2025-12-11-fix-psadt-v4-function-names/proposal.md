# Change: Fix PSADT v4 Function Names

## Why

The codebase uses incorrect PSADT v4 function names that do not exist in the actual PSAppDeployToolkit v4.1.7 module. Scripts generated with these function names fail at runtime with errors like:

```
The term 'Initialize-ADTDeployment' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

This issue was identified during production testing of a WinRAR package (documented in `ReferenceKnowledge/PackageIssues/fixpsm.md`).

## What Changes

- **BREAKING**: Replace `Initialize-ADTDeployment` with `Open-ADTSession` pattern
- **BREAKING**: Replace `Complete-ADTDeployment` with `Close-ADTSession`
- Replace `Get-ADTInstalledApplication` with `Get-ADTApplication`
- Update `$ADTSession.FilesDirectory` to `$adtSession.DirFiles`
- Update `-Arguments` parameter to `-ArgumentList` for `Start-ADTProcess`
- Update script structure to use deployment functions (`Install-ADTDeployment`, `Uninstall-ADTDeployment`, `Repair-ADTDeployment`)
- Update validation rules to check for correct v4.1.7 patterns

## Impact

- Affected specs: `psadt-service`, `validation-service`
- Affected code:
  - `src/templates/*.hbs` - All Handlebars templates
  - `src/services/validation.ts` - Validation service
  - `src/workflows/convert-legacy.ts` - Legacy conversion workflow
  - `src/__tests__/*.test.ts` - Test files
  - `src/knowledge/installers/*.md` - Installer documentation
  - `src/knowledge/reference/exit-codes.md` - Exit codes documentation
  - `openspec/project.md` - Project context
  - `openspec/specs/*/spec.md` - Spec files
