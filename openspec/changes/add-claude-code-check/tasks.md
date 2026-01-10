# Tasks

## 1. Implementation

- [x] 1.1 Add `DirectorySearch` and `FileSearch` to detect Claude Code at `%USERPROFILE%\.claude\local\claude.exe`
- [x] 1.2 Add `CLAUDECODE_FOUND` property to store detection result
- [x] 1.3 Add warning message displayed via custom action when Claude Code not found
- [x] 1.4 Ensure warning is non-blocking (user clicks OK to continue)

## 2. Testing

- [ ] 2.1 Test installation on system WITH Claude Code installed (no warning shown)
- [ ] 2.2 Test installation on system WITHOUT Claude Code installed (warning shown)
- [ ] 2.3 Verify clicking OK allows installation to proceed
- [ ] 2.4 Verify silent install (`/qn`) proceeds without interruption

## 3. Documentation

- [x] 3.1 Update installer README with Claude Code recommendation note
