# WinRAR 7.13.0 - Intune Deployment Package

## Package Information

| Property | Value |
|----------|-------|
| **Application** | WinRAR |
| **Version** | 7.13.0 |
| **Vendor** | RARLab |
| **Installer Type** | EXE (NSIS-based) |
| **Architecture** | x64 |
| **Package Framework** | PSAppDeployToolkit v4 |

---

## Package Contents

```
TEST_WinRAR_Package3/
├── Assets/                          # Banner and icon images
│   ├── AppIcon.png
│   └── Banner.Classic.png
├── Config/
│   └── config.psd1                  # PSADT configuration
├── Files/
│   └── winrar-x64-713.exe           # WinRAR installer
├── PSAppDeployToolkit/              # PSADT module
│   ├── PSAppDeployToolkit.psd1
│   └── PSAppDeployToolkit.psm1
├── Invoke-AppDeployToolkit.exe      # Compiled launcher
├── Invoke-AppDeployToolkit.ps1      # Main deployment script
├── DetectionRules.md                # Intune detection configuration
└── README.md                        # This file
```

---

## Intune Deployment Guide

### Step 1: Create the .intunewin Package

1. Download the [Microsoft Win32 Content Prep Tool](https://github.com/Microsoft/Microsoft-Win32-Content-Prep-Tool)
2. Run the following command:

```powershell
.\IntuneWinAppUtil.exe -c "C:\Path\To\TEST_WinRAR_Package3" -s "Invoke-AppDeployToolkit.exe" -o "C:\Output" -q
```

### Step 2: Add Win32 App in Intune

1. Navigate to **Microsoft Intune admin center** → **Apps** → **All apps** → **Add**
2. Select **Windows app (Win32)** as the app type
3. Upload the generated `.intunewin` file

### Step 3: Configure App Information

| Setting | Value |
|---------|-------|
| **Name** | WinRAR |
| **Description** | WinRAR - Compress, Encrypt, Package and Backup |
| **Publisher** | RARLab |
| **App Version** | 7.13.0 |
| **Category** | Utilities & Tools |
| **Information URL** | https://www.win-rar.com |

### Step 4: Configure Program Settings

| Setting | Value |
|---------|-------|
| **Install command** | `Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent` |
| **Uninstall command** | `Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent` |
| **Install behavior** | System |
| **Device restart behavior** | No specific action |
| **Return codes** | Use default return codes |

### Step 5: Configure Requirements

| Setting | Value |
|---------|-------|
| **Operating system architecture** | 64-bit |
| **Minimum operating system** | Windows 10 1903 |
| **Disk space required** | 50 MB |

### Step 6: Configure Detection Rules

Use the settings from `DetectionRules.md`. **Recommended method:**

| Setting | Value |
|---------|-------|
| **Rule type** | File |
| **Path** | `C:\Program Files\WinRAR` |
| **File or folder** | `WinRAR.exe` |
| **Detection method** | Version |
| **Operator** | Greater than or equal to |
| **Value** | `7.13.0.0` |

### Step 7: Assign the Application

1. Navigate to **Assignments** tab
2. Add target groups:
   - **Required**: For mandatory deployment
   - **Available**: For self-service in Company Portal
3. Configure end-user notifications as needed

---

## Silent Installation Commands

### Install
```powershell
# Using PSADT wrapper (recommended)
.\Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent

# Direct installer (not recommended for Intune)
.\Files\winrar-x64-713.exe /S
```

### Uninstall
```powershell
# Using PSADT wrapper (recommended)
.\Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent

# Direct uninstall
"C:\Program Files\WinRAR\uninstall.exe" /S
```

---

## Testing the Package

### Local Testing

```powershell
# Test installation (interactive mode for troubleshooting)
.\Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Interactive

# Test silent installation
.\Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent

# Test uninstallation
.\Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent
```

### Verify Installation

```powershell
# Check if WinRAR is installed
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" |
    Where-Object { $_.DisplayName -like "*WinRAR*" } |
    Select-Object DisplayName, DisplayVersion, InstallLocation

# Check file version
(Get-Item "C:\Program Files\WinRAR\WinRAR.exe").VersionInfo.FileVersion
```

---

## Log Files

PSADT creates detailed logs for troubleshooting:

| Log Type | Location |
|----------|----------|
| **Installation Log** | `C:\Windows\Logs\Software\WinRAR_7.13.0_Install.log` |
| **Uninstall Log** | `C:\Windows\Logs\Software\WinRAR_7.13.0_Uninstall.log` |
| **Intune Agent Log** | `C:\ProgramData\Microsoft\IntuneManagementExtension\Logs\` |

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Installation fails with exit code 1 | Check if WinRAR processes are running; PSADT should close them automatically |
| Detection fails after install | Verify the file path and version in detection rules |
| Silent install shows UI | Ensure `-DeployMode Silent` is specified |
| Application not in Programs | Check Windows Installer logs and PSADT logs |

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General failure |
| 1602 | User cancelled |
| 1618 | Another installation in progress |
| 3010 | Success, restart required |
| 60001 | PSADT initialization failed |

---

## Customization

### Pre/Post Installation Actions

Edit `Invoke-AppDeployToolkit.ps1` to add custom actions:

- **Pre-Installation**: Backup settings, remove old versions
- **Post-Installation**: Apply license, configure settings, create shortcuts
- **Pre-Uninstallation**: Export settings
- **Post-Uninstallation**: Clean up residual files

### Example: Apply License Key

Add this to the Post-Installation section of `Invoke-AppDeployToolkit.ps1`:

```powershell
# Apply license key
$licensePath = Join-Path -Path $ADTSession.FilesDirectory -ChildPath 'rarreg.key'
if (Test-Path $licensePath) {
    Copy-Item -Path $licensePath -Destination "$env:ProgramFiles\WinRAR\rarreg.key" -Force
    Write-ADTLogEntry -Message "License key applied successfully"
}
```

---

## Support

- **WinRAR Official**: https://www.win-rar.com/support.html
- **PSADT Documentation**: https://psappdeploytoolkit.com
- **Intune Win32 Apps**: https://docs.microsoft.com/mem/intune/apps/apps-win32-app-management

---

*Package generated by Packager-MCP on 2025-12-11*
