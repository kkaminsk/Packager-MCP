function Confirm-PackagerMcpAction {
  <#
    .SYNOPSIS
    Prompts user for confirmation before performing an action.

    .DESCRIPTION
    Displays a confirmation prompt and returns true if the user confirms.
    Supports optional Force parameter to skip confirmation.

    .PARAMETER Message
    The message to display to the user.

    .PARAMETER Force
    If specified, skips the confirmation prompt and returns true.

    .PARAMETER DefaultYes
    If specified, pressing Enter defaults to Yes. Otherwise defaults to No.

    .OUTPUTS
    Boolean indicating whether the action was confirmed.

    .EXAMPLE
    if (Confirm-PackagerMcpAction -Message 'Create new application registration?') {
      # proceed with creation
    }

    .EXAMPLE
    if (Confirm-PackagerMcpAction -Message 'Overwrite existing certificate?' -Force:$Force) {
      # proceed with overwrite
    }
  #>
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [string]$Message,

    [switch]$Force,

    [switch]$DefaultYes
  )

  if ($Force) {
    Write-PackagerMcpLog "Action confirmed via -Force: $Message" 'DEBUG'
    return $true
  }

  $prompt = if ($DefaultYes) {
    "$Message [Y/n]"
  }
  else {
    "$Message [y/N]"
  }

  Write-Host ''
  $response = Read-Host -Prompt $prompt

  $confirmed = if ([string]::IsNullOrWhiteSpace($response)) {
    # Empty response uses default
    $DefaultYes
  }
  elseif ($response -match '^[Yy]') {
    $true
  }
  else {
    $false
  }

  if ($confirmed) {
    Write-PackagerMcpLog "Action confirmed by user: $Message" 'DEBUG'
  }
  else {
    Write-PackagerMcpLog "Action declined by user: $Message" 'DEBUG'
  }

  return $confirmed
}
