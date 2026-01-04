## MODIFIED Requirements

### Requirement: Toolkit version pinned
The system SHALL ensure that the PSADT toolkit version displayed in template metadata matches the actual embedded toolkit version v4.1.7.

#### Scenario: Static toolkit files available
- **WHEN** the static toolkit files are accessed
- **THEN** the version SHALL be PSADT v4.1.7 with 135 exported functions
- **AND** the module GUID SHALL be `8c3c366b-8606-4576-9f2d-4051144f7ca2`

#### Scenario: Template metadata displays correct version
- **WHEN** a PSADT template is generated
- **THEN** the `metadata.psadtVersion` field SHALL be `'4.1.7'`
- **AND** package summaries SHALL display "PSADT v4.1.7" or "PowerShell App Deployment Toolkit (PSADT) v4.1.7"
