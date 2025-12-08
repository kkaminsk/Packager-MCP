---
title: "PSADT v4 Overview"
id: "psadt-overview"
psadt_target: "4.1.x"
last_updated: "2024-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/V4DOCS.md#introduction"
tags: ["psadt", "overview", "architecture", "introduction", "v4.1"]
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

## Key Features in v4.1

- **No ServiceUI Required**: Intune deployments no longer need ServiceUI.exe for user interaction
- **Fluent UI**: Modern user interface with Light/Dark mode support
- **Module-based Architecture**: Digitally signed PowerShell module
- **PowerShell 7 and ARM Support**: Full compatibility with modern PowerShell
- **Extensions Support**: Supplemental modules for custom functionality
- **Group Policy Integration**: ADMX templates for enterprise configuration

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

The `$adtSession` hashtable defines your deployment. In v4.1, key properties include:

```powershell
$adtSession = @{
    # App variables
    AppVendor = 'Microsoft'
    AppName = 'Office 365'
    AppVersion = '16.0'
    AppArch = 'x64'
    AppLang = 'EN'
    AppRevision = '01'
    AppSuccessExitCodes = @(0)
    AppRebootExitCodes = @(1641, 3010)

    # v4.1: Processes to close (used across Install/Uninstall/Repair)
    AppProcessesToClose = @(@{ Name = 'winword'; Description = 'Microsoft Word' })

    # v4.1: Per-deployment admin requirement
    RequireAdmin = $true
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

## Basic Script Structure (v4.1)

```powershell
[CmdletBinding()]
param(
    [ValidateSet('Install', 'Uninstall', 'Repair')]
    [string]$DeploymentType,

    [ValidateSet('Auto', 'Interactive', 'NonInteractive', 'Silent')]
    [string]$DeployMode
)

$adtSession = @{
    AppVendor = 'Contoso'
    AppName = 'MyApp'
    AppVersion = '1.0.0'
    AppProcessesToClose = @(@{ Name = 'myapp'; Description = 'My Application' })
    RequireAdmin = $true
}

function Install-ADTDeployment {
    # Pre-Install
    $adtSession.InstallPhase = 'Pre-Install'
    Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -AllowDeferCloseProcesses -DeferTimes 3
    Show-ADTInstallationProgress

    # Install
    $adtSession.InstallPhase = 'Install'
    Start-ADTProcess -FilePath 'setup.exe' -ArgumentList '/S'

    # Post-Install
    $adtSession.InstallPhase = 'Post-Install'
    # Configure settings, remove shortcuts, etc.
}

function Uninstall-ADTDeployment {
    # Similar structure for uninstall
}

function Repair-ADTDeployment {
    # Similar structure for repair
}

# Initialization - import module and open session
$adtSession = Open-ADTSession @adtSession -PassThru

# Invocation
& "$($adtSession.DeploymentType)-ADTDeployment"
Close-ADTSession
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

| Feature | v3 | v4/v4.1 |
|---------|----|----|
| Main script | Deploy-Application.ps1 | Invoke-AppDeployToolkit.ps1 |
| Architecture | Single script | Module-based |
| Function prefix | None | ADT- prefix |
| State management | Variables ($appName) | $adtSession object |
| Config format | XML | PSD1 (PowerShell data) |
| UI | Classic only | Fluent + Classic |
| ServiceUI for Intune | Required | Not required (v4.1) |

## Resources

- Official Documentation: https://psappdeploytoolkit.com
- GitHub Repository: https://github.com/PSAppDeployToolkit/PSAppDeployToolkit
- Community Forums: https://discourse.psappdeploytoolkit.com
- Discord: #psappdeploytoolkit channel
