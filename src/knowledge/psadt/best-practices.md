# PSADT v4 Best Practices

This guide covers best practices for creating reliable, maintainable PSADT v4 deployment packages.

## Script Structure

### Use Proper Error Handling

Always wrap your deployment logic in try/catch and use `Complete-ADTDeployment`:

```powershell
try {
    # All deployment logic here
    Complete-ADTDeployment -DeploymentStatus 'Complete'
}
catch {
    Write-ADTLogEntry -Message "Error: $($_.Exception.Message)" -Severity 3
    Complete-ADTDeployment -DeploymentStatus 'Failed' -ErrorMessage $_.Exception.Message
}
```

### Organize Code by Phase

Keep your script organized by deployment phase:

```powershell
switch ($DeploymentType) {
    'Install' {
        #region Pre-Installation
        Show-ADTInstallationWelcome -CloseApps 'appname'
        # Prerequisites checks here
        #endregion

        #region Installation
        Start-ADTProcess -FilePath 'installer.exe' -Arguments '/S'
        #endregion

        #region Post-Installation
        # Configuration, shortcuts, cleanup
        #endregion
    }
    'Uninstall' {
        # Uninstall logic
    }
    'Repair' {
        # Repair logic
    }
}
```

## Application Detection

### Always Verify Installation

Check that the application actually installed:

```powershell
# After installation
$installed = Get-ADTInstalledApplication -Name 'Application Name'
if (-not $installed) {
    throw "Installation verification failed - application not found"
}

# Check version if needed
if ($installed.DisplayVersion -ne $ADTSession.InstallVersion) {
    Write-ADTLogEntry -Message "Warning: Installed version ($($installed.DisplayVersion)) differs from expected ($($ADTSession.InstallVersion))" -Severity 2
}
```

### Use Multiple Detection Methods

For critical applications, use multiple detection methods:

```powershell
function Test-ApplicationInstalled {
    # Method 1: Registry detection
    $regApp = Get-ADTInstalledApplication -Name 'Application'

    # Method 2: File detection
    $fileExists = Test-Path -Path "$env:ProgramFiles\Application\app.exe"

    # Method 3: Service detection (if applicable)
    $serviceExists = Get-Service -Name 'AppService' -ErrorAction SilentlyContinue

    return ($regApp -and $fileExists)
}
```

## Process Management

### Close Applications Gracefully

Give users time to save their work:

```powershell
# Allow deferral for non-critical updates
Show-ADTInstallationWelcome -CloseApps 'outlook,excel,word' `
    -AllowDefer -DeferTimes 3 `
    -CloseAppsCountdown 300 `
    -PersistPrompt
```

### Handle Running Processes

Check for and handle running processes appropriately:

```powershell
$runningApps = Get-ADTRunningProcesses -ProcessName 'appname'
if ($runningApps) {
    Write-ADTLogEntry -Message "Found running processes: $($runningApps.ProcessName -join ', ')"

    if ($ADTSession.DeployMode -eq 'Silent') {
        # Force close in silent mode (Intune deployment)
        Stop-ADTProcess -Name 'appname'
    } else {
        # Prompt user in interactive mode
        Show-ADTInstallationWelcome -CloseApps 'appname' -CloseAppsCountdown 120
    }
}
```

## Logging

### Log Important Events

Log key milestones and decisions:

```powershell
Write-ADTLogEntry -Message "=== Starting $($ADTSession.DeploymentType) of $($ADTSession.InstallTitle) ==="
Write-ADTLogEntry -Message "Deployment Mode: $($ADTSession.DeployMode)"
Write-ADTLogEntry -Message "Running as: $(if ($ADTSession.IsSystemAccount) {'SYSTEM'} else {$env:USERNAME})"

# Log before critical operations
Write-ADTLogEntry -Message "Executing installer with arguments: /S /norestart"

# Log results
Write-ADTLogEntry -Message "Installer completed with exit code: $exitCode"
```

### Use Appropriate Severity Levels

- **Severity 1 (Info)**: Normal operations, progress updates
- **Severity 2 (Warning)**: Non-fatal issues, unexpected but handled conditions
- **Severity 3 (Error)**: Failures, exceptions

```powershell
Write-ADTLogEntry -Message "Installation started" -Severity 1
Write-ADTLogEntry -Message "Config file not found, using defaults" -Severity 2
Write-ADTLogEntry -Message "Installation failed: $errorMessage" -Severity 3
```

## Silent Deployment (Intune)

### Design for Silent First

Always ensure your script works in silent mode:

```powershell
# Skip UI elements in silent mode
if ($ADTSession.DeployMode -ne 'Silent') {
    Show-ADTInstallationProgress -StatusMessage 'Installing...'
}

# Force close apps in silent mode instead of prompting
if ($ADTSession.DeployMode -eq 'Silent') {
    Stop-ADTProcess -Name 'appname' -IgnoreErrors
} else {
    Show-ADTInstallationWelcome -CloseApps 'appname'
}
```

### Handle Reboots Appropriately

For Intune deployments, typically suppress reboots and let Intune handle them:

```powershell
# Suppress installer reboot
Start-ADTProcess -FilePath 'setup.exe' -Arguments '/S /norestart'

# Or for MSI
Start-ADTMsiProcess -Action Install -Path 'app.msi' -Parameters 'REBOOT=ReallySuppress'

# Return appropriate exit code for Intune
if ($rebootRequired) {
    Complete-ADTDeployment -DeploymentStatus 'RestartRequired'  # Returns 3010
}
```

## Prerequisites and Dependencies

### Check Prerequisites Before Installation

```powershell
#region Prerequisites Check
# Check disk space
$diskSpace = Get-ADTDiskSpace -Drive 'C:'
if ($diskSpace.FreeMB -lt 500) {
    throw "Insufficient disk space. Required: 500 MB, Available: $($diskSpace.FreeMB) MB"
}

# Check Windows version
if ($envOSVersionBuild -lt 17763) {
    throw "This application requires Windows 10 1809 or later"
}

# Check for required dependency
$dotNet = Get-ADTInstalledApplication -Name '.NET*Runtime*6*'
if (-not $dotNet) {
    Write-ADTLogEntry -Message "Installing .NET 6 Runtime prerequisite"
    Start-ADTProcess -FilePath "$($ADTSession.FilesDirectory)\dotnet-6-runtime.exe" -Arguments '/install /quiet /norestart'
}
#endregion
```

### Install Prerequisites Separately

For complex dependencies, consider separate packages:

```powershell
# Check for prerequisite, but don't install (handled by dependency in Intune)
$vcRuntime = Get-ADTInstalledApplication -Name '*Visual C++*2019*'
if (-not $vcRuntime) {
    Write-ADTLogEntry -Message "Visual C++ 2019 Runtime not found. This should be installed as a dependency." -Severity 2
    # Continue anyway - Intune dependency should have installed it
}
```

## MSI Best Practices

### Use Consistent MSI Parameters

```powershell
# Standard MSI install
Start-ADTMsiProcess -Action Install -Path "$($ADTSession.FilesDirectory)\app.msi" `
    -Parameters 'ALLUSERS=1 REBOOT=ReallySuppress'

# With logging
Start-ADTMsiProcess -Action Install -Path "$($ADTSession.FilesDirectory)\app.msi" `
    -Parameters 'ALLUSERS=1' `
    -LoggingOptions '/l*v'
```

### Uninstall by Product Code

For reliable uninstalls, use the product code:

```powershell
# Store product code as variable
$productCode = '{12345678-1234-1234-1234-123456789012}'

# Uninstall
Start-ADTMsiProcess -Action Uninstall -Path $productCode
```

## EXE Installer Best Practices

### Detect Installer Type

Handle different EXE installer types appropriately:

```powershell
# Inno Setup
Start-ADTProcess -FilePath 'setup.exe' -Arguments '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART'

# NSIS / Nullsoft
Start-ADTProcess -FilePath 'setup.exe' -Arguments '/S'

# InstallShield
Start-ADTProcess -FilePath 'setup.exe' -Arguments '/s /v"/qn REBOOT=ReallySuppress"'

# Unknown - try common flags
Start-ADTProcess -FilePath 'setup.exe' -Arguments '/S /silent /quiet /q' -IgnoreExitCodes '1'
```

## File and Registry Operations

### Use Safe Path Construction

```powershell
# Use Join-Path instead of string concatenation
$configPath = Join-Path -Path $env:ProgramData -ChildPath 'MyApp\config.xml'

# Handle spaces in paths
Start-ADTProcess -FilePath "`"$($ADTSession.FilesDirectory)\My Installer.exe`"" -Arguments '/S'
```

### Clean Up Temporary Files

```powershell
# In Post-Installation
try {
    Remove-ADTFile -Path "$env:TEMP\MyAppInstaller*" -Recurse -ContinueOnError
    Remove-ADTFolder -Path "$env:TEMP\MyAppSetup" -ContinueOnError
}
catch {
    Write-ADTLogEntry -Message "Cleanup warning: $($_.Exception.Message)" -Severity 2
}
```

## Testing Recommendations

### Test All Scenarios

1. **Interactive Install** - Verify all UI elements
2. **Silent Install** - Test Intune deployment scenario
3. **Uninstall** - Ensure clean removal
4. **Upgrade** - Test over previous version
5. **Repair** - If implemented

### Test on Clean Systems

- Use VM snapshots
- Test on different Windows versions
- Test with and without admin rights (if applicable)
- Test with applications running

### Validate in Intune

Before production deployment:
1. Upload to Intune test group
2. Verify detection rules work
3. Check logs in `C:\ProgramData\Microsoft\IntuneManagementExtension\Logs`
4. Verify application appears in "Apps & Features"

## Common Pitfalls to Avoid

1. **Don't hardcode paths** - Use environment variables and `$ADTSession`
2. **Don't skip error handling** - Always use try/catch
3. **Don't ignore exit codes** - Check installer return codes
4. **Don't forget uninstall** - Every install should have a matching uninstall
5. **Don't assume admin rights** - Check `$ADTSession.IsAdmin`
6. **Don't forget x86 apps on x64** - Check both Program Files locations
7. **Don't leave debug code** - Remove testing commands before production
8. **Don't skip logging** - Future you will thank present you

## Template Checklist

Before deploying, verify:

- [ ] Script runs without errors in silent mode
- [ ] All file paths use variables, not hardcoded strings
- [ ] Error handling wraps all critical operations
- [ ] Exit codes are handled appropriately
- [ ] Uninstall logic is implemented and tested
- [ ] Detection method returns accurate results
- [ ] Log entries provide useful troubleshooting info
- [ ] Prerequisites are checked or documented
- [ ] Cleanup removes temporary files
- [ ] Script is tested on clean VM
