---
title: "PSADT v3 to v4 Migration Guide"
id: "psadt-migration"
psadt_target: "4.1.7"
last_updated: "2025-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/V4Assets/PSAppDeployToolkit"
tags: ["psadt", "migration", "v3", "v4", "v4.1.7", "upgrade"]
---

# PSADT v3 to v4 Migration Guide

This guide helps you migrate existing PSADT v3 scripts to the v4 module-based architecture.

## Key Changes Overview

| Aspect | v3 | v4.1.7 |
|--------|----|----|
| Architecture | Single script with dot-sourced functions | PowerShell module (GUID: `8c3c366b-8606-4576-9f2d-4051144f7ca2`) |
| Main script | `Deploy-Application.ps1` | `Invoke-AppDeployToolkit.ps1` |
| Function naming | No prefix | `ADT` prefix (e.g., `Show-ADTInstallationWelcome`) |
| State management | Global variables (`$appName`, `$appVendor`) | `$adtSession` hashtable/object |
| Initialization | Set variables at top of script | `Open-ADTSession` with hashtable splatting |
| Completion | Direct exit or `Exit-Script` | `Close-ADTSession` |
| Deployment structure | If/ElseIf blocks | Function-based (`Install-ADTDeployment`, etc.) |
| Config format | XML | PSD1 (PowerShell data files) |
| UI Style | Classic only | Fluent (default) + Classic |
| Error handling | Manual try/catch | Structured with `Resolve-ADTErrorRecord` |

## Function Name Mapping

### Core Functions

| v3 Function | v4 Function |
|-------------|-------------|
| `Execute-Process` | `Start-ADTProcess` |
| `Execute-ProcessAsUser` | `Start-ADTProcessAsUser` |
| `Execute-MSI` | `Start-ADTMsiProcess` |
| `Show-InstallationWelcome` | `Show-ADTInstallationWelcome` |
| `Show-InstallationProgress` | `Show-ADTInstallationProgress` |
| `Close-InstallationProgress` | `Close-ADTInstallationProgress` |
| `Show-InstallationRestartPrompt` | `Show-ADTInstallationRestartPrompt` |
| `Show-BalloonTip` | `Show-ADTBalloonTip` |
| `Exit-Script` | `Close-ADTSession` |

### File Operations

| v3 Function | v4 Function |
|-------------|-------------|
| `Copy-File` | `Copy-ADTFile` |
| `Remove-File` | `Remove-ADTFile` |
| `New-Folder` | `New-ADTFolder` |
| `Remove-Folder` | `Remove-ADTFolder` |
| `Get-FileVersion` | `Get-ADTFileVersion` |

### Registry Operations

| v3 Function | v4 Function |
|-------------|-------------|
| `Set-RegistryKey` | `Set-ADTRegistryKey` |
| `Remove-RegistryKey` | `Remove-ADTRegistryKey` |
| `Get-RegistryKey` | `Get-ADTRegistryKey` |

### Shortcut Operations

| v3 Function | v4 Function |
|-------------|-------------|
| `New-Shortcut` | `New-ADTShortcut` |
| `Set-Shortcut` | `Set-ADTShortcut` |
| `Get-Shortcut` | `Get-ADTShortcut` |

### Application Management

| v3 Function | v4 Function |
|-------------|-------------|
| `Get-InstalledApplication` | `Get-ADTApplication` |
| `Remove-MSIApplications` | `Uninstall-ADTApplication` |
| `Get-RunningProcesses` | `Get-ADTRunningProcesses` |
| `Block-AppExecution` | `Block-ADTAppExecution` |
| `Unblock-AppExecution` | `Unblock-ADTAppExecution` |

### Logging

| v3 Function | v4 Function |
|-------------|-------------|
| `Write-Log` | `Write-ADTLogEntry` |

### Utility Functions

| v3 Function | v4 Function |
|-------------|-------------|
| `Test-Battery` | `Test-ADTBattery` |
| `Test-NetworkConnection` | `Test-ADTNetworkConnection` |
| `Test-PowerPoint` | `Test-ADTPowerPoint` |
| `Get-DiskSpace` | `Get-ADTFreeDiskSpace` |
| `Get-FreeDiskSpace` | `Get-ADTFreeDiskSpace` |
| `Convert-RegistryPath` | `Convert-ADTRegistryPath` |

## Script Structure Migration

### v3 Script Structure

```powershell
##*===============================================
##* VARIABLE DECLARATION
##*===============================================
[string]$appVendor = 'Company'
[string]$appName = 'Application'
[string]$appVersion = '1.0.0'
[string]$appArch = 'x64'
[string]$appLang = 'EN'
[string]$appRevision = '01'
[string]$appScriptVersion = '1.0.0'
[string]$appScriptDate = '2024-01-01'
[string]$appScriptAuthor = 'Admin'
$deploymentType = 'Install'
$deployMode = 'Interactive'

##*===============================================
##* PRE-INSTALLATION
##*===============================================
If ($deploymentType -ieq 'Install') {
    Show-InstallationWelcome -CloseApps 'app1,app2' -AllowDefer

    Show-InstallationProgress

    ##*===============================================
    ##* INSTALLATION
    ##*===============================================

    Execute-Process -Path "$dirFiles\setup.exe" -Parameters '/S'

    ##*===============================================
    ##* POST-INSTALLATION
    ##*===============================================

    Copy-File -Path "$dirFiles\config.xml" -Destination "$envProgramData\App\config.xml"
}
ElseIf ($deploymentType -ieq 'Uninstall') {
    Show-InstallationWelcome -CloseApps 'app1,app2'
    Execute-Process -Path "$envProgramFiles\App\uninstall.exe" -Parameters '/S'
}
```

### v4.1.7 Script Structure

```powershell
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('Install', 'Uninstall', 'Repair')]
    [System.String]$DeploymentType,

    [Parameter(Mandatory = $false)]
    [ValidateSet('Auto', 'Interactive', 'NonInteractive', 'Silent')]
    [System.String]$DeployMode,

    [Parameter(Mandatory = $false)]
    [System.Management.Automation.SwitchParameter]$SuppressRebootPassThru,

    [Parameter(Mandatory = $false)]
    [System.Management.Automation.SwitchParameter]$TerminalServerMode,

    [Parameter(Mandatory = $false)]
    [System.Management.Automation.SwitchParameter]$DisableLogging
)

# Session hashtable (becomes object after Open-ADTSession)
$adtSession = @{
    AppVendor = 'Company'
    AppName = 'Application'
    AppVersion = '1.0.0'
    AppArch = 'x64'
    AppLang = 'EN'
    AppRevision = '01'
    AppSuccessExitCodes = @(0)
    AppRebootExitCodes = @(1641, 3010)
    AppProcessesToClose = @(@{ Name = 'app1'; Description = 'Application 1' }, @{ Name = 'app2'; Description = 'Application 2' })
    AppScriptVersion = '1.0.0'
    AppScriptDate = '2025-01-01'
    AppScriptAuthor = 'Admin'
    RequireAdmin = $true
    DeployAppScriptFriendlyName = $MyInvocation.MyCommand.Name
    DeployAppScriptParameters = $PSBoundParameters
    DeployAppScriptVersion = '4.1.7'
}

# Deployment functions
function Install-ADTDeployment {
    [CmdletBinding()]
    param()

    # Pre-Install
    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"
    $saiwParams = @{
        AllowDefer = $true
        DeferTimes = 3
        CheckDiskSpace = $true
        PersistPrompt = $true
    }
    if ($adtSession.AppProcessesToClose.Count -gt 0) {
        $saiwParams.Add('CloseProcesses', $adtSession.AppProcessesToClose)
    }
    Show-ADTInstallationWelcome @saiwParams
    Show-ADTInstallationProgress

    # Install
    $adtSession.InstallPhase = $adtSession.DeploymentType
    Start-ADTProcess -FilePath (Join-Path $adtSession.DirFiles 'setup.exe') -ArgumentList '/S'

    # Post-Install
    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"
    Copy-ADTFile -Path (Join-Path $adtSession.DirFiles 'config.xml') -Destination "$envProgramData\App\config.xml"
}

function Uninstall-ADTDeployment {
    [CmdletBinding()]
    param()

    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"
    if ($adtSession.AppProcessesToClose.Count -gt 0) {
        Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -CloseProcessesCountdown 60
    }
    Show-ADTInstallationProgress

    $adtSession.InstallPhase = $adtSession.DeploymentType
    Start-ADTProcess -FilePath "$envProgramFiles\App\uninstall.exe" -ArgumentList '/S'

    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"
}

function Repair-ADTDeployment {
    [CmdletBinding()]
    param()
    # Repair logic here
}

# Initialization
$ErrorActionPreference = [System.Management.Automation.ActionPreference]::Stop
$ProgressPreference = [System.Management.Automation.ActionPreference]::SilentlyContinue
Set-StrictMode -Version 1

try {
    Import-Module -FullyQualifiedName @{ ModuleName = 'PSAppDeployToolkit'; Guid = '8c3c366b-8606-4576-9f2d-4051144f7ca2'; ModuleVersion = '4.1.7' } -Force
    $iadtParams = Get-ADTBoundParametersAndDefaultValues -Invocation $MyInvocation
    $adtSession = Remove-ADTHashtableNullOrEmptyValues -Hashtable $adtSession
    $adtSession = Open-ADTSession @adtSession @iadtParams -PassThru
}
catch {
    $Host.UI.WriteErrorLine((Out-String -InputObject $_ -Width ([System.Int32]::MaxValue)))
    exit 60008
}

# Invocation
try {
    & "$($adtSession.DeploymentType)-ADTDeployment"
    Close-ADTSession
}
catch {
    Write-ADTLogEntry -Message "Unhandled error: $(Resolve-ADTErrorRecord -ErrorRecord $_)" -Severity 3
    Close-ADTSession -ExitCode 60001
}
```

## Variable Migration

### v3 Variables to v4.1.7 Equivalents

| v3 Variable | v4.1.7 Equivalent |
|-------------|---------------|
| `$appVendor` | `$adtSession.AppVendor` |
| `$appName` | `$adtSession.AppName` |
| `$appVersion` | `$adtSession.AppVersion` |
| `$deploymentType` | `$adtSession.DeploymentType` |
| `$deployMode` | `$adtSession.DeployMode` |
| `$dirFiles` | `$adtSession.DirFiles` |
| `$dirSupportFiles` | `$adtSession.DirSupportFiles` |
| `$scriptDirectory` | `$adtSession.ScriptDirectory` |
| `$logName` | `$adtSession.LogName` |
| `$installPhase` | `$adtSession.InstallPhase` |
| `$installTitle` | `$adtSession.InstallTitle` |
| `$installName` | `$adtSession.InstallName` |

Note: In v4.1.7, the session variable is lowercase `$adtSession` (not `$ADTSession`).

## Common Migration Tasks

### 1. Update Function Calls

Find and replace all function calls with their v4 equivalents:

```powershell
# v3
Execute-Process -Path "setup.exe" -Parameters "/S"

# v4
Start-ADTProcess -FilePath "setup.exe" -ArgumentList "/S"
```

Note: `-Parameters` changed to `-ArgumentList` in v4.

### 2. Update Path References

```powershell
# v3
$installer = "$dirFiles\setup.exe"

# v4.1.7
$installer = Join-Path -Path $adtSession.DirFiles -ChildPath 'setup.exe'
# Or using string interpolation
$installer = "$($adtSession.DirFiles)\setup.exe"
```

### 3. Update Exit Handling

```powershell
# v3
If ($mainExitCode -eq 0) {
    Exit-Script -ExitCode $mainExitCode
}

# v4.1.7 - success
Close-ADTSession

# v4.1.7 - failure with specific exit code
Close-ADTSession -ExitCode 60001

# v4.1.7 - error handling pattern
try {
    & "$($adtSession.DeploymentType)-ADTDeployment"
    Close-ADTSession
}
catch {
    Write-ADTLogEntry -Message "Unhandled error: $(Resolve-ADTErrorRecord -ErrorRecord $_)" -Severity 3
    Close-ADTSession -ExitCode 60001
}
```

### 4. Update Logging

```powershell
# v3
Write-Log -Message "Installation started" -Severity 1

# v4
Write-ADTLogEntry -Message "Installation started" -Severity 1
```

### 5. Update Registry Operations

```powershell
# v3
Set-RegistryKey -Key "HKLM:\SOFTWARE\App" -Name "Version" -Value "1.0"

# v4
Set-ADTRegistryKey -Key "HKLM:\SOFTWARE\App" -Name "Version" -Value "1.0"
```

## Parameter Changes

### Show-InstallationWelcome to Show-ADTInstallationWelcome

Most parameters remain the same, but some have been renamed:

```powershell
# v3
Show-InstallationWelcome -CloseApps "app1,app2" -AllowDefer -DeferTimes 3 -CheckDiskSpace -PersistPrompt

# v4
Show-ADTInstallationWelcome -CloseApps "app1,app2" -AllowDefer -DeferTimes 3 -CheckDiskSpace -PersistPrompt
```

### Execute-Process to Start-ADTProcess

```powershell
# v3
Execute-Process -Path "setup.exe" -Parameters "/S" -WindowStyle "Hidden" -IgnoreExitCodes "1,2"

# v4
Start-ADTProcess -FilePath "setup.exe" -ArgumentList "/S" -WindowStyle "Hidden" -IgnoreExitCodes "1,2"
```

Key changes:
- `-Path` → `-FilePath`
- `-Parameters` → `-ArgumentList`

### Execute-MSI to Start-ADTMsiProcess

```powershell
# v3
Execute-MSI -Action Install -Path "$dirFiles\app.msi" -Transform "$dirFiles\app.mst"

# v4.1.7
Start-ADTMsiProcess -Action Install -Path (Join-Path $adtSession.DirFiles 'app.msi') -Transform (Join-Path $adtSession.DirFiles 'app.mst')
```

## Testing After Migration

1. **Test in Interactive mode** first to verify UI elements work
2. **Test in Silent mode** for Intune deployment
3. **Verify logging** is working correctly
4. **Check error handling** by simulating failures
5. **Test uninstall** if implemented
6. **Validate detection** in Intune

## Migration Checklist

- [ ] Rename script from `Deploy-Application.ps1` to `Invoke-AppDeployToolkit.ps1`
- [ ] Update parameter block (add `Auto` to DeployMode, use `SuppressRebootPassThru`)
- [ ] Convert variable declarations to `$adtSession` hashtable
- [ ] Add `AppProcessesToClose` array with Name/Description hashtables
- [ ] Add `RequireAdmin` to session instead of config
- [ ] Create deployment functions (`Install-ADTDeployment`, `Uninstall-ADTDeployment`, `Repair-ADTDeployment`)
- [ ] Add module import with FullyQualifiedName and GUID
- [ ] Add `Open-ADTSession`/`Close-ADTSession` initialization pattern
- [ ] Replace all function calls with ADT-prefixed versions
- [ ] Update path variables from `$dirFiles` to `$adtSession.DirFiles`
- [ ] Add structured error handling with `Resolve-ADTErrorRecord`
- [ ] Update any custom functions that reference old function names
- [ ] Test all deployment scenarios (Interactive, Silent, NonInteractive)
- [ ] Update Intune detection rules if needed
