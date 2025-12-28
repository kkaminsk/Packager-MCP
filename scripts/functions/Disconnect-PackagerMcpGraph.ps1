function Disconnect-PackagerMcpGraph {
  <#
    .SYNOPSIS
    Disconnects from Microsoft Graph.

    .DESCRIPTION
    Cleanly disconnects the current Microsoft Graph session.

    .EXAMPLE
    Disconnect-PackagerMcpGraph
    Disconnects from Graph.
  #>
  [CmdletBinding()]
  param()

  try {
    Disconnect-MgGraph -ErrorAction SilentlyContinue | Out-Null
    Write-PackagerMcpLog "Disconnected from Microsoft Graph" 'INFO'
  }
  catch {
    Write-PackagerMcpLog "Error disconnecting from Graph: $($_.Exception.Message)" 'WARN'
  }
}
