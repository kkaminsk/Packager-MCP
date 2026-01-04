## ADDED Requirements

### Requirement: MSI Installer Package

The system SHALL provide a WiX-based MSI installer for Windows deployment.

#### Scenario: Install to Program Files

- **WHEN** the MSI installer is executed
- **THEN** the application is installed to `%ProgramFiles%\Packager-MCP`

#### Scenario: Include dist folder

- **WHEN** the MSI installer completes
- **THEN** the compiled `dist/` folder is present in the installation directory

#### Scenario: Include example files

- **WHEN** the MSI installer completes
- **THEN** the `Packaging_Files/` contents are installed to an `examples/` subfolder

#### Scenario: Include node_modules

- **WHEN** the MSI installer completes
- **THEN** the production `node_modules/` dependencies are present in the installation directory

### Requirement: Registry Registration

The installer SHALL register the installation path in Windows Registry.

#### Scenario: Create registry key

- **WHEN** the MSI installer completes
- **THEN** the key `HKEY_LOCAL_MACHINE\SOFTWARE\Packager-MCP` exists with `InstallPath` and `Version` values

#### Scenario: Remove registry on uninstall

- **WHEN** the MSI uninstaller is executed
- **THEN** the `HKEY_LOCAL_MACHINE\SOFTWARE\Packager-MCP` registry key is removed

### Requirement: Start Menu Integration

The installer SHALL create Start Menu shortcuts for user access.

#### Scenario: Create Start Menu folder

- **WHEN** the MSI installer completes
- **THEN** a `Packager-MCP` folder exists in the Start Menu

#### Scenario: Examples shortcut

- **WHEN** the user clicks the Examples shortcut
- **THEN** the examples folder opens in File Explorer

#### Scenario: Documentation shortcut

- **WHEN** the user clicks the Documentation shortcut
- **THEN** the README.md file opens

### Requirement: Node.js Prerequisite Check

The installer SHALL verify Node.js 20+ is installed before proceeding.

#### Scenario: Node.js installed

- **WHEN** Node.js 20+ is detected in the system PATH
- **THEN** the installation proceeds normally

#### Scenario: Node.js not installed

- **WHEN** Node.js is not detected or version is below 20
- **THEN** the installer displays an error message and aborts installation

### Requirement: Silent Installation Support

The installer SHALL support silent (unattended) installation for enterprise deployment.

#### Scenario: Silent install

- **WHEN** the installer is run with `msiexec /i Packager-MCP.msi /qn`
- **THEN** installation completes without user interaction

#### Scenario: Silent uninstall

- **WHEN** the installer is run with `msiexec /x Packager-MCP.msi /qn`
- **THEN** uninstallation completes without user interaction

### Requirement: Upgrade Support

The installer SHALL support upgrading from previous versions.

#### Scenario: Major upgrade

- **WHEN** a newer version MSI is installed over an existing installation
- **THEN** the previous version is uninstalled and the new version is installed

#### Scenario: Preserve UpgradeCode

- **WHEN** the installer is built
- **THEN** the UpgradeCode GUID remains constant across all versions

### Requirement: Clean Uninstall

The installer SHALL remove all installed files and registry entries on uninstall.

#### Scenario: Remove files

- **WHEN** the uninstaller completes
- **THEN** the `%ProgramFiles%\Packager-MCP` directory is removed

#### Scenario: Remove Start Menu

- **WHEN** the uninstaller completes
- **THEN** the Start Menu shortcuts are removed

### Requirement: Build Script

A build script SHALL automate MSI creation from source.

#### Scenario: Build from clean state

- **WHEN** `scripts/build-msi.ps1` is executed
- **THEN** a complete MSI package is generated in `installer/bin/`

#### Scenario: Build updates dist

- **WHEN** the build script runs
- **THEN** `npm run build` is executed to ensure dist/ is current

#### Scenario: Build installs production dependencies

- **WHEN** the build script runs
- **THEN** `npm ci --production` is executed for clean node_modules
