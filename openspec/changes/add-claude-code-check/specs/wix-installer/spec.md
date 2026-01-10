## ADDED Requirements

### Requirement: Claude Code Recommendation Check

The installer SHALL check if Claude Code is installed and display a recommendation warning if not found.

#### Scenario: Claude Code installed

- **WHEN** Claude Code is detected at `%USERPROFILE%\.claude\local\claude.exe`
- **THEN** the installation proceeds without displaying a warning

#### Scenario: Claude Code not installed - interactive

- **WHEN** Claude Code is not detected
- **AND** the installation is running interactively
- **THEN** a warning dialog is displayed recommending Claude Code and showing the winget install command
- **AND** the user can click OK to continue installation

#### Scenario: Claude Code not installed - silent

- **WHEN** Claude Code is not detected
- **AND** the installation is running silently (`/qn`)
- **THEN** the installation proceeds without interruption
