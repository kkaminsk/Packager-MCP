# PSADT v4 Script Fix Documentation

## Issue

The `Invoke-AppDeployToolkit.ps1` script failed to launch with the following error:

```
Failed to initialize deployment: The term 'Initialize-ADTDeployment' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

## Root Cause

The script was generated using incorrect function names that do not exist in PSAppDeployToolkit v4. The script used:

| Incorrect | Correct |
|-----------|---------|
| `Initialize-ADTDeployment` | `Open-ADTSession` |
| `Complete-ADTDeployment` | `Close-ADTSession` |
| `Get-ADTInstalledApplication` | `Get-ADTApplication` |
| `$ADTSession.FilesDirectory` | `$adtSession.DirFiles` |
| `Start-ADTProcess -Arguments` | `Start-ADTProcess -ArgumentList` |

## Solution

The script was rewritten to follow the official PSADT v4 template structure:

### 1. Session Configuration

Changed from passing parameters to `Initialize-ADTDeployment` to using a `$adtSession` hashtable:

```powershell
$adtSession = @{
    AppVendor = 'RARLab'
    AppName = 'WinRAR'
    AppVersion = '7.13.0'
    AppProcessesToClose = @('WinRAR', 'Rar', 'UnRAR')
    # ... other configuration
}
```

### 2. Deployment Functions

Added the required deployment functions that PSADT v4 expects:

- `Install-ADTDeployment` - Handles installation logic
- `Uninstall-ADTDeployment` - Handles uninstallation logic
- `Repair-ADTDeployment` - Handles repair logic

### 3. Module Import

Updated to use the correct module import with manifest file:

```powershell
Import-Module -FullyQualifiedName @{
    ModuleName = "$PSScriptRoot\PSAppDeployToolkit\PSAppDeployToolkit.psd1"
    Guid = '8c3c366b-8606-4576-9f2d-4051144f7ca2'
    ModuleVersion = '4.1.7'
} -Force
```

### 4. Session Initialization

Changed to use `Open-ADTSession`:

```powershell
$iadtParams = Get-ADTBoundParametersAndDefaultValues -Invocation $MyInvocation
$adtSession = Remove-ADTHashtableNullOrEmptyValues -Hashtable $adtSession
$adtSession = Open-ADTSession @adtSession @iadtParams -PassThru
```

### 5. Dynamic Invocation

Uses dynamic function invocation based on deployment type:

```powershell
& "$($adtSession.DeploymentType)-ADTDeployment"
Close-ADTSession
```

## Files Modified

- `C:\Temp\WinRAR\WinRAR_Package\Invoke-AppDeployToolkit.ps1`

## Reference

The fix was based on the official PSADT v4 template located at:
`C:\Temp\WinRAR\WinRAR_Package\PSAppDeployToolkit\Frontend\v4\Invoke-AppDeployToolkit.ps1`
