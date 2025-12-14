## MODIFIED Requirements

### Requirement: PSADT v4 Compliance
All generated templates and knowledge documentation SHALL comply with PSADT v4.1.7 module-based architecture.

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

#### Scenario: Knowledge documentation uses correct parameter names
- **WHEN** knowledge documentation includes `Start-ADTProcess` examples
- **THEN** all examples SHALL use `-ArgumentList` parameter (not `-Arguments`)
- **AND** all examples SHALL use `-FilePath` parameter (not `-Path`)
