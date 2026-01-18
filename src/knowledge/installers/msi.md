---
title: "MSI Packaging Guide"
id: "kb-installers-msi"
psadt_target: "4.1.8"
last_updated: "2025-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/V4Assets/PSAppDeployToolkit"
tags: ["msi", "installers", "guide", "windows-installer", "v4.1.8"]
---

# MSI Packaging Guide

Windows Installer (MSI) packages are the most standardized installer format for Windows applications. This guide covers best practices for packaging MSI-based applications with PSADT.

## MSI Basics

### What is MSI?

MSI (Microsoft Installer) is a database-driven installation technology that provides:
- Transactional installs (rollback on failure)
- Built-in repair functionality
- Standardized uninstall
- Windows Installer logging
- Group Policy deployment support

### MSI Components

- **Product Code**: GUID identifying the product
- **Package Code**: GUID identifying the MSI file
- **Upgrade Code**: GUID for upgrade relationships
- **Features**: Installable components
- **Properties**: Installation parameters

## Silent Installation

### Standard Silent Arguments

```powershell
# Basic silent install
msiexec.exe /i "app.msi" /qn

# Silent with no restart
msiexec.exe /i "app.msi" /qn /norestart

# Silent with logging
msiexec.exe /i "app.msi" /qn /l*v "C:\Logs\install.log"

# Silent with suppress reboot
msiexec.exe /i "app.msi" /qn REBOOT=ReallySuppress
```

### MSI Arguments Reference

| Argument | Description |
|----------|-------------|
| `/i` | Install |
| `/x` | Uninstall |
| `/a` | Administrative install |
| `/j` | Advertise |
| `/f` | Repair |
| `/qn` | No UI (completely silent) |
| `/qb` | Basic UI (progress bar) |
| `/qr` | Reduced UI |
| `/qf` | Full UI |
| `/norestart` | Suppress restart |
| `/l*v` | Verbose logging |

### Common Properties

| Property | Description | Example |
|----------|-------------|---------|
| `ALLUSERS` | Install for all users | `ALLUSERS=1` |
| `INSTALLDIR` | Installation directory | `INSTALLDIR="C:\MyApp"` |
| `REBOOT` | Reboot behavior | `REBOOT=ReallySuppress` |
| `ADDLOCAL` | Features to install | `ADDLOCAL=ALL` |
| `REMOVE` | Features to remove | `REMOVE=Feature1` |
| `TRANSFORMS` | Transform file | `TRANSFORMS=custom.mst` |

## PSADT Integration

### Basic MSI Install

```powershell
# Using Start-ADTMsiProcess
Start-ADTMsiProcess -Action Install -Path "$($adtSession.DirFiles)\app.msi"

# With properties
Start-ADTMsiProcess -Action Install -Path "$($adtSession.DirFiles)\app.msi" `
    -Parameters 'ALLUSERS=1 INSTALLDIR="C:\CustomPath"'
```

### With Transform File

Transform files (.mst) customize MSI behavior without modifying the original:

```powershell
Start-ADTMsiProcess -Action Install -Path "$($adtSession.DirFiles)\app.msi" `
    -Transform "$($adtSession.DirFiles)\custom.mst"
```

### With Patch File

```powershell
Start-ADTMsiProcess -Action Patch -Path "$($adtSession.DirFiles)\app.msi" `
    -Patch "$($adtSession.DirFiles)\update.msp"
```

### Repair

```powershell
Start-ADTMsiProcess -Action Repair -Path "$($adtSession.DirFiles)\app.msi"
```

### Uninstall by Product Code

```powershell
# Direct uninstall
Start-ADTMsiProcess -Action Uninstall -Path '{12345678-1234-1234-1234-123456789012}'

# Or find and uninstall
$app = Get-ADTApplication -Name 'Application Name'
if ($app) {
    Start-ADTMsiProcess -Action Uninstall -Path $app.ProductCode
}
```

## Finding Product Information

### From Installed Application

```powershell
# Get product code from registry
$app = Get-ADTApplication -Name 'Application Name' -Exact
$app.ProductCode    # {GUID}
$app.UninstallString
```

### From MSI File

Using PowerShell:

```powershell
function Get-MsiProperty {
    param([string]$Path, [string]$Property)

    $installer = New-Object -ComObject WindowsInstaller.Installer
    $database = $installer.GetType().InvokeMember(
        'OpenDatabase', 'InvokeMethod', $null, $installer, @($Path, 0)
    )

    $query = "SELECT Value FROM Property WHERE Property = '$Property'"
    $view = $database.GetType().InvokeMember('OpenView', 'InvokeMethod', $null, $database, $query)
    $view.GetType().InvokeMember('Execute', 'InvokeMethod', $null, $view, $null)

    $record = $view.GetType().InvokeMember('Fetch', 'InvokeMethod', $null, $view, $null)
    $value = $record.GetType().InvokeMember('StringData', 'InvokeProperty', $null, $record, 1)

    return $value
}

$productCode = Get-MsiProperty -Path 'app.msi' -Property 'ProductCode'
$productName = Get-MsiProperty -Path 'app.msi' -Property 'ProductName'
$productVersion = Get-MsiProperty -Path 'app.msi' -Property 'ProductVersion'
```

Using Orca (MSI editor) or command line:

```cmd
msiexec /i app.msi /qn /l*v install.log
# Then search log for "Product Code" or "ProductName"
```

## Logging

### Enable Verbose Logging

```powershell
Start-ADTMsiProcess -Action Install -Path "$($adtSession.DirFiles)\app.msi" `
    -LoggingOptions '/l*v'
```

Log is created at: `C:\Windows\Logs\Software\{AppName}_{Version}_Install.log`

### Custom Log Location

```powershell
# Using msiexec directly
Start-ADTProcess -FilePath 'msiexec.exe' `
    -ArgumentList "/i `"$($adtSession.DirFiles)\app.msi`" /qn /l*v `"C:\Logs\MyApp_Install.log`""
```

### Log File Flags

| Flag | Description |
|------|-------------|
| `i` | Status messages |
| `w` | Non-fatal warnings |
| `e` | All error messages |
| `a` | Start of actions |
| `r` | Action-specific records |
| `u` | User requests |
| `c` | Initial UI parameters |
| `m` | Out-of-memory or fatal exit |
| `o` | Out-of-disk-space messages |
| `p` | Terminal properties |
| `v` | Verbose output |
| `x` | Extra debugging info |
| `*` | All information except v and x |

## Detection Methods

### By Product Code (Recommended)

```powershell
# In Intune detection script
$productCode = '{12345678-1234-1234-1234-123456789012}'
$app = Get-WmiObject -Class Win32_Product | Where-Object { $_.IdentifyingNumber -eq $productCode }
if ($app) {
    Write-Output "Detected"
    exit 0
}
exit 1
```

### By Registry

```powershell
$regPaths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)

$app = Get-ItemProperty -Path $regPaths | Where-Object {
    $_.DisplayName -eq 'Application Name' -and
    $_.DisplayVersion -ge '1.0.0'
}

if ($app) {
    Write-Output "Detected"
    exit 0
}
exit 1
```

## Upgrade Scenarios

### In-Place Upgrade

If MSI supports upgrade (same UpgradeCode):

```powershell
# Just install new version - old will be removed
Start-ADTMsiProcess -Action Install -Path "$($adtSession.DirFiles)\app_v2.msi"
```

### Manual Upgrade

```powershell
# Remove old version first
$oldApp = Get-ADTApplication -Name 'Application Name'
if ($oldApp) {
    Write-ADTLogEntry -Message "Removing previous version: $($oldApp.DisplayVersion)"
    Start-ADTMsiProcess -Action Uninstall -Path $oldApp.ProductCode
}

# Install new version
Start-ADTMsiProcess -Action Install -Path "$($adtSession.DirFiles)\app.msi"
```

## Troubleshooting

### Common Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1603 | Fatal error during installation |
| 1618 | Another installation in progress |
| 1619 | Package could not be opened |
| 1620 | Package path invalid |
| 1625 | Installation prohibited by policy |
| 1638 | Another version already installed |
| 1641 | Restart initiated |
| 3010 | Restart required |

### Debugging 1603 Errors

1. Enable verbose logging
2. Search log for "Return value 3"
3. Look for the action before the failure
4. Common causes:
   - Missing prerequisites
   - Insufficient permissions
   - File in use
   - Disk space

### MSI Mutex Issues

If getting 1618 (another install in progress):

```powershell
# Wait for other MSI operations
Start-ADTMsiProcess -Action Install -Path "$($adtSession.DirFiles)\app.msi" -WaitForMsiExec
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

$productCode = '{12345678-1234-1234-1234-123456789012}'

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

    # Remove previous version if different product code
    $existing = Get-ADTApplication -Name 'Application Name'
    if ($existing -and $existing.ProductCode -ne $productCode) {
        Write-ADTLogEntry -Message "Removing old version: $($existing.DisplayVersion)"
        Start-ADTMsiProcess -Action Uninstall -ProductCode $existing.ProductCode
    }

    $adtSession.InstallPhase = $adtSession.DeploymentType
    Start-ADTMsiProcess -Action Install -FilePath "$($adtSession.DirFiles)\app.msi" -AdditionalArgumentList 'ALLUSERS=1 REBOOT=ReallySuppress'

    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"
    # Verify installation
    $installed = Get-ADTApplication -ProductCode $productCode
    if (-not $installed) {
        throw "Installation verification failed"
    }
}

function Uninstall-ADTDeployment {
    [CmdletBinding()]
    param()

    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"
    Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose
    Show-ADTInstallationProgress

    $adtSession.InstallPhase = $adtSession.DeploymentType
    Start-ADTMsiProcess -Action Uninstall -ProductCode $productCode
}

function Repair-ADTDeployment {
    [CmdletBinding()]
    param()

    $adtSession.InstallPhase = $adtSession.DeploymentType
    Start-ADTMsiProcess -Action Repair -ProductCode $productCode
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
