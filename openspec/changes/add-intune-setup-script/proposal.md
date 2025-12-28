# Change: Add Intune Setup Script

## Why

The `publish_to_intune` tool requires certificate-based service principal authentication, which involves multiple manual steps in Azure portal:
1. Register an application in Entra ID
2. Generate and upload a certificate
3. Configure API permissions (DeviceManagementApps.ReadWrite.All)
4. Grant admin consent
5. Set environment variables

This is error-prone and time-consuming. Users need an automated setup experience that provisions everything correctly and saves the configuration for the MCP server.

## What Changes

- **NEW**: `Setup-PackagerMcpIntune.ps1` - PowerShell script that automates app registration setup
- **NEW**: `intune_mcp_config.yaml` - Configuration file for storing Azure auth settings
- **MODIFIED**: MCP server reads config from YAML file as alternative to environment variables
- **NEW**: Reusable PowerShell function library based on proven patterns from reference functions

## Scope

This feature will:
- Create an Entra ID app registration with appropriate permissions
- Generate a self-signed certificate (or use existing Key Vault cert)
- Grant admin consent for Graph API permissions
- Export certificate to local path for MCP server use
- Write all configuration to `intune_mcp_config.yaml`
- Update MCP server to load config from YAML when env vars not set

## Impact

- **Affected specs**: New `intune-setup` capability spec
- **Affected code**:
  - `scripts/Setup-PackagerMcpIntune.ps1` - New setup script
  - `scripts/functions/` - Reusable PowerShell functions
  - `src/services/graph-auth.ts` - Add YAML config loading
  - `src/config/loader.ts` - Support intune_mcp_config.yaml

## Non-Goals

- Automating IntuneWinAppUtil.exe installation (separate tool)
- Managing Intune policies or assignments
- Multi-tenant setup (single tenant per config file)
- Azure Key Vault integration for production certificates (future enhancement)
