# npm Security - Vulnerability Remediation

## MODIFIED Requirements

### Requirement: No High-Severity Vulnerabilities
The project MUST have no known high or critical severity vulnerabilities in its npm dependencies.

#### Scenario: npm audit reports clean
**Given** the project dependencies are installed
**When** `npm audit` is executed
**Then** the output SHALL report zero high-severity vulnerabilities
**And** the output SHALL report zero critical-severity vulnerabilities

### Requirement: MCP SDK Version
The `@modelcontextprotocol/sdk` dependency MUST be at version 1.25.2 or higher to include the ReDoS fix.

#### Scenario: MCP SDK is patched version
**Given** the project `package.json` is examined
**When** the `@modelcontextprotocol/sdk` version is checked
**Then** the version SHALL be `^1.25.2` or higher
**And** `package-lock.json` SHALL lock to version 1.25.2 or higher

### Requirement: Transitive Dependency Security
All transitive dependencies MUST be free of known high-severity vulnerabilities.

#### Scenario: qs dependency is patched
**Given** the project dependencies are installed
**When** the `qs` package version is checked in `package-lock.json`
**Then** the version SHALL be 6.14.1 or higher
