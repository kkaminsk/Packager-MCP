# intune-detection Specification

## Purpose
TBD - created by archiving change 5-add-intune-detection. Update Purpose after archive.
## Requirements
### Requirement: Generate Intune Detection Rules
The system SHALL provide a `generate_intune_detection` MCP tool that creates detection rules for Intune Win32 app deployments.

#### Scenario: Choose detection type
- **WHEN** the user invokes `generate_intune_detection` with a `detection_type`
- **THEN** the system SHALL generate detection rules of the specified type (file, registry, msi, script)

#### Scenario: Default output format
- **WHEN** a detection rule is generated
- **THEN** the response SHALL include `detection_method` describing the rule type
- **AND** the response SHALL include `configuration` object with type-specific settings
- **AND** the response SHALL include `intune_json` ready for Intune Graph API

### Requirement: File-Based Detection
The system SHALL generate file-based detection rules that check for file existence, version, or size.

#### Scenario: File existence detection
- **WHEN** the user specifies `detection_type: "file"` with a file path
- **THEN** the system SHALL generate a rule checking if the file exists at the specified path

#### Scenario: File version detection
- **WHEN** the user specifies file detection with a version requirement
- **THEN** the system SHALL generate a rule checking the file version
- **AND** the user SHALL be able to specify version comparison operators

#### Scenario: File size detection
- **WHEN** the user specifies file detection with a size requirement
- **THEN** the system SHALL generate a rule checking the file size in bytes

#### Scenario: 32-bit on 64-bit system option
- **WHEN** generating file detection
- **THEN** the system SHALL support `check32BitOn64System` option for legacy applications

### Requirement: Registry-Based Detection
The system SHALL generate registry-based detection rules that check for key or value existence.

#### Scenario: Registry key existence
- **WHEN** the user specifies `detection_type: "registry"` with a key path
- **THEN** the system SHALL generate a rule checking if the registry key exists

#### Scenario: Registry value detection
- **WHEN** the user specifies registry detection with a value name
- **THEN** the system SHALL generate a rule checking for the specific value

#### Scenario: Registry value comparison
- **WHEN** the user specifies registry detection with a detection value
- **THEN** the system SHALL generate a rule comparing against that value
- **AND** the user SHALL be able to specify comparison operators

#### Scenario: String vs integer detection
- **WHEN** generating registry detection
- **THEN** the system SHALL support both string and integer detection types

### Requirement: MSI Product Code Detection
The system SHALL generate MSI product code detection rules using the Windows Installer registry.

#### Scenario: Product code detection
- **WHEN** the user specifies `detection_type: "msi"` with a product code
- **THEN** the system SHALL generate a rule using the MSI product code GUID

#### Scenario: MSI version comparison
- **WHEN** the user specifies MSI detection with a version
- **THEN** the system SHALL generate a rule comparing the installed MSI version
- **AND** the user SHALL be able to specify version comparison operators

#### Scenario: Product code format validation
- **WHEN** an MSI product code is provided
- **THEN** the system SHALL validate it matches the GUID format ({xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx})

### Requirement: Script-Based Detection
The system SHALL generate PowerShell detection scripts that return exit codes.

#### Scenario: Generate detection script
- **WHEN** the user specifies `detection_type: "script"`
- **THEN** the system SHALL generate a PowerShell script for detection
- **AND** the script SHALL exit with code 0 if detected
- **AND** the script SHALL exit with code 1 if not detected

#### Scenario: Script includes application details
- **WHEN** generating a detection script
- **THEN** the script SHALL incorporate provided application name, version, and install path

#### Scenario: Script handles version comparison
- **WHEN** the user provides a version requirement
- **THEN** the detection script SHALL compare installed version against the requirement

#### Scenario: Script output for Intune
- **WHEN** the script detects the application
- **THEN** the script SHALL write output (STDOUT) indicating detection status

### Requirement: Intune JSON Output
The system SHALL output detection rules in Intune Graph API compatible JSON format.

#### Scenario: File detection JSON format
- **WHEN** generating file detection
- **THEN** the `intune_json` SHALL include `@odata.type: "#microsoft.graph.win32LobAppFileSystemDetection"`

#### Scenario: Registry detection JSON format
- **WHEN** generating registry detection
- **THEN** the `intune_json` SHALL include `@odata.type: "#microsoft.graph.win32LobAppRegistryDetection"`

#### Scenario: MSI detection JSON format
- **WHEN** generating MSI detection
- **THEN** the `intune_json` SHALL include `@odata.type: "#microsoft.graph.win32LobAppProductCodeDetection"`

#### Scenario: Script detection includes script content
- **WHEN** generating script detection
- **THEN** the response SHALL include `powershell_script` with the full script content

### Requirement: Version Comparison Operators
The system SHALL support standard version comparison operators for detection rules.

#### Scenario: Supported operators
- **WHEN** the user specifies a version comparison
- **THEN** the system SHALL support: equal, notEqual, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual

#### Scenario: Operator in output
- **WHEN** an operator is specified
- **THEN** the generated detection rule SHALL use the appropriate operator string for Intune

### Requirement: Detection Type Recommendation
The system SHALL provide guidance on which detection type to use.

#### Scenario: Recommend MSI for MSI installers
- **WHEN** the installer type is known to be MSI
- **THEN** the system SHALL recommend MSI product code detection as most reliable

#### Scenario: Recommend file for versioned executables
- **WHEN** the application has a main executable with version info
- **THEN** the system SHALL recommend file-based version detection

#### Scenario: Recommend registry for uninstall key
- **WHEN** other detection methods are unsuitable
- **THEN** the system SHALL recommend registry detection using uninstall registry key

