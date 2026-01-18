# Knowledge Base Changelog

All notable changes to the knowledge base are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [2025-12-07] - Complete Knowledge Base v4.1.8 Alignment

### Changed
- `installers/msi.md` - Updated to v4.1.8
  - Changed `$ADTSession.FilesDirectory` to `$adtSession.DirFiles`
  - Updated metadata to v4.1.8 target
- `installers/exe.md` - Updated to v4.1.8
  - Changed `$ADTSession.FilesDirectory` to `$adtSession.DirFiles`
  - Updated metadata to v4.1.8 target
- `installers/msix.md` - Updated to v4.1.8
  - Changed deprecated patterns to v4.1.8 function-based structure
  - Replaced `Initialize-ADTDeployment`/`Complete-ADTDeployment` with proper pattern
  - Updated complete example with `Open-ADTSession`/`Close-ADTSession`
- `patterns/prerequisites.md` - Updated to v4.1.8
  - Replaced deprecated patterns with v4.1.8 function-based structure
  - Updated complete example with proper session management
  - Fixed restart handling to use `Close-ADTSession -ExitCode 3010`
- `patterns/detection.md` - Updated metadata to v4.1.8

### Fixed
- Corrected function names in migration.md:
  - `Get-ADTInstalledApplication` → `Get-ADTApplication`
  - `Remove-ADTInstalledApplication` → `Uninstall-ADTApplication`
  - `Get-ADTDiskSpace` → `Get-ADTFreeDiskSpace`
  - `Remove-ADTShortcut` → Added `Get-ADTShortcut` and `Set-ADTShortcut`
- Fixed function names across all installer guides (msi.md, exe.md, prerequisites.md)
- Corrected all deprecated v3 patterns in example code

## [2025-12-07] - PSADT v4.1.8 Update

### Changed
- Updated all PSADT documentation to target v4.1.8 (from 4.1.5)
- `VERSION` - Bumped to 4.1.8
- `psadt/overview.md` - Updated to v4.1.8
  - Updated module GUID reference and version requirements
  - Corrected script structure with proper initialization pattern
  - Updated comparison table with v4.1.8 specifics
- `psadt/functions.md` - Updated to v4.1.8
  - Added complete 135-function reference organized by category
  - Updated session management section with correct patterns
- `psadt/variables.md` - Updated to v4.1.8
  - Added `DeployAppScriptVersion = '4.1.8'` to session template
  - Updated initialization pattern with `Get-ADTBoundParametersAndDefaultValues`
- `psadt/migration.md` - Comprehensive update
  - Fixed incorrect `Initialize-ADTDeployment`/`Complete-ADTDeployment` references
  - Corrected to use `Open-ADTSession`/`Close-ADTSession`
  - Added complete v4.1.8 script structure with function-based deployment
  - Updated variable mapping table with correct property names
- `psadt/best-practices.md` - Updated version references to v4.1.8

### Fixed
- Corrected migration guide which referenced non-existent functions
- Fixed variable name casing (`$adtSession` not `$ADTSession`)
- Fixed session property names (`DirFiles` not `FilesDirectory`)

## [2024-12-07] - PSADT v4.1 Content Update

### Changed
- Updated all PSADT documentation to target v4.1.5
- `psadt/overview.md` - Added v4.1 features (No ServiceUI, Fluent UI, Auto mode)
- `psadt/functions.md` - Updated with v4.1 functions and parameters
  - Added `Open-ADTSession`/`Close-ADTSession` (replacing Initialize/Complete)
  - Updated `Start-ADTProcess` with v4.1 params (WaitForChildProcesses, UseUnelevatedToken, Timeout)
  - Added `Uninstall-ADTApplication` with FilterScript support
  - Added `Start-ADTProcessAsUser` and `Start-ADTMsiProcessAsUser`
- `psadt/variables.md` - Updated session properties for v4.1
  - Added `AppProcessesToClose`, `RequireAdmin` session variables
  - Updated directory properties (`DirFiles`, `DirSupportFiles`)
- `psadt/best-practices.md` - Rewritten with v4.1 patterns from Examples
  - Function-based structure (`Install-ADTDeployment`, etc.)
  - Parameter splatting patterns
  - Real examples from VLC and WinRAR deployments

### Added
- v4.1-specific features documented:
  - DeployMode 'Auto' behavior
  - No ServiceUI requirement for Intune
  - Zero-config MSI handling
  - `AppProcessesToClose` pattern
  - `RequireAdmin` per-deployment setting

## [2024-12-07] - Initial Structured Release

### Added
- Knowledge maintenance infrastructure
  - VERSION file tracking PSADT target version (4.0.3)
  - CHANGELOG.md for tracking knowledge updates
  - CONTRIBUTING.md for contributor guidance
- YAML frontmatter to all knowledge files with:
  - `title`, `id`, `psadt_target`, `last_updated`
  - `verified_by`, `source_ref`, `tags` metadata
- ReferenceKnowledge/README.md documenting source material
- Validation tooling for knowledge integrity

### PSADT Content
- `psadt/overview.md` - PSADT v4 architecture and concepts
- `psadt/functions.md` - Core function reference
- `psadt/variables.md` - Session variables and properties
- `psadt/migration.md` - v3 to v4 migration guide
- `psadt/best-practices.md` - Deployment patterns

### Installer Guides
- `installers/msi.md` - MSI packaging guide
- `installers/exe.md` - EXE installer guide
- `installers/msix.md` - MSIX/AppX guide

### Patterns
- `patterns/detection.md` - Intune detection patterns
- `patterns/prerequisites.md` - Prerequisite handling

### Reference Data
- `reference/silent-args.json` - Silent install arguments database
- `reference/exit-codes.md` - Common installer exit codes

---

## Template for Future Entries

```markdown
## [YYYY-MM-DD] - Version X.Y.Z Update

### Added
- New content added

### Changed
- Updated content

### Deprecated
- Content marked for removal

### Removed
- Content removed

### Fixed
- Corrections made

### Security
- Security-related updates
```
