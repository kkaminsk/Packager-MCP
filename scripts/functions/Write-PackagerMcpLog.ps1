function Write-PackagerMcpLog {
  <#
    .SYNOPSIS
    Writes a timestamped log entry to the log file and console.

    .DESCRIPTION
    Appends a formatted log entry with timestamp and severity level.
    Also outputs to the appropriate PowerShell stream based on level.

    .PARAMETER Message
    The log message text to write.

    .PARAMETER Level
    The severity level: INFO, WARN, ERROR, or DEBUG. Defaults to INFO.

    .EXAMPLE
    Write-PackagerMcpLog "Starting setup process" 'INFO'

    .EXAMPLE
    Write-PackagerMcpLog "Permission denied" 'ERROR'

    .NOTES
    If $script:logPath is set, logs to file. Always outputs to console streams.
  #>
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [string]$Message,

    [ValidateSet('INFO', 'WARN', 'ERROR', 'DEBUG')]
    [string]$Level = 'INFO'
  )

  $timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  $line = "[$timestamp] ${Level}: $Message"

  # Write to log file if path is set
  if ($script:logPath) {
    try {
      Add-Content -LiteralPath $script:logPath -Value $line -ErrorAction SilentlyContinue
    }
    catch {
      # Ignore file logging errors
    }
  }

  # Output to appropriate stream
  switch ($Level) {
    'ERROR' { Write-Error $Message }
    'WARN'  { Write-Warning $Message }
    'DEBUG' { Write-Verbose $Message }
    default { Write-Host $line }
  }
}
