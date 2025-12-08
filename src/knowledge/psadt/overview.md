---
title: "PSADT v4 Overview"
id: "psadt-overview"
psadt_target: "4.1.7"
last_updated: "2025-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/V4Assets/PSAppDeployToolkit"
tags: ["psadt", "overview", "architecture", "introduction", "v4.1.7"]
---

# PSADT v4 Overview

PowerShell Application Deployment Toolkit (PSADT) is a framework that simplifies complex scripting for enterprise application deployment, providing a consistent user experience. It provides well-defined functions for common deployment tasks, as well as user interface elements for end-user interaction.

## System Requirements

| Component | Requirement |
|-----------|-------------|
| PowerShell | Windows PowerShell 5.1 or PowerShell (Core) 7.4+ |
| .NET Framework | 4.7.2 or higher |
| Windows Client | Windows 10 (1809+), Windows 11 |
| Windows Server | 2016, 2019, 2022, 2025 |

## Key Features in v4.1.7

- **No ServiceUI Required**: Intune deployments no longer need ServiceUI.exe for user interaction
- **Fluent UI**: Modern user interface with Light/Dark mode support (default: `DialogStyle = 'Fluent'`)
- **Module-based Architecture**: Digitally signed PowerShell module (GUID: `8c3c366b-8606-4576-9f2d-4051144f7ca2`)
- **PowerShell 7 and ARM Support**: Full compatibility with modern PowerShell (requires 5.1.14393.0+)
- **Extensions Support**: Supplemental modules via `PSAppDeployToolkit.Extensions`
- **Group Policy Integration**: ADMX templates for enterprise configuration
- **135 Exported Functions**: Comprehensive function library with `ADT` prefix
- **CMTrace Log Format**: Native support for CMTrace-compatible logging

## Deployment Template Structure (v4 Native)

```
Package/
├── Invoke-AppDeployToolkit.ps1    # Main deployment script
├── Invoke-AppDeployToolkit.exe    # Launcher executable
├── PSAppDeployToolkit/            # Core module (do not modify)
├── PSAppDeployToolkit.Extensions/ # Optional custom extensions
├── Files/                         # Installer files go here
├── SupportFiles/                  # Additional support files
├── Assets/
│   └── AppIcon.png               # 256x256 PNG for branding
├── Config/
│   └── config.psd1               # Configuration settings
└── Strings/
    └── strings.psd1              # UI text localization
```

## Session Object ($adtSession)

The `$adtSession` hashtable defines your deployment. In v4.1.7, key properties include:

```powershell
$adtSession = @{
    # App variables
    AppVendor = ''
    AppName = ''
    AppVersion = ''
    AppArch = ''
    AppLang = 'EN'
    AppRevision = '01'
    AppSuccessExitCodes = @(0)
    AppRebootExitCodes = @(1641, 3010)

    # Processes to close (array of strings or hashtables)
    AppProcessesToClose = @()  # Example: @('excel', @{ Name = 'winword'; Description = 'Microsoft Word' })

    # Script metadata
    AppScriptVersion = '1.0.0'
    AppScriptDate = '2000-12-31'
    AppScriptAuthor = '<author name>'

    # Per-deployment admin requirement
    RequireAdmin = $true

    # Install titles (optional - overrides auto-generated)
    InstallName = ''
    InstallTitle = ''

    # Script info (auto-populated)
    DeployAppScriptFriendlyName = $MyInvocation.MyCommand.Name
    DeployAppScriptParameters = $PSBoundParameters
    DeployAppScriptVersion = '4.1.7'
}
```

## Deployment Types and Phases

| Deployment Type | Phases |
|-----------------|--------|
| `Install-ADTDeployment` | Pre-Install → Install → Post-Install |
| `Uninstall-ADTDeployment` | Pre-Uninstall → Uninstall → Post-Uninstall |
| `Repair-ADTDeployment` | Pre-Repair → Repair → Post-Repair |

## DeployMode Options (v4.1)

| Mode | Behavior |
|------|----------|
| `Auto` | **Default in v4.1**. Shows UI unless in OOBE/ESP, no user logged on, or no processes to close |
| `Interactive` | Always shows UI dialogs |
| `NonInteractive` | Shows progress but no prompts |
| `Silent` | No UI at all |

## Basic Script Structure (v4.1.7)

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
    Start-ADTProcess -FilePath 'setup.exe' -ArgumentList '/S'

    # Post-Install
    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"
    # Configure settings, remove shortcuts, etc.
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
    # Uninstall logic here

    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"
}

function Repair-ADTDeployment {
    [CmdletBinding()]
    param()
    # Similar structure for repair
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

## Zero-Config MSI Deployment

For simple MSI deployments, leave `AppName` empty and place MSI in `Files/`:

1. Leave `AppName` empty in session hashtable
2. Place `.msi` file in `Files/` folder
3. Optionally add `.mst` file with same name
4. PSADT auto-detects and installs the MSI

## Integration with Intune

**v4.1 Improvement**: No ServiceUI.exe required!

```powershell
# Install command
Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent

# Uninstall command
Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent
```

For interactive deployments, simply omit `-DeployMode Silent` - PSADT handles user interaction automatically.

## Comparison: v3 vs v4

| Feature | v3 | v4.1.7 |
|---------|----|----|
| Main script | Deploy-Application.ps1 | Invoke-AppDeployToolkit.ps1 |
| Architecture | Single script | Module-based (PowerShell module) |
| Function prefix | None | ADT- prefix (135 functions) |
| State management | Variables ($appName) | $adtSession object |
| Config format | XML | PSD1 (PowerShell data files) |
| UI Style | Classic only | Fluent (default) + Classic |
| ServiceUI for Intune | Required | Not required |
| Default timeout | 60 minutes | 55 minutes (better Intune compat) |
| Defer exit code | Custom | 1602 (default) |
| Module GUID | N/A | 8c3c366b-8606-4576-9f2d-4051144f7ca2 |

## Resources

- Official Documentation: https://psappdeploytoolkit.com
- GitHub Repository: https://github.com/PSAppDeployToolkit/PSAppDeployToolkit
- Community Forums: https://discourse.psappdeploytoolkit.com
- Discord: #psappdeploytoolkit channel
