function Set-PackagerMcpPermissions {
  <#
    .SYNOPSIS
    Configures Microsoft Graph API permissions for the Packager-MCP application.

    .DESCRIPTION
    Configures the required application permissions for Intune Win32 app management:
    - DeviceManagementApps.ReadWrite.All

    .PARAMETER Application
    The application object to configure.

    .EXAMPLE
    Set-PackagerMcpPermissions -Application $app
    Configures Intune permissions for the application.
  #>
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    $Application
  )

  Write-Host 'Configuring Microsoft Graph API permissions...' -ForegroundColor Cyan

  # Get Microsoft Graph service principal
  $graphSp = Invoke-GraphWithRetry -OperationName 'Get-GraphSP' -Script {
    Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'" -ErrorAction Stop
  }

  if (-not $graphSp) {
    throw 'Could not find Microsoft Graph service principal'
  }

  # Find the DeviceManagementApps.ReadWrite.All app role
  $intuneRole = $graphSp.AppRoles | Where-Object { $_.Value -eq 'DeviceManagementApps.ReadWrite.All' }

  if (-not $intuneRole) {
    throw 'Could not find DeviceManagementApps.ReadWrite.All permission in Microsoft Graph'
  }

  Write-Host " - DeviceManagementApps.ReadWrite.All" -ForegroundColor Cyan

  # Build required resource access
  $resourceAccess = @(
    @{
      Id   = $intuneRole.Id
      Type = 'Role'  # Application permission
    }
  )

  $requiredResourceAccess = @(
    @{
      ResourceAppId  = $graphSp.AppId
      ResourceAccess = $resourceAccess
    }
  )

  # Update application with required permissions
  Invoke-GraphWithRetry -OperationName 'Update-Permissions' -Script {
    Update-MgApplication -ApplicationId $Application.Id -RequiredResourceAccess $requiredResourceAccess -ErrorAction Stop
  }

  Write-Host 'Permissions configured successfully.' -ForegroundColor Green
  Write-PackagerMcpLog "Configured DeviceManagementApps.ReadWrite.All permission" 'INFO'

  # Return info needed for consent
  return @{
    GraphServicePrincipal = $graphSp
    AppRoleId             = $intuneRole.Id
  }
}
