## ADDED Requirements

### Requirement: Configurable Intune Upload Timeouts
The Intune publisher service SHALL use configurable timeout values for Azure Storage URI polling and file commit polling, rather than hardcoded loop counts.

#### Scenario: Default timeouts used
- **WHEN** no timeout configuration is provided
- **THEN** the system SHALL use default timeout values (60 seconds for storage URI, 120 seconds for commit)

#### Scenario: Custom timeouts configured
- **WHEN** timeout values are specified in configuration
- **THEN** the system SHALL use the configured values for polling loops

#### Scenario: Timeout exceeded
- **WHEN** a polling operation exceeds the configured timeout
- **THEN** the system SHALL throw a descriptive error indicating which operation timed out and the elapsed time

### Requirement: Contributing Documentation
The project SHALL include a `CONTRIBUTING.md` at the repository root with development setup, build/test commands, code style conventions, and PR workflow.

#### Scenario: New contributor onboards
- **WHEN** a developer reads `CONTRIBUTING.md`
- **THEN** they SHALL have sufficient information to set up, build, test, and submit changes to the project
