<#
.SYNOPSIS
    Configures the Packager-MCP server in Claude Code's settings.local.json file.

.DESCRIPTION
    Reads the intune_mcp_config.yaml file and updates the .claude/settings.local.json
    file to configure the packager-mcp MCP server with the required environment variables
    for Microsoft Intune authentication.

.PARAMETER ConfigPath
    Path to the YAML config file. Defaults to intune_mcp_config.yaml in the script directory.

.PARAMETER CertPassword
    Password for the certificate. If not provided, will prompt for it.

.PARAMETER SettingsPath
    Path to the settings.local.json file. Defaults to .claude/settings.local.json in the project root.

.PARAMETER ServerPath
    Path to the MCP server entry point. Defaults to dist/server.js in the project root.

.EXAMPLE
    .\Set-McpEnvironment.ps1
    Updates settings.local.json for the current project.

.EXAMPLE
    .\Set-McpEnvironment.ps1 -CertPassword "MyPassword123"
    Updates settings with the specified certificate password.
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$ConfigPath = "$PSScriptRoot\intune_mcp_config.yaml",

    [Parameter()]
    [string]$CertPassword,

    [Parameter()]
    [string]$SettingsPath,

    [Parameter()]
    [string]$ServerPath
)

# Determine project root (parent of scripts directory)
$projectRoot = Split-Path $PSScriptRoot -Parent

# Set defaults based on project root
if (-not $SettingsPath) {
    $SettingsPath = Join-Path $projectRoot ".claude\settings.local.json"
}
if (-not $ServerPath) {
    $ServerPath = Join-Path $projectRoot "dist\server.js"
}

# Validate config file exists
if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config file not found: $ConfigPath"
    Write-Host "Run Setup-PackagerMcpIntune.ps1 first to create the configuration." -ForegroundColor Yellow
    exit 1
}

# Validate server file exists
if (-not (Test-Path $ServerPath)) {
    Write-Error "Server file not found: $ServerPath"
    Write-Host "Run 'npm run build' first to build the MCP server." -ForegroundColor Yellow
    exit 1
}

Write-Host "Reading configuration from: $ConfigPath" -ForegroundColor Cyan

# Parse YAML manually (simple parser for this specific format)
$configContent = Get-Content $ConfigPath -Raw
$config = @{}

# Extract values using regex
if ($configContent -match 'tenantId:\s*"([^"]+)"') {
    $config.TenantId = $matches[1]
}
if ($configContent -match 'clientId:\s*"([^"]+)"') {
    $config.ClientId = $matches[1]
}
if ($configContent -match 'certificatePath:\s*"([^"]+)"') {
    $config.CertificatePath = $matches[1]
}
if ($configContent -match 'certificateThumbprint:\s*"([^"]+)"') {
    $config.CertificateThumbprint = $matches[1]
}

# Validate required values
$missingValues = @()
if (-not $config.TenantId) { $missingValues += "tenantId" }
if (-not $config.ClientId) { $missingValues += "clientId" }
if (-not $config.CertificatePath) { $missingValues += "certificatePath" }

if ($missingValues.Count -gt 0) {
    Write-Error "Missing required values in config: $($missingValues -join ', ')"
    exit 1
}

# Validate certificate file exists
if (-not (Test-Path $config.CertificatePath)) {
    Write-Error "Certificate file not found: $($config.CertificatePath)"
    exit 1
}

# Get certificate password if not provided
if (-not $CertPassword) {
    $securePassword = Read-Host "Enter certificate password" -AsSecureString
    $CertPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    )
}

# Read existing settings or create new structure
Write-Host "Reading settings from: $SettingsPath" -ForegroundColor Cyan

if (Test-Path $SettingsPath) {
    $settingsContent = Get-Content $SettingsPath -Raw
    $settings = $settingsContent | ConvertFrom-Json -AsHashtable
} else {
    Write-Host "Settings file not found, creating new one..." -ForegroundColor Yellow
    $settings = @{}

    # Ensure .claude directory exists
    $claudeDir = Split-Path $SettingsPath -Parent
    if (-not (Test-Path $claudeDir)) {
        New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
    }
}

# Ensure permissions structure exists
if (-not $settings.ContainsKey('permissions')) {
    $settings['permissions'] = @{
        'allow' = @()
        'deny' = @()
        'ask' = @()
    }
}

# Ensure mcpServers structure exists
if (-not $settings.ContainsKey('mcpServers')) {
    $settings['mcpServers'] = @{}
}

# Convert paths to forward slashes for JSON compatibility
$configPathForJson = $ConfigPath -replace '\\', '/'
$serverPathForJson = $ServerPath -replace '\\', '/'

# Configure packager-mcp server
Write-Host "`nConfiguring packager-mcp MCP server..." -ForegroundColor Cyan

$settings['mcpServers']['packager-mcp'] = @{
    'command' = 'node'
    'args' = @($serverPathForJson)
    'env' = @{
        'INTUNE_MCP_CONFIG' = $configPathForJson
        'INTUNE_CERT_PASSWORD' = $CertPassword
    }
}

# Convert to JSON and save
$jsonOutput = $settings | ConvertTo-Json -Depth 10

# Write to file
Set-Content -Path $SettingsPath -Value $jsonOutput -Encoding UTF8

Write-Host "`nSettings updated successfully!" -ForegroundColor Green
Write-Host "  File: $SettingsPath" -ForegroundColor Cyan

# Display configuration (mask password)
Write-Host "`nMCP Server Configuration:" -ForegroundColor Cyan
Write-Host "  Server Name:  packager-mcp"
Write-Host "  Command:      node $serverPathForJson"
Write-Host "  Environment:"
Write-Host "    INTUNE_MCP_CONFIG:    $configPathForJson"
Write-Host "    INTUNE_CERT_PASSWORD: ********"

Write-Host "`nConfiguration Summary:" -ForegroundColor Cyan
Write-Host "  Tenant ID:    $($config.TenantId)"
Write-Host "  Client ID:    $($config.ClientId)"
Write-Host "  Certificate:  $($config.CertificatePath)"
Write-Host "  Thumbprint:   $($config.CertificateThumbprint)"

Write-Host "`nRestart Claude Code to apply changes." -ForegroundColor Yellow
