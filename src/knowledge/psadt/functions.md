---
title: "PSADT v4 Function Reference"
id: "psadt-functions"
psadt_target: "4.1.8"
last_updated: "2025-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/V4Assets/PSAppDeployToolkit/PSAppDeployToolkit.psd1"
tags: ["psadt", "functions", "reference", "api", "v4.1.8"]
---

# PSADT v4.1.8 Function Reference

PSADT v4.1.8 exports **135 functions** with the `ADT` prefix. This document covers the most commonly used functions for application deployment.

## Invoke-AppDeployToolkit.ps1

The main deployment script that orchestrates application installation, uninstallation, and repair operations.

### Script Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `DeploymentType` | String | The type of deployment: `Install`, `Uninstall`, or `Repair`. Default: `Install` |
| `DeployMode` | String | Installation mode: `Auto`, `Interactive`, `NonInteractive`, or `Silent`. Auto shows dialogs if user logged on. |
| `SuppressRebootPassThru` | Switch | Suppresses the 3010 return code (requires restart) from being passed to parent process (e.g., SCCM) |
| `TerminalServerMode` | Switch | Enables user install/execute mode switching for RDS/Citrix servers |
| `DisableLogging` | Switch | Disables logging to file |

### Session Configuration Variables ($adtSession)

| Variable | Type | Description |
|----------|------|-------------|
| `AppVendor` | String | Application vendor name |
| `AppName` | String | Application name (empty enables Zero-Config MSI) |
| `AppVersion` | String | Application version |
| `AppArch` | String | Application architecture (x86, x64) |
| `AppLang` | String | Application language (default: EN) |
| `AppRevision` | String | Application revision (default: 01) |
| `AppSuccessExitCodes` | Array | Exit codes indicating success (default: @(0)) |
| `AppRebootExitCodes` | Array | Exit codes indicating reboot needed (default: @(1641, 3010)) |
| `AppProcessesToClose` | Array | Processes to close before install |
| `AppScriptVersion` | String | Script version |
| `AppScriptDate` | String | Script date |
| `AppScriptAuthor` | String | Script author |
| `RequireAdmin` | Boolean | Whether admin rights are required (default: $true) |
| `InstallName` | String | Override for installation name |
| `InstallTitle` | String | Override for installation title |

### Deployment Functions

#### Install-ADTDeployment

Handles the complete installation workflow in three phases:

- **Pre-Install**: Shows welcome message, closes specified processes, checks disk space, allows deferrals
- **Install**: Executes MSI installation (Zero-Config) or custom installation tasks
- **Post-Install**: Runs post-installation tasks, shows completion message

#### Uninstall-ADTDeployment

Handles the complete uninstallation workflow in three phases:

- **Pre-Uninstall**: Shows welcome with 60-second countdown for process closure
- **Uninstall**: Executes MSI uninstallation (Zero-Config) or custom uninstall tasks
- **Post-Uninstall**: Runs post-uninstallation tasks

#### Repair-ADTDeployment

Handles the complete repair workflow in three phases:

- **Pre-Repair**: Shows welcome with 60-second countdown for process closure
- **Repair**: Executes MSI repair (Zero-Config) or custom repair tasks
- **Post-Repair**: Runs post-repair tasks

## Session Management

### Open-ADTSession

Opens a new deployment session. Called after importing the module.

```powershell
$adtSession = @{
    AppVendor = 'Contoso'
    AppName = 'MyApp'
    AppVersion = '1.0.0'
    AppArch = 'x64'
    AppLang = 'EN'
    AppRevision = '01'
    AppSuccessExitCodes = @(0)
    AppRebootExitCodes = @(1641, 3010)
    AppProcessesToClose = @(@{ Name = 'myapp'; Description = 'My Application' })
    AppScriptVersion = '1.0.0'
    AppScriptDate = '2025-01-01'
    AppScriptAuthor = 'IT Admin'
    RequireAdmin = $true
}
$iadtParams = Get-ADTBoundParametersAndDefaultValues -Invocation $MyInvocation
$adtSession = Remove-ADTHashtableNullOrEmptyValues -Hashtable $adtSession
$adtSession = Open-ADTSession @adtSession @iadtParams -PassThru
```

**Key Parameters:**
- `AppVendor`, `AppName`, `AppVersion` - Application metadata
- `AppProcessesToClose` - Array of processes to close
- `RequireAdmin` - Require admin rights
- `AppSuccessExitCodes` - Exit codes indicating success
- `AppRebootExitCodes` - Exit codes indicating reboot needed
- `-PassThru` - Return the session object

### Close-ADTSession

Finalizes the deployment and performs cleanup.

```powershell
Close-ADTSession
Close-ADTSession -ExitCode 60001
```

### Get-ADTSession

Retrieves the current deployment session object.

```powershell
$session = Get-ADTSession
Write-Host "Deploying: $($session.AppName)"
```

### Get-ADTConfig

Retrieves PSADT configuration settings.

```powershell
$config = Get-ADTConfig
$logPath = $config.Toolkit.LogPath
```

### Test-ADTSessionActive

Checks if an ADT session is currently active.

```powershell
if (Test-ADTSessionActive) {
    Write-ADTLogEntry -Message "Session is active"
}
```

## User Interaction

### Show-ADTInstallationWelcome

Displays a welcome dialog with options to close applications and defer.

```powershell
# Basic usage with processes to close
Show-ADTInstallationWelcome -CloseProcesses @('chrome', 'firefox')

# Using AppProcessesToClose from session (v4.1 pattern)
Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose

# With defer option and splatting (v4.1 recommended)
$saiwParams = @{
    AllowDeferCloseProcesses = $true
    DeferTimes = 3
    PersistPrompt = $true
}
if ($adtSession.AppProcessesToClose.Count -gt 0) {
    $saiwParams.Add('CloseProcesses', $adtSession.AppProcessesToClose)
}
Show-ADTInstallationWelcome @saiwParams

# Force close with countdown
Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -CloseProcessesCountdown 60
```

**Parameters:**
- `CloseProcesses` - Array of process names or hashtables with Name/Description
- `CloseProcessesCountdown` - Seconds before force closing
- `AllowDeferCloseProcesses` - Allow defer when processes are running
- `DeferTimes` - Number of deferrals allowed
- `DeferDays` - Days until deferral expires
- `PersistPrompt` - Keep the prompt visible
- `BlockExecution` - Prevent apps from launching during install
- `CheckDiskSpace` - Verify disk space before continuing

### Show-ADTInstallationProgress

Shows a progress dialog during installation.

```powershell
# Default message
Show-ADTInstallationProgress

# Custom message
Show-ADTInstallationProgress -StatusMessage 'Installing components...'

# With percentage (v4.1 Fluent UI)
Show-ADTInstallationProgress -StatusMessage 'Installing...' -ProgressPercentComplete 50
```

### Show-ADTInstallationPrompt

Shows a custom dialog with configurable buttons.

```powershell
# Simple OK dialog
Show-ADTInstallationPrompt -Message 'Installation complete.' -ButtonRightText 'OK' -Icon Information

# Non-blocking (returns immediately)
Show-ADTInstallationPrompt -Message 'Installation complete.' -ButtonRightText 'OK' -Icon Information -NoWait

# Three-button dialog
Show-ADTInstallationPrompt -Message 'Choose an option' -ButtonLeftText 'Option 1' -ButtonMiddleText 'Option 2' -ButtonRightText 'Cancel'
```

### Show-ADTInstallationRestartPrompt

Prompts user for restart.

```powershell
Show-ADTInstallationRestartPrompt -CountdownSeconds 600
Show-ADTInstallationRestartPrompt -CountdownSeconds 300 -CountdownNoHideSeconds 60
```

### Show-ADTDialogBox

Shows a generic Windows dialog without PSADT branding.

```powershell
Show-ADTDialogBox -Text 'Operation completed' -Icon Information -Buttons OK
Show-ADTDialogBox -Text 'Continue?' -Icon Question -Buttons YesNo
```

## Process Execution

### Start-ADTProcess

Executes a process with comprehensive logging and error handling.

```powershell
# Basic execution
Start-ADTProcess -FilePath 'setup.exe' -ArgumentList '/S'

# With PassThru to get exit code
$result = Start-ADTProcess -FilePath 'setup.exe' -ArgumentList '/S' -PassThru
if ($result.ExitCode -eq 0) { Write-ADTLogEntry 'Success' }

# Wait for MSI operations to complete first
Start-ADTProcess -FilePath 'installer.exe' -ArgumentList '/silent' -WaitForMsiExec

# Wait for child processes (v4.1)
Start-ADTProcess -FilePath 'setup.exe' -ArgumentList '/S' -WaitForChildProcesses

# Kill child processes when parent exits (v4.1)
Start-ADTProcess -FilePath 'setup.exe' -ArgumentList '/S' -KillChildProcessesWithParent

# Force unelevated execution (v4.1 - for Windows 11 Admin Protection)
Start-ADTProcess -FilePath 'userapp.exe' -UseUnelevatedToken

# Timeout handling (v4.1)
Start-ADTProcess -FilePath 'setup.exe' -Timeout 300 -TimeoutAction 'Terminate'

# Ignore specific exit codes
Start-ADTProcess -FilePath 'setup.exe' -IgnoreExitCodes '1,2,3010'
```

**Key Parameters (v4.1):**
- `FilePath` - Path to executable (if in Files/, just filename works)
- `ArgumentList` - Command-line arguments (**NOT** `-Arguments` which does not exist)
- `SecureArgumentList` - Hide arguments from log
- `WaitForMsiExec` - Wait if another MSI is running
- `WaitForChildProcesses` - Wait for spawned processes (v4.1)
- `KillChildProcessesWithParent` - Terminate child processes (v4.1)
- `UseUnelevatedToken` - Run without elevation (v4.1)
- `Timeout` - Maximum wait time in seconds (v4.1)
- `TimeoutAction` - Action on timeout: Continue, Terminate (v4.1)
- `SuccessExitCodes` - Custom success codes
- `RebootExitCodes` - Codes indicating reboot needed
- `IgnoreExitCodes` - Codes to ignore
- `PassThru` - Return object with ExitCode, StdOut, StdErr

### Start-ADTProcessAsUser

Runs a process in the logged-in user's context (from SYSTEM).

```powershell
# Run user-context uninstaller
Start-ADTProcessAsUser -FilePath '%LOCALAPPDATA%\Programs\App\uninstall.exe' -ArgumentList '/S' -ExpandEnvironmentVariables

# Inherit environment from deployment
Start-ADTProcessAsUser -FilePath 'config.exe' -InheritEnvironmentVariables
```

### Start-ADTMsiProcess

Specialized function for MSI operations.

```powershell
# Install MSI
Start-ADTMsiProcess -Action Install -FilePath 'app.msi'

# Install with transform and properties
Start-ADTMsiProcess -Action Install -FilePath 'app.msi' -Transforms 'custom.mst' -AdditionalArgumentList 'INSTALLDIR="C:\App"'

# Uninstall by product code
Start-ADTMsiProcess -Action Uninstall -ProductCode '{12345678-1234-1234-1234-123456789012}'

# Repair (using Reinstall mode - default in v4.1)
Start-ADTMsiProcess -Action Repair -FilePath 'app.msi'
```

**Parameters:**
- `Action` - Install, Uninstall, Repair, Patch
- `FilePath` - MSI file path
- `ProductCode` - Product GUID (for Uninstall/Repair)
- `Transforms` - MST file names
- `Patches` - MSP file names
- `AdditionalArgumentList` - Append to default MSI params
- `ArgumentList` - Replace default MSI params entirely

### Start-ADTMsiProcessAsUser

Installs/uninstalls user-context MSIs from SYSTEM account (v4.1).

```powershell
Start-ADTMsiProcessAsUser -Action Uninstall -FilePath '%LOCALAPPDATA%\App\app.msi' -ExpandEnvironmentVariables
```

## Application Management

### Get-ADTApplication

Gets installed applications from registry.

```powershell
# Find by name (wildcard match)
$apps = Get-ADTApplication -Name 'Google*'

# Find exact match
$app = Get-ADTApplication -Name 'Google Chrome' -Exact
```

### Uninstall-ADTApplication

Uninstalls applications by name or filter.

```powershell
# Uninstall by exact name
Uninstall-ADTApplication -Name 'VLC media player' -NameMatch 'Exact' -ArgumentList '/S'

# Uninstall MSI applications matching filter
Uninstall-ADTApplication -FilterScript { $_.Publisher -eq 'Adobe' -and $_.DisplayName -like '*Reader*' }

# Uninstall EXE applications (v4.1)
Uninstall-ADTApplication -FilterScript { $_.DisplayName -match 'WinRAR' } -ApplicationType EXE -ArgumentList '/S'
```

**Parameters:**
- `Name` - Application name to match
- `NameMatch` - Exact, Contains, Regex
- `FilterScript` - ScriptBlock for complex filtering
- `ApplicationType` - MSI, EXE, or All
- `ArgumentList` - Arguments (replaces detected)
- `AdditionalArgumentList` - Arguments (appends to detected)

## File Operations

### Copy-ADTFile

Copies files with logging.

```powershell
Copy-ADTFile -Path "$($adtSession.DirFiles)\config.xml" -Destination "$env:ProgramData\App\"
Copy-ADTFile -Path "$($adtSession.DirFiles)\*" -Destination 'C:\Program Files\App' -Recurse
```

### Copy-ADTFileToUserProfiles

Copies files to all user profiles (v4.1 enhanced).

```powershell
# Copy to AppData\Roaming for all users
Copy-ADTFileToUserProfiles -Path "$($adtSession.DirSupportFiles)\settings" -Destination 'AppData\Roaming\MyApp' -Recurse
```

### Remove-ADTFile

Removes files with logging.

```powershell
Remove-ADTFile -Path "$env:PUBLIC\Desktop\App.lnk"
Remove-ADTFile -Path 'C:\Temp\installer.exe', 'C:\Temp\readme.txt'
```

### New-ADTFolder / Remove-ADTFolder

Creates or removes folders.

```powershell
New-ADTFolder -Path 'C:\Program Files\MyApp\Data'
Remove-ADTFolder -Path 'C:\Temp\InstallFiles'
```

## Registry Operations

### Set-ADTRegistryKey

Sets registry values.

```powershell
# Create key
Set-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp'

# Set string value
Set-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp' -Name 'Version' -Value '1.0.0'

# Set DWORD
Set-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp' -Name 'Enabled' -Value 1 -Type DWord

# Create volatile key (v4.1)
Set-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp\Temp' -Volatile
```

### Get-ADTRegistryKey / Remove-ADTRegistryKey

Gets or removes registry keys/values.

```powershell
$version = Get-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp' -Name 'Version'
Remove-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp' -Name 'OldSetting'
Remove-ADTRegistryKey -Key 'HKLM:\SOFTWARE\OldApp' -Recurse
```

### Invoke-ADTAllUsersRegistryAction

Applies registry changes to all user profiles.

```powershell
Invoke-ADTAllUsersRegistryAction -ScriptBlock {
    Set-ADTRegistryKey -Key "HKCU:\Software\MyApp" -Name 'Setting' -Value 1 -SID $_.SID
}
```

## Environment Variables (v4.1)

### Get-ADTEnvironmentVariable / Set-ADTEnvironmentVariable / Remove-ADTEnvironmentVariable

Manage environment variables.

```powershell
$path = Get-ADTEnvironmentVariable -Name 'PATH' -Scope 'Machine'
Set-ADTEnvironmentVariable -Name 'MY_APP_HOME' -Value 'C:\MyApp' -Scope 'Machine'
Remove-ADTEnvironmentVariable -Name 'OLD_VAR' -Scope 'User'
```

## INI File Operations (v4.1)

### Get-ADTIniValue / Set-ADTIniValue / Remove-ADTIniValue

Manage INI file values.

```powershell
$value = Get-ADTIniValue -FilePath 'C:\App\config.ini' -Section 'Settings' -Key 'Theme'
Set-ADTIniValue -FilePath 'C:\App\config.ini' -Section 'Settings' -Key 'Theme' -Value 'Dark'
Remove-ADTIniValue -FilePath 'C:\App\config.ini' -Section 'Settings' -Key 'OldKey'
```

## Logging

### Write-ADTLogEntry

Writes to the deployment log.

```powershell
Write-ADTLogEntry -Message 'Starting configuration'
Write-ADTLogEntry -Message 'Warning: File not found' -Severity 2
Write-ADTLogEntry -Message 'Critical error' -Severity 3
```

**Severity Levels:**
- 1 = Information (default)
- 2 = Warning
- 3 = Error

## Utility Functions

### Get-ADTPendingReboot

Checks if a reboot is pending.

```powershell
if (Get-ADTPendingReboot) {
    Write-ADTLogEntry 'Pending reboot detected' -Severity 2
}
```

### Block-ADTAppExecution / Unblock-ADTAppExecution

Prevents applications from running during deployment.

```powershell
Block-ADTAppExecution -ProcessNames @('app1', 'app2')
# ... perform installation ...
Unblock-ADTAppExecution
```

### Invoke-ADTCommandWithRetries

Retries a command on failure.

```powershell
Invoke-ADTCommandWithRetries -Command { Start-ADTProcess -FilePath 'flaky.exe' } -RetryCount 3 -RetryInterval 10
```

## Exit Codes

### Exit Code Ranges

| Range | Purpose |
|-------|---------|
| 60000 - 68999 | Reserved for built-in exit codes in Invoke-AppDeployToolkit.ps1/.exe |
| 69000 - 69999 | Recommended for user customized exit codes in Invoke-AppDeployToolkit.ps1 |
| 70000 - 79999 | Recommended for user customized exit codes in PSAppDeployToolkit.Extensions |

### Common Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1602 | User cancelled (default defer code) |
| 1618 | Another installation in progress |
| 1641 | Restart initiated |
| 3010 | Restart required |
| 60001 | Fast retry / Unhandled error |
| 60002 | Block execution |
| 60003 | Defer |
| 60008 | Module import or session initialization failure |

## Complete Function List (v4.1.8)

PSADT v4.1.8 exports 135 functions organized by category:

### Session & Module
- `Initialize-ADTModule`, `Test-ADTModuleInitialized`
- `Open-ADTSession`, `Close-ADTSession`, `Get-ADTSession`, `Test-ADTSessionActive`
- `Get-ADTConfig`, `Get-ADTStringTable`
- `Add-ADTModuleCallback`, `Get-ADTModuleCallback`, `Remove-ADTModuleCallback`, `Clear-ADTModuleCallback`
- `Get-ADTEnvironment`, `Get-ADTEnvironmentTable`, `Export-ADTEnvironmentTableToSessionState`

### Process Execution
- `Start-ADTProcess`, `Start-ADTProcessAsUser`
- `Start-ADTMsiProcess`, `Start-ADTMsiProcessAsUser`
- `Start-ADTMspProcess`, `Start-ADTMspProcessAsUser`
- `Invoke-ADTRegSvr32`, `Register-ADTDll`, `Unregister-ADTDll`
- `Get-ADTRunningProcesses`, `Block-ADTAppExecution`, `Unblock-ADTAppExecution`

### User Interaction
- `Show-ADTInstallationWelcome`, `Show-ADTInstallationProgress`, `Close-ADTInstallationProgress`
- `Show-ADTInstallationPrompt`, `Show-ADTInstallationRestartPrompt`
- `Show-ADTBalloonTip`, `Show-ADTDialogBox`, `Show-ADTHelpConsole`

### Application Management
- `Get-ADTApplication`, `Uninstall-ADTApplication`
- `Get-ADTMsiTableProperty`, `Get-ADTMsiExitCodeMessage`
- `New-ADTMsiTransform`, `Set-ADTMsiProperty`
- `Install-ADTMSUpdates`, `Test-ADTMSUpdates`

### File Operations
- `Copy-ADTFile`, `Copy-ADTFileToUserProfiles`, `Remove-ADTFile`, `Remove-ADTFileFromUserProfiles`
- `New-ADTFolder`, `Remove-ADTFolder`
- `Copy-ADTContentToCache`, `Remove-ADTContentFromCache`
- `Get-ADTFileVersion`, `Get-ADTPEFileArchitecture`, `Get-ADTExecutableInfo`
- `New-ADTZipFile`, `Mount-ADTWimFile`, `Dismount-ADTWimFile`

### Registry Operations
- `Set-ADTRegistryKey`, `Get-ADTRegistryKey`, `Remove-ADTRegistryKey`, `Test-ADTRegistryValue`
- `Convert-ADTRegistryPath`, `Invoke-ADTAllUsersRegistryAction`

### Shortcut Operations
- `New-ADTShortcut`, `Set-ADTShortcut`, `Get-ADTShortcut`

### Environment Variables
- `Get-ADTEnvironmentVariable`, `Set-ADTEnvironmentVariable`, `Remove-ADTEnvironmentVariable`
- `Update-ADTEnvironmentPsProvider`

### INI File Operations
- `Get-ADTIniValue`, `Set-ADTIniValue`, `Remove-ADTIniValue`
- `Get-ADTIniSection`, `Set-ADTIniSection`, `Remove-ADTIniSection`

### Service Management
- `Test-ADTServiceExists`, `Get-ADTServiceStartMode`, `Set-ADTServiceStartMode`
- `Start-ADTServiceAndDependencies`, `Stop-ADTServiceAndDependencies`

### System Information
- `Get-ADTOperatingSystemInfo`, `Get-ADTPendingReboot`, `Get-ADTFreeDiskSpace`
- `Get-ADTLoggedOnUser`, `Get-ADTUserProfiles`, `Get-ADTPowerShellProcessPath`
- `Test-ADTCallerIsAdmin`, `Test-ADTBattery`, `Test-ADTNetworkConnection`
- `Test-ADTPowerPoint`, `Test-ADTMicrophoneInUse`, `Test-ADTUserIsBusy`
- `Test-ADTMutexAvailability`, `Test-ADTOobeCompleted`, `Test-ADTEspActive`
- `Get-ADTUserNotificationState`, `Get-ADTPresentationSettingsEnabledUsers`

### Active Setup
- `Set-ADTActiveSetup`

### Edge Extensions
- `Add-ADTEdgeExtension`, `Remove-ADTEdgeExtension`

### SCCM Integration
- `Invoke-ADTSCCMTask`, `Install-ADTSCCMSoftwareUpdates`

### Terminal Server
- `Enable-ADTTerminalServerInstallMode`, `Disable-ADTTerminalServerInstallMode`

### Deferral
- `Get-ADTDeferHistory`, `Set-ADTDeferHistory`, `Reset-ADTDeferHistory`

### Utility Functions
- `Write-ADTLogEntry`, `Resolve-ADTErrorRecord`, `New-ADTErrorRecord`, `New-ADTValidateScriptErrorRecord`
- `Invoke-ADTCommandWithRetries`, `Invoke-ADTObjectMethod`, `Get-ADTObjectProperty`
- `Update-ADTDesktop`, `Update-ADTGroupPolicy`, `Send-ADTKeys`
- `Get-ADTUniversalDate`, `Get-ADTWindowTitle`
- `ConvertTo-ADTNTAccountOrSID`, `Set-ADTItemPermission`
- `Remove-ADTInvalidFileNameChars`, `Remove-ADTHashtableNullOrEmptyValues`
- `Out-ADTPowerShellEncodedCommand`, `Set-ADTPowerShellCulture`
- `Get-ADTBoundParametersAndDefaultValues`, `Convert-ADTValuesFromRemainingArguments`, `Convert-ADTValueType`
- `Initialize-ADTFunction`, `Complete-ADTFunction`, `Invoke-ADTFunctionErrorHandler`
- `Get-ADTCommandTable`, `New-ADTTemplate`

## Module Information

| Property | Value |
|----------|-------|
| Version | 4.1.8 |
| GUID | 8c3c366b-8606-4576-9f2d-4051144f7ca2 |
| PowerShell Required | 5.1.14393.0+ |
| CLR Version | 4.0.30319.42000 |
| Authors | PSAppDeployToolkit Team (Sean Lillis, Dan Cunningham, Muhammad Mashwani, Mitch Richters, Dan Gough) |
| Website | https://psappdeploytoolkit.com |
| License | https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/blob/main/COPYING.Lesser |
