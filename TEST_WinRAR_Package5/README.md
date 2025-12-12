# WinRAR 7.13.0 Deployment Package

This package provides an enterprise-ready deployment solution for **WinRAR 7.13.0** using the PowerShell App Deployment Toolkit (PSADT) v4.

## Package Information

| Property | Value |
|----------|-------|
| **Application** | WinRAR |
| **Version** | 7.13.0 |
| **Vendor** | RARLab |
| **Installer Type** | EXE |
| **PSADT Version** | 4.0 |
| **Architecture** | x64 |

---

## Package Contents

```
TEST_WinRAR_Package5/
├── Assets/                          # PSADT branding assets
│   ├── AppIcon.png
│   └── Banner.Classic.png
├── Config/                          # PSADT configuration
│   └── config.psd1
├── Files/                           # Installer files
│   └── winrar-x64-713.exe          # WinRAR installer (downloaded)
├── PSAppDeployToolkit/              # PSADT module
│   ├── PSAppDeployToolkit.psd1
│   └── PSAppDeployToolkit.psm1
├── Invoke-AppDeployToolkit.exe      # ServiceUI wrapper executable
├── Invoke-AppDeployToolkit.ps1      # Main deployment script
├── DetectionRules.md                # Intune detection rules
└── README.md                        # This file
```

---

## Deployment Commands

### Install (Silent)

```powershell
.\Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent
```

### Install (Interactive)

```powershell
.\Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Interactive
```

### Uninstall (Silent)

```powershell
.\Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent
```

### PowerShell Direct Execution

```powershell
powershell.exe -ExecutionPolicy Bypass -File ".\Invoke-AppDeployToolkit.ps1" -DeploymentType Install -DeployMode Silent
```

---

## Microsoft Intune Deployment

### Step 1: Create the .intunewin Package

1. Download the [Microsoft Win32 Content Prep Tool](https://github.com/Microsoft/Microsoft-Win32-Content-Prep-Tool)
2. Run the tool to create the `.intunewin` file:

```cmd
IntuneWinAppUtil.exe -c "C:\Path\To\TEST_WinRAR_Package5" -s "Invoke-AppDeployToolkit.exe" -o "C:\Output"
```

### Step 2: Create Win32 App in Intune

1. Navigate to **Intune Admin Center** > **Apps** > **Windows** > **Add**
2. Select **Windows app (Win32)**
3. Upload the `.intunewin` file

### Step 3: Configure App Information

| Setting | Value |
|---------|-------|
| **Name** | WinRAR |
| **Description** | WinRAR 7.13.0 - File archiver utility |
| **Publisher** | RARLab |
| **App Version** | 7.13.0 |

### Step 4: Configure Program Settings

| Setting | Value |
|---------|-------|
| **Install command** | `Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent` |
| **Uninstall command** | `Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent` |
| **Install behavior** | System |
| **Device restart behavior** | No specific action |

### Step 5: Configure Requirements

| Setting | Value |
|---------|-------|
| **Operating system architecture** | 64-bit |
| **Minimum operating system** | Windows 10 1607 |
| **Disk space required** | 50 MB |
| **Physical memory required** | 512 MB |

### Step 6: Configure Detection Rules

Use one of the detection methods from `DetectionRules.md`:

**Recommended: File Detection**
- Rule type: File
- Path: `C:\Program Files\WinRAR`
- File: `WinRAR.exe`
- Detection method: Version
- Operator: Greater than or equal to
- Value: `7.13.0.0`

---

## SCCM/ConfigMgr Deployment

### Create Application

1. Open Configuration Manager Console
2. Navigate to **Software Library** > **Application Management** > **Applications**
3. Right-click and select **Create Application**
4. Choose **Manually specify the application information**

### Deployment Type Settings

| Setting | Value |
|---------|-------|
| **Content location** | `\\server\share\TEST_WinRAR_Package5` |
| **Installation program** | `Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent` |
| **Uninstall program** | `Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent` |
| **Install behavior** | Install for system |
| **Logon requirement** | Whether or not a user is logged on |

### Detection Method

- **Setting Type**: File System
- **Path**: `C:\Program Files\WinRAR`
- **File**: `WinRAR.exe`
- **Property**: Version
- **Operator**: Greater than or equal to
- **Value**: `7.13.0.0`

---

## Silent Installation Arguments

The WinRAR installer supports the following silent arguments:

| Argument | Description |
|----------|-------------|
| `/S` | Silent installation |

---

## Logging

PSADT creates detailed logs during deployment:

- **Log Location**: `C:\Windows\Logs\Software\WinRAR_7.13.0_Install.log`
- **Toolkit Logs**: `C:\Windows\Logs\Software\PSAppDeployToolkit*.log`

To review logs after deployment:

```powershell
Get-Content "C:\Windows\Logs\Software\WinRAR_7.13.0*.log" -Tail 100
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Installation fails silently | Check PSADT logs for detailed error information |
| Detection not working | Verify WinRAR.exe exists in expected path after install |
| User prompts appearing | Ensure `-DeployMode Silent` is specified |
| Access denied errors | Run installer with SYSTEM context (Intune default) |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General failure |
| 1641 | Restart initiated |
| 3010 | Restart required |
| 60001 | PSADT initialization failed |
| 60008 | PSADT completion failed |

---

## Customization

### Close Running Applications

The script is configured to close running WinRAR instances before installation. Modify the `$AppsToClose` variable in `Invoke-AppDeployToolkit.ps1` to add additional processes:

```powershell
$AppsToClose = 'WinRAR,Rar'
```

### Post-Installation Tasks

Add custom post-installation tasks in the Post-Installation section of `Invoke-AppDeployToolkit.ps1`:

```powershell
# Example: Copy license file
$licenseSource = Join-Path -Path $ADTSession.FilesDirectory -ChildPath 'rarreg.key'
Copy-ADTFile -Path $licenseSource -Destination "$env:ProgramFiles\WinRAR\rarreg.key"
```

---

## License

WinRAR is a proprietary software by RARLab. Ensure you have appropriate licensing for enterprise deployment.

---

## Support

- **WinRAR Official**: https://www.win-rar.com
- **PSADT Documentation**: https://psappdeploytoolkit.com
- **Intune Documentation**: https://docs.microsoft.com/mem/intune

---

*Package generated by Packager-MCP on 2025-12-12*
