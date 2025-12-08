# PSADT v4 Overview

PowerShell Application Deployment Toolkit (PSADT) v4 is a comprehensive framework for deploying applications in enterprise environments. Version 4 introduces a module-based architecture that improves maintainability, testing, and extensibility.

## Key Features

- **Silent deployment** with optional user interaction
- **Application lifecycle management** (install, uninstall, repair)
- **User session handling** for deployments during active user sessions
- **Logging and error handling** built-in
- **Balloon notifications** and progress dialogs
- **Application detection** before and after deployment
- **Prerequisite handling** and dependency checks
- **Reboot management** with user prompts

## Architecture

PSADT v4 uses a module-based architecture:

```
PSAppDeployToolkit/
├── PSAppDeployToolkit.psd1    # Module manifest
├── PSAppDeployToolkit.psm1    # Main module
├── Public/                     # Exported functions
├── Private/                    # Internal functions
└── AppDeployToolkit/
    ├── Deploy-Application.ps1  # Your deployment script
    └── Files/                  # Installer files
```

## Session Object ($ADTSession)

The `$ADTSession` variable is central to PSADT v4. It maintains state throughout the deployment:

```powershell
$ADTSession.InstallName        # Application name being deployed
$ADTSession.DeploymentType     # Install, Uninstall, or Repair
$ADTSession.DeployMode         # Interactive, Silent, or NonInteractive
$ADTSession.IsAdmin            # Whether running with admin rights
$ADTSession.LogName            # Log file name
```

## Deployment Phases

1. **Initialization**: Import module, configure session
2. **Pre-Installation**: Close apps, check prerequisites, show welcome
3. **Installation**: Execute installer with appropriate arguments
4. **Post-Installation**: Configure settings, create shortcuts, verify
5. **Finalization**: Handle reboots, clean up, log results

## Basic Script Structure

```powershell
#Requires -Version 5.1
using namespace PSADT.Module

[CmdletBinding()]
param (
    [ValidateSet('Install', 'Uninstall', 'Repair')]
    [string]$DeploymentType = 'Install',
    [ValidateSet('Interactive', 'Silent', 'NonInteractive')]
    [string]$DeployMode = 'Interactive'
)

# Import PSADT module
Import-Module "$PSScriptRoot\PSAppDeployToolkit" -Force

# Initialize deployment
$adtSession = @{
    InstallName = 'Application Name'
    InstallVersion = '1.0.0'
    Publisher = 'Publisher Name'
    DeploymentType = $DeploymentType
    DeployMode = $DeployMode
}
Initialize-ADTDeployment @adtSession

try {
    switch ($DeploymentType) {
        'Install' {
            # Pre-Installation
            Show-ADTInstallationWelcome -CloseApps 'app1,app2'

            # Installation
            Start-ADTProcess -FilePath 'installer.exe' -Arguments '/S'

            # Post-Installation
            # Configure application settings
        }
        'Uninstall' {
            Show-ADTInstallationWelcome -CloseApps 'app1,app2'
            Start-ADTProcess -FilePath 'uninstaller.exe' -Arguments '/S'
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

## Comparison: PSADT v3 vs v4

| Feature | v3 | v4 |
|---------|----|----|
| Architecture | Single script | Module-based |
| Function prefix | None | ADT- prefix |
| State management | Variables | $ADTSession object |
| Error handling | Manual | Structured |
| Testing | Difficult | Unit testable |

## When to Use PSADT

Use PSADT when you need:

- Consistent deployment experience across applications
- User interaction during deployment (close apps, prompts)
- Detailed logging for troubleshooting
- Handling of complex prerequisites
- Support for different deployment scenarios (user vs system context)

## Integration with Intune

PSADT works well with Intune Win32 app deployments:

1. Package PSADT folder with IntuneWinAppUtil.exe
2. Set install command: `Deploy-Application.exe -DeploymentType Install -DeployMode Silent`
3. Set uninstall command: `Deploy-Application.exe -DeploymentType Uninstall -DeployMode Silent`
4. Configure detection rules based on installed application

## Resources

- Official Documentation: https://psappdeploytoolkit.com
- GitHub Repository: https://github.com/PSAppDeployToolkit/PSAppDeployToolkit
- Community Forums: https://discourse.psappdeploytoolkit.com
