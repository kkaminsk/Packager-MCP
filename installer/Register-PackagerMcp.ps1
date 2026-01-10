<#
.SYNOPSIS
    Registers the Packager-MCP server with Claude Code.
.DESCRIPTION
    This script is called by the MSI installer to automatically register
    the Packager-MCP server with Claude Code CLI.

    If Claude Code is not installed, the script exits gracefully without error.
    If registration fails, the script logs a warning but does not fail the install.
.PARAMETER InstallPath
    The installation directory of Packager-MCP (e.g., "C:\Program Files\Packager-MCP\").
.PARAMETER GitHubPat
    Optional GitHub Personal Access Token for Winget API access.
.EXAMPLE
    .\Register-PackagerMcp.ps1 -InstallPath "C:\Program Files\Packager-MCP\"
.EXAMPLE
    .\Register-PackagerMcp.ps1 -InstallPath "C:\Program Files\Packager-MCP\" -GitHubPat "ghp_xxxx"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InstallPath,

    [Parameter(Mandatory = $false)]
    [string]$GitHubPat
)

$ErrorActionPreference = 'SilentlyContinue'
$LogFile = Join-Path $env:TEMP "Packager-MCP-Registration.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Add-Content -Path $LogFile -Value $logEntry -ErrorAction SilentlyContinue
    Write-Verbose $logEntry
}

Write-Log "=== Packager-MCP Registration Script ==="
Write-Log "InstallPath: $InstallPath"
Write-Log "GitHubPat provided: $(-not [string]::IsNullOrEmpty($GitHubPat))"

# Normalize install path (remove trailing backslash if present, except for root)
$InstallPath = $InstallPath.TrimEnd('\')
if ($InstallPath -match '^[A-Za-z]:$') {
    $InstallPath += '\'
}

# Check if Claude Code is installed
$claudeExe = $null

# Check common locations
$searchPaths = @(
    (Join-Path $env:USERPROFILE ".claude\local\claude.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\claude-code\claude.exe"),
    (Join-Path $env:ProgramFiles "Claude Code\claude.exe")
)

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        $claudeExe = $path
        Write-Log "Found Claude Code at: $claudeExe"
        break
    }
}

# Also check PATH
if (-not $claudeExe) {
    $claudeInPath = Get-Command claude -ErrorAction SilentlyContinue
    if ($claudeInPath) {
        $claudeExe = $claudeInPath.Source
        Write-Log "Found Claude Code in PATH: $claudeExe"
    }
}

if (-not $claudeExe) {
    Write-Log "Claude Code not found. Skipping MCP registration."
    Write-Log "To register manually after installing Claude Code, run:"
    Write-Log "  claude mcp add packager-mcp -s user -- `"$InstallPath\nodejs\node.exe`" `"$InstallPath\dist\server.js`""
    exit 0
}

# Build registration command arguments
$nodeExe = Join-Path $InstallPath "nodejs\node.exe"
$serverJs = Join-Path $InstallPath "dist\server.js"

if (-not (Test-Path $nodeExe)) {
    Write-Log "ERROR: Node.js not found at: $nodeExe"
    exit 0  # Don't fail the install
}

if (-not (Test-Path $serverJs)) {
    Write-Log "ERROR: Server.js not found at: $serverJs"
    exit 0  # Don't fail the install
}

# Build the claude mcp add command
$mcpArgs = @("mcp", "add", "packager-mcp", "-s", "user")

# Add environment variable for GitHub token if provided
if (-not [string]::IsNullOrEmpty($GitHubPat)) {
    $mcpArgs += @("-e", "GITHUB_TOKEN=$GitHubPat")
    Write-Log "Adding GITHUB_TOKEN environment variable"
}

# Add the command to run
$mcpArgs += @("--", $nodeExe, $serverJs)

Write-Log "Running: claude $($mcpArgs -join ' ')"

try {
    # First, try to remove any existing registration (ignore errors)
    & $claudeExe mcp remove packager-mcp -s user 2>&1 | Out-Null

    # Register the MCP server
    $result = & $claudeExe $mcpArgs 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Log "Successfully registered Packager-MCP with Claude Code"
        Write-Log "Output: $result"
    } else {
        Write-Log "Registration returned exit code: $exitCode"
        Write-Log "Output: $result"
        Write-Log "MCP server may need to be registered manually"
    }
} catch {
    Write-Log "Exception during registration: $_"
    Write-Log "MCP server may need to be registered manually"
}

Write-Log "=== Registration script completed ==="
exit 0
