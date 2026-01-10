<#
.SYNOPSIS
    Shows a warning dialog when Claude Code is not installed.
.DESCRIPTION
    This script is called by the MSI installer to display a non-blocking
    informational message when Claude Code is not detected on the system.
#>
[CmdletBinding()]
param()

Add-Type -AssemblyName System.Windows.Forms

$message = @"
Claude Code is highly recommended for using Packager-MCP.

The MCP server requires Claude Code to function.

To install, run:
winget install Anthropic.ClaudeCode
"@

[System.Windows.Forms.MessageBox]::Show(
    $message,
    "Packager-MCP Setup",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
) | Out-Null

exit 0
