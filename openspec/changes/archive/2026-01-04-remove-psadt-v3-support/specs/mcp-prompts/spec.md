## REMOVED Requirements

### Requirement: Convert Legacy Prompt
**Reason**: PSADT v3 is deprecated and users should migrate scripts externally before using this MCP server. Maintaining v3 migration support adds complexity without sufficient value.

**Migration**: Users with v3 scripts should:
1. Use the official PSADT v4 migration documentation at https://psappdeploytoolkit.com
2. Manually convert scripts using the v3-to-v4 function mapping reference
3. Use community migration tools if available

The system ~~SHALL~~ no longer provides a `/convert-legacy` MCP prompt.

#### Scenario: Analyze v3 script
- **WHEN** the user invokes `/convert-legacy ./Deploy-Application.ps1`
- **THEN** the system SHALL return an error indicating this functionality has been removed

#### Scenario: Identify deprecated functions
- **REMOVED** - No longer applicable

#### Scenario: Generate converted script
- **REMOVED** - No longer applicable

#### Scenario: Highlight manual review points
- **REMOVED** - No longer applicable

#### Scenario: Validate converted script
- **REMOVED** - No longer applicable

## MODIFIED Requirements

### Requirement: Prompt Registration
The system SHALL register all prompts with the MCP server at startup.

#### Scenario: List available prompts
- **WHEN** an MCP client requests the prompt list
- **THEN** the system SHALL return three prompts with descriptions:
  - `/package-app` - Create Intune-ready packages
  - `/troubleshoot` - Diagnose failing packages
  - `/bulk-lookup` - Look up multiple applications

#### Scenario: Prompt metadata
- **WHEN** prompts are listed
- **THEN** each prompt SHALL include name, description, and argument schema
