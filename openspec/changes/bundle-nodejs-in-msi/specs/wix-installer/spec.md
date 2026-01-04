## ADDED Requirements

### Requirement: Bundled Node.js Runtime
The MSI installer SHALL include a bundled Node.js runtime in a private directory, eliminating the need for system-wide Node.js installation.

#### Scenario: Node.js bundled in installation directory
- **WHEN** the MSI installer is built
- **THEN** the Node.js Windows x64 runtime SHALL be included in `[INSTALLFOLDER]\nodejs\`

#### Scenario: Specific Node.js version pinned
- **WHEN** the build script downloads Node.js
- **THEN** it SHALL use a pinned LTS version (20.x) for consistency across installations

#### Scenario: Download cached during build
- **WHEN** Node.js has already been downloaded for a previous build
- **THEN** the build script SHALL skip download and use the cached copy

### Requirement: Self-Contained Server Launch
The MSI installer SHALL provide a launch mechanism that uses the bundled Node.js runtime rather than requiring Node.js on the system PATH.

#### Scenario: Launch script uses bundled Node.js
- **WHEN** the user launches the MCP server via Start Menu shortcut
- **THEN** the launcher SHALL invoke `[INSTALLFOLDER]\nodejs\node.exe` to run `dist\server.js`

#### Scenario: No system Node.js required
- **WHEN** the MSI is installed on a system without Node.js
- **THEN** the MCP server SHALL start successfully using the bundled runtime

## REMOVED Requirements

### Requirement: Node.js Prerequisite Check
The MSI installer previously required Node.js 20+ to be installed on the system.

#### Scenario: Launch condition removed
- **WHEN** the MSI is installed
- **THEN** it SHALL NOT fail if Node.js is not installed on the system

## MODIFIED Requirements

### Requirement: MSI Package Size
The MSI installer SHALL include the Node.js runtime, resulting in a larger package size.

#### Scenario: Size includes Node.js
- **WHEN** the MSI is built with bundled Node.js
- **THEN** the package size SHALL be approximately 30-35MB larger than without bundling
