# WinRAR 7.13.0 - PSADT Deployment Package

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
TEST_WinRAR_Package2/
├── PSAppDeployToolkit/          # PSADT module files
│   ├── PSAppDeployToolkit.psd1
│   └── PSAppDeployToolkit.psm1
├── Config/                       # Configuration files
│   └── config.psd1
├── Assets/                       # Banner images and icons
├── Files/                        # Installer files
│   └── winrar-x64-713.exe       # WinRAR installer
├── Invoke-AppDeployToolkit.exe   # Compiled launcher
├── Invoke-AppDeployToolkit.ps1   # Main deployment script
├── DetectionRules.md             # Intune detection rules
└── README.md                     # This file
```

---

## Deployment Commands

### Local Testing

**Install (Interactive):**
```powershell
.\Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Interactive
```

**Install (Silent):**
```powershell
.\Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent
```

**Uninstall (Silent):**
```powershell
.\Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent
```

---

## Microsoft Intune Deployment

### Step 1: Create the .intunewin Package

1. Download the [Microsoft Win32 Content Prep Tool](https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool)
2. Run the following command:

```cmd
IntuneWinAppUtil.exe -c "C:\Path\To\TEST_WinRAR_Package2" -s "Invoke-AppDeployToolkit.exe" -o "C:\Output"
```

### Step 2: Create Win32 App in Intune

1. Navigate to **Microsoft Intune admin center** → **Apps** → **Windows** → **Add**
2. Select **Windows app (Win32)**
3. Upload the generated `.intunewin` file

### Step 3: Configure App Information

| Field | Value |
|-------|-------|
| **Name** | WinRAR |
| **Description** | WinRAR 7.13.0 - File compression and archive utility |
| **Publisher** | RARLab |
| **App Version** | 7.13.0 |

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
| **Minimum operating system** | Windows 10 1809 |
| **Disk space required** | 50 MB |
| **Physical memory required** | N/A |

### Step 6: Configure Detection Rules

See `DetectionRules.md` for detailed detection rule options.

**Recommended: File-based detection**
- **Rule type:** File
- **Path:** `C:\Program Files\WinRAR`
- **File:** `WinRAR.exe`
- **Detection method:** Version
- **Operator:** Greater than or equal to
- **Value:** `7.13.0.0`

### Step 7: Assign the Application

1. Go to **Assignments** tab
2. Add required groups for mandatory deployment
3. Add available groups for self-service deployment via Company Portal

---

## SCCM/ConfigMgr Deployment

### Create Application

1. Open **Configuration Manager Console**
2. Navigate to **Software Library** → **Application Management** → **Applications**
3. Click **Create Application**

### Deployment Type Settings

| Setting | Value |
|---------|-------|
| **Content location** | `\\server\share\WinRAR_7.13.0` |
| **Installation program** | `Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent` |
| **Uninstall program** | `Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent` |
| **Installation behavior** | Install for system |
| **Logon requirement** | Whether or not a user is logged on |

### Detection Method

- **Setting Type:** File System
- **Path:** `C:\Program Files\WinRAR`
- **File:** `WinRAR.exe`
- **Property:** Version
- **Operator:** Greater than or equal to
- **Value:** `7.13.0.0`

---

## Silent Installation Arguments

WinRAR uses NSIS-based installer with the following arguments:

| Argument | Description |
|----------|-------------|
| `/S` | Silent installation |
| `/D=path` | Set installation directory |

---

## Logging

PSADT creates detailed logs in the following locations:

- **Install logs:** `C:\Windows\Logs\Software\WinRAR_7.13.0_Install.log`
- **Uninstall logs:** `C:\Windows\Logs\Software\WinRAR_7.13.0_Uninstall.log`

---

## Troubleshooting

### Common Issues

1. **Installation fails silently**
   - Check the PSADT log file for detailed error messages
   - Verify the installer file exists in the Files folder
   - Run interactive mode to see any dialogs

2. **Detection fails after installation**
   - Verify WinRAR installed to the expected path
   - Check if 32-bit vs 64-bit detection settings match the installed version
   - Review registry keys created by the installer

3. **Application doesn't close before install**
   - Ensure process names in `$AppsToClose` match running processes
   - Extend the countdown timer if users need more time

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 1602 | User cancelled |
| 1618 | Another installation in progress |
| 3010 | Restart required |
| 60001 | PSADT initialization failed |
| 60008 | Deployment failed |

---

## Customization

### Adding License Key

To pre-configure a license key, add `rarreg.key` to the Files folder and modify the post-installation section:

```powershell
# In Post-Installation section
$licenseSource = Join-Path -Path $ADTSession.FilesDirectory -ChildPath 'rarreg.key'
$licenseTarget = "$env:ProgramFiles\WinRAR\rarreg.key"
Copy-ADTFile -Path $licenseSource -Destination $licenseTarget
```

### Disabling Desktop Shortcut

Add to post-installation:

```powershell
Remove-ADTFile -Path "$env:Public\Desktop\WinRAR.lnk" -ContinueOnError
```

### Setting File Associations

WinRAR typically handles associations during install. To force specific associations, modify registry in post-installation.

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 7.13.0 | 2025-12-12 | Initial package creation |

---

## References

- [WinRAR Official Site](https://www.rarlab.com/)
- [PSAppDeployToolkit Documentation](https://psappdeploytoolkit.com/)
- [Intune Win32 App Management](https://docs.microsoft.com/en-us/mem/intune/apps/apps-win32-app-management)

---

*Generated by Packager-MCP*
