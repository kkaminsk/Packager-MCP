# Node.js Runtime - Version Standardization

## MODIFIED Requirements

### Requirement: Docker Image Uses LTS Node.js
The Dockerfile MUST use an even-numbered Node.js LTS release, not an odd-numbered "Current" release.

#### Scenario: Dockerfile uses Node.js 24 LTS
**Given** the `Dockerfile` is examined
**When** the base image tags are checked
**Then** both builder and runtime stages SHALL use `node:24-bookworm-slim`
**And** the version SHALL be an Active or Maintenance LTS release

#### Scenario: Docker image builds successfully
**Given** the Dockerfile uses Node.js 24
**When** `docker build -t packager-mcp .` is executed
**Then** the build SHALL complete successfully
**And** the resulting image SHALL start the MCP server

### Requirement: MSI Bundled Node.js Version
The MSI installer MUST bundle a Node.js version with current security patches.

#### Scenario: MSI bundles Node.js 20.20.0 or higher
**Given** the `scripts/build-msi.ps1` script is examined
**When** the default `$NodeVersion` parameter is checked
**Then** the version SHALL be "20.20.0" or higher
**And** the `$NodeChecksums` hashtable SHALL contain the corresponding SHA256 hash

#### Scenario: MSI installs with updated Node.js
**Given** an MSI is built with the updated script
**When** the MSI is installed
**Then** the bundled Node.js version SHALL be 20.20.0 or higher
**And** the MCP server SHALL start successfully

### Requirement: No EOL Node.js Versions
No deployment target SHALL use an end-of-life Node.js version.

#### Scenario: All Node.js versions are supported
**Given** the project's deployment configurations
**When** all Node.js version references are examined
**Then** no version SHALL be end-of-life
**And** all versions SHALL be from Active LTS or Maintenance LTS releases
