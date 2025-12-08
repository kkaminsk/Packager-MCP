---
title: "PSADT v4 Best Practices"
id: "psadt-best-practices"
psadt_target: "4.1.x"
last_updated: "2024-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/Examples/"
tags: ["psadt", "best-practices", "patterns", "deployment", "v4.1"]
---

# PSADT v4 Best Practices

Best practices for creating reliable, maintainable PSADT v4.1 deployment packages, derived from real-world examples.

## Script Structure (v4.1)

### Use Function-Based Structure

In v4.1, use separate functions for each deployment type:

```powershell
function Install-ADTDeployment {
    # Pre-Install
    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"
    Show-ADTInstallationWelcome @saiwParams
    Show-ADTInstallationProgress

    # Install
    $adtSession.InstallPhase = $adtSession.DeploymentType
    Start-ADTProcess -FilePath 'setup.exe' -ArgumentList '/S'

    # Post-Install
    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"
    # Cleanup, configuration
}

function Uninstall-ADTDeployment {
    # Similar structure
}

function Repair-ADTDeployment {
    # Similar structure
}
```

### Use AppProcessesToClose (v4.1)

Define processes to close once in the session, reuse everywhere:

```powershell
$adtSession = @{
    AppProcessesToClose = @(
        @{ Name = 'vlc'; Description = 'VLC media player' },
        @{ Name = 'winword'; Description = 'Microsoft Word' }
    )
    # other properties...
}

# In Install-ADTDeployment:
if ($adtSession.AppProcessesToClose.Count -gt 0) {
    $saiwParams.Add('CloseProcesses', $adtSession.AppProcessesToClose)
}
Show-ADTInstallationWelcome @saiwParams
```

### Use Parameter Splatting

v4.1 recommends splatting for cleaner code:

```powershell
$saiwParams = @{
    AllowDeferCloseProcesses = $true
    DeferTimes = 3
    PersistPrompt = $true
}
if ($adtSession.AppProcessesToClose.Count -gt 0) {
    $saiwParams.Add('CloseProcesses', $adtSession.AppProcessesToClose)
}
Show-ADTInstallationWelcome @saiwParams
```

## Error Handling

### Proper Try/Catch Pattern

```powershell
# Initialization
try {
    $adtSession = Open-ADTSession @adtSession -PassThru
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
    $mainErrorMessage = "Deployment failed: $(Resolve-ADTErrorRecord -ErrorRecord $_)"
    Write-ADTLogEntry -Message $mainErrorMessage -Severity 3
    Show-ADTInstallationPrompt -Message "Installation failed." -ButtonRightText OK -Icon Error -NoWait
    Close-ADTSession -ExitCode 60001
}
```

## Process Management

### Graceful App Closing with Defer

Give users time to save work:

```powershell
$saiwParams = @{
    AllowDeferCloseProcesses = $true
    DeferTimes = 3
    PersistPrompt = $true
}
if ($adtSession.AppProcessesToClose.Count -gt 0) {
    $saiwParams.Add('CloseProcesses', $adtSession.AppProcessesToClose)
}
Show-ADTInstallationWelcome @saiwParams
```

### Force Close for Uninstall

For uninstalls, use countdown instead of defer:

```powershell
# In Uninstall-ADTDeployment
if ($adtSession.AppProcessesToClose.Count -gt 0) {
    Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -CloseProcessesCountdown 60
}
```

## Installation Patterns

### EXE Installation (VLC Example)

```powershell
function Install-ADTDeployment {
    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"

    $saiwParams = @{
        AllowDeferCloseProcesses = $true
        DeferTimes = 3
        PersistPrompt = $true
    }
    if ($adtSession.AppProcessesToClose.Count -gt 0) {
        $saiwParams.Add('CloseProcesses', $adtSession.AppProcessesToClose)
    }
    Show-ADTInstallationWelcome @saiwParams
    Show-ADTInstallationProgress

    $adtSession.InstallPhase = $adtSession.DeploymentType

    # Install with language and silent switch
    Start-ADTProcess -FilePath "vlc-$($adtSession.AppVersion)-win64.exe" -ArgumentList '/L=1033 /S'

    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"

    # Remove unwanted shortcuts
    Remove-ADTFile -Path "$envCommonDesktop\VLC media player.lnk","$envCommonStartMenuPrograms\VideoLAN\Release Notes.lnk"

    # Copy user settings
    Copy-ADTFileToUserProfiles -Path "$($adtSession.DirSupportFiles)\vlc" -Destination 'AppData\Roaming' -Recurse

    # Show completion (non-blocking)
    if (!$adtSession.UseDefaultMsi) {
        Show-ADTInstallationPrompt -Message "$($adtSession.AppName) installation complete." -ButtonRightText 'OK' -Icon Information -NoWait
    }
}
```

### EXE Uninstallation (WinRAR Example)

```powershell
function Uninstall-ADTDeployment {
    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"

    if ($adtSession.AppProcessesToClose.Count -gt 0) {
        Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -CloseProcessesCountdown 60
    }
    Show-ADTInstallationProgress

    $adtSession.InstallPhase = 'Uninstall'

    # Try vendor uninstaller first
    $uninstPath = Join-Path $env:ProgramFiles 'WinRAR\uninstall.exe'
    if (Test-Path -LiteralPath $uninstPath) {
        Start-ADTProcess -FilePath $uninstPath -ArgumentList '/S'
    }
    else {
        # Fallback: use Uninstall-ADTApplication
        Uninstall-ADTApplication -FilterScript { $_.DisplayName -match 'WinRAR' } -ApplicationType EXE -ArgumentList '/S' -ErrorAction SilentlyContinue
    }

    $adtSession.InstallPhase = 'Post-Uninstall'
}
```

### Zero-Config MSI Handling

When using zero-config (empty AppName), handle MSI in Install function:

```powershell
$adtSession.InstallPhase = $adtSession.DeploymentType

# Handle Zero-Config MSI installations
if ($adtSession.UseDefaultMsi) {
    $ExecuteDefaultMSISplat = @{ Action = $adtSession.DeploymentType; FilePath = $adtSession.DefaultMsiFile }
    if ($adtSession.DefaultMstFile) {
        $ExecuteDefaultMSISplat.Add('Transforms', $adtSession.DefaultMstFile)
    }
    Start-ADTMsiProcess @ExecuteDefaultMSISplat
    if ($adtSession.DefaultMspFiles) {
        $adtSession.DefaultMspFiles | Start-ADTMsiProcess -Action Patch
    }
}
```

## Silent/Intune Deployment

### No ServiceUI Required (v4.1)

v4.1 handles user interaction without ServiceUI:

```powershell
# Install command for Intune:
Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent

# Uninstall command:
Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent
```

### DeployMode Auto (v4.1 Default)

Let PSADT decide when to show UI:

```powershell
# With Auto mode (default in v4.1):
# - Shows UI if user is logged on AND not in OOBE/ESP AND processes to close are running
# - Silent otherwise
Invoke-AppDeployToolkit.exe -DeploymentType Install
```

### Conditional UI Display

```powershell
# Only show completion message in interactive modes
if ($adtSession.DeployMode -ne 'Silent') {
    Show-ADTInstallationPrompt -Message "$($adtSession.AppName) installation complete." -Icon Information -ButtonRightText 'OK' -NoWait
}
```

## Logging Best Practices

### Log Context at Start

```powershell
Write-ADTLogEntry -Message "=== Deployment Context ==="
Write-ADTLogEntry -Message "App: $($adtSession.AppVendor) $($adtSession.AppName) $($adtSession.AppVersion)"
Write-ADTLogEntry -Message "Type: $($adtSession.DeploymentType)"
Write-ADTLogEntry -Message "Mode: $($adtSession.DeployMode)"
Write-ADTLogEntry -Message "Computer: $envComputerName"
Write-ADTLogEntry -Message "IsAdmin: $($adtSession.IsAdmin)"
Write-ADTLogEntry -Message "IsSystem: $($adtSession.IsSystemAccount)"
```

### Log Key Operations

```powershell
Write-ADTLogEntry -Message "Executing: setup.exe /S"
$result = Start-ADTProcess -FilePath 'setup.exe' -ArgumentList '/S' -PassThru
Write-ADTLogEntry -Message "Exit code: $($result.ExitCode)"
```

## Post-Installation Cleanup

### Remove Unwanted Shortcuts

```powershell
$adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"

# Remove desktop shortcuts
Remove-ADTFile -Path "$envCommonDesktop\Application.lnk"

# Remove unnecessary Start Menu items
Remove-ADTFile -Path @(
    "$envCommonStartMenuPrograms\Vendor\Release Notes.lnk",
    "$envCommonStartMenuPrograms\Vendor\Website.lnk",
    "$envCommonStartMenuPrograms\Vendor\Uninstall.lnk"
)
```

### Copy User Configuration

```powershell
# Copy preconfigured settings to all user profiles
Copy-ADTFileToUserProfiles -Path "$($adtSession.DirSupportFiles)\config" -Destination 'AppData\Roaming\AppName' -Recurse
```

## Repair Implementation

Repair typically reinstalls over existing:

```powershell
function Repair-ADTDeployment {
    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"

    if ($adtSession.AppProcessesToClose.Count -gt 0) {
        Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -CloseProcessesCountdown 60
    }
    Show-ADTInstallationProgress

    $adtSession.InstallPhase = $adtSession.DeploymentType

    # Uninstall first
    Uninstall-ADTApplication -Name $adtSession.AppName -NameMatch 'Exact' -ArgumentList '/S'

    # Reinstall
    Start-ADTProcess -FilePath "setup-$($adtSession.AppVersion).exe" -ArgumentList '/S'

    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"

    # Reapply post-install config
    Remove-ADTFile -Path "$envCommonDesktop\$($adtSession.AppName).lnk"
}
```

## Testing Checklist

Before deployment, verify:

- [ ] **Silent Install** works (`-DeployMode Silent`)
- [ ] **Silent Uninstall** works
- [ ] **Detection** returns correct result in Intune
- [ ] **Processes close** gracefully with countdown
- [ ] **Exit codes** are appropriate (0, 3010, etc.)
- [ ] **Logs** provide useful troubleshooting info
- [ ] **Cleanup** removes shortcuts/temp files
- [ ] **Repair** (if implemented) works correctly

## Common Pitfalls

1. **Don't hardcode paths** - Use `$adtSession.DirFiles`, `$envProgramFiles`
2. **Don't skip uninstall** - Every install needs matching uninstall
3. **Don't ignore exit codes** - Check and handle appropriately
4. **Don't assume interactive** - Design for silent first
5. **Don't use ServiceUI** - v4.1 handles user interaction natively
6. **Don't duplicate process lists** - Use `AppProcessesToClose`
7. **Don't skip logging** - Future troubleshooting depends on it
