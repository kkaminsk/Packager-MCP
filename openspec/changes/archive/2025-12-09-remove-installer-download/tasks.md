## 1. Remove download_installer tool

- [x] 1.1 Remove `download_installer` tool registration from `src/handlers/tools.ts`
- [x] 1.2 Delete `src/services/download.ts`
- [x] 1.3 Delete `src/types/download.ts`
- [x] 1.4 Remove download-related error classes from `src/utils/errors.ts` (kept DownloadError/ExtractionError for psadt-download)
- [x] 1.5 Remove `download.*` configuration from `src/config/loader.ts` and schema

## 2. Update documentation

- [x] 2.1 Update `src/knowledge/patterns/download.md` to guide clients on using `Invoke-WebRequest` with the URL from `search_winget`
- [x] 2.2 Update `CLAUDE.md` to remove references to `download_installer` tool

## 3. Archive the installer-download spec

- [x] 3.1 Remove the `installer-download` spec from `openspec/specs/`

## 4. Validation

- [x] 4.1 Run `npm run build` to verify no compilation errors
- [x] 4.2 Test MCP server still starts and lists tools correctly
