---
title: "Detection Rule Patterns"
id: "kb-patterns-detection"
psadt_target: "4.0.x"
last_updated: "2024-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/Examples/"
tags: ["detection", "patterns", "intune", "registry", "file"]
---

# Detection Rule Patterns

Detection rules determine whether an application is already installed. Proper detection is critical for Intune deployments to work correctly.

## Detection Methods Overview

| Method | Best For | Reliability |
|--------|----------|-------------|
| MSI Product Code | MSI packages | High |
| Registry | Most applications | High |
| File | Simple apps, portable | Medium |
| Script | Complex scenarios | High (flexible) |

## MSI Product Code Detection

The most reliable method for MSI-based applications.

### Finding the Product Code

```powershell
# From installed application
Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*AppName*" } | Select-Object IdentifyingNumber, Name, Version

# From registry (faster)
$paths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
Get-ItemProperty -Path $paths | Where-Object { $_.DisplayName -like "*AppName*" } | Select-Object PSChildName, DisplayName, DisplayVersion

# From MSI file (using PowerShell)
$msi = "app.msi"
$installer = New-Object -ComObject WindowsInstaller.Installer
$db = $installer.OpenDatabase($msi, 0)
$view = $db.OpenView("SELECT Value FROM Property WHERE Property='ProductCode'")
$view.Execute()
$record = $view.Fetch()
$productCode = $record.StringData(1)
```

### Intune MSI Detection Rule

In Intune:
1. Select "MSI" as detection rule type
2. Enter the product code: `{12345678-1234-1234-1234-123456789012}`
3. Optionally specify version requirement

## Registry Detection

### Common Registry Locations

```
# 64-bit applications on 64-bit Windows
HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{ProductCode}

# 32-bit applications on 64-bit Windows
HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{ProductCode}

# Per-user installations
HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{ProductCode}

# Application-specific keys
HKLM:\SOFTWARE\Vendor\ProductName
```

### Intune Registry Detection Rule

**Key Existence:**
```
Key: HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{ProductCode}
Detection method: Key exists
```

**String Value:**
```
Key: HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{ProductCode}
Value: DisplayVersion
Detection method: String comparison
Operator: Equals
Value: 1.0.0
```

**Version Comparison:**
```
Key: HKLM\SOFTWARE\Vendor\App
Value: Version
Detection method: Version comparison
Operator: Greater than or equal to
Value: 1.0.0
```

### PowerShell Registry Detection Script

```powershell
# Simple registry check
$regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{GUID}"
if (Test-Path $regPath) {
    $app = Get-ItemProperty -Path $regPath
    if ($app.DisplayVersion -ge "1.0.0") {
        Write-Output "Detected"
        exit 0
    }
}
exit 1

# Check both 32-bit and 64-bit
$paths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

$app = Get-ItemProperty -Path $paths -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -eq "Application Name" -and [version]$_.DisplayVersion -ge [version]"1.0.0" }

if ($app) {
    Write-Output "Detected: $($app.DisplayName) $($app.DisplayVersion)"
    exit 0
}
exit 1
```

## File Detection

### Common File Locations

```powershell
# Main executable
"$env:ProgramFiles\Vendor\App\app.exe"
"$env:ProgramFiles(x86)\Vendor\App\app.exe"

# Version file
"$env:ProgramFiles\Vendor\App\version.txt"

# Configuration file
"$env:ProgramData\Vendor\App\config.xml"
```

### Intune File Detection Rule

**File Exists:**
```
Path: %ProgramFiles%\Vendor\App
File: app.exe
Detection method: File or folder exists
```

**File Version:**
```
Path: %ProgramFiles%\Vendor\App
File: app.exe
Detection method: Version
Operator: Greater than or equal to
Value: 1.0.0.0
```

**File Size or Date:**
```
Path: %ProgramFiles%\Vendor\App
File: app.exe
Detection method: Date modified
Operator: Greater than or equal to
Value: 2024-01-01
```

### PowerShell File Detection Script

```powershell
# Simple file existence
$filePath = "$env:ProgramFiles\Vendor\App\app.exe"
if (Test-Path $filePath) {
    Write-Output "Detected"
    exit 0
}
exit 1

# File version check
$filePath = "$env:ProgramFiles\Vendor\App\app.exe"
$requiredVersion = [version]"1.0.0.0"

if (Test-Path $filePath) {
    $fileVersion = [version](Get-Item $filePath).VersionInfo.FileVersion
    if ($fileVersion -ge $requiredVersion) {
        Write-Output "Detected version $fileVersion"
        exit 0
    }
}
exit 1

# Check both x86 and x64 paths
$possiblePaths = @(
    "$env:ProgramFiles\Vendor\App\app.exe",
    "${env:ProgramFiles(x86)}\Vendor\App\app.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        Write-Output "Detected at $path"
        exit 0
    }
}
exit 1
```

## Script Detection (Custom)

For complex detection scenarios, use PowerShell scripts.

### Script Requirements

- **Exit code 0** = Application detected (installed)
- **Exit code non-zero** = Application not detected
- **STDOUT output** = Logged but doesn't affect detection
- **Maximum runtime** = 60 seconds in Intune

### Basic Script Template

```powershell
#Requires -Version 5.1
<#
.SYNOPSIS
    Detection script for Application Name
.DESCRIPTION
    Returns exit 0 if application is installed with correct version
#>

$appName = "Application Name"
$requiredVersion = [version]"1.0.0"

try {
    # Detection logic here
    $detected = $false

    # Method 1: Registry
    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    $app = Get-ItemProperty -Path $regPaths -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -eq $appName }

    if ($app -and [version]$app.DisplayVersion -ge $requiredVersion) {
        $detected = $true
    }

    # Output result
    if ($detected) {
        Write-Output "Detected: $appName v$($app.DisplayVersion)"
        exit 0
    } else {
        Write-Output "Not detected"
        exit 1
    }
}
catch {
    Write-Output "Detection error: $($_.Exception.Message)"
    exit 1
}
```

### Multi-Condition Detection

```powershell
$conditions = @{
    Registry = $false
    File = $false
    Service = $false
}

# Check registry
$regPath = "HKLM:\SOFTWARE\Vendor\App"
if (Test-Path $regPath) {
    $regValue = Get-ItemProperty -Path $regPath -Name "Installed" -ErrorAction SilentlyContinue
    if ($regValue.Installed -eq 1) {
        $conditions.Registry = $true
    }
}

# Check file
if (Test-Path "$env:ProgramFiles\Vendor\App\app.exe") {
    $conditions.File = $true
}

# Check service
$service = Get-Service -Name "AppService" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    $conditions.Service = $true
}

# All conditions must be true
if ($conditions.Registry -and $conditions.File -and $conditions.Service) {
    Write-Output "All conditions met"
    exit 0
}

Write-Output "Missing conditions: $($conditions.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key })"
exit 1
```

## MSIX Detection

```powershell
$packageName = "Publisher.AppName"
$requiredVersion = [version]"1.0.0"

$package = Get-AppxPackage -Name $packageName -ErrorAction SilentlyContinue

if ($package -and [version]$package.Version -ge $requiredVersion) {
    Write-Output "Detected: $($package.Name) v$($package.Version)"
    exit 0
}

exit 1
```

## Best Practices

### Choose the Right Detection Method

| Scenario | Recommended Method |
|----------|-------------------|
| MSI package | MSI Product Code |
| EXE with registry entry | Registry |
| Portable application | File existence |
| Complex requirements | Custom script |
| MSIX package | Custom script with Get-AppxPackage |

### Avoid Common Mistakes

1. **Don't use file size** - Files can match size but be wrong version
2. **Don't use date only** - Dates can be modified
3. **Check both x86/x64 paths** - Applications may install to either
4. **Handle per-user installs** - HKCU vs HKLM
5. **Use version comparison** - Not just existence

### Testing Detection Rules

```powershell
# Test detection script locally
& .\detection.ps1
Write-Host "Exit code: $LASTEXITCODE"

# Should return 0 when installed, non-zero when not
```

### Detection Rule Examples by Application Type

**Microsoft 365 Apps:**
```powershell
$officeKey = "HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration"
if (Test-Path $officeKey) {
    $version = (Get-ItemProperty -Path $officeKey).VersionToReport
    if ($version -ge "16.0.0.0") {
        exit 0
    }
}
exit 1
```

**Google Chrome:**
```powershell
$chromePaths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Google Chrome",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Google Chrome"
)
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $version = (Get-ItemProperty -Path $path).DisplayVersion
        if ([version]$version -ge [version]"120.0.0.0") {
            exit 0
        }
    }
}
exit 1
```

**7-Zip:**
```powershell
$7zipPath = "$env:ProgramFiles\7-Zip\7z.exe"
if (Test-Path $7zipPath) {
    $version = (Get-Item $7zipPath).VersionInfo.FileVersion
    if ([version]$version -ge [version]"23.0.0.0") {
        exit 0
    }
}
exit 1
```

## Troubleshooting

### Detection Not Working

1. **Test locally first** - Run script on target machine
2. **Check exit codes** - Ensure 0 for detected, non-zero for not
3. **Verify paths** - Account for x86/x64 differences
4. **Check permissions** - Script runs as SYSTEM in Intune
5. **Review IME logs** - `C:\ProgramData\Microsoft\IntuneManagementExtension\Logs`

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Always shows "Not installed" | Wrong path or version | Verify paths and version format |
| Always shows "Installed" | Detection too broad | Add version check |
| Inconsistent results | Per-user vs per-machine | Check correct registry hive |
| Script timeout | Complex detection | Optimize or simplify script |
