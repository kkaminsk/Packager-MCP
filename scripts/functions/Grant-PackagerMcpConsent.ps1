function Grant-PackagerMcpConsent {
  <#
    .SYNOPSIS
    Grants admin consent for the Packager-MCP application permissions.

    .DESCRIPTION
    Creates an app role assignment to grant admin consent for the configured
    Microsoft Graph API permissions (DeviceManagementApps.ReadWrite.All).

    .PARAMETER Application
    The application object that needs consent.

    .PARAMETER PermissionInfo
    The permission info returned from Set-PackagerMcpPermissions, containing
    the Graph service principal and app role ID.

    .EXAMPLE
    Grant-PackagerMcpConsent -Application $app -PermissionInfo $permInfo
    Grants admin consent for the application.
  #>
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    $Application,

    [Parameter(Mandatory)]
    [hashtable]$PermissionInfo
  )

  Write-Host 'Granting admin consent for API permissions...' -ForegroundColor Cyan

  # Get the service principal for our application
  $appSp = Invoke-GraphWithRetry -OperationName 'Get-AppServicePrincipal' -Script {
    Get-MgServicePrincipal -Filter "appId eq '$($Application.AppId)'" -ErrorAction Stop | Select-Object -First 1
  }

  if (-not $appSp) {
    throw "Could not find service principal for application $($Application.AppId)"
  }

  # Check if consent already exists
  $existingAssignment = Invoke-GraphWithRetry -OperationName 'Get-ExistingAssignment' -NonFatalStatusCodes @(404) -NonFatalReturn $null -Script {
    Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $appSp.Id -ErrorAction Stop |
      Where-Object { $_.AppRoleId -eq $PermissionInfo.AppRoleId -and $_.ResourceId -eq $PermissionInfo.GraphServicePrincipal.Id }
  }

  if ($existingAssignment) {
    Write-Host 'Admin consent already granted.' -ForegroundColor Green
    Write-PackagerMcpLog 'Admin consent already exists for DeviceManagementApps.ReadWrite.All' 'INFO'
    return
  }

  # Grant consent by creating app role assignment
  $params = @{
    PrincipalId = $appSp.Id
    ResourceId  = $PermissionInfo.GraphServicePrincipal.Id
    AppRoleId   = $PermissionInfo.AppRoleId
  }

  Invoke-GraphWithRetry -OperationName 'Grant-Consent' -Script {
    New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $appSp.Id -BodyParameter $params -ErrorAction Stop
  }

  Write-Host 'Admin consent granted successfully.' -ForegroundColor Green
  Write-PackagerMcpLog 'Granted admin consent for DeviceManagementApps.ReadWrite.All' 'INFO'
}
