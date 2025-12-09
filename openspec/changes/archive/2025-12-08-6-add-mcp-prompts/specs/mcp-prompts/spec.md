## ADDED Requirements

### Requirement: Package App Prompt
The system SHALL provide a `/package-app` MCP prompt that guides users through creating a complete Intune-ready package.

#### Scenario: Basic package creation
- **WHEN** the user invokes `/package-app Google Chrome`
- **THEN** the system SHALL search Winget for "Google Chrome"
- **AND** the system SHALL present metadata for confirmation
- **AND** the system SHALL generate a PSADT script
- **AND** the system SHALL generate detection rules
- **AND** the system SHALL validate the package

#### Scenario: Quick mode
- **WHEN** the user invokes `/package-app 7-Zip --quick`
- **THEN** the system SHALL skip detailed explanations
- **AND** the system SHALL output the package directly

#### Scenario: Skip validation
- **WHEN** the user invokes `/package-app Firefox --no-validate`
- **THEN** the system SHALL skip the validation step

#### Scenario: Application not found in Winget
- **WHEN** the searched application is not found
- **THEN** the system SHALL inform the user
- **AND** the system SHALL offer to proceed with manual input

#### Scenario: Complete package output
- **WHEN** a package is successfully created
- **THEN** the output SHALL include the PSADT script
- **AND** the output SHALL include the required file structure
- **AND** the output SHALL include detection rules
- **AND** the output SHALL include documentation

### Requirement: Convert Legacy Prompt
The system SHALL provide a `/convert-legacy` MCP prompt that converts PSADT v3 scripts to v4 format.

#### Scenario: Analyze v3 script
- **WHEN** the user invokes `/convert-legacy ./Deploy-Application.ps1`
- **THEN** the system SHALL analyze the provided v3 script

#### Scenario: Identify deprecated functions
- **WHEN** analyzing a v3 script
- **THEN** the system SHALL identify functions without the ADT prefix
- **AND** the system SHALL list all deprecated patterns found

#### Scenario: Generate converted script
- **WHEN** conversion is performed
- **THEN** the system SHALL output a v4-compatible script
- **AND** deprecated functions SHALL be replaced with ADT-prefixed equivalents

#### Scenario: Highlight manual review points
- **WHEN** conversion is completed
- **THEN** the system SHALL highlight areas requiring manual review
- **AND** the system SHALL explain why each area needs attention

#### Scenario: Validate converted script
- **WHEN** conversion is completed
- **THEN** the system SHALL validate the converted script against v4 standards

### Requirement: Troubleshoot Prompt
The system SHALL provide a `/troubleshoot` MCP prompt that helps diagnose issues with failing packages.

#### Scenario: Troubleshoot with log file
- **WHEN** the user invokes `/troubleshoot --log-file C:\Logs\install.log`
- **THEN** the system SHALL analyze the provided log file
- **AND** the system SHALL identify error patterns

#### Scenario: Troubleshoot with error code
- **WHEN** the user invokes `/troubleshoot --error-code 1603`
- **THEN** the system SHALL look up the error code meaning
- **AND** the system SHALL provide common causes and solutions

#### Scenario: Identify likely causes
- **WHEN** troubleshooting information is provided
- **THEN** the system SHALL list likely causes in order of probability

#### Scenario: Suggest specific fixes
- **WHEN** causes are identified
- **THEN** the system SHALL provide specific actionable fixes
- **AND** fixes SHALL include code snippets where applicable

#### Scenario: No information provided
- **WHEN** `/troubleshoot` is invoked without arguments
- **THEN** the system SHALL prompt for error symptoms
- **AND** the system SHALL guide the user through diagnostic questions

### Requirement: Bulk Lookup Prompt
The system SHALL provide a `/bulk-lookup` MCP prompt that retrieves information for multiple applications.

#### Scenario: Lookup multiple applications
- **WHEN** the user invokes `/bulk-lookup Chrome, Firefox, 7-Zip`
- **THEN** the system SHALL look up each application in Winget
- **AND** the system SHALL compile results for all applications

#### Scenario: CSV output format
- **WHEN** the user specifies `--output csv`
- **THEN** the output SHALL be formatted as comma-separated values
- **AND** the CSV SHALL include headers

#### Scenario: JSON output format
- **WHEN** the user specifies `--output json`
- **THEN** the output SHALL be formatted as valid JSON array

#### Scenario: Markdown output format
- **WHEN** the user specifies `--output markdown`
- **THEN** the output SHALL be formatted as a Markdown table

#### Scenario: Default output format
- **WHEN** no output format is specified
- **THEN** the system SHALL use Markdown as the default format

#### Scenario: Partial lookup failure
- **WHEN** some applications are found and others are not
- **THEN** the output SHALL include found applications
- **AND** the output SHALL list applications that could not be found

### Requirement: Prompt Registration
The system SHALL register all prompts with the MCP server at startup.

#### Scenario: List available prompts
- **WHEN** an MCP client requests the prompt list
- **THEN** the system SHALL return all four prompts with descriptions

#### Scenario: Prompt metadata
- **WHEN** prompts are listed
- **THEN** each prompt SHALL include name, description, and argument schema

### Requirement: Prompt Argument Parsing
The system SHALL parse prompt arguments according to documented formats.

#### Scenario: Positional arguments
- **WHEN** a prompt is invoked with positional arguments
- **THEN** the system SHALL parse them in the documented order

#### Scenario: Flag arguments
- **WHEN** a prompt is invoked with `--flag` style arguments
- **THEN** the system SHALL correctly parse boolean flags

#### Scenario: Value arguments
- **WHEN** a prompt is invoked with `--key value` style arguments
- **THEN** the system SHALL correctly associate values with keys

#### Scenario: Invalid arguments
- **WHEN** a prompt is invoked with unrecognized arguments
- **THEN** the system SHALL return an error with usage guidance

### Requirement: Prompt Error Handling
The system SHALL handle errors gracefully during prompt execution.

#### Scenario: Service unavailable
- **WHEN** a required service (e.g., GitHub API) is unavailable
- **THEN** the system SHALL return a helpful error message
- **AND** the system SHALL suggest alternative approaches if available

#### Scenario: Partial completion
- **WHEN** a multi-step workflow fails partway through
- **THEN** the system SHALL report which steps succeeded
- **AND** the system SHALL report which step failed and why
