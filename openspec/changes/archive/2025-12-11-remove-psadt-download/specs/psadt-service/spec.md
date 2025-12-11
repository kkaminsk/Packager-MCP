# psadt-service Specification Delta

## REMOVED Requirements

### Requirement: Download PSADT Toolkit

**Reason**: The dynamic download mechanism is unreliable due to GitHub API rate limits, network timeouts, and caching complexity. Static toolkit files bundled with the MCP server provide a more reliable user experience.

**Migration**: Users should copy toolkit files from `dist/knowledge/v4github/` directory to their package directory instead of using the `download_psadt_toolkit` tool.

### Requirement: Toolkit Download Output Structure

**Reason**: Removed along with the download functionality. The static knowledge structure in `dist/knowledge/v4github/` provides the same directory layout.

**Migration**: Copy files from `dist/knowledge/v4github/` which contains the same structure: PSAppDeployToolkit/, Config/, Assets/, Files/, and frontend scripts.

### Requirement: Integrated Template and Toolkit Download

**Reason**: The `download_toolkit` parameter in `get_psadt_template` is removed since dynamic downloads are being replaced with static files.

**Migration**: After calling `get_psadt_template`, manually copy toolkit files from `dist/knowledge/v4github/` to the output directory.

## ADDED Requirements

### Requirement: Static PSADT Toolkit Knowledge Base
The system SHALL include a static copy of PSADT v4 toolkit files in the `dist/knowledge/v4github/` directory for reliable offline access.

#### Scenario: Static toolkit files available
- **WHEN** the MCP server is installed
- **THEN** the `dist/knowledge/v4github/` directory SHALL contain:
  - `PSAppDeployToolkit/` directory with module files (PSAppDeployToolkit.psd1, PSAppDeployToolkit.psm1)
  - `Config/` directory with default configuration (config.psd1)
  - `Assets/` directory with icons and images
  - `Files/` directory for user installer placement
  - Frontend scripts in `PSAppDeployToolkit/Frontend/v4/` (Invoke-AppDeployToolkit.exe, Invoke-AppDeployToolkit.ps1)

#### Scenario: Toolkit version pinned
- **WHEN** the static toolkit files are accessed
- **THEN** the version SHALL be PSADT v4.1.7 with 135 exported functions
- **AND** the module GUID SHALL be `8c3c366b-8606-4576-9f2d-4051144f7ca2`

## MODIFIED Requirements

### Requirement: Generate PSADT Template
The system SHALL provide a `get_psadt_template` MCP tool that generates PSADT v4 deployment scripts based on application characteristics.

#### Scenario: Generate MSI template
- **WHEN** the user invokes `get_psadt_template` with `installer_type: "msi"`
- **THEN** the system SHALL return a PSADT script using `Start-ADTMsiProcess`
- **AND** the script SHALL include proper MSI silent arguments

#### Scenario: Generate EXE template
- **WHEN** the user invokes `get_psadt_template` with `installer_type: "exe"`
- **THEN** the system SHALL return a PSADT script using `Start-ADTProcess`
- **AND** the script SHALL have placeholders for silent install arguments

#### Scenario: Generate MSIX template
- **WHEN** the user invokes `get_psadt_template` with `installer_type: "msix"`
- **THEN** the system SHALL return a PSADT script using `Add-AppxPackage`

#### Scenario: Generate ZIP template
- **WHEN** the user invokes `get_psadt_template` with `installer_type: "zip"`
- **THEN** the system SHALL return a PSADT script with extraction and file copy logic

#### Scenario: Basic complexity level
- **WHEN** the user specifies `complexity: "basic"`
- **THEN** the generated script SHALL include only essential installation logic
- **AND** the script SHALL NOT include user prompts or deferred execution

#### Scenario: Standard complexity level
- **WHEN** the user specifies `complexity: "standard"`
- **THEN** the generated script SHALL include pre/post installation phases
- **AND** the script SHALL include `Show-ADTInstallationWelcome` for user interaction

#### Scenario: Advanced complexity level
- **WHEN** the user specifies `complexity: "advanced"`
- **THEN** the generated script SHALL include all phases (pre, install, post, uninstall, repair)
- **AND** the script SHALL include prerequisite checking
- **AND** the script SHALL include custom action hooks

#### Scenario: Include uninstall logic
- **WHEN** the user specifies `include_uninstall: true`
- **THEN** the generated script SHALL include a complete uninstallation section

#### Scenario: Include repair logic
- **WHEN** the user specifies `include_repair: true`
- **THEN** the generated script SHALL include a repair section for corrupted installations

#### Scenario: Machine vs user scope
- **WHEN** the user specifies `install_scope: "machine"` or `install_scope: "user"`
- **THEN** the generated script SHALL configure installation context accordingly

#### Scenario: Template references static toolkit location
- **WHEN** any template is generated
- **THEN** the response SHALL include guidance to copy toolkit files from `dist/knowledge/v4github/`
- **AND** the response SHALL NOT include any `download_toolkit` or `toolkit_download` fields
