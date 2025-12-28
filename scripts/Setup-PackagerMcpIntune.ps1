<#
.SYNOPSIS
Sets up Azure AD application registration for Packager-MCP Intune integration.

.DESCRIPTION
This script automates the setup of an Azure AD application registration for
the Packager-MCP server to publish Win32 apps to Microsoft Intune via the
Microsoft Graph API.

The script will:
1. Create or update an Azure AD application registration
2. Configure required Microsoft Graph API permissions
3. Grant admin consent for the permissions
4. Create a self-signed certificate for authentication
5. Upload the certificate to the application
6. Save configuration to intune_mcp_config.yaml

.PARAMETER TenantId
The Azure AD tenant ID. If not specified, uses the tenant from authentication.

.PARAMETER DisplayName
The display name for the application. Default: 'Packager-MCP'

.PARAMETER CertificatePath
Path where the PFX certificate should be saved. Default: './packager-mcp.pfx'

.PARAMETER ConfigPath
Path for the YAML config file. Default: './intune_mcp_config.yaml'

.PARAMETER CertificateValidityYears
How many years the certificate should be valid. Default: 2

.PARAMETER SkipTest
Skip the connection test at the end.

.PARAMETER Force
Skip confirmation prompts.

.EXAMPLE
.\Setup-PackagerMcpIntune.ps1
Runs the setup with default settings, prompting for confirmation.

.EXAMPLE
.\Setup-PackagerMcpIntune.ps1 -TenantId 'contoso.onmicrosoft.com' -Force
Runs setup for a specific tenant without prompts.

.EXAMPLE
.\Setup-PackagerMcpIntune.ps1 -CertificatePath 'C:\certs\packager.pfx' -ConfigPath 'C:\config\intune.yaml'
Uses custom paths for certificate and config files.

.NOTES
Requires:
- PowerShell 7.0 or later
- Microsoft.Graph PowerShell module
- Global Administrator or Application Administrator role

Author: Packager-MCP
Version: 1.0.0
#>
#Requires -Version 7.0

[CmdletBinding()]
param(
  [string]$TenantId,

  [string]$DisplayName = 'Packager-MCP',

  [string]$CertificatePath = './packager-mcp.pfx',

  [string]$ConfigPath = './intune_mcp_config.yaml',

  [int]$CertificateValidityYears = 2,

  [switch]$SkipTest,

  [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

#region Script Initialization

# Initialize logging
$script:logPath = Join-Path -Path $PSScriptRoot -ChildPath 'Setup-PackagerMcpIntune.log'

# Dot-source all function files
$functionsPath = Join-Path -Path $PSScriptRoot -ChildPath 'functions'
if (Test-Path -LiteralPath $functionsPath) {
  Get-ChildItem -Path $functionsPath -Filter '*.ps1' -File | ForEach-Object {
    . $_.FullName
  }
}
else {
  throw "Functions directory not found: $functionsPath"
}

#endregion

#region Main Script

Write-Host ''
Write-Host '╔══════════════════════════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║       Packager-MCP Intune Setup                              ║' -ForegroundColor Cyan
Write-Host '║       Azure AD Application Registration                      ║' -ForegroundColor Cyan
Write-Host '╚══════════════════════════════════════════════════════════════╝' -ForegroundColor Cyan
Write-Host ''

Write-PackagerMcpLog '========== Setup Started ==========' 'INFO'
Write-PackagerMcpLog "Parameters: DisplayName=$DisplayName, TenantId=$TenantId" 'INFO'

try {
  # Step 1: Check prerequisites
  Write-Host 'Step 1: Checking prerequisites...' -ForegroundColor Yellow
  Write-Host ''

  # Check PowerShell version
  if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw 'PowerShell 7.0 or later is required. Please install from https://aka.ms/powershell'
  }
  Write-Host " ✓ PowerShell $($PSVersionTable.PSVersion)" -ForegroundColor Green

  # Check Microsoft.Graph module
  $graphModule = Get-Module -Name Microsoft.Graph.Applications -ListAvailable | Select-Object -First 1
  if (-not $graphModule) {
    Write-Host ' ⚠ Microsoft.Graph module not found. Installing...' -ForegroundColor Yellow
    Install-Module -Name Microsoft.Graph -Scope CurrentUser -Force -AllowClobber
    $graphModule = Get-Module -Name Microsoft.Graph.Applications -ListAvailable | Select-Object -First 1
  }
  Write-Host " ✓ Microsoft.Graph module v$($graphModule.Version)" -ForegroundColor Green

  # Import required modules
  Import-Module Microsoft.Graph.Authentication -ErrorAction Stop
  Import-Module Microsoft.Graph.Applications -ErrorAction Stop

  Write-Host ''

  # Step 2: Authenticate to Microsoft Graph
  Write-Host 'Step 2: Authenticating to Microsoft Graph...' -ForegroundColor Yellow
  $context = Connect-PackagerMcpGraph -TenantId $TenantId

  # Use tenant from context if not specified
  if (-not $TenantId) {
    $TenantId = $context.TenantId
  }

  Write-Host " ✓ Authenticated as: $($context.Account)" -ForegroundColor Green
  Write-Host " ✓ Tenant ID: $TenantId" -ForegroundColor Green
  Write-Host ''

  # Step 3: Create or update application
  Write-Host 'Step 3: Configuring application registration...' -ForegroundColor Yellow

  if (-not (Confirm-PackagerMcpAction -Message "Create or update application '$DisplayName'?" -Force:$Force -DefaultYes)) {
    Write-Host 'Setup cancelled by user.' -ForegroundColor Yellow
    exit 0
  }

  $app = Set-PackagerMcpApplication -DisplayName $DisplayName -TenantId $TenantId
  Write-Host " ✓ Application ID: $($app.AppId)" -ForegroundColor Green
  Write-Host ''

  # Step 4: Configure permissions
  Write-Host 'Step 4: Configuring API permissions...' -ForegroundColor Yellow
  $permissionInfo = Set-PackagerMcpPermissions -Application $app
  Write-Host ''

  # Step 5: Grant admin consent
  Write-Host 'Step 5: Granting admin consent...' -ForegroundColor Yellow

  if (-not (Confirm-PackagerMcpAction -Message 'Grant admin consent for DeviceManagementApps.ReadWrite.All?' -Force:$Force -DefaultYes)) {
    Write-Host 'Skipping admin consent. You will need to grant consent manually in Azure Portal.' -ForegroundColor Yellow
  }
  else {
    Grant-PackagerMcpConsent -Application $app -PermissionInfo $permissionInfo
  }
  Write-Host ''

  # Step 6: Create certificate
  Write-Host 'Step 6: Creating authentication certificate...' -ForegroundColor Yellow

  $certFullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($CertificatePath)

  if ((Test-Path -LiteralPath $certFullPath) -and -not $Force) {
    if (-not (Confirm-PackagerMcpAction -Message "Certificate already exists at $certFullPath. Overwrite?")) {
      Write-Host 'Skipping certificate creation. Using existing certificate.' -ForegroundColor Yellow
      # Try to get thumbprint from existing cert
      $existingCertPassword = Read-Host -Prompt 'Enter password for existing certificate' -AsSecureString
      $existingCert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new(
        $certFullPath,
        $existingCertPassword,
        [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
      )
      $certInfo = @{
        Thumbprint = $existingCert.Thumbprint
        Path       = $certFullPath
      }
      $certPassword = $existingCertPassword
    }
    else {
      $certInfo = Set-PackagerMcpCertificate -Application $app -CertificatePath $CertificatePath -ValidityYears $CertificateValidityYears
      $certPassword = Read-Host -Prompt 'Re-enter certificate password for config' -AsSecureString
    }
  }
  else {
    $certInfo = Set-PackagerMcpCertificate -Application $app -CertificatePath $CertificatePath -ValidityYears $CertificateValidityYears
    $certPassword = Read-Host -Prompt 'Re-enter certificate password for config' -AsSecureString
  }

  Write-Host " ✓ Certificate thumbprint: $($certInfo.Thumbprint)" -ForegroundColor Green
  Write-Host ''

  # Step 7: Export configuration
  Write-Host 'Step 7: Saving configuration...' -ForegroundColor Yellow
  $configFullPath = Export-PackagerMcpConfig `
    -TenantId $TenantId `
    -ClientId $app.AppId `
    -CertificatePath $certInfo.PemPath `
    -CertificateThumbprint $certInfo.Thumbprint `
    -OutputPath $ConfigPath

  Write-Host ''

  # Step 8: Test connection
  if (-not $SkipTest) {
    Write-Host 'Step 8: Testing connection...' -ForegroundColor Yellow

    # Brief delay to allow Azure AD to propagate changes
    Write-Host ' - Waiting 10 seconds for Azure AD propagation...' -ForegroundColor Cyan
    Start-Sleep -Seconds 10

    $testResult = Test-PackagerMcpConnection `
      -TenantId $TenantId `
      -ClientId $app.AppId `
      -CertificatePath $certInfo.Path `
      -CertificatePassword $certPassword

    if (-not $testResult) {
      Write-Host ''
      Write-Host '⚠ Connection test failed. This error may not be fatal.' -ForegroundColor Yellow
      Write-Host ''
      Write-Host '  This is commonly caused by Azure AD propagation delay (can take 1-5 minutes).' -ForegroundColor Yellow
      Write-Host '  Please manually verify the application registration in the Entra Portal:' -ForegroundColor Yellow
      Write-Host ''
      Write-Host "  https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/CallAnAPI/appId/$($app.AppId)/isMSAApp~/false" -ForegroundColor Cyan
      Write-Host ''
      Write-Host '  Check that:' -ForegroundColor Yellow
      Write-Host '   - DeviceManagementApps.ReadWrite.All permission is listed' -ForegroundColor White
      Write-Host '   - Admin consent has been granted (green checkmark)' -ForegroundColor White
      Write-Host '   - If not granted, click "Grant admin consent for [tenant]"' -ForegroundColor White
      Write-Host ''
      Write-Host '  After verifying, wait a few minutes and test manually:' -ForegroundColor Yellow
      Write-Host "  Connect-MgGraph -ClientId '$($app.AppId)' -TenantId '$TenantId' -CertificateThumbprint '$($certInfo.Thumbprint)'" -ForegroundColor Gray
      Write-Host '  Get-MgDeviceAppManagementMobileApp -Top 1' -ForegroundColor Gray
    }
  }
  else {
    Write-Host 'Step 8: Skipping connection test (-SkipTest specified)' -ForegroundColor Yellow
  }

  Write-Host ''

  # Final summary
  Write-Host '╔══════════════════════════════════════════════════════════════╗' -ForegroundColor Green
  Write-Host '║       Setup Complete!                                        ║' -ForegroundColor Green
  Write-Host '╚══════════════════════════════════════════════════════════════╝' -ForegroundColor Green
  Write-Host ''
  Write-Host 'Configuration Summary:' -ForegroundColor Cyan
  Write-Host " - Tenant ID:       $TenantId" -ForegroundColor White
  Write-Host " - Client ID:       $($app.AppId)" -ForegroundColor White
  Write-Host " - Certificate PFX: $($certInfo.Path)" -ForegroundColor White
  Write-Host " - Certificate PEM: $($certInfo.PemPath)" -ForegroundColor White
  Write-Host " - Thumbprint:      $($certInfo.Thumbprint)" -ForegroundColor White
  Write-Host " - Config file:     $configFullPath" -ForegroundColor White
  Write-Host ''
  Write-Host 'Next Steps:' -ForegroundColor Yellow
  Write-Host ' 1. Securely store the PFX certificate password (for backup purposes)' -ForegroundColor White
  Write-Host ' 2. Set INTUNE_MCP_CONFIG environment variable to the config file path' -ForegroundColor White
  Write-Host '    $env:INTUNE_MCP_CONFIG = "' -NoNewline -ForegroundColor White
  Write-Host $configFullPath -NoNewline -ForegroundColor Cyan
  Write-Host '"' -ForegroundColor White
  Write-Host ' 3. The PEM certificate does not require a password environment variable' -ForegroundColor White
  Write-Host ''

  Write-PackagerMcpLog '========== Setup Completed Successfully ==========' 'INFO'
}
catch {
  Write-Host ''
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-PackagerMcpLog "Setup failed: $($_.Exception.Message)" 'ERROR'
  Write-PackagerMcpLog $_.ScriptStackTrace 'ERROR'

  throw
}
finally {
  # Clean up Graph connection
  Disconnect-PackagerMcpGraph
}

#endregion
