function Connect-PackagerMcpGraph {
  <#
    .SYNOPSIS
    Connects to Microsoft Graph with admin scopes for app registration management.

    .DESCRIPTION
    Establishes a Microsoft Graph connection with administrative scopes required for
    app registration management (Application.ReadWrite.All, AppRoleAssignment.ReadWrite.All).

    If an existing session has the required scopes, it is reused. Otherwise, initiates
    interactive authentication.

    .PARAMETER Reauth
    Forces re-authentication even if an existing valid session exists.

    .PARAMETER TenantId
    Target tenant ID. If not specified, uses the default tenant.

    .OUTPUTS
    Microsoft.Graph.PowerShell.Authentication.AuthContext
    Returns the Graph context object for the authenticated session.

    .EXAMPLE
    $context = Connect-PackagerMcpGraph
    Connects to Graph, reusing existing session if it has required scopes.

    .EXAMPLE
    $context = Connect-PackagerMcpGraph -Reauth
    Forces a fresh authentication.

    .EXAMPLE
    $context = Connect-PackagerMcpGraph -TenantId 'contoso.onmicrosoft.com'
    Connects to a specific tenant.
  #>
  [CmdletBinding()]
  param(
    [switch]$Reauth,

    [string]$TenantId
  )

  # Required scopes for app registration management
  $requiredScopes = @(
    'Application.ReadWrite.All'
    'AppRoleAssignment.ReadWrite.All'
  )

  # Force re-authentication if requested
  if ($Reauth) {
    try {
      Disconnect-MgGraph -ErrorAction SilentlyContinue | Out-Null
    }
    catch {
      # Ignore disconnect errors
    }
  }

  # Check for existing session
  $context = Get-MgContext

  if ($context -and $context.Account) {
    # Verify session has required scopes
    $hasRequiredScopes = $true
    foreach ($scope in $requiredScopes) {
      if ($context.Scopes -notcontains $scope) {
        $hasRequiredScopes = $false
        break
      }
    }

    if ($hasRequiredScopes) {
      Write-PackagerMcpLog "Using existing Graph session as $($context.Account)" 'INFO'
      return $context
    }
    else {
      Write-PackagerMcpLog "Existing session lacks required admin scopes. Re-authenticating..." 'WARN'
      Disconnect-MgGraph -ErrorAction SilentlyContinue | Out-Null
    }
  }

  # Authenticate
  Write-Host ''
  Write-Host 'Connecting to Microsoft Graph...' -ForegroundColor Cyan
  Write-Host 'A browser window will open for interactive authentication.' -ForegroundColor Yellow
  Write-Host 'Sign in with Global Administrator or Application Administrator credentials.' -ForegroundColor Yellow
  Write-Host ''

  try {
    $connectParams = @{
      Scopes      = $requiredScopes
      ErrorAction = 'Stop'
    }

    if ($TenantId) {
      $connectParams['TenantId'] = $TenantId
    }

    Connect-MgGraph @connectParams | Out-Null
  }
  catch {
    throw "Microsoft Graph authentication failed: $($_.Exception.Message)"
  }

  $context = Get-MgContext

  if (-not $context -or -not $context.Account) {
    throw 'Microsoft Graph authentication failed: no authenticated account found.'
  }

  Write-PackagerMcpLog "Successfully authenticated as $($context.Account)" 'INFO'
  return $context
}
