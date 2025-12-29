# Packager-MCP Scripts

This directory contains PowerShell scripts for setting up and managing the Packager-MCP Intune integration.

## Setup-PackagerMcpIntune.ps1

Automates the Azure AD application registration setup for the Packager-MCP server to publish Win32 apps to Microsoft Intune via Microsoft Graph API.

### Prerequisites

- **PowerShell 7.0 or later** - Install from https://aka.ms/powershell
- **Microsoft.Graph PowerShell module** - Installed automatically if missing
- **Azure AD role** - Global Administrator or Application Administrator

### What It Does

1. Creates or updates an Azure AD application registration
2. Configures required Microsoft Graph API permissions (DeviceManagementApps.ReadWrite.All)
3. Grants admin consent for the permissions
4. Creates a self-signed certificate for authentication
5. Uploads the certificate to the application
6. Saves configuration to `intune_mcp_config.yaml`

### Usage

```powershell
# Basic usage - interactive prompts
.\Setup-PackagerMcpIntune.ps1

# Specify tenant and skip prompts
.\Setup-PackagerMcpIntune.ps1 -TenantId 'contoso.onmicrosoft.com' -Force

# Custom paths for certificate and config
.\Setup-PackagerMcpIntune.ps1 -CertificatePath 'C:\certs\packager.pfx' -ConfigPath 'C:\config\intune.yaml'

# Skip the connection test at the end
.\Setup-PackagerMcpIntune.ps1 -SkipTest
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `-TenantId` | (from auth) | Azure AD tenant ID |
| `-DisplayName` | `Packager-MCP` | Application display name |
| `-CertificatePath` | `./packager-mcp.pfx` | Path for certificate file |
| `-ConfigPath` | `./intune_mcp_config.yaml` | Path for config file |
| `-CertificateValidityYears` | `2` | Certificate validity period |
| `-SkipTest` | (not set) | Skip connection test |
| `-Force` | (not set) | Skip confirmation prompts |

### Output

The script creates two files:

1. **Certificate file** (`.pfx`) - Contains the private key for authentication
2. **Configuration file** (`intune_mcp_config.yaml`) - Contains Azure AD settings

Example `intune_mcp_config.yaml`:

```yaml
azure:
  tenantId: "your-tenant-id"
  clientId: "your-client-id"
  authMethod: "certificate"
  certificatePath: "C:/path/to/packager-mcp.pfx"
  certificateThumbprint: "ABC123..."
```

### After Setup

1. **Secure the certificate password** - Store it in a password manager or vault
2. **Set environment variables**:
   ```powershell
   $env:INTUNE_MCP_CONFIG = "C:\path\to\intune_mcp_config.yaml"
   $env:INTUNE_CERT_PASSWORD = "your-certificate-password"
   ```
3. **Start the MCP server** - The server will automatically load the configuration

## Functions Directory

The `functions/` directory contains reusable PowerShell functions used by the setup script:

| Function | Description |
|----------|-------------|
| `Write-PackagerMcpLog` | Logging with file and console output |
| `Invoke-GraphWithRetry` | Graph API calls with retry logic |
| `Connect-PackagerMcpGraph` | Graph authentication with admin scopes |
| `Disconnect-PackagerMcpGraph` | Clean Graph disconnection |
| `Get-PackagerMcpApplication` | Find existing app registration |
| `Set-PackagerMcpApplication` | Create/update app registration |
| `Set-PackagerMcpPermissions` | Configure Graph API permissions |
| `Grant-PackagerMcpConsent` | Grant admin consent |
| `Set-PackagerMcpCertificate` | Create and configure certificate |
| `Confirm-PackagerMcpAction` | User confirmation prompts |
| `Test-PackagerMcpConnection` | Test Graph connection |
| `Export-PackagerMcpConfig` | Export YAML configuration |

## Troubleshooting

### "The term '...' is not recognized"

Ensure you're running PowerShell 7+:
```powershell
$PSVersionTable.PSVersion
```

### "Authorization_RequestDenied"

Admin consent may not have propagated yet. Wait a few minutes and try again, or grant consent manually in the Azure Portal.

### "Certificate file not found"

Verify the certificate path in your config file matches the actual file location.

### "AADSTS700016: Application not found"

The client ID in your config doesn't match a registered application. Re-run the setup script.

### "Connection test failed: Intune API access denied"

This error may appear at the end of setup:

```
FAILED: Access denied to Intune API. Admin consent may not be granted.
ERROR: Connection test failed: Intune API access denied - Response status code does not indicate success: Forbidden (Forbidden).
```

**This error is often not fatal.** It typically occurs because Azure AD permissions take 1-5 minutes to propagate after granting admin consent.

**Remediation steps:**

1. **Wait and retry** - Wait 2-3 minutes for Azure AD propagation, then test manually:
   ```powershell
   Connect-MgGraph -ClientId '<your-client-id>' -TenantId '<your-tenant-id>' -CertificateThumbprint '<thumbprint>'
   Get-MgDeviceAppManagementMobileApp -Top 1
   ```

2. **Verify permissions in Entra Portal** - Go to https://entra.microsoft.com and navigate to:
   - **Identity** → **Applications** → **App registrations**
   - Find your app (Packager-MCP-*)
   - Click **API permissions**
   - Verify `DeviceManagementApps.ReadWrite.All` is listed
   - Check for a green checkmark indicating admin consent is granted
   - If not granted, click **Grant admin consent for [tenant]**

3. **Check service principal** - Ensure a service principal exists for the app:
   - In Entra Portal, go to **Enterprise applications**
   - Search for your app name
   - If not found, the service principal may not have been created

The setup still creates valid configuration files even if the test fails. Once permissions propagate, the MCP server will work correctly.

## Log Files

The setup script creates a log file at:
```
scripts/Setup-PackagerMcpIntune.log
```

Review this file for detailed troubleshooting information.
