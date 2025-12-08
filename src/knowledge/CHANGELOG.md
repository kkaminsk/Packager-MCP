# Knowledge Base Changelog

All notable changes to the knowledge base are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
