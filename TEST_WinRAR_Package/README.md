# WinRAR 7.13.0 - PSADT Deployment Package

## Package Information

| Property | Value |
|----------|-------|
| **Application** | WinRAR |
| **Version** | 7.13.0 |
| **Vendor** | RARLab |
| **Installer Type** | EXE |
| **Architecture** | x64 |
| **PSADT Version** | 4.0 |

---

## Package Contents

```
TEST_WinRAR_Package/
├── PSAppDeployToolkit/           # PSADT module files
│   ├── PSAppDeployToolkit.psd1
│   └── PSAppDeployToolkit.psm1
├── Config/                       # Configuration files
├── Assets/                       # UI assets (icons, banners)
├── Files/                        # Installer files
│   └── winrar-x64-713.exe       # WinRAR installer
├── Invoke-AppDeployToolkit.exe   # Main executable wrapper
├── Invoke-AppDeployToolkit.ps1   # PowerShell deployment script
├── Detection.ps1                 # Intune detection script
├── DetectionRules.md            # Intune detection configuration
└── README.md                    # This file
```

---

## Deployment Instructions

### Local Testing

#### Silent Installation
```powershell
.\Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent
```

#### Silent Uninstallation
```powershell
.\Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent
```

#### Interactive Installation (for testing)
```powershell
.\Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Interactive
```

---

## Microsoft Intune Deployment

### Step 1: Create the .intunewin Package

1. Download the [Microsoft Win32 Content Prep Tool](https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool)
2. Run the following command:
   ```cmd
   IntuneWinAppUtil.exe -c "C:\Path\To\TEST_WinRAR_Package" -s "Invoke-AppDeployToolkit.exe" -o "C:\Output"
   ```
3. This creates `Invoke-AppDeployToolkit.intunewin`

### Step 2: Create Win32 App in Intune

1. Navigate to **Microsoft Intune admin center** > **Apps** > **All apps**
2. Click **Add** > Select **Windows app (Win32)**
3. Upload the `.intunewin` file created in Step 1

### Step 3: Configure App Information

| Field | Value |
|-------|-------|
| **Name** | WinRAR |
| **Description** | WinRAR 7.13.0 - Compress, Encrypt, Package and Backup utility |
| **Publisher** | RARLab |
| **App Version** | 7.13.0 |
| **Category** | Utilities |
| **Information URL** | https://www.win-rar.com |
| **Privacy URL** | https://www.win-rar.com/privacy.html |

### Step 4: Configure Program Settings

| Field | Value |
|-------|-------|
| **Install command** | `Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent` |
| **Uninstall command** | `Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent` |
| **Install behavior** | System |
| **Device restart behavior** | No specific action |
| **Return codes** | Use default return codes |

### Step 5: Configure Requirements

| Field | Value |
|-------|-------|
| **Operating system architecture** | 64-bit |
| **Minimum operating system** | Windows 10 1607 |
| **Disk space required** | 50 MB |
| **Physical memory required** | Not configured |
| **Minimum number of logical processors** | Not configured |
| **Minimum CPU speed** | Not configured |

### Step 6: Configure Detection Rules

Choose **one** of the following methods (see `DetectionRules.md` for details):

#### Option A: File Detection (Recommended)
| Setting | Value |
|---------|-------|
| **Rule type** | File |
| **Path** | `C:\Program Files\WinRAR` |
| **File or folder** | `WinRAR.exe` |
| **Detection method** | File version |
| **Operator** | Greater than or equal to |
| **Value** | `7.13.0.0` |

#### Option B: Registry Detection
| Setting | Value |
|---------|-------|
| **Rule type** | Registry |
| **Key path** | `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\WinRAR archiver` |
| **Value name** | `DisplayVersion` |
| **Detection method** | Version comparison |
| **Operator** | Greater than or equal to |
| **Value** | `7.13.0` |

#### Option C: Custom Script
Use the `Detection.ps1` script included in this package.

### Step 7: Assign the Application

1. Navigate to **Assignments** tab
2. Add required groups for mandatory deployment
3. Add available groups for self-service deployment via Company Portal

---

## SCCM/ConfigMgr Deployment

### Create Application
1. Navigate to **Software Library** > **Application Management** > **Applications**
2. Create new application, select **Manually specify the application information**

### Deployment Type Configuration
| Setting | Value |
|---------|-------|
| **Content location** | `\\server\share\WinRAR_7.13.0` |
| **Installation program** | `Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent` |
| **Uninstall program** | `Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent` |
| **Installation behavior** | Install for system |
| **Logon requirement** | Whether or not a user is logged on |

### Detection Method
Use the file or registry detection method as specified in `DetectionRules.md`.

---

## Silent Installation Parameters

| Parameter | Description |
|-----------|-------------|
| `/s` | Silent installation |

### Direct Installer Command (without PSADT)
```cmd
winrar-x64-713.exe /s
```

---

## Logging

PSADT logs are stored in:
- **Install logs**: `C:\Windows\Logs\Software\WinRAR_7.13.0_Install.log`
- **Uninstall logs**: `C:\Windows\Logs\Software\WinRAR_7.13.0_Uninstall.log`

---

## Troubleshooting

### Common Issues

1. **Installation hangs or fails**
   - Ensure WinRAR, Rar, and UnRAR processes are not running
   - Check logs for specific error messages

2. **Detection fails after successful install**
   - Verify the detection path matches the actual installation location
   - Check if the application installed to a different directory

3. **Exit code 1603 (Fatal error during installation)**
   - Run installation interactively to see error messages
   - Check Windows Event Viewer for additional details

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1603 | Fatal error during installation |
| 1618 | Another installation is in progress |
| 1641 | Restart initiated |
| 3010 | Restart required |

---

## License Information

WinRAR is a shareware application. For commercial use, appropriate licenses must be purchased from RARLab.

- Website: https://www.win-rar.com
- Licensing: https://www.win-rar.com/winrarlicense.html

---

## Package Generation

- **Generated by**: Packager-MCP
- **Generated on**: 2025-12-12
- **Template**: PSADT v4 Standard

---

## Support

For issues with:
- **WinRAR application**: Contact RARLab support
- **PSADT framework**: https://psappdeploytoolkit.com
- **This package**: Review logs and detection rules
