# Tasks

## 1. Copy Static Knowledge Files
- [x] 1.1 Create `src/knowledge/v4github/` directory structure
- [x] 1.2 Copy `ReferenceKnowledge/PSAppDeployToolkit_Template_v4/PSAppDeployToolkit/` to `src/knowledge/v4github/PSAppDeployToolkit/`
- [x] 1.3 Copy `ReferenceKnowledge/PSAppDeployToolkit_Template_v4/Config/` to `src/knowledge/v4github/Config/`
- [x] 1.4 Copy `ReferenceKnowledge/PSAppDeployToolkit_Template_v4/Assets/` to `src/knowledge/v4github/Assets/`
- [x] 1.5 Copy `ReferenceKnowledge/PSAppDeployToolkit_Template_v4/Files/` to `src/knowledge/v4github/Files/`
- [x] 1.6 Verify copied files match source (spot check key files like PSAppDeployToolkit.psd1)

## 2. Remove Download Service Code
- [x] 2.1 Delete `src/services/psadt-download.ts`
- [x] 2.2 Delete `src/types/psadt-download.ts`
- [x] 2.3 Delete `src/__tests__/psadt-download.test.ts`

## 3. Update Tools Handler
- [x] 3.1 Remove `download_psadt_toolkit` tool registration from `src/handlers/tools.ts`
- [x] 3.2 Keep `output_directory` parameter in `get_psadt_template` schema (for package creation)
- [x] 3.3 Update `get_psadt_template` handler to copy toolkit from `ReferenceKnowledge/PSAppDeployToolkit_Template_v4/` when `output_directory` is specified
- [x] 3.4 Update `get_psadt_template` tool description to reference automatic package creation
- [x] 3.5 Remove imports for `getPsadtDownloadService` and related types

## 4. Update Knowledge Documentation
- [x] 4.1 Update `src/knowledge/psadt/overview.md` with automatic package creation guidance
- [x] 4.2 Update `src/knowledge/patterns/download.md` to document `output_directory` package creation

## 5. Update Configuration and Error Handling
- [x] 5.1 Remove `DownloadError`, `ExtractionError` exports if no longer needed
- [x] 5.2 Remove PSADT download-related config options if present in `src/config/` (none present)
- [x] 5.3 Update any error handling that references download functionality

## 6. Build and Test
- [x] 6.1 Run `npm run build` to verify TypeScript compilation
- [x] 6.2 Verify the static knowledge files are included in `dist/knowledge/v4github/`
- [x] 6.3 Run existing tests to ensure no regressions (185 tests passing)
- [x] 6.4 Test `get_psadt_template` tool with `output_directory` to verify package creation

## 7. Documentation Updates
- [x] 7.1 Update CLAUDE.md to document automatic package creation with `output_directory`
- [x] 7.2 Update README.md if it references the download tool
- [x] 7.3 Update any other docs that mention toolkit downloading
