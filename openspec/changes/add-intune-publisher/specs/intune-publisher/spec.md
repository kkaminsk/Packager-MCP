# intune-publisher Specification

## Purpose

Enables publishing Win32 applications to Microsoft Intune via the Microsoft Graph API, completing the end-to-end packaging workflow.

## ADDED Requirements

### Requirement: Certificate-Based Service Principal Authentication

The system SHALL authenticate to Microsoft Graph API using a service principal with certificate-based credentials.

#### Scenario: Environment variable configuration
- **WHEN** the publish_to_intune tool is invoked
- **THEN** the system SHALL read authentication configuration from environment variables:
  - `AZURE_TENANT_ID` - Entra ID tenant identifier
  - `AZURE_CLIENT_ID` - Service principal application ID
  - `AZURE_CLIENT_CERTIFICATE_PATH` - Path to PFX/PEM certificate file
  - `AZURE_CLIENT_CERTIFICATE_PASSWORD` - Certificate password (optional)

#### Scenario: Token acquisition
- **WHEN** valid credentials are configured
- **THEN** the system SHALL acquire an access token with `DeviceManagementApps.ReadWrite.All` scope

#### Scenario: Missing credentials error
- **WHEN** required environment variables are not set
- **THEN** the system SHALL return a clear error message listing missing variables
- **AND** SHALL provide guidance on creating a service principal

#### Scenario: Authentication failure
- **WHEN** certificate authentication fails
- **THEN** the system SHALL return the Azure error message with remediation steps

### Requirement: Publish Win32 App to Intune

The system SHALL provide a `publish_to_intune` MCP tool that uploads .intunewin packages to Microsoft Intune.

#### Scenario: Upload existing intunewin package
- **WHEN** the user provides a path to a .intunewin file
- **THEN** the system SHALL upload the package via Microsoft Graph API
- **AND** SHALL create a Win32 LOB app in Intune

#### Scenario: Auto-populate metadata from packaging context
- **WHEN** metadata parameters are not explicitly provided
- **THEN** the system SHALL use values from the packaging workflow:
  - Application name from PSADT template
  - Application version from PSADT template
  - Vendor from PSADT template
  - Install command from PSADT script path
  - Uninstall command from PSADT script path

#### Scenario: Specify install commands
- **WHEN** the package is uploaded
- **THEN** the system SHALL set install command to: `Deploy-Application.exe -DeploymentType Install -DeployMode Silent`
- **AND** SHALL set uninstall command to: `Deploy-Application.exe -DeploymentType Uninstall -DeployMode Silent`

#### Scenario: Set system requirements
- **WHEN** the app is created
- **THEN** the system SHALL set architecture requirement to x64
- **AND** SHALL set minimum OS to Windows 10 1607 or later

#### Scenario: Detection rule from generator
- **WHEN** a detection rule configuration is provided
- **THEN** the system SHALL apply the detection rule to the Intune app
- **AND** SHALL support all detection types from `generate_intune_detection`

#### Scenario: Upload success response
- **WHEN** the upload completes successfully
- **THEN** the system SHALL return the Intune app ID
- **AND** SHALL return the app display name
- **AND** SHALL return the Intune portal URL for the app

#### Scenario: Upload failure with retry guidance
- **WHEN** the upload fails
- **THEN** the system SHALL return the Graph API error
- **AND** SHALL provide guidance on common issues (permissions, file size, etc.)

### Requirement: Fetch Application Description

The system SHALL fetch application descriptions via web search when not provided.

#### Scenario: Web search for description
- **WHEN** a description is not provided
- **THEN** the system SHALL search the web for "{app_name} application description"
- **AND** SHALL extract a description of 10,000 characters or less

#### Scenario: Description truncation
- **WHEN** the fetched description exceeds 10,000 characters
- **THEN** the system SHALL truncate to 10,000 characters at a sentence boundary

#### Scenario: Description fallback
- **WHEN** web search fails or returns no results
- **THEN** the system SHALL use a generic description: "{app_name} {version} by {vendor}"

### Requirement: Auto-Assign Category

The system SHALL automatically assign the best-fit Intune app category.

#### Scenario: Category mapping
- **WHEN** an app is published
- **THEN** the system SHALL analyze the app name and description
- **AND** SHALL assign one of the standard Intune categories:
  - Productivity
  - Business
  - Communication
  - Developer Tools
  - Utilities
  - Other

#### Scenario: Category creation not required
- **WHEN** assigning a category
- **THEN** the system SHALL use existing Intune tenant categories
- **AND** SHALL NOT create new categories

### Requirement: Optional Logo Fetching

The system SHALL optionally fetch application logos via web search.

#### Scenario: Logo search
- **WHEN** a logo is not provided
- **AND** logo fetching is enabled (default: enabled)
- **THEN** the system SHALL search for "{app_name} logo png 256x256"
- **AND** SHALL download a suitable PNG or JPEG image

#### Scenario: Logo format requirements
- **WHEN** a logo is found
- **THEN** the system SHALL verify it is PNG or JPEG format
- **AND** SHALL verify dimensions are suitable (prefer 256x256)
- **AND** SHALL convert if necessary

#### Scenario: Logo upload
- **WHEN** a valid logo is obtained
- **THEN** the system SHALL upload it as the app icon in Intune

#### Scenario: Logo failure graceful degradation
- **WHEN** logo fetching fails
- **THEN** the system SHALL continue without a logo
- **AND** SHALL note in the response that no logo was set

### Requirement: Publishing Workflow Prompt

The system SHALL provide a `/publish-to-intune` MCP prompt that guides users through the publishing process.

#### Scenario: Prompt workflow steps
- **WHEN** the user invokes `/publish-to-intune`
- **THEN** the system SHALL guide the user through:
  1. Verify .intunewin file exists
  2. Confirm app metadata (name, version, vendor)
  3. Review detection rule configuration
  4. Authenticate to Graph API
  5. Upload and create app
  6. Report success with portal URL

#### Scenario: Prompt validates prerequisites
- **WHEN** the workflow starts
- **THEN** the system SHALL verify:
  - .intunewin file path is valid
  - Environment variables for auth are set
  - Required permissions are available

#### Scenario: Prompt handles errors gracefully
- **WHEN** any step fails
- **THEN** the system SHALL provide actionable error messages
- **AND** SHALL offer to retry or skip (where applicable)

### Requirement: Input Validation

The system SHALL validate all inputs before attempting upload.

#### Scenario: Validate intunewin file
- **WHEN** a file path is provided
- **THEN** the system SHALL verify the file exists
- **AND** SHALL verify the file has .intunewin extension
- **AND** SHALL verify the file is not empty

#### Scenario: Validate app name
- **WHEN** an app name is provided
- **THEN** the system SHALL verify it is between 1 and 256 characters

#### Scenario: Validate version format
- **WHEN** a version is provided
- **THEN** the system SHALL accept any string up to 50 characters
