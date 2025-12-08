# intune-detection Specification Delta

## MODIFIED Requirements

### Requirement: File-Based Detection
The system SHALL generate file-based detection rules that check for file existence, version, or size.

#### Scenario: File existence detection
- **WHEN** the user specifies `detection_type: "file"` with a file path
- **THEN** the system SHALL generate a rule checking if the file exists at the specified path

#### Scenario: File version detection
- **WHEN** the user specifies file detection with a version requirement
- **THEN** the system SHALL generate a rule checking the file version
- **AND** the user SHALL be able to specify version comparison operators

#### Scenario: File version format normalization
- **WHEN** the user provides a version with fewer than 4 parts (e.g., "7.13.0")
- **THEN** the system SHALL normalize it to 4-part Windows format (e.g., "7.13.0.0")
- **AND** the response SHALL include a recommendation noting the normalization

#### Scenario: File version format validation
- **WHEN** the user provides a version value for file detection
- **THEN** the system SHALL validate each version component is numeric
- **AND** if invalid, the system SHALL return an error with guidance on correct format

#### Scenario: File size detection
- **WHEN** the user specifies file detection with a size requirement
- **THEN** the system SHALL generate a rule checking the file size in bytes

#### Scenario: 32-bit on 64-bit system option
- **WHEN** generating file detection
- **THEN** the system SHALL support `check32BitOn64System` option for legacy applications
