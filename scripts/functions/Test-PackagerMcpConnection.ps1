function Test-PackagerMcpConnection {
  <#
    .SYNOPSIS
    Tests the Packager-MCP application connection to Microsoft Graph.

    .DESCRIPTION
    Verifies that the application can authenticate using certificate credentials
    and has the required permissions to access Intune APIs.

    .PARAMETER TenantId
    The Azure AD tenant ID.

    .PARAMETER ClientId
    The application (client) ID.

    .PARAMETER CertificatePath
    Path to the PFX certificate file.

    .PARAMETER CertificatePassword
    SecureString password for the PFX file.

    .OUTPUTS
    Boolean indicating whether the connection test succeeded.

    .EXAMPLE
    $result = Test-PackagerMcpConnection -TenantId $tenantId -ClientId $clientId `
      -CertificatePath './packager-mcp.pfx' -CertificatePassword $password
  #>
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [string]$TenantId,

    [Parameter(Mandatory)]
    [string]$ClientId,

    [Parameter(Mandatory)]
    [string]$CertificatePath,

    [Parameter(Mandatory)]
    [SecureString]$CertificatePassword
  )

  Write-Host ''
  Write-Host 'Testing application connection to Microsoft Graph...' -ForegroundColor Cyan

  # Disconnect any existing sessions
  try {
    Disconnect-MgGraph -ErrorAction SilentlyContinue | Out-Null
  }
  catch {
    # Ignore
  }

  # Load the certificate
  $fullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($CertificatePath)

  if (-not (Test-Path -LiteralPath $fullPath)) {
    Write-Host " - FAILED: Certificate file not found at $fullPath" -ForegroundColor Red
    Write-PackagerMcpLog "Connection test failed: Certificate not found at $fullPath" 'ERROR'
    return $false
  }

  try {
    $cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new(
      $fullPath,
      $CertificatePassword,
      [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
    )
  }
  catch {
    Write-Host " - FAILED: Could not load certificate: $($_.Exception.Message)" -ForegroundColor Red
    Write-PackagerMcpLog "Connection test failed: Could not load certificate - $($_.Exception.Message)" 'ERROR'
    return $false
  }

  Write-Host " - Certificate loaded: $($cert.Subject)" -ForegroundColor Cyan

  # Connect using certificate
  try {
    Connect-MgGraph -TenantId $TenantId -ClientId $ClientId -Certificate $cert -NoWelcome -ErrorAction Stop | Out-Null
  }
  catch {
    Write-Host " - FAILED: Could not connect to Graph: $($_.Exception.Message)" -ForegroundColor Red
    Write-PackagerMcpLog "Connection test failed: Graph connection error - $($_.Exception.Message)" 'ERROR'
    return $false
  }

  Write-Host ' - Connected to Microsoft Graph' -ForegroundColor Cyan

  # Test access to Intune API
  try {
    # Try to list device app management (requires DeviceManagementApps.Read permission)
    $null = Invoke-MgGraphRequest -Method GET -Uri 'https://graph.microsoft.com/v1.0/deviceAppManagement' -ErrorAction Stop
    Write-Host ' - Intune API access verified' -ForegroundColor Cyan
  }
  catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -match 'Authorization_RequestDenied|Forbidden|403') {
      Write-Host ' - FAILED: Access denied to Intune API. Admin consent may not be granted.' -ForegroundColor Red
      Write-PackagerMcpLog "Connection test failed: Intune API access denied - $errorMsg" 'ERROR'
    }
    else {
      Write-Host " - FAILED: Intune API error: $errorMsg" -ForegroundColor Red
      Write-PackagerMcpLog "Connection test failed: Intune API error - $errorMsg" 'ERROR'
    }

    Disconnect-MgGraph -ErrorAction SilentlyContinue | Out-Null
    return $false
  }

  # Clean up
  Disconnect-MgGraph -ErrorAction SilentlyContinue | Out-Null

  Write-Host ''
  Write-Host 'Connection test PASSED' -ForegroundColor Green
  Write-PackagerMcpLog 'Connection test passed successfully' 'INFO'

  return $true
}
