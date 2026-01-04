## REMOVED Requirements

### Requirement: v3 Migration Knowledge
**Reason**: PSADT v3 support is being removed from the project. The migration guide and v3 frontend compatibility files are no longer needed.

**Migration**: The following files will be deleted:
- `src/knowledge/psadt/migration.md` - v3 to v4 migration guide
- `src/knowledge/v4github/PSAppDeployToolkit/Frontend/v3/` directory - v3 frontend compatibility files

Users requiring v3 migration assistance should refer to the official PSADT documentation.

#### Scenario: Access v3 migration guide
- **WHEN** the system previously provided migration guidance
- **THEN** this resource is no longer available
- **AND** the knowledge base focuses solely on PSADT v4.1.7

## MODIFIED Requirements

### Requirement: PSADT Documentation Resources
The system SHALL provide comprehensive PSADT v4 documentation through MCP resources.

#### Scenario: List available PSADT resources
- **WHEN** a client requests resource list with `psadt://docs/*` pattern
- **THEN** the system SHALL return documentation for:
  - `psadt://docs/overview` - PSADT v4 overview
  - `psadt://docs/functions` - Function reference (135 ADT-prefixed functions)
  - `psadt://docs/variables` - Variable reference
  - `psadt://docs/best-practices` - Best practices guide
- **AND** the system SHALL NOT include v3 migration documentation

#### Scenario: Validate PSADT v4 scripts
- **WHEN** validating a PSADT script
- **THEN** the validation service SHALL check for v4 patterns only
- **AND** the service SHALL NOT provide v3-to-v4 migration suggestions
- **AND** legacy function detection (e.g., `Execute-Process` instead of `Start-ADTProcess`) SHALL warn without referencing v3 migration
