## ADDED Requirements

### Requirement: Verify PSADT Functions Tool

The system SHALL provide a `verify_psadt_functions` MCP tool that validates PSADT scripts against the authoritative list of 135 valid v4.1.7 function names.

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

The system SHALL maintain an authoritative reference list of valid PSADT v4.1.7 function names.

#### Scenario: Reference data includes all 135 functions
- **WHEN** the validation service is initialized
- **THEN** the reference data SHALL include all 135 exported functions from PSADT v4.1.7

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
