# MSIX/AppX Packaging Guide

MSIX (and its predecessor AppX) is Microsoft's modern application packaging format. It provides containerized installation with clean uninstall and improved security.

## MSIX Overview

### Key Features

- **Container-based isolation**: Apps run in a controlled environment
- **Clean uninstall**: All files and registry entries removed automatically
- **Side-by-side installation**: Multiple versions can coexist
- **Automatic updates**: Built-in update mechanism
- **Code signing required**: All packages must be signed

### Package Types

| Extension | Description |
|-----------|-------------|
| `.msix` | Single package |
| `.msixbundle` | Bundle containing multiple architectures |
| `.appx` | Legacy single package (Windows 8/8.1) |
| `.appxbundle` | Legacy bundle |

### Package Components

- **AppxManifest.xml**: Package metadata and capabilities
- **AppxBlockMap.xml**: File integrity information
- **AppxSignature.p7x**: Code signature
- **Assets/**: Icons and visual assets
- **Application files**: The actual application

## Installation Methods

### PowerShell Commands

```powershell
# Install for current user
Add-AppxPackage -Path "app.msix"

# Install for all users (requires admin)
Add-AppxPackage -Path "app.msix" -AllUsers

# Install from Microsoft Store (online)
Add-AppxPackage -AppInstallerFile "https://..."

# Install with dependencies
Add-AppxPackage -Path "app.msix" -DependencyPath "dependency.msix"

# Install provisioned package (for new users)
Add-AppxProvisionedPackage -Online -PackagePath "app.msix" -SkipLicense
```

### Silent Installation

MSIX packages are inherently silent - no user interaction is required:

```powershell
# Standard silent install
Add-AppxPackage -Path "app.msix"

# The command blocks until complete and throws on error
```

## PSADT Integration

### Basic MSIX Install

```powershell
# Using PowerShell cmdlet
$msixPath = "$($ADTSession.FilesDirectory)\app.msix"
Add-AppxPackage -Path $msixPath

# Or with PSADT process execution
Start-ADTProcess -FilePath 'powershell.exe' `
    -Arguments "-NoProfile -ExecutionPolicy Bypass -Command `"Add-AppxPackage -Path '$msixPath'`""
```

### Install with Dependencies

```powershell
$msixPath = "$($ADTSession.FilesDirectory)\app.msix"
$depPath = "$($ADTSession.FilesDirectory)\dependencies"

# Get all dependency packages
$dependencies = Get-ChildItem -Path $depPath -Filter "*.msix" | Select-Object -ExpandProperty FullName

# Install with dependencies
Add-AppxPackage -Path $msixPath -DependencyPath $dependencies
```

### Install for All Users

```powershell
# Requires running as SYSTEM (typical for Intune)
$msixPath = "$($ADTSession.FilesDirectory)\app.msix"

if ($ADTSession.IsSystemAccount) {
    Add-AppxProvisionedPackage -Online -PackagePath $msixPath -SkipLicense
} else {
    Add-AppxPackage -Path $msixPath
}
```

### Handling Bundles

```powershell
$bundlePath = "$($ADTSession.FilesDirectory)\app.msixbundle"

# Install bundle (correct architecture selected automatically)
Add-AppxPackage -Path $bundlePath
```

## Uninstallation

### By Package Name

```powershell
# Find package
$package = Get-AppxPackage -Name "*ApplicationName*"

# Remove for current user
Remove-AppxPackage -Package $package.PackageFullName

# Remove for all users
Remove-AppxPackage -Package $package.PackageFullName -AllUsers
```

### By Package Family Name

```powershell
# Get package family name from manifest or installed package
$packageFamilyName = "Publisher.AppName_abcdef123"

# Remove all versions
Get-AppxPackage -PackageFamilyName $packageFamilyName | Remove-AppxPackage
```

### Remove Provisioned Package

```powershell
# This prevents installation for new users
$package = Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -like "*AppName*" }
Remove-AppxProvisionedPackage -Online -PackageName $package.PackageName
```

## Detection Methods

### Check if MSIX is Installed

```powershell
# By name
$app = Get-AppxPackage -Name "Publisher.AppName"
if ($app) {
    Write-Output "Installed: $($app.Version)"
}

# By package family name
$app = Get-AppxPackage -PackageFamilyName "Publisher.AppName_abcdef123"

# For all users (as admin)
$app = Get-AppxPackage -Name "Publisher.AppName" -AllUsers
```

### Intune Detection Script

```powershell
$packageName = "Publisher.AppName"
$requiredVersion = [version]"1.0.0"

$package = Get-AppxPackage -Name $packageName -ErrorAction SilentlyContinue
if ($package -and [version]$package.Version -ge $requiredVersion) {
    Write-Output "Detected version $($package.Version)"
    exit 0
}
exit 1
```

## Package Information

### Get Package Details

```powershell
# List all MSIX packages
Get-AppxPackage | Select-Object Name, Version, Publisher, PackageFamilyName

# Get specific package
$package = Get-AppxPackage -Name "Publisher.AppName"
$package | Format-List *

# Important properties
$package.Name
$package.Version
$package.Publisher
$package.PackageFamilyName
$package.PackageFullName
$package.InstallLocation
```

### Read Manifest

```powershell
$package = Get-AppxPackage -Name "Publisher.AppName"
$manifestPath = Join-Path $package.InstallLocation "AppxManifest.xml"
[xml]$manifest = Get-Content $manifestPath
$manifest.Package.Identity
```

## Common Scenarios

### Install Dependencies First

MSIX often requires VCLibs and other framework packages:

```powershell
# Common dependencies
$dependencies = @(
    "Microsoft.VCLibs.140.00",
    "Microsoft.VCLibs.140.00.UWPDesktop",
    "Microsoft.NET.Native.Framework.2.2",
    "Microsoft.NET.Native.Runtime.2.2"
)

foreach ($dep in $dependencies) {
    $installed = Get-AppxPackage -Name $dep
    if (-not $installed) {
        $depFile = Get-ChildItem -Path "$($ADTSession.FilesDirectory)\dependencies" `
            -Filter "$dep*.appx" | Select-Object -First 1
        if ($depFile) {
            Add-AppxPackage -Path $depFile.FullName
        }
    }
}
```

### Handle Version Conflicts

```powershell
# Remove existing version before installing
$existing = Get-AppxPackage -Name "Publisher.AppName"
if ($existing) {
    Write-ADTLogEntry -Message "Removing existing version: $($existing.Version)"
    Remove-AppxPackage -Package $existing.PackageFullName
}

Add-AppxPackage -Path "$($ADTSession.FilesDirectory)\app.msix"
```

### Store-Signed vs Enterprise-Signed

```powershell
# For enterprise-signed packages, may need to trust the certificate
$certPath = "$($ADTSession.FilesDirectory)\app.cer"
if (Test-Path $certPath) {
    Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\LocalMachine\TrustedPeople
}
```

## Limitations and Considerations

### What MSIX Cannot Do

- Kernel-mode drivers
- Direct registry access outside container
- Windows services (with some exceptions)
- COM registration (limited support)
- Shell extensions (limited support)
- Boot-time components

### Sideloading Requirements

For non-Store packages:

1. **Developer Mode** or **Sideload apps** enabled in Settings
2. Valid code signature from trusted certificate
3. Dependencies available

```powershell
# Check if sideloading is enabled
$policy = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -ErrorAction SilentlyContinue
if ($policy.AllowAllTrustedApps -eq 1 -or $policy.AllowDevelopmentWithoutDevLicense -eq 1) {
    Write-Output "Sideloading enabled"
}
```

### Package Signing

All MSIX packages must be signed:

```powershell
# Check signature
$signature = Get-AuthenticodeSignature -FilePath "app.msix"
$signature.Status  # Should be "Valid"
$signature.SignerCertificate.Subject
```

## Complete PSADT Example

```powershell
#Requires -Version 5.1

[CmdletBinding()]
param (
    [ValidateSet('Install', 'Uninstall', 'Repair')]
    [string]$DeploymentType = 'Install',
    [ValidateSet('Interactive', 'Silent', 'NonInteractive')]
    [string]$DeployMode = 'Interactive'
)

Import-Module "$PSScriptRoot\PSAppDeployToolkit" -Force

$packageName = "Publisher.ApplicationName"
$packageFamilyName = "Publisher.ApplicationName_abcdef123456"

Initialize-ADTDeployment @{
    InstallName = 'Application Name'
    InstallVersion = '1.0.0'
    Publisher = 'Publisher'
    DeploymentType = $DeploymentType
    DeployMode = $DeployMode
}

try {
    switch ($DeploymentType) {
        'Install' {
            Show-ADTInstallationProgress -StatusMessage 'Installing Application Name...'

            # Install dependencies
            $depPath = Join-Path -Path $ADTSession.FilesDirectory -ChildPath 'dependencies'
            if (Test-Path $depPath) {
                $dependencies = Get-ChildItem -Path $depPath -Filter "*.appx"
                foreach ($dep in $dependencies) {
                    Write-ADTLogEntry -Message "Installing dependency: $($dep.Name)"
                    try {
                        Add-AppxPackage -Path $dep.FullName -ErrorAction Stop
                    } catch {
                        Write-ADTLogEntry -Message "Dependency may already be installed: $($_.Exception.Message)" -Severity 2
                    }
                }
            }

            # Remove existing version if present
            $existing = Get-AppxPackage -Name $packageName -ErrorAction SilentlyContinue
            if ($existing) {
                Write-ADTLogEntry -Message "Removing existing version: $($existing.Version)"
                Remove-AppxPackage -Package $existing.PackageFullName
            }

            # Install MSIX package
            $msixPath = Join-Path -Path $ADTSession.FilesDirectory -ChildPath 'app.msix'
            Write-ADTLogEntry -Message "Installing MSIX package: $msixPath"

            if ($ADTSession.IsSystemAccount) {
                # Running as SYSTEM - provision for all users
                Add-AppxProvisionedPackage -Online -PackagePath $msixPath -SkipLicense
            } else {
                # Running as user
                Add-AppxPackage -Path $msixPath
            }

            # Verify installation
            $installed = Get-AppxPackage -Name $packageName -ErrorAction SilentlyContinue
            if (-not $installed) {
                throw "Installation verification failed - package not found"
            }
            Write-ADTLogEntry -Message "Successfully installed version: $($installed.Version)"
        }
        'Uninstall' {
            Write-ADTLogEntry -Message "Uninstalling $packageName"

            # Remove provisioned package first (if running as admin)
            if ($ADTSession.IsAdmin) {
                $provisioned = Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq $packageName }
                if ($provisioned) {
                    Remove-AppxProvisionedPackage -Online -PackageName $provisioned.PackageName
                }
            }

            # Remove installed package for all users
            $packages = Get-AppxPackage -Name $packageName -AllUsers -ErrorAction SilentlyContinue
            foreach ($package in $packages) {
                Write-ADTLogEntry -Message "Removing package: $($package.PackageFullName)"
                Remove-AppxPackage -Package $package.PackageFullName -AllUsers
            }
        }
        'Repair' {
            Write-ADTLogEntry -Message "Repair requested - reinstalling package"

            # Remove and reinstall
            $existing = Get-AppxPackage -Name $packageName -ErrorAction SilentlyContinue
            if ($existing) {
                Remove-AppxPackage -Package $existing.PackageFullName
            }

            $msixPath = Join-Path -Path $ADTSession.FilesDirectory -ChildPath 'app.msix'
            Add-AppxPackage -Path $msixPath
        }
    }

    Complete-ADTDeployment -DeploymentStatus 'Complete'
}
catch {
    Write-ADTLogEntry -Message "Error: $($_.Exception.Message)" -Severity 3
    Complete-ADTDeployment -DeploymentStatus 'Failed' -ErrorMessage $_.Exception.Message
}
```

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 0x80073CF9 | Package dependency issue | Install all required dependencies |
| 0x80073CFB | Package already installed | Remove existing version first |
| 0x80073CF3 | Package validation failed | Check package signature |
| 0x80073CFF | Sideloading not enabled | Enable sideloading in Settings |

### Debug Installation

```powershell
# Enable verbose logging
Add-AppxPackage -Path "app.msix" -Verbose

# Check event logs
Get-WinEvent -LogName Microsoft-Windows-AppXDeployment/Operational -MaxEvents 20

# Check AppX deployment service
Get-Service AppXSvc
```

### Package Analysis

```powershell
# Examine package contents
Expand-Archive -Path "app.msix" -DestinationPath "extracted" -Force

# Or use makeappx
makeappx.exe unpack /p app.msix /d extracted
```
