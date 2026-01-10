## ADDED Requirements

### Requirement: GitHub PAT Configuration Dialog

The installer SHALL provide a dialog for entering the GitHub Personal Access Token during interactive installation.

#### Scenario: Display PAT dialog

- **WHEN** the installer is running interactively
- **AND** the user proceeds past the installation directory selection
- **THEN** a "GitHub Configuration" dialog is displayed with a password field for the PAT

#### Scenario: PAT is optional

- **WHEN** the user leaves the PAT field blank
- **AND** clicks Next
- **THEN** the installation proceeds without error

#### Scenario: PAT field is masked

- **WHEN** the user enters text in the PAT field
- **THEN** the characters are displayed as asterisks or dots (password style)

### Requirement: Claude Code Registration Opt-Out

The installer SHALL provide an option to skip Claude Code registration.

#### Scenario: Register checkbox default

- **WHEN** the GitHub Configuration dialog is displayed
- **THEN** a "Register with Claude Code" checkbox is shown and checked by default

#### Scenario: User unchecks register

- **WHEN** the user unchecks "Register with Claude Code"
- **AND** completes the installation
- **THEN** the MCP server is NOT registered with Claude Code

### Requirement: MCP Server Registration

The installer SHALL register the MCP server with Claude Code after file installation.

#### Scenario: Register with PAT

- **WHEN** the installation completes
- **AND** Claude Code is installed
- **AND** "Register with Claude Code" is checked
- **AND** a GitHub PAT was provided
- **THEN** the server is registered via `claude mcp add packager-mcp` with `GITHUB_TOKEN` environment variable

#### Scenario: Register without PAT

- **WHEN** the installation completes
- **AND** Claude Code is installed
- **AND** "Register with Claude Code" is checked
- **AND** no GitHub PAT was provided
- **THEN** the server is registered via `claude mcp add packager-mcp` without the token

#### Scenario: Claude Code not installed

- **WHEN** the installation completes
- **AND** Claude Code is NOT installed
- **THEN** the registration step is skipped without error
- **AND** the installation completes successfully

#### Scenario: Registration failure is non-fatal

- **WHEN** the `claude mcp add` command fails
- **THEN** the installation still completes successfully
- **AND** a warning is logged

### Requirement: Silent Install PAT Property

The installer SHALL accept a GitHub PAT via command-line property for silent installations.

#### Scenario: Silent install with PAT

- **WHEN** the installer is run with `msiexec /i ... /qn GITHUBPAT=ghp_xxxx`
- **THEN** the PAT is used for MCP server registration

#### Scenario: Silent install skip registration

- **WHEN** the installer is run with `msiexec /i ... /qn REGISTERWITHCLAUDE=0`
- **THEN** the MCP server registration is skipped

#### Scenario: PAT not logged

- **WHEN** a GitHub PAT is provided via property or dialog
- **THEN** the PAT value is NOT written to the MSI install log
