# PSAppDeployToolkit v4 Functions Reference

This document provides a comprehensive reference of all functions available in PSAppDeployToolkit v4.1.7.

## Invoke-AppDeployToolkit.ps1

The main deployment script that orchestrates application installation, uninstallation, and repair operations.

### Script Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `DeploymentType` | String | The type of deployment: `Install`, `Uninstall`, or `Repair`. Default: `Install` |
| `DeployMode` | String | Installation mode: `Auto`, `Interactive`, `NonInteractive`, or `Silent`. Auto shows dialogs if user logged on. |
| `SuppressRebootPassThru` | Switch | Suppresses the 3010 return code (requires restart) from being passed to parent process |
| `TerminalServerMode` | Switch | Enables user install/execute mode switching for RDS/Citrix servers |
| `DisableLogging` | Switch | Disables logging to file |

### Session Configuration Variables ($adtSession)

| Variable | Description |
|----------|-------------|
| `AppVendor` | Application vendor name |
| `AppName` | Application name (empty enables Zero-Config MSI) |
| `AppVersion` | Application version |
| `AppArch` | Application architecture |
| `AppLang` | Application language (default: EN) |
| `AppRevision` | Application revision (default: 01) |
| `AppSuccessExitCodes` | Array of success exit codes (default: 0) |
| `AppRebootExitCodes` | Array of reboot-required exit codes (default: 1641, 3010) |
| `AppProcessesToClose` | Array of processes to close before install |
| `AppScriptVersion` | Script version |
| `AppScriptDate` | Script date |
| `AppScriptAuthor` | Script author |
| `RequireAdmin` | Whether admin rights are required (default: $true) |
| `InstallName` | Override for installation name |
| `InstallTitle` | Override for installation title |

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

---

## PSAppDeployToolkit Module Functions

The module exports 135 functions organized by category below.

### Session Management

| Function | Description |
|----------|-------------|
| `Open-ADTSession` | Opens a new deployment session |
| `Close-ADTSession` | Closes the current deployment session |
| `Get-ADTSession` | Gets the current session object |
| `Test-ADTSessionActive` | Tests if a session is currently active |
| `Initialize-ADTModule` | Initializes the PSADT module |
| `Test-ADTModuleInitialized` | Tests if the module is initialized |

### Installation UI Functions

| Function | Description |
|----------|-------------|
| `Show-ADTInstallationWelcome` | Displays welcome dialog with options (deferrals, process closing, disk check) |
| `Show-ADTInstallationProgress` | Displays installation progress dialog |
| `Show-ADTInstallationPrompt` | Displays a custom installation prompt |
| `Show-ADTInstallationRestartPrompt` | Displays a restart prompt to the user |
| `Close-ADTInstallationProgress` | Closes the installation progress dialog |
| `Show-ADTDialogBox` | Displays a standard Windows dialog box |
| `Show-ADTBalloonTip` | Displays a balloon tip notification |
| `Show-ADTHelpConsole` | Displays the PSADT help console |

### Process Execution

| Function | Description |
|----------|-------------|
| `Start-ADTProcess` | Starts a process with enhanced logging and error handling |
| `Start-ADTProcessAsUser` | Starts a process in the user's session context |
| `Start-ADTMsiProcess` | Executes MSI installation with msiexec |
| `Start-ADTMsiProcessAsUser` | Executes MSI installation in user context |
| `Start-ADTMspProcess` | Executes MSP patch installation |
| `Start-ADTMspProcessAsUser` | Executes MSP patch in user context |
| `Get-ADTRunningProcesses` | Gets a list of running processes |
| `Block-ADTAppExecution` | Blocks execution of specified applications |
| `Unblock-ADTAppExecution` | Unblocks previously blocked applications |

### Application Management

| Function | Description |
|----------|-------------|
| `Get-ADTApplication` | Gets installed application information from registry |
| `Uninstall-ADTApplication` | Uninstalls an application by name, product code, or other criteria |
| `Install-ADTMSUpdates` | Installs Microsoft updates (.msu, .msp files) |
| `Test-ADTMSUpdates` | Tests if Microsoft updates are installed |
| `Install-ADTSCCMSoftwareUpdates` | Triggers SCCM software updates installation |

### File Operations

| Function | Description |
|----------|-------------|
| `Copy-ADTFile` | Copies files with logging and verification |
| `Copy-ADTFileToUserProfiles` | Copies files to all user profile directories |
| `Remove-ADTFile` | Removes files with logging |
| `Remove-ADTFileFromUserProfiles` | Removes files from all user profile directories |
| `New-ADTFolder` | Creates new folders |
| `Remove-ADTFolder` | Removes folders recursively |
| `New-ADTZipFile` | Creates a ZIP archive |
| `Get-ADTFileVersion` | Gets file version information |
| `Remove-ADTInvalidFileNameChars` | Removes invalid characters from filenames |
| `Copy-ADTContentToCache` | Copies content to PSADT cache location |
| `Remove-ADTContentFromCache` | Removes content from cache |

### Registry Operations

| Function | Description |
|----------|-------------|
| `Get-ADTRegistryKey` | Gets registry key values |
| `Set-ADTRegistryKey` | Sets registry key values |
| `Remove-ADTRegistryKey` | Removes registry keys |
| `Test-ADTRegistryValue` | Tests if a registry value exists |
| `Convert-ADTRegistryPath` | Converts registry paths between formats |
| `Invoke-ADTAllUsersRegistryAction` | Executes actions against all users' registry hives |

### Shortcut Management

| Function | Description |
|----------|-------------|
| `New-ADTShortcut` | Creates a new shortcut |
| `Get-ADTShortcut` | Gets shortcut properties |
| `Set-ADTShortcut` | Modifies an existing shortcut |

### Service Management

| Function | Description |
|----------|-------------|
| `Test-ADTServiceExists` | Tests if a Windows service exists |
| `Get-ADTServiceStartMode` | Gets the start mode of a service |
| `Set-ADTServiceStartMode` | Sets the start mode of a service |
| `Start-ADTServiceAndDependencies` | Starts a service and its dependencies |
| `Stop-ADTServiceAndDependencies` | Stops a service and its dependencies |

### Environment & System

| Function | Description |
|----------|-------------|
| `Get-ADTEnvironment` | Gets environment information |
| `Get-ADTEnvironmentTable` | Gets the full environment table |
| `Export-ADTEnvironmentTableToSessionState` | Exports environment to session state |
| `Get-ADTEnvironmentVariable` | Gets an environment variable value |
| `Set-ADTEnvironmentVariable` | Sets an environment variable |
| `Remove-ADTEnvironmentVariable` | Removes an environment variable |
| `Update-ADTEnvironmentPsProvider` | Updates the PowerShell environment provider |
| `Get-ADTOperatingSystemInfo` | Gets operating system information |
| `Get-ADTFreeDiskSpace` | Gets free disk space |
| `Get-ADTPendingReboot` | Checks for pending reboot status |
| `Update-ADTDesktop` | Refreshes the desktop (icon refresh) |
| `Update-ADTGroupPolicy` | Forces a Group Policy update |

### User Information

| Function | Description |
|----------|-------------|
| `Get-ADTLoggedOnUser` | Gets currently logged-on users |
| `Get-ADTUserProfiles` | Gets user profile paths |
| `Test-ADTCallerIsAdmin` | Tests if the caller has admin rights |
| `Get-ADTUserNotificationState` | Gets user notification/quiet hours state |
| `Get-ADTPresentationSettingsEnabledUsers` | Gets users with presentation mode enabled |
| `Test-ADTUserIsBusy` | Tests if user is busy (presentation mode, etc.) |
| `ConvertTo-ADTNTAccountOrSID` | Converts between NT account names and SIDs |

### INI File Operations

| Function | Description |
|----------|-------------|
| `Get-ADTIniSection` | Gets an INI file section |
| `Set-ADTIniSection` | Sets an INI file section |
| `Remove-ADTIniSection` | Removes an INI file section |
| `Get-ADTIniValue` | Gets an INI file value |
| `Set-ADTIniValue` | Sets an INI file value |
| `Remove-ADTIniValue` | Removes an INI file value |

### MSI Operations

| Function | Description |
|----------|-------------|
| `Get-ADTMsiTableProperty` | Gets properties from MSI database tables |
| `Get-ADTMsiExitCodeMessage` | Gets the message for an MSI exit code |
| `Set-ADTMsiProperty` | Sets a property in an MSI database |
| `New-ADTMsiTransform` | Creates an MSI transform file (.mst) |

### DLL Registration

| Function | Description |
|----------|-------------|
| `Register-ADTDll` | Registers a DLL file |
| `Unregister-ADTDll` | Unregisters a DLL file |
| `Invoke-ADTRegSvr32` | Invokes regsvr32 for DLL registration |

### Active Setup

| Function | Description |
|----------|-------------|
| `Set-ADTActiveSetup` | Configures Active Setup for per-user installation |

### WIM File Operations

| Function | Description |
|----------|-------------|
| `Mount-ADTWimFile` | Mounts a WIM file |
| `Dismount-ADTWimFile` | Dismounts a WIM file |

### Edge Browser Extensions

| Function | Description |
|----------|-------------|
| `Add-ADTEdgeExtension` | Adds a Microsoft Edge extension |
| `Remove-ADTEdgeExtension` | Removes a Microsoft Edge extension |

### Terminal Server

| Function | Description |
|----------|-------------|
| `Enable-ADTTerminalServerInstallMode` | Enables Terminal Server install mode |
| `Disable-ADTTerminalServerInstallMode` | Disables Terminal Server install mode |

### Deferral Management

| Function | Description |
|----------|-------------|
| `Get-ADTDeferHistory` | Gets deferral history for the deployment |
| `Set-ADTDeferHistory` | Sets deferral history |
| `Reset-ADTDeferHistory` | Resets deferral history |

### Window Management

| Function | Description |
|----------|-------------|
| `Get-ADTWindowTitle` | Gets window titles of running processes |
| `Send-ADTKeys` | Sends keystrokes to a window |

### Logging

| Function | Description |
|----------|-------------|
| `Write-ADTLogEntry` | Writes an entry to the PSADT log file |

### Configuration

| Function | Description |
|----------|-------------|
| `Get-ADTConfig` | Gets PSADT configuration values |
| `Get-ADTStringTable` | Gets localized string table |

### System Tests

| Function | Description |
|----------|-------------|
| `Test-ADTBattery` | Tests if running on battery power |
| `Test-ADTNetworkConnection` | Tests network connectivity |
| `Test-ADTPowerPoint` | Tests if PowerPoint presentation is running |
| `Test-ADTMicrophoneInUse` | Tests if microphone is in use |
| `Test-ADTMutexAvailability` | Tests if a mutex is available |
| `Test-ADTOobeCompleted` | Tests if Windows OOBE is completed |
| `Test-ADTEspActive` | Tests if Enrollment Status Page is active |

### SCCM Integration

| Function | Description |
|----------|-------------|
| `Invoke-ADTSCCMTask` | Invokes an SCCM client task |

### Utility Functions

| Function | Description |
|----------|-------------|
| `Get-ADTExecutableInfo` | Gets executable file information |
| `Get-ADTPEFileArchitecture` | Gets PE file architecture (x86/x64) |
| `Get-ADTUniversalDate` | Gets date in universal format |
| `Get-ADTPowerShellProcessPath` | Gets the PowerShell executable path |
| `Out-ADTPowerShellEncodedCommand` | Encodes a command for PowerShell -EncodedCommand |
| `Set-ADTPowerShellCulture` | Sets PowerShell culture settings |
| `Set-ADTItemPermission` | Sets file/folder permissions |
| `New-ADTTemplate` | Creates a new PSADT deployment template |

### Module Callbacks

| Function | Description |
|----------|-------------|
| `Add-ADTModuleCallback` | Adds a module callback function |
| `Get-ADTModuleCallback` | Gets module callbacks |
| `Remove-ADTModuleCallback` | Removes a module callback |
| `Clear-ADTModuleCallback` | Clears all module callbacks |

### Error Handling & Internal Functions

| Function | Description |
|----------|-------------|
| `Initialize-ADTFunction` | Initializes a function for logging |
| `Complete-ADTFunction` | Completes a function and handles cleanup |
| `Invoke-ADTFunctionErrorHandler` | Handles function errors |
| `New-ADTErrorRecord` | Creates a new error record |
| `New-ADTValidateScriptErrorRecord` | Creates validation error record |
| `Resolve-ADTErrorRecord` | Resolves and formats error records |
| `Invoke-ADTCommandWithRetries` | Invokes a command with retry logic |
| `Get-ADTCommandTable` | Gets the command table |
| `Get-ADTBoundParametersAndDefaultValues` | Gets bound parameters with defaults |
| `Get-ADTObjectProperty` | Gets object properties dynamically |
| `Invoke-ADTObjectMethod` | Invokes object methods dynamically |
| `Convert-ADTValuesFromRemainingArguments` | Converts remaining arguments |
| `Convert-ADTValueType` | Converts value types |
| `Remove-ADTHashtableNullOrEmptyValues` | Removes null/empty hashtable values |

---

## Exit Code Ranges

| Range | Purpose |
|-------|---------|
| 60000 - 68999 | Reserved for built-in exit codes in Invoke-AppDeployToolkit.ps1/.exe |
| 69000 - 69999 | Recommended for user customized exit codes in Invoke-AppDeployToolkit.ps1 |
| 70000 - 79999 | Recommended for user customized exit codes in PSAppDeployToolkit.Extensions |

### Common Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1641 | Reboot initiated |
| 3010 | Reboot required |
| 60001 | Unhandled error in deployment script |
| 60008 | Module import or session initialization failure |

---

## Module Information

- **Version**: 4.1.7
- **GUID**: 8c3c366b-8606-4576-9f2d-4051144f7ca2
- **PowerShell Version Required**: 5.1.14393.0+
- **Authors**: PSAppDeployToolkit Team (Sean Lillis, Dan Cunningham, Muhammad Mashwani, Mitch Richters, Dan Gough)
- **Website**: https://psappdeploytoolkit.com
