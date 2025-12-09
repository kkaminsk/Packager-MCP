---
title: "PSADT v4 Built-in Variables"
id: "psadt-variables"
psadt_target: "4.1.7"
last_updated: "2025-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/V4Assets/PSAppDeployToolkit"
tags: ["psadt", "variables", "session", "environment", "v4.1.7"]
---

# PSADT v4.1.7 Built-in Variables

PSADT v4.1.7 provides variables through the `$adtSession` object and environment variables that become available after opening a session.

## Session Object ($adtSession)

In v4.1.7, you define `$adtSession` as a hashtable, then it becomes the session object after `Open-ADTSession`.

### Session Variables (v4.1.7)

```powershell
# Initial hashtable definition
$adtSession = @{
    # Application info
    AppVendor = 'Microsoft'
    AppName = 'Office 365'
    AppVersion = '16.0'
    AppArch = 'x64'
    AppLang = 'EN'
    AppRevision = '01'

    # Exit codes
    AppSuccessExitCodes = @(0)
    AppRebootExitCodes = @(1641, 3010)

    # Processes to close (used in Install/Uninstall/Repair)
    AppProcessesToClose = @(
        @{ Name = 'winword'; Description = 'Microsoft Word' },
        @{ Name = 'excel'; Description = 'Microsoft Excel' }
    )

    # Admin requirement
    RequireAdmin = $true

    # UI titles (optional overrides)
    InstallName = ''
    InstallTitle = ''

    # Script metadata
    AppScriptVersion = '1.0.0'
    AppScriptDate = '2025-01-01'
    AppScriptAuthor = 'IT Admin'

    # Script info (auto-populated)
    DeployAppScriptFriendlyName = $MyInvocation.MyCommand.Name
    DeployAppScriptParameters = $PSBoundParameters
    DeployAppScriptVersion = '4.1.7'
}

# After Open-ADTSession, these become session properties:
$iadtParams = Get-ADTBoundParametersAndDefaultValues -Invocation $MyInvocation
$adtSession = Remove-ADTHashtableNullOrEmptyValues -Hashtable $adtSession
$adtSession = Open-ADTSession @adtSession @iadtParams -PassThru
```

### Session Properties (After Open-ADTSession)

```powershell
# Application information
$adtSession.AppVendor             # Application vendor
$adtSession.AppName               # Application name
$adtSession.AppVersion            # Application version
$adtSession.InstallName           # Full install name (Vendor AppName AppVersion)
$adtSession.InstallTitle          # Display title for UI

# Deployment info
$adtSession.DeploymentType        # Install, Uninstall, or Repair
$adtSession.DeployMode            # Auto, Interactive, NonInteractive, Silent
$adtSession.InstallPhase          # Current phase (Pre-Install, Install, Post-Install, etc.)

# Directories
$adtSession.DirFiles              # Files/ directory path
$adtSession.DirSupportFiles       # SupportFiles/ directory path
$adtSession.ScriptDirectory       # Script root directory

# Logging
$adtSession.LogName               # Log file name
$adtSession.LogTempFolder         # Temporary log folder (when CompressLogs enabled)

# State
$adtSession.IsAdmin               # Running with admin rights
$adtSession.IsSystemAccount       # Running as SYSTEM
$adtSession.RunAsActiveUser       # Username when running as SYSTEM

# Zero-Config MSI (when AppName is empty)
$adtSession.UseDefaultMsi         # Boolean: Using zero-config mode
$adtSession.DefaultMsiFile        # Detected MSI file path
$adtSession.DefaultMstFile        # Detected MST transform path
$adtSession.DefaultMspFiles       # Array of detected MSP files
```

## Environment Variables

Environment variables become available after `Open-ADTSession` (or after calling `Export-ADTEnvironmentTableToSessionState`).

### System Information

```powershell
$envComputerName                  # Computer name
$envComputerNameFQDN              # Fully qualified domain name
$envUserName                      # Current username
$envUserDomain                    # User's domain
$envOSName                        # OS name (e.g., "Microsoft Windows 11 Pro")
$envOSVersion                     # OS version object
$envOSVersionMajor                # Major version (10 for Win10/11)
$envOSVersionMinor                # Minor version
$envOSVersionBuild                # Build number (e.g., 22631)
$envOSArchitecture                # 32-bit or 64-bit
```

### Architecture Detection

```powershell
$Is64Bit                          # Boolean: 64-bit OS
$Is64BitProcess                   # Boolean: 64-bit PowerShell process
$envProcessorArchitecture         # x86, AMD64, or ARM64
```

### Common Paths

```powershell
# System paths
$envSystemRoot                    # Windows directory (C:\Windows)
$envProgramFiles                  # Program Files (64-bit on 64-bit OS)
$envProgramFilesX86               # Program Files (x86)
$envCommonProgramFiles            # Common Files
$envCommonProgramFilesX86         # Common Files (x86)
$envProgramData                   # C:\ProgramData
$envTemp                          # System temp directory
$envWinDir                        # Windows directory

# User paths
$envUserProfile                   # User profile (C:\Users\username)
$envAppData                       # Roaming AppData
$envLocalAppData                  # Local AppData
$envUserDesktop                   # User's Desktop
$envUserDocuments                 # User's Documents

# Public paths
$envPublic                        # C:\Users\Public
$envCommonDesktop                 # Public Desktop (shortcuts for all users)
$envCommonStartMenuPrograms       # All Users Start Menu\Programs
$envCommonStartMenu               # All Users Start Menu
$envCommonStartup                 # All Users Startup folder
```

### Registry Paths

```powershell
# Pre-formatted registry paths
$regKeyLMSoftware                 # HKLM:\SOFTWARE
$regKeyLMSoftwareWow6432Node      # HKLM:\SOFTWARE\WOW6432Node (on 64-bit)
$regKeyCUSoftware                 # HKCU:\SOFTWARE
```

## Usage Examples

### Architecture-Aware Installation

```powershell
# Select installer based on architecture
if ($Is64Bit) {
    $installerFile = 'setup_x64.exe'
} else {
    $installerFile = 'setup_x86.exe'
}

Start-ADTProcess -FilePath $installerFile -ArgumentList '/S'
```

### Deploy Mode Handling

```powershell
# Different behavior based on deploy mode
if ($adtSession.DeployMode -ne 'Silent') {
    Show-ADTInstallationPrompt -Message 'Installation complete!' -ButtonRightText 'OK' -Icon Information -NoWait
}
```

### Windows Version Checks

```powershell
# Windows 11 detection (build 22000+)
if ($envOSVersionBuild -ge 22000) {
    Write-ADTLogEntry 'Running on Windows 11'
    # Apply Windows 11 specific settings
}

# Windows 10 feature update check
if ($envOSVersionBuild -ge 19041) {
    # Windows 10 2004 or later
}
```

### Context-Aware File Paths

```powershell
# Determine config location based on context
if ($adtSession.IsSystemAccount) {
    # Machine-wide config
    $configPath = "$envProgramData\MyApp\config.xml"
} else {
    # Per-user config
    $configPath = "$envLocalAppData\MyApp\config.xml"
}

# Use session directory properties
$installer = Join-Path $adtSession.DirFiles 'setup.exe'
$supportFile = Join-Path $adtSession.DirSupportFiles 'settings.reg'
```

### Creating Shortcuts

```powershell
# Desktop shortcut for all users
New-ADTShortcut -Path "$envCommonDesktop\MyApp.lnk" -TargetPath "$envProgramFiles\MyApp\myapp.exe"

# Start menu shortcut
New-ADTShortcut -Path "$envCommonStartMenuPrograms\MyApp\MyApp.lnk" -TargetPath "$envProgramFiles\MyApp\myapp.exe"
```

### Logging Context Information

```powershell
# Log deployment context at start (good practice)
Write-ADTLogEntry -Message "=== Deployment Context ==="
Write-ADTLogEntry -Message "Computer: $envComputerName"
Write-ADTLogEntry -Message "OS: $envOSName (Build $envOSVersionBuild)"
Write-ADTLogEntry -Message "Architecture: $envOSArchitecture"
Write-ADTLogEntry -Message "User: $envUserName"
Write-ADTLogEntry -Message "IsAdmin: $($adtSession.IsAdmin)"
Write-ADTLogEntry -Message "IsSystem: $($adtSession.IsSystemAccount)"
Write-ADTLogEntry -Message "DeployMode: $($adtSession.DeployMode)"
Write-ADTLogEntry -Message "DeploymentType: $($adtSession.DeploymentType)"
```

## Best Practices

1. **Use `$adtSession.DirFiles`** instead of hardcoding `"$PSScriptRoot\Files"`
2. **Check architecture** before selecting x86 vs x64 installers
3. **Use environment variables** for system paths rather than hardcoding
4. **Log context** at deployment start for troubleshooting
5. **Handle both SYSTEM and user context** appropriately
6. **Use `AppProcessesToClose`** (v4.1) instead of repeating process lists
7. **Set `RequireAdmin`** (v4.1) in session instead of config file
