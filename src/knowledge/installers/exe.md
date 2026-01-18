---
title: "EXE Installer Guide"
id: "kb-installers-exe"
psadt_target: "4.1.8"
last_updated: "2025-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/V4Assets/PSAppDeployToolkit"
tags: ["exe", "installers", "guide", "inno-setup", "nsis", "installshield", "v4.1.8"]
---

# EXE Installer Guide

EXE installers are the most common format for Windows application installation. Unlike MSI, there's no standard format - each EXE may use different technologies with different silent arguments.

## Common Installer Types

### Inno Setup

**Identification**:
- File description contains "Inno Setup"
- Temp folder created: `%TEMP%\is-*`
- Registry: Check for Inno Setup entries

**Silent Arguments**:
```powershell
# Very silent (no UI at all)
/VERYSILENT /SUPPRESSMSGBOXES /NORESTART

# Silent with progress bar
/SILENT /NORESTART

# With logging
/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /LOG="C:\Logs\install.log"

# Custom install directory
/VERYSILENT /SUPPRESSMSGBOXES /DIR="C:\MyApp"

# No icons
/VERYSILENT /SUPPRESSMSGBOXES /NOICONS

# Specific tasks
/VERYSILENT /SUPPRESSMSGBOXES /TASKS="desktopicon,quicklaunchicon"
```

**PSADT Example**:
```powershell
Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" `
    -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS'
```

### NSIS (Nullsoft)

**Identification**:
- File description contains "Nullsoft" or "NSIS"
- Resources contain "NSIS" strings
- Temp folder: `%TEMP%\nst*` or `%TEMP%\nsb*`

**Silent Arguments**:
```powershell
# Silent
/S

# With install directory
/S /D=C:\MyApp

# Note: /D must be last parameter and without quotes even if path has spaces
```

**PSADT Example**:
```powershell
Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" `
    -ArgumentList '/S'
```

### InstallShield

**Identification**:
- File description mentions "InstallShield"
- Setup.exe with setup.iss or setup.ini
- May extract to temp folder with InstallShield files

**Silent Arguments**:
```powershell
# Basic silent (InstallShield 2015+)
/s /v"/qn"

# With logging
/s /v"/qn /l*v C:\Logs\install.log"

# Response file
/s /f1"setup.iss"

# With MSI properties
/s /v"/qn INSTALLDIR=\"C:\MyApp\" REBOOT=ReallySuppress"
```

**PSADT Example**:
```powershell
# Modern InstallShield
Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" `
    -ArgumentList '/s /v"/qn REBOOT=ReallySuppress"'

# With response file
Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" `
    -ArgumentList "/s /f1`"$($adtSession.DirFiles)\setup.iss`""
```

### WiX Burn

**Identification**:
- Bootstrapper that installs multiple MSIs
- Often shows chained installations

**Silent Arguments**:
```powershell
# Silent
/quiet /norestart

# With logging
/quiet /norestart /log "C:\Logs\install.log"

# Passive (progress UI only)
/passive /norestart
```

**PSADT Example**:
```powershell
Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" `
    -ArgumentList '/quiet /norestart'
```

### Advanced Installer

**Silent Arguments**:
```powershell
# Silent
/exenoui /qn

# With logging
/exenoui /qn /l*v "C:\Logs\install.log"
```

### ClickOnce

Not recommended for enterprise deployment. If required:
- Extract with `/layout` parameter
- Deploy extracted files
- Consider repackaging as MSI

### Squirrel

Used by Electron apps (e.g., Slack, Discord):
```powershell
# Silent install (usually auto-updates)
--silent

# Specific version
-s
```

### Actual Installer

```powershell
# Silent
/S

# Uninstall
/U /S
```

## Detection Methods

### Identifying Unknown Installers

1. **Check file properties**:
```powershell
$file = Get-Item "setup.exe"
$versionInfo = $file.VersionInfo
$versionInfo.FileDescription
$versionInfo.ProductName
$versionInfo.CompanyName
```

2. **Extract and inspect**:
```powershell
# Many EXEs are self-extracting archives
# Try 7-Zip to extract and inspect
& "C:\Program Files\7-Zip\7z.exe" x setup.exe -oextracted
```

3. **Run with /? or --help**:
```cmd
setup.exe /?
setup.exe /help
setup.exe --help
setup.exe -h
```

4. **Check online resources**:
- Silent Install HQ (silentinstallhq.com)
- Winget manifests (github.com/microsoft/winget-pkgs)
- Vendor documentation

## Universal Arguments to Try

When installer type is unknown, try these in order:

```powershell
# Try these arguments (most common silent flags)
$silentArgs = @(
    '/S',                                    # NSIS
    '/s',                                    # Various
    '/silent',                               # Various
    '/quiet',                                # WiX, various
    '-s',                                    # Various
    '-silent',                               # Various
    '/VERYSILENT /SUPPRESSMSGBOXES',         # Inno Setup
    '/qn',                                   # MSI wrapper
    '--silent',                              # Electron/Squirrel
    '-q'                                     # Various
)
```

## PSADT Best Practices for EXE

### Handle Unknown Exit Codes

```powershell
$result = Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" `
    -ArgumentList '/S' `
    -PassThru

switch ($result.ExitCode) {
    0 { Write-ADTLogEntry -Message "Installation successful" }
    1 { Write-ADTLogEntry -Message "Installation completed with warnings" -Severity 2 }
    3010 { Write-ADTLogEntry -Message "Restart required" -Severity 2 }
    default {
        throw "Installation failed with exit code: $($result.ExitCode)"
    }
}
```

### Wait for Child Processes

Some installers spawn child processes:

```powershell
Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" `
    -ArgumentList '/S' `
    -WaitForMsiExec  # Wait if MSI operations are triggered

# Or manually wait for a specific process
Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" -ArgumentList '/S'
do {
    Start-Sleep -Seconds 2
    $installer = Get-Process -Name 'installer_child' -ErrorAction SilentlyContinue
} while ($installer)
```

### Handle Wrapped MSI

Many EXE installers are MSI wrappers:

```powershell
# Check if it's extracting to temp
Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" `
    -ArgumentList '/s /v"/qn REBOOT=ReallySuppress"'

# Or extract first
Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" `
    -ArgumentList '/extract /a'
# Then find and install the MSI
$msi = Get-ChildItem -Path "$env:TEMP" -Filter "*.msi" -Recurse | Select-Object -First 1
Start-ADTMsiProcess -Action Install -Path $msi.FullName
```

## Uninstall Methods

### Registry-Based Uninstall

```powershell
# Find uninstall command
$app = Get-ADTApplication -Name 'Application Name'
$uninstallString = $app.UninstallString

# Parse and execute
if ($uninstallString -match 'msiexec') {
    # MSI uninstall
    $productCode = [regex]::Match($uninstallString, '\{[A-F0-9-]+\}').Value
    Start-ADTMsiProcess -Action Uninstall -Path $productCode
} else {
    # EXE uninstall
    $uninstallPath = $uninstallString -replace '"', ''
    Start-ADTProcess -FilePath $uninstallPath -ArgumentList '/S'
}
```

### Common Uninstall Arguments

| Installer Type | Uninstall Arguments |
|----------------|---------------------|
| Inno Setup | `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART` |
| NSIS | `/S` |
| InstallShield | `/s /v"/qn"` or response file |
| WiX Burn | `/uninstall /quiet /norestart` |

### Uninstall with Cleanup

```powershell
# Uninstall application
$app = Get-ADTApplication -Name 'Application Name'
if ($app.UninstallString) {
    # Execute uninstall
    $uninstallPath = ($app.UninstallString -split ' ')[0] -replace '"', ''
    Start-ADTProcess -FilePath $uninstallPath -ArgumentList '/S'
}

# Clean up remaining files
Remove-ADTFolder -Path "$env:ProgramFiles\Application" -ContinueOnError
Remove-ADTFolder -Path "$env:ProgramData\Application" -ContinueOnError
Remove-ADTRegistryKey -Key 'HKLM:\SOFTWARE\Application' -Recurse -ContinueOnError
```

## Complete PSADT v4.1.8 Example

```powershell
#Requires -Version 5.1

[CmdletBinding()]
param (
    [ValidateSet('Install', 'Uninstall', 'Repair')]
    [string]$DeploymentType = 'Install',
    [ValidateSet('Interactive', 'Silent', 'NonInteractive')]
    [string]$DeployMode = 'Interactive',
    [switch]$AllowRebootPassThru,
    [switch]$TerminalServerMode,
    [switch]$DisableLogging
)

# Session configuration
$adtSession = @{
    AppVendor = 'Publisher'
    AppName = 'Application Name'
    AppVersion = '1.0.0'
    AppArch = 'x64'
    AppLang = 'EN'
    AppRevision = '01'
    AppSuccessExitCodes = @(0)
    AppRebootExitCodes = @(1641, 3010)
    AppProcessesToClose = @(@{ Name = 'appname'; Description = 'Application Name' })
    AppScriptVersion = '1.0.0'
    AppScriptDate = (Get-Date -Format 'yyyy-MM-dd')
    AppScriptAuthor = 'IT Admin'
    RequireAdmin = $true
}

# Initialize
$ErrorActionPreference = [System.Management.Automation.ActionPreference]::Stop
try {
    Import-Module -FullyQualifiedName @{ ModuleName = "$PSScriptRoot\PSAppDeployToolkit\PSAppDeployToolkit.psd1"; Guid = '8c3c366b-8606-4576-9f2d-4051144f7ca2'; ModuleVersion = '4.1.8' } -Force
    $iadtParams = Get-ADTBoundParametersAndDefaultValues -Invocation $MyInvocation
    $adtSession = Open-ADTSession @adtSession @iadtParams -PassThru
}
catch {
    $Host.UI.WriteErrorLine((Out-String -InputObject $_ -Width ([System.Int32]::MaxValue)))
    exit 60008
}

# Deployment functions
function Install-ADTDeployment {
    [CmdletBinding()]
    param()

    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"
    Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -CloseProcessesCountdown 300
    Show-ADTInstallationProgress

    # Check for existing installation
    $existing = Get-ADTApplication -Name 'Application Name'
    if ($existing) {
        Write-ADTLogEntry -Message "Removing existing version: $($existing.DisplayVersion)"
        $uninstallPath = ($existing.UninstallString -split ' ')[0] -replace '"', ''
        if (Test-Path $uninstallPath) {
            Start-ADTProcess -FilePath $uninstallPath -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART'
        }
    }

    $adtSession.InstallPhase = $adtSession.DeploymentType
    # Inno Setup installer
    Start-ADTProcess -FilePath "$($adtSession.DirFiles)\setup.exe" -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS'

    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"
    # Verify installation
    $installed = Get-ADTApplication -Name 'Application Name'
    if (-not $installed) {
        throw "Installation verification failed"
    }
    Write-ADTLogEntry -Message "Successfully installed version: $($installed.DisplayVersion)"

    # Post-installation configuration
    Copy-ADTFile -Path "$($adtSession.DirFiles)\config.xml" -Destination "$env:ProgramFiles\Application\config.xml"
}

function Uninstall-ADTDeployment {
    [CmdletBinding()]
    param()

    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"
    Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose
    Show-ADTInstallationProgress

    $adtSession.InstallPhase = $adtSession.DeploymentType
    $app = Get-ADTApplication -Name 'Application Name'
    if ($app) {
        $uninstallPath = ($app.UninstallString -split ' ')[0] -replace '"', ''
        Start-ADTProcess -FilePath $uninstallPath -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART'
    }

    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"
    Remove-ADTFolder -Path "$env:ProgramFiles\Application" -ContinueOnError
    Remove-ADTFolder -Path "$env:LocalAppData\Application" -ContinueOnError
}

function Repair-ADTDeployment {
    [CmdletBinding()]
    param()
    Write-ADTLogEntry -Message "Repair requested - performing reinstall"
    Uninstall-ADTDeployment
    Install-ADTDeployment
}

# Invoke deployment
try {
    & "$($adtSession.DeploymentType)-ADTDeployment"
    Close-ADTSession
}
catch {
    Write-ADTLogEntry -Message "Unhandled error: $(Resolve-ADTErrorRecord -ErrorRecord $_)" -Severity 3
    Close-ADTSession -ExitCode 60001
}
```

## Troubleshooting

### Silent Install Not Working

1. **Verify installer type** - Wrong arguments for installer type
2. **Check for UAC prompts** - May need to run elevated
3. **Look for pop-ups** - Some installers have uncloseable dialogs
4. **Check prerequisites** - Missing runtime dependencies
5. **Try response file** - Create via recorded installation

### Creating Response Files

For InstallShield:
```cmd
setup.exe /r /f1"C:\setup.iss"
```
This records your choices to setup.iss, then use:
```cmd
setup.exe /s /f1"C:\setup.iss"
```

For Inno Setup - use INF file:
```ini
[Setup]
Lang=en
Dir=C:\Program Files\MyApp
Group=MyApp
NoIcons=0
Tasks=desktopicon
```

### Finding Exit Codes

Check vendor documentation or test installation:
```powershell
$process = Start-Process -FilePath "setup.exe" -ArgumentList "/S" -Wait -PassThru
$process.ExitCode
```
