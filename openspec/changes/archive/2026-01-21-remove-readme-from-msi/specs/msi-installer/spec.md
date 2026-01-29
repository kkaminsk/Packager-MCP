# MSI Installer - Remove Readme.txt

## REMOVED Requirements

### Requirement: Readme.txt File Installation
The MSI installer shall no longer install the `Readme.txt` file to the installation directory.

#### Scenario: User installs Packager-MCP via MSI
**Given** a user runs the Packager-MCP MSI installer
**When** the installation completes successfully
**Then** the `Readme.txt` file shall not be present in the installation directory
**And** the `README.md` file shall still be installed

### Requirement: Readme Start Menu Shortcut
The MSI installer shall no longer create a Start Menu shortcut for `Readme.txt`.

#### Scenario: User checks Start Menu after installation
**Given** a user has installed Packager-MCP via MSI
**When** the user opens the Packager-MCP Start Menu folder
**Then** the "Packager-MCP Readme" shortcut shall not be present
**And** the "Start Packager-MCP Server" shortcut shall still be present
**And** the "Packager-MCP Examples" shortcut shall still be present
**And** the "Packager-MCP Project Folder" shortcut shall still be present
