## 1. Configurable Intune Publisher Timeouts
- [x] 1.1 Extract polling constants (`AZURE_STORAGE_URI_TIMEOUT_MS`, `COMMIT_TIMEOUT_MS`, `POLL_INTERVAL_MS`) to top of `intune-publisher.ts`
- [ ] 1.2 Optionally allow these to be set via config under `intune.timeouts`
- [ ] 1.3 Use `AbortController` with `fetch` for request-level timeouts
- [x] 1.4 Extract polling loop into a `pollUntil` utility function

## 2. Documentation Cleanup
- [x] 2.1 Delete `Readme.txt` (redundant with `README.md`)
- [x] 2.2 Create `docs/` directory and move `applicationspecification.md` into it
- [x] 2.3 Consolidate `CLAUDE.md` and `COPILOT.md` to reference `AGENTS.md` as the canonical agent instructions file
- [x] 2.4 Create `CONTRIBUTING.md` at project root

## 3. Verify
- [ ] 3.1 Ensure README links still resolve after file moves
- [x] 3.2 Verify build and tests still pass
