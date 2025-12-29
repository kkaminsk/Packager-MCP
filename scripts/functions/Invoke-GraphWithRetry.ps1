function Invoke-GraphWithRetry {
  <#
    .SYNOPSIS
    Executes a Graph API call with automatic retry logic for transient failures.

    .DESCRIPTION
    Wraps a scriptblock that makes Graph API calls and provides:
    - Automatic retry for HTTP 429 (throttling), 502, 503, 504 errors
    - Exponential backoff with Retry-After header support
    - Non-fatal error handling for specified status codes
    - Detailed logging of all attempts

    .PARAMETER Script
    The scriptblock containing the Graph API call to execute.

    .PARAMETER MaxRetries
    Maximum number of retry attempts. Default: 4

    .PARAMETER OperationName
    Friendly name for the operation (used in logging).

    .PARAMETER NonFatalStatusCodes
    Array of HTTP status codes to treat as non-fatal (e.g., 404).

    .PARAMETER NonFatalReturn
    Value to return when a non-fatal status code is encountered.

    .OUTPUTS
    The result of the scriptblock execution, or NonFatalReturn on non-fatal error.

    .EXAMPLE
    Invoke-GraphWithRetry -OperationName 'Get-App' -Script { Get-MgApplication -Filter "displayName eq 'MyApp'" }

    .EXAMPLE
    Invoke-GraphWithRetry -NonFatalStatusCodes @(404) -NonFatalReturn $null -Script { Get-MgApplication -ApplicationId $id }
  #>
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [scriptblock]$Script,

    [int]$MaxRetries = 4,

    [string]$OperationName = 'GraphOperation',

    [int[]]$NonFatalStatusCodes,

    $NonFatalReturn
  )

  $attempt = 0

  while ($true) {
    $attempt++
    Write-PackagerMcpLog "Graph call attempt $($attempt): $OperationName" 'DEBUG'

    try {
      $result = & $Script
      Write-PackagerMcpLog "Graph call succeeded: $OperationName" 'DEBUG'
      return $result
    }
    catch {
      $msg = $_.Exception.Message
      $code = $null

      # Try to extract status code from response
      try {
        if ($_.Exception.Response.StatusCode) {
          $code = [int]$_.Exception.Response.StatusCode
        }
      }
      catch { }

      # Try to parse status from message if not found in response
      if (-not $code) {
        $match = [regex]::Match($msg, 'Status:\s*(\d{3})')
        if ($match.Success) {
          $code = [int]$match.Groups[1].Value
        }
      }

      # Check for "not found" patterns if 404 is non-fatal
      if (-not $code -and $NonFatalStatusCodes -and ($NonFatalStatusCodes -contains 404)) {
        if ($msg -match '(?i)\bnot\s*found\b|\bcould not be found\b') {
          $code = 404
        }
      }

      # Handle non-fatal status codes
      if ($NonFatalStatusCodes -and ($code -in $NonFatalStatusCodes)) {
        Write-PackagerMcpLog "Graph call non-fatal (status=$code): $OperationName - $msg" 'DEBUG'
        return $NonFatalReturn
      }

      # Determine if we should retry
      $shouldRetry = $code -in @(429, 502, 503, 504) -or $msg -match 'timeout|temporar|Too Many'

      # Calculate wait time with exponential backoff
      $waitSeconds = [Math]::Min(2 * [Math]::Pow(2, $attempt), 60)

      # Check for Retry-After header
      try {
        $headers = $_.Exception.Response.Headers
        if ($headers -and $headers['Retry-After']) {
          $waitSeconds = [int]$headers['Retry-After']
        }
      }
      catch { }

      if ($attempt -le $MaxRetries -and $shouldRetry) {
        Write-PackagerMcpLog "Graph call retry $attempt/$MaxRetries in $waitSeconds sec (status=$code): $OperationName - $msg" 'WARN'
        Start-Sleep -Seconds $waitSeconds
        continue
      }

      Write-PackagerMcpLog "Graph call failed (status=$code): $OperationName - $msg" 'ERROR'
      throw
    }
  }
}
