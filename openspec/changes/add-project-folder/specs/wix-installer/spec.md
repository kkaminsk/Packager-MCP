## ADDED Requirements

### Requirement: Project Folder Creation

The installer SHALL create a secondary project folder for packaging work.

#### Scenario: Create project folder during installation

- **WHEN** the MSI installer completes
- **THEN** the directory `C:\Temp\Packager-MCP` exists

#### Scenario: Include Claude.md instructions file

- **WHEN** the MSI installer completes
- **THEN** the file `C:\Temp\Packager-MCP\CLAUDE.md` exists containing packaging workflow instructions

#### Scenario: Claude.md content source

- **WHEN** the installer copies the Claude.md file
- **THEN** the content is sourced from `Packaging_Files\Claude_NewPackage.md`

### Requirement: Project Folder Start Menu Shortcut

The installer SHALL create a Start Menu shortcut to the project folder.

#### Scenario: Project folder shortcut

- **WHEN** the user clicks the "Packager-MCP Project Folder" shortcut in Start Menu
- **THEN** the folder `C:\Temp\Packager-MCP` opens in File Explorer

### Requirement: Project Folder Uninstall Behavior

The installer SHALL handle the project folder appropriately during uninstall.

#### Scenario: Remove empty project folder

- **WHEN** the uninstaller runs and `C:\Temp\Packager-MCP` contains only installer-created files
- **THEN** the project folder is removed

#### Scenario: Preserve user files

- **WHEN** the uninstaller runs and `C:\Temp\Packager-MCP` contains user-created files
- **THEN** the project folder is preserved (Windows Installer default behavior)
