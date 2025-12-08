# PSADT v3 to v4 Migration Guide

This guide helps you migrate existing PSADT v3 scripts to the v4 module-based architecture.

## Key Changes Overview

| Aspect | v3 | v4 |
|--------|----|----|
| Architecture | Single script with dot-sourced functions | PowerShell module |
| Function naming | No prefix | `ADT` prefix (e.g., `Show-ADTInstallationWelcome`) |
| State management | Global variables | `$ADTSession` object |
| Initialization | `Set variables at top of script` | `Initialize-ADTDeployment` |
| Completion | Direct exit | `Complete-ADTDeployment` |
| Error handling | Manual try/catch | Structured with automatic logging |

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
| `Exit-Script` | `Complete-ADTDeployment` |

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
| `Remove-Shortcut` | `Remove-ADTShortcut` |

### Application Management

| v3 Function | v4 Function |
|-------------|-------------|
| `Get-InstalledApplication` | `Get-ADTInstalledApplication` |
| `Remove-MSIApplications` | `Remove-ADTInstalledApplication` |
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
| `Get-DiskSpace` | `Get-ADTDiskSpace` |
| `Get-FreeDiskSpace` | `Get-ADTDiskSpace` |
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

### v4 Script Structure

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

# Import PSADT module
Import-Module "$PSScriptRoot\PSAppDeployToolkit" -Force

# Initialize deployment
Initialize-ADTDeployment @{
    InstallName = 'Application'
    InstallVersion = '1.0.0'
    Publisher = 'Company'
    DeploymentType = $DeploymentType
    DeployMode = $DeployMode
    AllowRebootPassThru = $AllowRebootPassThru
    TerminalServerMode = $TerminalServerMode
    DisableLogging = $DisableLogging
}

try {
    switch ($DeploymentType) {
        'Install' {
            # Pre-Installation
            Show-ADTInstallationWelcome -CloseApps 'app1,app2' -AllowDefer
            Show-ADTInstallationProgress

            # Installation
            Start-ADTProcess -FilePath "$($ADTSession.FilesDirectory)\setup.exe" -Arguments '/S'

            # Post-Installation
            Copy-ADTFile -Path "$($ADTSession.FilesDirectory)\config.xml" -Destination "$env:ProgramData\App\config.xml"
        }
        'Uninstall' {
            Show-ADTInstallationWelcome -CloseApps 'app1,app2'
            Start-ADTProcess -FilePath "$env:ProgramFiles\App\uninstall.exe" -Arguments '/S'
        }
        'Repair' {
            # Repair logic
        }
    }

    Complete-ADTDeployment -DeploymentStatus 'Complete'
}
catch {
    Complete-ADTDeployment -DeploymentStatus 'Failed' -ErrorMessage $_.Exception.Message
}
```

## Variable Migration

### v3 Variables to v4 Equivalents

| v3 Variable | v4 Equivalent |
|-------------|---------------|
| `$appVendor` | `$ADTSession.Publisher` |
| `$appName` | `$ADTSession.InstallName` |
| `$appVersion` | `$ADTSession.InstallVersion` |
| `$deploymentType` | `$ADTSession.DeploymentType` |
| `$deployMode` | `$ADTSession.DeployMode` |
| `$dirFiles` | `$ADTSession.FilesDirectory` |
| `$dirSupportFiles` | `$ADTSession.SupportFilesDirectory` |
| `$scriptDirectory` | `$ADTSession.ScriptDirectory` |
| `$logName` | `$ADTSession.LogName` |
| `$installPhase` | Still available as `$installPhase` |

## Common Migration Tasks

### 1. Update Function Calls

Find and replace all function calls with their v4 equivalents:

```powershell
# v3
Execute-Process -Path "setup.exe" -Parameters "/S"

# v4
Start-ADTProcess -FilePath "setup.exe" -Arguments "/S"
```

Note: `-Parameters` changed to `-Arguments` in some functions.

### 2. Update Path References

```powershell
# v3
$installer = "$dirFiles\setup.exe"

# v4
$installer = "$($ADTSession.FilesDirectory)\setup.exe"
# Or
$installer = Join-Path -Path $ADTSession.FilesDirectory -ChildPath 'setup.exe'
```

### 3. Update Exit Handling

```powershell
# v3
If ($mainExitCode -eq 0) {
    Exit-Script -ExitCode $mainExitCode
}

# v4
Complete-ADTDeployment -DeploymentStatus 'Complete'
# Or for failures
Complete-ADTDeployment -DeploymentStatus 'Failed' -ErrorMessage 'Installation failed'
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
Start-ADTProcess -FilePath "setup.exe" -Arguments "/S" -WindowStyle "Hidden" -IgnoreExitCodes "1,2"
```

Key changes:
- `-Path` → `-FilePath`
- `-Parameters` → `-Arguments`

### Execute-MSI to Start-ADTMsiProcess

```powershell
# v3
Execute-MSI -Action Install -Path "$dirFiles\app.msi" -Transform "$dirFiles\app.mst"

# v4
Start-ADTMsiProcess -Action Install -Path "$($ADTSession.FilesDirectory)\app.msi" -Transform "$($ADTSession.FilesDirectory)\app.mst"
```

## Testing After Migration

1. **Test in Interactive mode** first to verify UI elements work
2. **Test in Silent mode** for Intune deployment
3. **Verify logging** is working correctly
4. **Check error handling** by simulating failures
5. **Test uninstall** if implemented
6. **Validate detection** in Intune

## Migration Checklist

- [ ] Update script header and parameter block
- [ ] Add `Import-Module` and `Initialize-ADTDeployment`
- [ ] Replace all function calls with ADT-prefixed versions
- [ ] Update path variables to use `$ADTSession`
- [ ] Add try/catch with `Complete-ADTDeployment`
- [ ] Update any custom functions that reference old function names
- [ ] Test all deployment scenarios
- [ ] Update Intune detection rules if needed
- [ ] Update documentation
