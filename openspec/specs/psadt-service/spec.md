# psadt-service Specification

## Purpose
TBD - created by archiving change 3-add-psadt-templates. Update Purpose after archive.
## Requirements
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

### Requirement: Template Output Structure
The system SHALL return template output with structured metadata in addition to the script content.

#### Scenario: Return script content
- **WHEN** a template is generated successfully
- **THEN** the response SHALL include the complete PowerShell script content

#### Scenario: Return file structure
- **WHEN** a template is generated
- **THEN** the response SHALL include the required file and folder structure for the package

#### Scenario: Return customization points
- **WHEN** a template is generated
- **THEN** the response SHALL include a list of customization points with location, description, and examples

#### Scenario: Return documentation
- **WHEN** a template is generated
- **THEN** the response SHALL include usage notes specific to the generated template

### Requirement: PSADT Documentation Resources
The system SHALL expose PSADT v4 documentation as MCP resources.

#### Scenario: Access overview documentation
- **WHEN** a client requests resource `psadt://docs/overview`
- **THEN** the system SHALL return PSADT v4 architecture and concepts documentation

#### Scenario: Access function reference
- **WHEN** a client requests resource `psadt://docs/functions`
- **THEN** the system SHALL return complete function reference for ADT-prefixed functions

#### Scenario: Access variables reference
- **WHEN** a client requests resource `psadt://docs/variables`
- **THEN** the system SHALL return documentation for built-in variables like `$ADTSession`

#### Scenario: Access migration guide
- **WHEN** a client requests resource `psadt://docs/migration`
- **THEN** the system SHALL return v3 to v4 migration guidance

#### Scenario: Access best practices
- **WHEN** a client requests resource `psadt://docs/best-practices`
- **THEN** the system SHALL return recommended patterns and anti-patterns

### Requirement: Installer Knowledge Base Resources
The system SHALL expose installer-type-specific guides as MCP resources.

#### Scenario: Access MSI guide
- **WHEN** a client requests resource `kb://installers/msi`
- **THEN** the system SHALL return MSI packaging guidance including msiexec parameters

#### Scenario: Access EXE guide
- **WHEN** a client requests resource `kb://installers/exe`
- **THEN** the system SHALL return EXE installer types guide (NSIS, Inno, InstallShield, WiX)

#### Scenario: Access MSIX guide
- **WHEN** a client requests resource `kb://installers/msix`
- **THEN** the system SHALL return MSIX/AppX packaging guidance for Intune

### Requirement: Packaging Pattern Resources
The system SHALL expose packaging patterns as MCP resources.

#### Scenario: Access detection patterns
- **WHEN** a client requests resource `kb://patterns/detection`
- **THEN** the system SHALL return detection rule patterns and examples

#### Scenario: Access prerequisites patterns
- **WHEN** a client requests resource `kb://patterns/prerequisites`
- **THEN** the system SHALL return guidance for handling .NET, VC++, and other prerequisites

#### Scenario: Access user context patterns
- **WHEN** a client requests resource `kb://patterns/user-context`
- **THEN** the system SHALL return guidance for user vs system context installations

### Requirement: Reference Data Resources
The system SHALL expose reference data as MCP resources.

#### Scenario: Access exit codes reference
- **WHEN** a client requests resource `ref://exit-codes`
- **THEN** the system SHALL return common installer exit codes and their meanings

### Requirement: PSADT v4 Compliance
All generated templates SHALL comply with PSADT v4 module-based architecture.

#### Scenario: Use module import pattern
- **WHEN** any template is generated
- **THEN** the script SHALL use `Import-Module PSAppDeployToolkit` pattern

#### Scenario: Use ADT-prefixed functions
- **WHEN** any template is generated
- **THEN** all PSADT functions SHALL use the `ADT` prefix (e.g., `Show-ADTInstallationWelcome`)

#### Scenario: Use ADTSession object
- **WHEN** a template requires state management
- **THEN** the script SHALL use `$ADTSession` for accessing session state

#### Scenario: Use structured initialization
- **WHEN** any template is generated
- **THEN** the script SHALL call `Initialize-ADTDeployment` at the start
- **AND** the script SHALL call `Complete-ADTDeployment` at the end

### Requirement: Download PSADT Toolkit
The system SHALL provide a `download_psadt_toolkit` MCP tool that downloads the PSAppDeployToolkit from its official GitHub repository.

#### Scenario: Download latest toolkit version
- **WHEN** the user invokes `download_psadt_toolkit` with an `output_directory`
- **THEN** the system SHALL fetch the latest release from `PSAppDeployToolkit/PSAppDeployToolkit` GitHub repository
- **AND** the system SHALL download and extract the release ZIP
- **AND** the extracted files SHALL be placed in the specified output directory
- **AND** the response SHALL include the version downloaded and file paths

#### Scenario: Download specific toolkit version
- **WHEN** the user invokes `download_psadt_toolkit` with `version: "4.0.4"`
- **THEN** the system SHALL fetch the release matching that version tag
- **AND** the system SHALL return an error if the version does not exist

#### Scenario: Download with Extensions module
- **WHEN** the user invokes `download_psadt_toolkit` with `include_extensions: true`
- **THEN** the system SHALL include the `PSAppDeployToolkit.Extensions` module in the output

#### Scenario: Toolkit already cached
- **WHEN** a release was previously downloaded within the cache TTL
- **THEN** the system SHALL copy from cache instead of re-downloading
- **AND** the response SHALL indicate the source was cache

#### Scenario: GitHub rate limit reached
- **WHEN** the GitHub API returns a 429 rate limit response
- **THEN** the system SHALL return an error message explaining the rate limit
- **AND** the message SHALL suggest configuring a `GITHUB_TOKEN` environment variable

#### Scenario: Download failure
- **WHEN** the ZIP download fails due to network error or timeout
- **THEN** the system SHALL return an error with the direct download URL
- **AND** the user can manually download and extract the toolkit

### Requirement: Toolkit Download Output Structure
The system SHALL extract toolkit files into a standard directory structure suitable for PSADT package creation.

#### Scenario: Standard extraction structure
- **WHEN** toolkit download completes successfully
- **THEN** the output directory SHALL contain:
  - `PSAppDeployToolkit/` directory with module files
  - `Config/` directory with default configuration
  - `Assets/` directory with icons and images
  - `Strings/` directory with localization files
  - `Files/` empty directory for installer placement
  - `Invoke-AppDeployToolkit.exe` executable wrapper
  - `Invoke-AppDeployToolkit.ps1` main script template

#### Scenario: Return download metadata
- **WHEN** toolkit download completes
- **THEN** the response SHALL include:
  - `version`: The downloaded version
  - `outputDirectory`: Where files were extracted
  - `files`: Array of extracted file paths
  - `downloadedFrom`: "cache" or "github"
  - `releaseUrl`: URL to the GitHub release page

### Requirement: Integrated Template and Toolkit Download
The system SHALL support downloading the toolkit as part of template generation for streamlined package creation.

#### Scenario: Template with toolkit download
- **WHEN** the user invokes `get_psadt_template` with `download_toolkit: true` and `output_directory`
- **THEN** the system SHALL generate the PSADT script
- **AND** the system SHALL download the toolkit to the output directory
- **AND** the generated script SHALL be saved as `Invoke-AppDeployToolkit.ps1` in the output directory
- **AND** the response SHALL include both the script content and toolkit download status

#### Scenario: Template without toolkit download
- **WHEN** the user invokes `get_psadt_template` without `download_toolkit` or with `download_toolkit: false`
- **THEN** the system SHALL generate only the script content
- **AND** the behavior SHALL remain unchanged from current implementation

