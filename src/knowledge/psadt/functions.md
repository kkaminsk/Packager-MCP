# PSADT v4 Function Reference

All PSADT v4 functions use the `ADT` prefix. This document covers the most commonly used functions for application deployment.

## Core Functions

### Initialize-ADTDeployment

Initializes the PSADT deployment session. Must be called at the start of every script.

```powershell
Initialize-ADTDeployment @{
    InstallName = 'Application Name'
    InstallVersion = '1.0.0'
    Publisher = 'Publisher Name'
    DeploymentType = 'Install'  # Install, Uninstall, Repair
    DeployMode = 'Interactive'  # Interactive, Silent, NonInteractive
}
```

**Parameters:**
- `InstallName` - Display name of the application
- `InstallVersion` - Version being deployed
- `Publisher` - Application publisher/vendor
- `DeploymentType` - Type of deployment operation
- `DeployMode` - User interaction level
- `ScriptDirectory` - Base directory for files (optional)

### Complete-ADTDeployment

Finalizes the deployment and performs cleanup.

```powershell
Complete-ADTDeployment -DeploymentStatus 'Complete'
Complete-ADTDeployment -DeploymentStatus 'Failed' -ErrorMessage 'Installation failed'
```

**Parameters:**
- `DeploymentStatus` - Complete, Failed, FastRetry, RestartRequired
- `ErrorMessage` - Error message for failed deployments

## User Interaction

### Show-ADTInstallationWelcome

Displays a welcome dialog with options to close applications.

```powershell
# Basic usage - prompt to close apps
Show-ADTInstallationWelcome -CloseApps 'chrome,firefox'

# With defer option
Show-ADTInstallationWelcome -CloseApps 'outlook' -AllowDefer -DeferTimes 3

# Force close with countdown
Show-ADTInstallationWelcome -CloseApps 'notepad' -CloseAppsCountdown 60

# Check for running apps only (no prompt)
Show-ADTInstallationWelcome -CloseApps 'app' -Silent
```

**Parameters:**
- `CloseApps` - Comma-separated process names to close
- `CloseAppsCountdown` - Seconds before force closing
- `AllowDefer` - Allow user to defer installation
- `DeferTimes` - Number of deferrals allowed
- `DeferDays` - Days until deferral expires
- `Silent` - Suppress the welcome dialog
- `PersistPrompt` - Keep the prompt on top
- `BlockExecution` - Prevent apps from launching during install

### Show-ADTInstallationProgress

Shows a progress dialog during installation.

```powershell
Show-ADTInstallationProgress -StatusMessage 'Installing application...'
Show-ADTInstallationProgress -StatusMessage 'Configuring settings...' -WindowLocation 'BottomRight'
```

**Parameters:**
- `StatusMessage` - Message to display
- `StatusMessageDetail` - Secondary message
- `WindowLocation` - Dialog position (Default, BottomRight, TopCenter)

### Close-ADTInstallationProgress

Closes the progress dialog.

```powershell
Close-ADTInstallationProgress
```

### Show-ADTInstallationRestartPrompt

Prompts user for restart.

```powershell
Show-ADTInstallationRestartPrompt -CountdownSeconds 600 -NoCountdown $false
```

**Parameters:**
- `CountdownSeconds` - Countdown before automatic restart
- `NoCountdown` - Disable countdown (user must click)

### Show-ADTBalloonTip

Shows a balloon notification.

```powershell
Show-ADTBalloonTip -BalloonTipTitle 'Installation Complete' -BalloonTipText 'Chrome has been installed'
```

## Process Management

### Start-ADTProcess

Executes a process with logging and error handling.

```powershell
# Basic execution
Start-ADTProcess -FilePath 'setup.exe' -Arguments '/S'

# With working directory
Start-ADTProcess -FilePath 'installer.exe' -Arguments '/silent' -WorkingDirectory "$PSScriptRoot\Files"

# MSI installation
Start-ADTProcess -FilePath 'msiexec.exe' -Arguments "/i `"$PSScriptRoot\Files\app.msi`" /qn /norestart"

# Ignore exit codes
Start-ADTProcess -FilePath 'setup.exe' -Arguments '/S' -IgnoreExitCodes '1,2,3'

# Wait for process to complete
Start-ADTProcess -FilePath 'app.exe' -Arguments '/config' -WaitForMsiExec
```

**Parameters:**
- `FilePath` - Path to executable
- `Arguments` - Command-line arguments
- `WorkingDirectory` - Working directory for process
- `WindowStyle` - Normal, Hidden, Maximized, Minimized
- `CreateNoWindow` - Don't create a window
- `IgnoreExitCodes` - Exit codes to treat as success
- `PassThru` - Return process object
- `WaitForMsiExec` - Wait if msiexec is running
- `SecureArguments` - Hide arguments in logs

### Stop-ADTProcess

Stops running processes.

```powershell
Stop-ADTProcess -Name 'chrome'
Stop-ADTProcess -Name 'app1,app2' -IgnoreErrors
```

**Parameters:**
- `Name` - Process names to stop
- `IgnoreErrors` - Don't throw on errors

### Get-ADTRunningProcesses

Gets running processes matching criteria.

```powershell
$running = Get-ADTRunningProcesses -ProcessName 'chrome,firefox'
if ($running) {
    # Handle running processes
}
```

## File Operations

### Copy-ADTFile

Copies files with logging.

```powershell
Copy-ADTFile -Path "$PSScriptRoot\Files\config.xml" -Destination "$env:ProgramData\App\config.xml"
Copy-ADTFile -Path "$PSScriptRoot\Files\*" -Destination 'C:\Program Files\App' -Recurse
```

**Parameters:**
- `Path` - Source path
- `Destination` - Destination path
- `Recurse` - Include subdirectories
- `ContinueOnError` - Continue on failures

### Remove-ADTFile

Removes files with logging.

```powershell
Remove-ADTFile -Path 'C:\Temp\installer.exe'
Remove-ADTFile -Path 'C:\Temp\*' -Recurse
```

### New-ADTFolder

Creates folders.

```powershell
New-ADTFolder -Path 'C:\Program Files\MyApp\Data'
```

### Remove-ADTFolder

Removes folders.

```powershell
Remove-ADTFolder -Path 'C:\Temp\InstallFiles' -ContinueOnError
```

## Registry Operations

### Set-ADTRegistryKey

Sets registry values.

```powershell
# Set string value
Set-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp' -Name 'Version' -Value '1.0.0'

# Set DWORD
Set-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp' -Name 'Enabled' -Value 1 -Type 'DWord'

# Create key only
Set-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp\Settings'
```

**Parameters:**
- `Key` - Registry key path
- `Name` - Value name
- `Value` - Value data
- `Type` - String, DWord, QWord, Binary, MultiString, ExpandString

### Remove-ADTRegistryKey

Removes registry keys or values.

```powershell
Remove-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp' -Name 'OldValue'
Remove-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp' -Recurse
```

### Get-ADTRegistryKey

Gets registry values.

```powershell
$version = Get-ADTRegistryKey -Key 'HKLM:\SOFTWARE\MyApp' -Name 'Version'
```

## Shortcut Management

### New-ADTShortcut

Creates shortcuts.

```powershell
# Desktop shortcut
New-ADTShortcut -Path "$env:PUBLIC\Desktop\MyApp.lnk" -TargetPath 'C:\Program Files\MyApp\app.exe'

# Start menu shortcut with arguments
New-ADTShortcut -Path "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\MyApp.lnk" `
    -TargetPath 'C:\Program Files\MyApp\app.exe' `
    -Arguments '--start-minimized' `
    -IconLocation 'C:\Program Files\MyApp\app.ico' `
    -Description 'My Application'
```

### Remove-ADTShortcut

Removes shortcuts.

```powershell
Remove-ADTShortcut -Path "$env:PUBLIC\Desktop\MyApp.lnk"
```

## MSI Operations

### Start-ADTMsiProcess

Specialized function for MSI installations.

```powershell
# Basic MSI install
Start-ADTMsiProcess -Action Install -Path "$PSScriptRoot\Files\app.msi"

# With transforms and properties
Start-ADTMsiProcess -Action Install -Path "$PSScriptRoot\Files\app.msi" `
    -Transform "$PSScriptRoot\Files\custom.mst" `
    -Parameters 'INSTALLDIR="C:\CustomPath"'

# Uninstall by product code
Start-ADTMsiProcess -Action Uninstall -Path '{12345678-1234-1234-1234-123456789012}'
```

**Parameters:**
- `Action` - Install, Uninstall, Patch, Repair
- `Path` - MSI path or product code
- `Transform` - Transform file path
- `Parameters` - Additional msiexec parameters
- `Patch` - Patch file path
- `LoggingOptions` - MSI logging flags

## Utility Functions

### Test-ADTBattery

Checks if running on battery.

```powershell
if (Test-ADTBattery) {
    # Handle battery mode
}
```

### Get-ADTDiskSpace

Gets available disk space.

```powershell
$space = Get-ADTDiskSpace -Drive 'C:'
if ($space.FreeMB -lt 1024) {
    # Not enough space
}
```

### Get-ADTInstalledApplication

Gets installed applications.

```powershell
# Find by name
$app = Get-ADTInstalledApplication -Name 'Google Chrome'

# Find by product code
$app = Get-ADTInstalledApplication -ProductCode '{12345678-1234-1234-1234-123456789012}'
```

### Remove-ADTInstalledApplication

Uninstalls an application.

```powershell
Remove-ADTInstalledApplication -Name 'Old Application'
```

## Logging

### Write-ADTLogEntry

Writes to the deployment log.

```powershell
Write-ADTLogEntry -Message 'Starting configuration'
Write-ADTLogEntry -Message 'Warning: File not found' -Severity 2
Write-ADTLogEntry -Message 'Error occurred' -Severity 3
```

**Severity Levels:**
- 1 = Information (default)
- 2 = Warning
- 3 = Error

## Exit Codes

PSADT uses standard exit codes:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 1618 | Another installation in progress |
| 1641 | Restart initiated |
| 3010 | Restart required |
| 60001 | PSADT fast retry |
| 60002 | PSADT block execution |
| 60003 | PSADT defer |
| 60004 | PSADT installation pending |
