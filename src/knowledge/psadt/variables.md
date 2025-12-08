# PSADT v4 Built-in Variables

PSADT v4 provides several built-in variables through the `$ADTSession` object and other automatic variables.

## Session Object ($ADTSession)

The `$ADTSession` object is the primary state container in PSADT v4.

### Deployment Information

```powershell
$ADTSession.InstallName        # Application name (e.g., "Google Chrome")
$ADTSession.InstallVersion     # Version being deployed (e.g., "120.0.6099.109")
$ADTSession.Publisher          # Application publisher (e.g., "Google LLC")
$ADTSession.InstallTitle       # Full title: "Publisher InstallName InstallVersion"
$ADTSession.DeploymentType     # Current operation: Install, Uninstall, Repair
$ADTSession.DeployMode         # Interaction mode: Interactive, Silent, NonInteractive
```

### Paths

```powershell
$ADTSession.ScriptDirectory    # Directory containing Deploy-Application.ps1
$ADTSession.FilesDirectory     # Path to Files subfolder
$ADTSession.SupportFilesDirectory  # Path to SupportFiles subfolder
$ADTSession.LogDirectory       # Directory for log files
$ADTSession.TempDirectory      # Temp directory for this deployment
```

### Logging

```powershell
$ADTSession.LogName            # Log file name without extension
$ADTSession.LogPath            # Full path to log file
$ADTSession.LogTempFolder      # Temporary log location
```

### State

```powershell
$ADTSession.IsAdmin            # Boolean: Running with admin rights
$ADTSession.IsSystemAccount    # Boolean: Running as SYSTEM
$ADTSession.RunAsActiveUser    # Username of logged-in user (when running as SYSTEM)
$ADTSession.CurrentDateTime    # Timestamp when deployment started
$ADTSession.DeploymentStatus   # Current status (updated during deployment)
```

## Environment Variables

### System Information

```powershell
$envComputerName               # Computer name
$envComputerNameFQDN           # Fully qualified domain name
$envUserName                   # Current username
$envUserDomain                 # User's domain
$envUserDNSDomain              # DNS domain
$envMachineADDomain            # Machine's AD domain
$envLogonServer                # Logon server
$envOSName                     # OS name (e.g., "Microsoft Windows 11 Pro")
$envOSVersion                  # OS version object
$envOSVersionMajor             # Major version (e.g., 10)
$envOSVersionMinor             # Minor version
$envOSVersionBuild             # Build number
$envOSVersionRevision          # Revision number
$envOSArchitecture             # 32-bit or 64-bit
$envOSLanguage                 # OS language code
```

### Processor Architecture

```powershell
$envProcessor                  # Processor architecture
$Is64Bit                       # Boolean: Running on 64-bit OS
$Is32Bit                       # Boolean: Running on 32-bit OS
$Is64BitProcess                # Boolean: Running as 64-bit process
$envProcessorArchitecture      # x86, AMD64, ARM64
```

### User Session

```powershell
$CurrentLoggedOnUserSID        # SID of current user
$CurrentLoggedOnUserNTAccount  # NT account (DOMAIN\User)
$IsUserLoggedOn                # Boolean: User is logged on
$SessionZero                   # Boolean: Running in Session 0
```

### Common Paths

```powershell
# System paths
$envSystemRoot                 # Windows directory (C:\Windows)
$envSystemDirectory            # System32 directory
$envProgramFiles               # Program Files directory
$envProgramFilesX86            # Program Files (x86) on 64-bit
$envCommonProgramFiles         # Common Files directory
$envCommonProgramFilesX86      # Common Files (x86)
$envProgramData                # ProgramData directory (C:\ProgramData)
$envTemp                       # System temp directory
$envWinDir                     # Windows directory

# User paths (may be system paths if running as SYSTEM)
$envUserProfile                # User profile directory
$envAppData                    # Roaming AppData
$envLocalAppData               # Local AppData
$envUserStartMenu              # User's Start Menu
$envUserDesktop                # User's Desktop
$envUserDocuments              # User's Documents
$envUserFavorites              # User's Favorites
$envUserProgramFiles           # User's local Program Files

# Public paths
$envPublicDesktop              # Public Desktop
$envPublicDocuments            # Public Documents
$envPublicStartMenu            # All Users Start Menu
$envAllUsersProfile            # All Users profile path
```

### Registry Paths

```powershell
$regKeyLMSoftware              # HKLM:\SOFTWARE
$regKeyLMSoftware32            # HKLM:\SOFTWARE\WOW6432Node (on 64-bit)
$regKeyCUSoftware              # HKCU:\SOFTWARE
$regKeyAppExecution            # App execution aliases
```

## Special Folders

```powershell
$envCommonDesktop              # All Users Desktop
$envCommonPrograms             # All Users Programs folder
$envCommonStartMenu            # All Users Start Menu
$envCommonStartup              # All Users Startup
$envCommonTemplates            # Common Templates
$envHomeDrive                  # User home drive
$envHomePath                   # User home path
$envHomeShare                  # Home share path
```

## PSADT-Specific Variables

### Installation Context

```powershell
$installPhase                  # Current phase: Pre-Installation, Installation, Post-Installation
$deployModeNonInteractive      # Boolean: No UI allowed
$deployModeSilent              # Boolean: Silent mode
$useDefaultMsi                 # Boolean: Using default MSI parameters
```

### Timeouts and Delays

```powershell
$configInstallationUITimeout         # UI timeout in seconds
$configInstallationPromptTimeout     # Prompt timeout
$configInstallationRestartCountdown  # Restart countdown
$configMSIMutexWaitTime              # MSI mutex wait time
```

### Configuration

```powershell
$configToolkitLogDir           # Log directory from config
$configToolkitTempPath         # Temp path from config
$configToolkitCompressLogs     # Compress logs on completion
$configToolkitLogMaxSize       # Max log size
$configToolkitLogMaxHistory    # Number of logs to keep
```

## Usage Examples

### Conditional Logic Based on Environment

```powershell
# Check architecture
if ($Is64Bit) {
    $installerPath = "$PSScriptRoot\Files\setup_x64.exe"
} else {
    $installerPath = "$PSScriptRoot\Files\setup_x86.exe"
}

# Check if running silently
if ($ADTSession.DeployMode -eq 'Silent') {
    # Skip user prompts
}

# Check Windows version
if ($envOSVersionBuild -ge 22000) {
    # Windows 11 specific logic
}

# Check user context
if ($ADTSession.IsSystemAccount) {
    # Running as SYSTEM
    $configPath = "$envProgramData\MyApp\config.xml"
} else {
    # Running as user
    $configPath = "$envLocalAppData\MyApp\config.xml"
}
```

### Dynamic Path Construction

```powershell
# Install to appropriate Program Files
$installDir = if ($Is64Bit) {
    "$envProgramFiles\MyApp"
} else {
    "$envProgramFilesX86\MyApp"
}

# Create shortcuts
$desktopShortcut = "$envPublicDesktop\MyApp.lnk"
$startMenuShortcut = "$envCommonPrograms\MyApp\MyApp.lnk"

# Log location
$customLog = "$($ADTSession.LogDirectory)\$($ADTSession.InstallName)_custom.log"
```

### Reading Installer Files

```powershell
# Reference files in the Files directory
$installer = Join-Path -Path $ADTSession.FilesDirectory -ChildPath 'setup.exe'
$config = Join-Path -Path $ADTSession.FilesDirectory -ChildPath 'config.xml'

# Or using the older style
$installer = "$PSScriptRoot\Files\setup.exe"
```

## Best Practices

1. **Use session variables** instead of hardcoding paths
2. **Check architecture** before selecting installers
3. **Use environment variables** for system paths
4. **Log important variables** at the start of deployment for debugging
5. **Handle both system and user context** appropriately

```powershell
# Log deployment context
Write-ADTLogEntry -Message "Deployment Context:"
Write-ADTLogEntry -Message "  Computer: $envComputerName"
Write-ADTLogEntry -Message "  OS: $envOSName ($envOSArchitecture)"
Write-ADTLogEntry -Message "  User: $envUserName"
Write-ADTLogEntry -Message "  IsAdmin: $($ADTSession.IsAdmin)"
Write-ADTLogEntry -Message "  DeployMode: $($ADTSession.DeployMode)"
```
