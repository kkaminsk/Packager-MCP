# intune-setup Specification

## Purpose

Provides automated setup of Azure App Registration for the MCP server's Intune publishing feature, eliminating manual Azure portal configuration.

## ADDED Requirements

### Requirement: PowerShell Setup Script

The system SHALL provide a PowerShell script that automates Intune integration setup.

#### Scenario: Interactive setup workflow
- **WHEN** the user runs `Setup-PackagerMcpIntune.ps1`
- **THEN** the script SHALL:
  1. Connect to Microsoft Graph with admin scopes
  2. Create or update an app registration named "Packager-MCP"
  3. Configure required API permissions
  4. Generate or configure a certificate
  5. Grant admin consent
  6. Export configuration to `intune_mcp_config.yaml`

#### Scenario: Existing app registration
- **WHEN** an app registration named "Packager-MCP" already exists
- **THEN** the script SHALL update the existing registration
- **AND** SHALL preserve the existing App ID
- **AND** SHALL prompt before overwriting certificates

#### Scenario: Certificate generation
- **WHEN** no certificate path is provided
- **THEN** the script SHALL generate a self-signed certificate
- **AND** SHALL export the certificate to `./certs/packager-mcp.pfx`
- **AND** SHALL upload the public key to the app registration

#### Scenario: Existing certificate
- **WHEN** a certificate path is provided via `-CertificatePath`
- **THEN** the script SHALL use the existing certificate
- **AND** SHALL upload the public key to the app registration

### Requirement: API Permission Configuration

The script SHALL configure the required Graph API permissions.

#### Scenario: Required permissions
- **WHEN** configuring permissions
- **THEN** the script SHALL request `DeviceManagementApps.ReadWrite.All` (Application)
- **AND** SHALL be extensible for additional permissions

#### Scenario: Admin consent
- **WHEN** permissions are configured
- **THEN** the script SHALL grant admin consent automatically
- **AND** SHALL verify consent was successful

#### Scenario: Insufficient privileges
- **WHEN** the authenticated user lacks admin privileges
- **THEN** the script SHALL display a clear error message
- **AND** SHALL list the required roles (Global Administrator or Application Administrator)

### Requirement: Configuration File Output

The script SHALL write configuration to a YAML file.

#### Scenario: Configuration file structure
- **WHEN** setup completes successfully
- **THEN** the script SHALL write `intune_mcp_config.yaml` with:
  ```yaml
  intune:
    tenant_id: "<guid>"
    client_id: "<guid>"
    certificate_path: "./certs/packager-mcp.pfx"
    certificate_password: "<encrypted or prompted>"
  ```

#### Scenario: Sensitive data handling
- **WHEN** writing configuration
- **THEN** the script SHALL NOT store certificate passwords in plain text
- **AND** SHALL prompt for password at runtime OR use Windows Credential Manager

#### Scenario: Configuration file location
- **WHEN** no output path is specified
- **THEN** the script SHALL write to `./intune_mcp_config.yaml` in the current directory
- **AND** SHALL support `-ConfigPath` parameter for custom location

### Requirement: MCP Server Configuration Loading

The MCP server SHALL read configuration from YAML file.

#### Scenario: YAML config precedence
- **WHEN** the MCP server starts
- **THEN** environment variables SHALL take precedence over YAML config
- **AND** YAML config SHALL be used when environment variables are not set

#### Scenario: Config file discovery
- **WHEN** loading configuration
- **THEN** the server SHALL search for `intune_mcp_config.yaml` in:
  1. Current working directory
  2. MCP server installation directory
  3. User's home directory (`~/.packager-mcp/`)

#### Scenario: Invalid configuration
- **WHEN** the YAML config is malformed or incomplete
- **THEN** the server SHALL log a warning with the specific issue
- **AND** SHALL fall back to environment variables

### Requirement: Reusable PowerShell Functions

The script SHALL use modular, reusable functions following established patterns.

#### Scenario: Function naming convention
- **WHEN** creating PowerShell functions
- **THEN** functions SHALL use `Verb-PackagerMcpNoun` naming pattern
- **AND** SHALL include comment-based help (Synopsis, Description, Parameters, Examples)

#### Scenario: Logging
- **WHEN** executing operations
- **THEN** the script SHALL log to both console and file
- **AND** SHALL use severity levels (INFO, WARN, ERROR, DEBUG)
- **AND** SHALL include timestamps

#### Scenario: Error handling with retry
- **WHEN** making Graph API calls
- **THEN** the script SHALL retry on transient errors (429, 502, 503, 504)
- **AND** SHALL use exponential backoff with Retry-After header support
- **AND** SHALL fail gracefully with actionable error messages

#### Scenario: User confirmation
- **WHEN** performing destructive or significant operations
- **THEN** the script SHALL prompt for confirmation
- **AND** SHALL support `-Force` parameter to skip prompts

### Requirement: Validation and Verification

The script SHALL verify the setup was successful.

#### Scenario: Post-setup validation
- **WHEN** setup completes
- **THEN** the script SHALL verify:
  1. App registration exists with correct permissions
  2. Certificate is valid and not expired
  3. Admin consent is granted
  4. Configuration file is readable

#### Scenario: Test connection
- **WHEN** the user specifies `-TestConnection`
- **THEN** the script SHALL attempt to acquire a token using the new configuration
- **AND** SHALL report success or failure with details

### Requirement: Cleanup and Uninstall

The script SHALL support cleanup of created resources.

#### Scenario: Uninstall mode
- **WHEN** the user runs with `-Uninstall` flag
- **THEN** the script SHALL:
  1. Prompt for confirmation
  2. Remove the app registration from Azure
  3. Delete local certificate files (with confirmation)
  4. Remove configuration file (with confirmation)

#### Scenario: Partial cleanup
- **WHEN** cleanup fails partway through
- **THEN** the script SHALL report which resources remain
- **AND** SHALL provide manual cleanup instructions
