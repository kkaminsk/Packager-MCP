function Set-PackagerMcpApplication {
  <#
    .SYNOPSIS
    Creates or updates the Packager-MCP application registration.

    .DESCRIPTION
    Creates a new Azure AD application registration or updates an existing one
    for the Packager-MCP server. Configures the application as a confidential
    client for certificate-based authentication.

    .PARAMETER DisplayName
    The display name for the application. Default: 'Packager-MCP'

    .PARAMETER TenantId
    The target tenant ID.

    .OUTPUTS
    Microsoft.Graph.PowerShell.Models.MicrosoftGraphApplication

    .EXAMPLE
    $app = Set-PackagerMcpApplication -TenantId $tenantId
    Creates or updates the Packager-MCP application.
  #>
  [CmdletBinding()]
  param(
    [string]$DisplayName = 'Packager-MCP',

    [Parameter(Mandatory)]
    [string]$TenantId
  )

  $app = Get-PackagerMcpApplication -DisplayName $DisplayName

  if (-not $app) {
    Write-Host "Creating application '$DisplayName'..." -ForegroundColor Cyan

    $params = @{
      DisplayName            = $DisplayName
      SignInAudience         = 'AzureADMyOrg'
      Description            = 'Packager-MCP server for Intune Win32 app publishing'
      Notes                  = 'Created by Setup-PackagerMcpIntune.ps1'
    }

    $app = Invoke-GraphWithRetry -OperationName 'New-Application' -Script {
      New-MgApplication @params -ErrorAction Stop
    }

    Write-Host "Application created with ID: $($app.AppId)" -ForegroundColor Green
    Write-PackagerMcpLog "Created application '$DisplayName' (AppId: $($app.AppId))" 'INFO'
  }
  else {
    Write-Host "Found existing application '$DisplayName' (AppId: $($app.AppId))" -ForegroundColor Green
    Write-PackagerMcpLog "Using existing application '$DisplayName' (AppId: $($app.AppId))" 'INFO'

    # Update description if needed
    if (-not $app.Description -or $app.Description -notmatch 'Packager-MCP') {
      Write-PackagerMcpLog "Updating application description..." 'DEBUG'
      Invoke-GraphWithRetry -OperationName 'Update-Application' -Script {
        Update-MgApplication -ApplicationId $app.Id -Description 'Packager-MCP server for Intune Win32 app publishing' -ErrorAction Stop
      }
    }
  }

  # Ensure service principal exists
  $sp = Invoke-GraphWithRetry -OperationName 'Get-ServicePrincipal' -NonFatalStatusCodes @(404) -NonFatalReturn $null -Script {
    Get-MgServicePrincipal -Filter "appId eq '$($app.AppId)'" -ErrorAction Stop | Select-Object -First 1
  }

  if (-not $sp) {
    Write-PackagerMcpLog "Creating service principal..." 'DEBUG'
    $sp = Invoke-GraphWithRetry -OperationName 'New-ServicePrincipal' -Script {
      New-MgServicePrincipal -AppId $app.AppId -ErrorAction Stop
    }
    Write-PackagerMcpLog "Service principal created (Id: $($sp.Id))" 'INFO'
  }

  # Return refreshed application object
  return Invoke-GraphWithRetry -OperationName 'Get-Application-Refresh' -Script {
    Get-MgApplication -ApplicationId $app.Id -ErrorAction Stop
  }
}
