## MODIFIED Requirements

### Requirement: PSADT Structure Validation
The system SHALL validate PSADT v4.1.7 script structure.

#### Scenario: Check param block exists
- **WHEN** validating a PSADT script
- **THEN** the system SHALL verify a Param block exists with `DeploymentType` parameter

#### Scenario: Check try-catch exists
- **WHEN** validating a PSADT script
- **THEN** the system SHALL verify try-catch error handling is present

#### Scenario: Check PSADT import
- **WHEN** validating a PSADT script
- **THEN** the system SHALL verify `Import-Module` for PSAppDeployToolkit with FullyQualifiedName is present

#### Scenario: Check session initialization
- **WHEN** validating a PSADT script
- **THEN** the system SHALL verify `Open-ADTSession` is called to initialize the deployment session

#### Scenario: Check session completion
- **WHEN** validating a PSADT script
- **THEN** the system SHALL verify `Close-ADTSession` is called to finalize the deployment

#### Scenario: Check deployment functions
- **WHEN** validating a PSADT script
- **THEN** the system SHALL verify deployment functions exist (`Install-ADTDeployment`, `Uninstall-ADTDeployment`, `Repair-ADTDeployment`)

#### Scenario: Check correct function names
- **WHEN** validating a PSADT script
- **THEN** the system SHALL verify correct v4.1.7 function names are used:
  - `Get-ADTApplication` (not `Get-ADTInstalledApplication`)
  - `Open-ADTSession` (not `Initialize-ADTDeployment`)
  - `Close-ADTSession` (not `Complete-ADTDeployment`)

#### Scenario: Check correct parameter names
- **WHEN** validating a PSADT script that uses `Start-ADTProcess`
- **THEN** the system SHALL verify `-ArgumentList` is used (not `-Arguments`)
- **AND** the system SHALL verify `-FilePath` is used (not `-Path`)
