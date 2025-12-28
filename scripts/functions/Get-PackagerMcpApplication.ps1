function Get-PackagerMcpApplication {
  <#
    .SYNOPSIS
    Retrieves the Packager-MCP application registration.

    .DESCRIPTION
    Searches for an existing application registration by display name.
    Returns the application object if found, or $null if not found.

    .PARAMETER DisplayName
    The display name to search for. Default: 'Packager-MCP'

    .OUTPUTS
    Microsoft.Graph.PowerShell.Models.MicrosoftGraphApplication or $null

    .EXAMPLE
    $app = Get-PackagerMcpApplication
    Gets the default Packager-MCP application.

    .EXAMPLE
    $app = Get-PackagerMcpApplication -DisplayName 'My Custom App'
    Gets an application with a custom name.
  #>
  [CmdletBinding()]
  param(
    [string]$DisplayName = 'Packager-MCP'
  )

  Write-PackagerMcpLog "Searching for application '$DisplayName'..." 'DEBUG'

  $app = Invoke-GraphWithRetry -OperationName 'Get-Application' -NonFatalStatusCodes @(404) -NonFatalReturn $null -Script {
    Get-MgApplication -Filter "displayName eq '$DisplayName'" -ErrorAction Stop | Select-Object -First 1
  }

  if ($app) {
    Write-PackagerMcpLog "Found application '$DisplayName' (AppId: $($app.AppId))" 'DEBUG'
  }
  else {
    Write-PackagerMcpLog "Application '$DisplayName' not found" 'DEBUG'
  }

  return $app
}
