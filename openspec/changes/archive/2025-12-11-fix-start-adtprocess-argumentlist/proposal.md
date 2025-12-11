# Change: Fix Start-ADTProcess Parameter Name in Knowledge Files

## Why

The PSADT v4 function `Start-ADTProcess` uses the parameter `-ArgumentList` to pass arguments to executables, not `-Arguments`. Several knowledge documentation files contain incorrect examples using `-Arguments`, which causes runtime errors when users copy these examples into their deployment scripts.

This was discovered during a WinRAR package deployment where the error message was:
```
A parameter cannot be found that matches parameter name 'Arguments'.
```

## What Changes

- **Knowledge files**: Update all instances of `Start-ADTProcess -Arguments` to use `-ArgumentList` in:
  - `src/knowledge/installers/exe.md` (2 instances)
  - `src/knowledge/installers/msi.md` (1 instance)
  - `src/knowledge/installers/msix.md` (1 instance)
  - `src/knowledge/reference/exit-codes.md` (1 instance)
  - `src/knowledge/psadt/migration.md` (2 instances)
  - `src/knowledge/patterns/prerequisites.md` (6 instances)
  - `src/knowledge/CONTRIBUTING.md` (1 instance)

- **Test files**: Update test expectations to use correct parameter name:
  - `src/__tests__/validation.test.ts` (1 instance - this tests v3 detection, may be intentional)
  - `src/__tests__/prompts.test.ts` (1 instance)

Note: Files in `src/knowledge/v4github/` are the actual PSADT toolkit source and use `-Arguments` for other cmdlets (like `Invoke-CimMethod`), which is correct for those functions. These should NOT be changed.

## Impact

- Affected specs: `psadt-service` (already specifies correct behavior in requirement "Use correct parameter names")
- Affected code: Knowledge documentation files only (no source code changes)
- This is a documentation fix to align with the existing specification
