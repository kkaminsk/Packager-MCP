## ADDED Requirements

### Requirement: File Path Sanitization
The system SHALL validate all file paths received from MCP tool inputs before performing file system operations. Path traversal sequences (`..`) SHALL be rejected. Optionally, the system SHALL restrict output paths to configured allowed directories.

#### Scenario: Path traversal rejected
- **WHEN** a tool receives `output_directory` containing `../../etc`
- **THEN** the system SHALL return an error indicating path traversal is not allowed
- **AND** no file system operation SHALL be performed

#### Scenario: Absolute path with traversal rejected
- **WHEN** a tool receives `file_path` of `C:\Users\admin\..\..\Windows\System32\config`
- **THEN** the system SHALL return an error indicating path traversal is not allowed

#### Scenario: Allowed directory configured and path within bounds
- **WHEN** `security.allowedOutputDirs` includes `C:\Packages`
- **AND** `output_directory` is `C:\Packages\MyApp`
- **THEN** the system SHALL allow the operation

#### Scenario: Allowed directory configured and path out of bounds
- **WHEN** `security.allowedOutputDirs` includes `C:\Packages`
- **AND** `output_directory` is `D:\SomewhereElse`
- **THEN** the system SHALL return an error indicating the path is outside allowed directories

#### Scenario: No allowed directories configured
- **WHEN** `security.allowedOutputDirs` is not configured
- **THEN** the system SHALL only reject paths containing traversal sequences
