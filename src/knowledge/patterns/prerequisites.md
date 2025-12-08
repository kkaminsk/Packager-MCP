---
title: "Prerequisites Handling Patterns"
id: "kb-patterns-prerequisites"
psadt_target: "4.0.x"
last_updated: "2024-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/Examples/"
tags: ["prerequisites", "patterns", "dependencies", "runtime"]
---

# Prerequisites Handling Patterns

Many applications require prerequisites (dependencies) to be installed before the main application. This guide covers patterns for handling prerequisites in PSADT deployments.

## Common Prerequisites

### Runtime Libraries

| Prerequisite | Common Apps | Detection |
|--------------|-------------|-----------|
| .NET Framework 4.8 | Most .NET apps | Registry key |
| .NET 6/7/8 Runtime | Modern .NET apps | Registry key |
| Visual C++ Redistributable | Native apps | Registry key |
| Java Runtime | Java apps | Registry/File |
| DirectX | Games, media apps | File check |
| WebView2 | Modern web UIs | Registry key |

### Framework Dependencies

| Prerequisite | Package Name | Silent Install |
|--------------|--------------|----------------|
| VC++ 2015-2022 x64 | VC_redist.x64.exe | `/install /quiet /norestart` |
| VC++ 2015-2022 x86 | VC_redist.x86.exe | `/install /quiet /norestart` |
| .NET 4.8 | ndp48-x86-x64-allos-enu.exe | `/q /norestart` |
| .NET 6 Runtime | dotnet-runtime-6.0.x-win-x64.exe | `/install /quiet /norestart` |
| .NET 6 Desktop Runtime | windowsdesktop-runtime-6.0.x-win-x64.exe | `/install /quiet /norestart` |
| WebView2 | MicrosoftEdgeWebview2Setup.exe | `/silent /install` |

## Detection Functions

### .NET Framework Detection

```powershell
function Test-DotNetFrameworkVersion {
    param (
        [version]$RequiredVersion = "4.8"
    )

    $ndpKey = "HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full"
    if (Test-Path $ndpKey) {
        $release = (Get-ItemProperty -Path $ndpKey -Name Release -ErrorAction SilentlyContinue).Release

        # Release key mapping
        $versionMap = @{
            528040 = "4.8"      # Windows 10 May 2019 Update
            528049 = "4.8"      # Other Windows
            533320 = "4.8.1"    # Windows 11 and Server 2022
        }

        foreach ($key in $versionMap.Keys | Sort-Object -Descending) {
            if ($release -ge $key) {
                return [version]$versionMap[$key] -ge $RequiredVersion
            }
        }
    }
    return $false
}
```

### .NET Runtime Detection (Modern)

```powershell
function Test-DotNetRuntimeVersion {
    param (
        [string]$RuntimeType = "Microsoft.NETCore.App",  # or Microsoft.WindowsDesktop.App
        [version]$RequiredVersion = "6.0.0"
    )

    $runtimes = & dotnet --list-runtimes 2>$null
    if ($LASTEXITCODE -ne 0) { return $false }

    foreach ($runtime in $runtimes) {
        if ($runtime -match "$RuntimeType\s+(\d+\.\d+\.\d+)") {
            if ([version]$Matches[1] -ge $RequiredVersion) {
                return $true
            }
        }
    }
    return $false
}
```

### Visual C++ Redistributable Detection

```powershell
function Test-VCRedistInstalled {
    param (
        [ValidateSet("x86", "x64", "Both")]
        [string]$Architecture = "Both",
        [version]$MinimumVersion = "14.0.0.0"  # 2015+
    )

    $installed = @{x86 = $false; x64 = $false}

    $regPaths = @{
        x64 = "HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\X64"
        x86 = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\X86"
    }

    foreach ($arch in $regPaths.Keys) {
        if (Test-Path $regPaths[$arch]) {
            $vcInfo = Get-ItemProperty -Path $regPaths[$arch]
            $version = [version]"$($vcInfo.Major).$($vcInfo.Minor).$($vcInfo.Bld).0"
            if ($version -ge $MinimumVersion) {
                $installed[$arch] = $true
            }
        }
    }

    switch ($Architecture) {
        "x86"  { return $installed.x86 }
        "x64"  { return $installed.x64 }
        "Both" { return ($installed.x86 -and $installed.x64) }
    }
}
```

### WebView2 Detection

```powershell
function Test-WebView2Installed {
    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        "HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
    )

    foreach ($path in $regPaths) {
        if (Test-Path $path) {
            $version = (Get-ItemProperty -Path $path -Name pv -ErrorAction SilentlyContinue).pv
            if ($version) {
                return $true
            }
        }
    }
    return $false
}
```

### Java Detection

```powershell
function Test-JavaInstalled {
    param (
        [version]$RequiredVersion = "1.8.0"
    )

    # Check registry
    $javaKeys = @(
        "HKLM:\SOFTWARE\JavaSoft\Java Runtime Environment",
        "HKLM:\SOFTWARE\JavaSoft\JRE",
        "HKLM:\SOFTWARE\WOW6432Node\JavaSoft\Java Runtime Environment"
    )

    foreach ($key in $javaKeys) {
        if (Test-Path $key) {
            $currentVersion = (Get-ItemProperty -Path $key -Name CurrentVersion -ErrorAction SilentlyContinue).CurrentVersion
            if ($currentVersion -and [version]$currentVersion -ge $RequiredVersion) {
                return $true
            }
        }
    }

    # Fallback: check java.exe
    $javaExe = Get-Command java.exe -ErrorAction SilentlyContinue
    if ($javaExe) {
        $versionOutput = & java.exe -version 2>&1
        if ($versionOutput -match 'version "(\d+\.\d+\.\d+)') {
            return [version]$Matches[1] -ge $RequiredVersion
        }
    }

    return $false
}
```

## Installation Patterns

### Pattern 1: Check and Install

```powershell
#region Prerequisites
Write-ADTLogEntry -Message "Checking prerequisites..."

# .NET 4.8
if (-not (Test-DotNetFrameworkVersion -RequiredVersion "4.8")) {
    Write-ADTLogEntry -Message "Installing .NET Framework 4.8"
    Show-ADTInstallationProgress -StatusMessage "Installing .NET Framework 4.8..."

    $dotnetInstaller = Join-Path $ADTSession.FilesDirectory "ndp48-x86-x64-allos-enu.exe"
    $result = Start-ADTProcess -FilePath $dotnetInstaller -Arguments '/q /norestart' -PassThru

    if ($result.ExitCode -eq 3010) {
        Write-ADTLogEntry -Message ".NET 4.8 installed - restart required" -Severity 2
        $rebootRequired = $true
    } elseif ($result.ExitCode -ne 0) {
        throw ".NET Framework installation failed with exit code: $($result.ExitCode)"
    }
}

# Visual C++ Redistributable
if (-not (Test-VCRedistInstalled -Architecture "x64")) {
    Write-ADTLogEntry -Message "Installing Visual C++ Redistributable x64"
    Show-ADTInstallationProgress -StatusMessage "Installing Visual C++ Runtime..."

    $vcRedist = Join-Path $ADTSession.FilesDirectory "VC_redist.x64.exe"
    Start-ADTProcess -FilePath $vcRedist -Arguments '/install /quiet /norestart'
}
#endregion
```

### Pattern 2: Bundled Prerequisites

Include all prerequisites in the package:

```powershell
function Install-Prerequisites {
    $prereqPath = Join-Path $ADTSession.FilesDirectory "Prerequisites"

    # Define prerequisites with detection and install info
    $prerequisites = @(
        @{
            Name = "Visual C++ 2015-2022 x64"
            Installer = "VC_redist.x64.exe"
            Arguments = "/install /quiet /norestart"
            DetectScript = { Test-VCRedistInstalled -Architecture "x64" }
        },
        @{
            Name = "Visual C++ 2015-2022 x86"
            Installer = "VC_redist.x86.exe"
            Arguments = "/install /quiet /norestart"
            DetectScript = { Test-VCRedistInstalled -Architecture "x86" }
        },
        @{
            Name = "WebView2 Runtime"
            Installer = "MicrosoftEdgeWebview2Setup.exe"
            Arguments = "/silent /install"
            DetectScript = { Test-WebView2Installed }
        }
    )

    foreach ($prereq in $prerequisites) {
        if (-not (& $prereq.DetectScript)) {
            Write-ADTLogEntry -Message "Installing prerequisite: $($prereq.Name)"
            Show-ADTInstallationProgress -StatusMessage "Installing $($prereq.Name)..."

            $installerPath = Join-Path $prereqPath $prereq.Installer
            if (Test-Path $installerPath) {
                Start-ADTProcess -FilePath $installerPath -Arguments $prereq.Arguments
            } else {
                Write-ADTLogEntry -Message "Prerequisite installer not found: $installerPath" -Severity 2
            }
        } else {
            Write-ADTLogEntry -Message "Prerequisite already installed: $($prereq.Name)"
        }
    }
}

# Usage in main script
Install-Prerequisites
```

### Pattern 3: Online Prerequisites

Download prerequisites if not bundled:

```powershell
function Get-PrerequisiteOnline {
    param (
        [string]$Name,
        [string]$Url,
        [string]$OutFile,
        [string]$Arguments
    )

    $downloadPath = Join-Path $env:TEMP $OutFile

    try {
        Write-ADTLogEntry -Message "Downloading $Name from $Url"
        Invoke-WebRequest -Uri $Url -OutFile $downloadPath -UseBasicParsing

        Write-ADTLogEntry -Message "Installing $Name"
        Start-ADTProcess -FilePath $downloadPath -Arguments $Arguments

        Remove-Item -Path $downloadPath -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-ADTLogEntry -Message "Failed to download/install $Name : $($_.Exception.Message)" -Severity 3
        throw
    }
}

# Example: Download VC++ Redist if needed
if (-not (Test-VCRedistInstalled -Architecture "x64")) {
    Get-PrerequisiteOnline -Name "VC++ 2022 x64" `
        -Url "https://aka.ms/vs/17/release/vc_redist.x64.exe" `
        -OutFile "vc_redist.x64.exe" `
        -Arguments "/install /quiet /norestart"
}
```

### Pattern 4: Intune Dependency Chain

Use Intune's dependency feature instead of installing in script:

```powershell
# Main application install script - prerequisites handled by Intune

Write-ADTLogEntry -Message "Prerequisites are managed by Intune dependencies"

# Verify prerequisites were installed
$prereqsMissing = @()

if (-not (Test-VCRedistInstalled -Architecture "x64")) {
    $prereqsMissing += "Visual C++ Redistributable x64"
}

if (-not (Test-WebView2Installed)) {
    $prereqsMissing += "WebView2 Runtime"
}

if ($prereqsMissing.Count -gt 0) {
    $message = "Missing prerequisites: $($prereqsMissing -join ', '). These should be installed via Intune dependencies."
    Write-ADTLogEntry -Message $message -Severity 3
    throw $message
}

# Continue with main installation
```

## Handling Restart Requirements

### Track Restart Requirement

```powershell
$script:RestartRequired = $false

function Install-PrerequisiteWithRestart {
    param (
        [string]$Name,
        [string]$FilePath,
        [string]$Arguments
    )

    $result = Start-ADTProcess -FilePath $FilePath -Arguments $Arguments -PassThru

    switch ($result.ExitCode) {
        0       { Write-ADTLogEntry -Message "$Name installed successfully" }
        3010    {
            Write-ADTLogEntry -Message "$Name installed - restart required" -Severity 2
            $script:RestartRequired = $true
        }
        1641    {
            Write-ADTLogEntry -Message "$Name initiated restart" -Severity 2
            $script:RestartRequired = $true
        }
        default {
            throw "$Name installation failed with exit code: $($result.ExitCode)"
        }
    }
}

# At end of script
if ($script:RestartRequired) {
    Write-ADTLogEntry -Message "One or more prerequisites require a restart"
    Complete-ADTDeployment -DeploymentStatus 'RestartRequired'
} else {
    Complete-ADTDeployment -DeploymentStatus 'Complete'
}
```

### Defer Main Installation Until Restart

```powershell
# Check for pending restart before installing
$pendingRestart = $false

$rebootKeys = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending",
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired",
    "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations"
)

foreach ($key in $rebootKeys) {
    if (Test-Path $key) {
        $pendingRestart = $true
        break
    }
}

if ($pendingRestart) {
    Write-ADTLogEntry -Message "System has pending restart - deferring installation" -Severity 2
    Complete-ADTDeployment -DeploymentStatus 'FastRetry'
    exit 60001
}
```

## Complete Example

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

#region Detection Functions
function Test-VCRedistInstalled {
    # ... (detection code from above)
}

function Test-DotNetRuntimeVersion {
    # ... (detection code from above)
}
#endregion

Initialize-ADTDeployment @{
    InstallName = 'Application Name'
    InstallVersion = '1.0.0'
    Publisher = 'Publisher'
    DeploymentType = $DeploymentType
    DeployMode = $DeployMode
}

$RestartRequired = $false

try {
    switch ($DeploymentType) {
        'Install' {
            #region Prerequisites
            Write-ADTLogEntry -Message "=== Checking Prerequisites ==="

            $prereqPath = Join-Path $ADTSession.FilesDirectory "Prerequisites"

            # Check and install VC++ Redistributable
            if (-not (Test-VCRedistInstalled -Architecture "x64")) {
                Show-ADTInstallationProgress -StatusMessage "Installing Visual C++ Runtime..."
                $vcResult = Start-ADTProcess -FilePath "$prereqPath\VC_redist.x64.exe" `
                    -Arguments '/install /quiet /norestart' -PassThru

                if ($vcResult.ExitCode -eq 3010) {
                    $RestartRequired = $true
                }
            }

            # Check and install .NET 6 Desktop Runtime
            if (-not (Test-DotNetRuntimeVersion -RuntimeType "Microsoft.WindowsDesktop.App" -RequiredVersion "6.0.0")) {
                Show-ADTInstallationProgress -StatusMessage "Installing .NET 6 Runtime..."
                $netResult = Start-ADTProcess -FilePath "$prereqPath\windowsdesktop-runtime-6.0.x-win-x64.exe" `
                    -Arguments '/install /quiet /norestart' -PassThru

                if ($netResult.ExitCode -eq 3010) {
                    $RestartRequired = $true
                }
            }

            Write-ADTLogEntry -Message "=== Prerequisites Complete ==="
            #endregion

            #region Main Installation
            Show-ADTInstallationWelcome -CloseApps 'appname'
            Show-ADTInstallationProgress -StatusMessage "Installing Application..."

            Start-ADTProcess -FilePath "$($ADTSession.FilesDirectory)\setup.exe" -Arguments '/S'

            # Verify
            $installed = Get-ADTInstalledApplication -Name 'Application Name'
            if (-not $installed) {
                throw "Installation verification failed"
            }
            #endregion
        }
        'Uninstall' {
            # Uninstall logic (don't remove shared prerequisites)
        }
    }

    if ($RestartRequired) {
        Complete-ADTDeployment -DeploymentStatus 'RestartRequired'
    } else {
        Complete-ADTDeployment -DeploymentStatus 'Complete'
    }
}
catch {
    Write-ADTLogEntry -Message "Error: $($_.Exception.Message)" -Severity 3
    Complete-ADTDeployment -DeploymentStatus 'Failed' -ErrorMessage $_.Exception.Message
}
```

## Best Practices

1. **Always check before installing** - Don't reinstall prerequisites unnecessarily
2. **Handle restart requirements** - Track and report if restart needed
3. **Use Intune dependencies when possible** - Cleaner and more maintainable
4. **Bundle prerequisites** - Avoid network dependencies during install
5. **Log prerequisite status** - Helps with troubleshooting
6. **Version check, not just existence** - Ensure minimum versions are met
7. **Don't uninstall shared prerequisites** - Other apps may depend on them
