# validation-service Specification

## Purpose
TBD - created by archiving change 4-add-validation-engine. Update Purpose after archive.
## Requirements
### Requirement: Validate Package Script
The system SHALL provide a `validate_package` MCP tool that checks PSADT scripts against best practices and common issues.

#### Scenario: Validate valid script
- **WHEN** the user invokes `validate_package` with a valid PSADT script
- **THEN** the system SHALL return `is_valid: true`
- **AND** the system SHALL return a score between 0 and 100

#### Scenario: Validate invalid script
- **WHEN** the user invokes `validate_package` with a script containing errors
- **THEN** the system SHALL return `is_valid: false`
- **AND** the response SHALL include an array of issues

#### Scenario: Issue details include location
- **WHEN** an issue is detected in the script
- **THEN** the issue SHALL include `line_number` where applicable
- **AND** the issue SHALL include a `suggestion` for remediation

#### Scenario: Issue categorization
- **WHEN** issues are returned
- **THEN** each issue SHALL have a `category` (structure, psadt, intune, security, best-practice)
- **AND** each issue SHALL have a `severity` (error, warning, info)

### Requirement: Validation Levels
The system SHALL support multiple validation levels for different use cases.

#### Scenario: Basic validation level
- **WHEN** the user specifies `validation_level: "basic"`
- **THEN** the system SHALL check only for critical errors
- **AND** the system SHALL NOT report warnings or informational issues

#### Scenario: Standard validation level
- **WHEN** the user specifies `validation_level: "standard"`
- **THEN** the system SHALL check for errors and warnings
- **AND** the system SHALL NOT report informational issues

#### Scenario: Strict validation level
- **WHEN** the user specifies `validation_level: "strict"`
- **THEN** the system SHALL check for all issue types including informational

#### Scenario: Default validation level
- **WHEN** no validation level is specified
- **THEN** the system SHALL use "standard" as the default

### Requirement: Target Environment Configuration
The system SHALL support environment-specific validation rules.

#### Scenario: Intune environment
- **WHEN** the user specifies `target_environment: "intune"`
- **THEN** the system SHALL apply Intune-specific validation rules
- **AND** the system SHALL verify the script supports silent installation

#### Scenario: SCCM environment
- **WHEN** the user specifies `target_environment: "sccm"`
- **THEN** the system SHALL apply SCCM/ConfigMgr-specific validation rules

#### Scenario: Standalone environment
- **WHEN** the user specifies `target_environment: "standalone"`
- **THEN** the system SHALL skip deployment-system-specific rules

### Requirement: PSADT Structure Validation
The system SHALL validate PSADT v4.1.8 script structure.

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
- **THEN** the system SHALL verify correct v4.1.8 function names are used:
  - `Get-ADTApplication` (not `Get-ADTInstalledApplication`)
  - `Open-ADTSession` (not `Initialize-ADTDeployment`)
  - `Close-ADTSession` (not `Complete-ADTDeployment`)

#### Scenario: Check correct parameter names
- **WHEN** validating a PSADT script that uses `Start-ADTProcess`
- **THEN** the system SHALL verify `-ArgumentList` is used (not `-Arguments`)
- **AND** the system SHALL verify `-FilePath` is used (not `-Path`)

### Requirement: Security Validation
The system SHALL check scripts for security issues.

#### Scenario: Detect hardcoded paths
- **WHEN** validating a script with user-specific hardcoded paths (e.g., C:\Users\username)
- **THEN** the system SHALL report a warning about hardcoded paths
- **AND** the suggestion SHALL recommend using environment variables

#### Scenario: Detect plaintext credentials
- **WHEN** validating a script containing patterns that appear to be credentials
- **THEN** the system SHALL report an error about potential credential exposure
- **AND** the suggestion SHALL recommend secure credential storage

#### Scenario: Detect unsafe execution patterns
- **WHEN** validating a script using `Invoke-Expression` with variable input
- **THEN** the system SHALL report a warning about potential command injection
- **AND** the suggestion SHALL recommend using `Start-ADTProcess` instead

### Requirement: Intune Compatibility Validation
The system SHALL validate scripts for Intune deployment compatibility.

#### Scenario: Check silent installation support
- **WHEN** validating for Intune environment
- **THEN** the system SHALL verify the script handles Silent deployment mode

#### Scenario: Check detection rule feasibility
- **WHEN** validating for Intune environment
- **THEN** the system SHALL verify detection rule generation is possible

#### Scenario: Check exit code handling
- **WHEN** validating for Intune environment
- **THEN** the system SHALL verify proper exit codes are returned

### Requirement: Quality Score Calculation
The system SHALL calculate a quality score based on validation results.

#### Scenario: Perfect score
- **WHEN** no issues are found during validation
- **THEN** the system SHALL return a score of 100

#### Scenario: Score penalties for errors
- **WHEN** errors are found
- **THEN** the system SHALL deduct 10 points per error from the score

#### Scenario: Score penalties for warnings
- **WHEN** warnings are found
- **THEN** the system SHALL deduct 3 points per warning from the score

#### Scenario: Score penalties for info
- **WHEN** informational issues are found
- **THEN** the system SHALL deduct 1 point per info item from the score

#### Scenario: Minimum score
- **WHEN** many issues are found
- **THEN** the score SHALL NOT go below 0

### Requirement: Passed Checks Reporting
The system SHALL report which validation checks passed.

#### Scenario: Include passed checks
- **WHEN** validation completes
- **THEN** the response SHALL include a `passed_checks` array
- **AND** each entry SHALL describe a rule that the script passed

### Requirement: Verify PSADT Functions Tool

The system SHALL provide a `verify_psadt_functions` MCP tool that validates PSADT scripts against the authoritative list of 135 valid v4.1.8 function names.

#### Scenario: Verify valid script file
- **WHEN** the user invokes `verify_psadt_functions` with a path to a valid PSADT script
- **THEN** the system SHALL return `is_valid: true`
- **AND** the response SHALL include a list of valid ADT functions found in the script

#### Scenario: Verify script with invalid function names
- **WHEN** the user invokes `verify_psadt_functions` with a script containing invalid function names
- **THEN** the system SHALL return `is_valid: false`
- **AND** the response SHALL include an `invalid_functions` array with each invalid function found
- **AND** each invalid function entry SHALL include `function_name`, `line_number`, and `suggested_replacement` where known

#### Scenario: Detect legacy function names with corrections
- **WHEN** the script contains known legacy function names (e.g., `Initialize-ADTDeployment`)
- **THEN** the response SHALL map the incorrect function to its correct replacement (e.g., `Open-ADTSession`)
- **AND** the suggestion SHALL include the exact replacement function name

#### Scenario: Detect incorrect parameter names
- **WHEN** the script uses incorrect parameter names on PSADT functions
- **THEN** the response SHALL include a `parameter_issues` array
- **AND** each entry SHALL include `function_name`, `incorrect_param`, `correct_param`, and `line_number`

#### Scenario: File not found
- **WHEN** the specified file path does not exist
- **THEN** the system SHALL return an error with a clear message indicating the file was not found

#### Scenario: Return function usage summary
- **WHEN** verification completes successfully
- **THEN** the response SHALL include a `summary` object with:
  - `total_adt_functions_found` - count of ADT function calls
  - `valid_functions` - array of unique valid function names used
  - `invalid_functions_count` - count of invalid function calls
  - `parameter_issues_count` - count of parameter issues

### Requirement: Valid PSADT Function Reference Data

The system SHALL maintain an authoritative reference list of valid PSADT v4.1.8 function names.

#### Scenario: Reference data includes all 135 functions
- **WHEN** the validation service is initialized
- **THEN** the reference data SHALL include all 135 exported functions from PSADT v4.1.8

#### Scenario: Reference data includes legacy function mappings
- **WHEN** validating scripts
- **THEN** the system SHALL recognize the following incorrect function names and provide corrections:
  - `Initialize-ADTDeployment` -> `Open-ADTSession`
  - `Complete-ADTDeployment` -> `Close-ADTSession`
  - `Get-ADTInstalledApplication` -> `Get-ADTApplication`
  - `Show-InstallationWelcome` -> `Show-ADTInstallationWelcome`
  - `Show-InstallationProgress` -> `Show-ADTInstallationProgress`
  - `Execute-Process` -> `Start-ADTProcess`
  - `Execute-MSI` -> `Start-ADTMsiProcess`
  - `Get-InstalledApplication` -> `Get-ADTApplication`

#### Scenario: Reference data includes parameter corrections
- **WHEN** validating `Start-ADTProcess` calls
- **THEN** the system SHALL flag `-Arguments` as incorrect and suggest `-ArgumentList`
- **AND** the system SHALL flag `-Path` as incorrect and suggest `-FilePath`

