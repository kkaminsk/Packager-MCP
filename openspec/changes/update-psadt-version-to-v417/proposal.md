# Change: Update PSADT Version Display to v4.1.7

## Why

The package output metadata displays "PSADT v4.0" in the Package Framework field, but the spec requires v4.1.7 and the embedded toolkit files are v4.1.7. This inconsistency confuses users who see a different version in their package metadata than what the toolkit actually provides.

Example current output:
```
- **Package Framework**: PowerShell App Deployment Toolkit (PSADT) v4.0
```

Should display:
```
- **Package Framework**: PowerShell App Deployment Toolkit (PSADT) v4.1.7
```

## What Changes

- Update `PSADT_VERSION` constant from `'4.0'` to `'4.1.7'` in `src/services/psadt.ts`
- Update tests in `psadt.test.ts` and `prompts.test.ts` to expect `'4.1.7'`

## Impact

- Affected specs: `psadt-service` (already specifies v4.1.7, this aligns implementation)
- Affected code: `src/services/psadt.ts`, `src/__tests__/psadt.test.ts`, `src/__tests__/prompts.test.ts`
- No breaking changes - this is a metadata display fix to match actual toolkit version
