## MODIFIED Requirements

### Requirement: PSADT v4 Compliance
All generated templates SHALL comply with PSADT v4.1.7 module-based architecture.

#### Scenario: Use module import pattern
- **WHEN** any template is generated
- **THEN** the script SHALL use `Import-Module -FullyQualifiedName @{ ModuleName = 'PSAppDeployToolkit'; Guid = '8c3c366b-8606-4576-9f2d-4051144f7ca2'; ModuleVersion = '4.1.7' }` pattern

#### Scenario: Use ADT-prefixed functions
- **WHEN** any template is generated
- **THEN** all PSADT functions SHALL use the `ADT` prefix (e.g., `Show-ADTInstallationWelcome`, `Get-ADTApplication`)

#### Scenario: Use adtSession object
- **WHEN** a template requires state management
- **THEN** the script SHALL use `$adtSession` (lowercase) hashtable for session configuration
- **AND** the script SHALL access directory properties via `$adtSession.DirFiles` and `$adtSession.DirSupportFiles`

#### Scenario: Use structured session management
- **WHEN** any template is generated
- **THEN** the script SHALL call `Open-ADTSession` to initialize the deployment session
- **AND** the script SHALL call `Close-ADTSession` to finalize the deployment
- **AND** the script SHALL use deployment functions (`Install-ADTDeployment`, `Uninstall-ADTDeployment`, `Repair-ADTDeployment`)

#### Scenario: Use correct parameter names
- **WHEN** template uses `Start-ADTProcess`
- **THEN** the script SHALL use `-ArgumentList` parameter (not `-Arguments`)
- **AND** the script SHALL use `-FilePath` parameter (not `-Path`)

### Requirement: PSADT Documentation Resources
The system SHALL expose PSADT v4.1.7 documentation as MCP resources.

#### Scenario: Access overview documentation
- **WHEN** a client requests resource `psadt://docs/overview`
- **THEN** the system SHALL return PSADT v4.1.7 architecture and concepts documentation

#### Scenario: Access function reference
- **WHEN** a client requests resource `psadt://docs/functions`
- **THEN** the system SHALL return complete function reference for 135 ADT-prefixed functions

#### Scenario: Access variables reference
- **WHEN** a client requests resource `psadt://docs/variables`
- **THEN** the system SHALL return documentation for `$adtSession` object properties

#### Scenario: Access migration guide
- **WHEN** a client requests resource `psadt://docs/migration`
- **THEN** the system SHALL return v3 to v4 migration guidance including correct function mappings

#### Scenario: Access best practices
- **WHEN** a client requests resource `psadt://docs/best-practices`
- **THEN** the system SHALL return recommended patterns and anti-patterns for v4.1.7
