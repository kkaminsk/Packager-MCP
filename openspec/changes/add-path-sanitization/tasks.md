## 1. Path Validation Utility
- [x] 1.1 Create `src/utils/path-validation.ts` with:
  - `validateOutputPath(path, allowedDirs?)` — resolves path, rejects `..` traversal, optionally checks against allowed base directories
  - `validateReadPath(path)` — resolves path, rejects `..` traversal
- [x] 1.2 Add unit tests for traversal rejection, absolute paths, relative paths, and allowed directory checks

## 2. Integrate into Handlers
- [x] 2.1 Add `validateOutputPath` call in `get_psadt_template` before any file system operations
- [x] 2.2 Add `validateReadPath` call in `verify_psadt_functions` before `readFileSync`
- [x] 2.3 Add `validateReadPath` call in `intune-publisher` for `intunewin_path` and `logo_path`
- [x] 2.4 Return clear error messages when validation fails (include the rejected path and reason)

## 3. Configuration
- [x] 3.1 Add optional `security.allowedOutputDirs` to config schema (array of strings)
- [x] 3.2 Update `packager-mcp.example.yaml` with example
- [ ] 3.3 Document the security setting in README
