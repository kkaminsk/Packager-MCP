# PSADT v4 Start-ADTProcess Parameter Fix

## Issue

The script failed during the installation phase with the following error:

```
Message               : A parameter cannot be found that matches parameter name 'Arguments'.
FullyQualifiedErrorId : NamedParameterNotFound,Install-ADTDeployment
ScriptStackTrace      : at Install-ADTDeployment, C:\temp\winrar\WinRAR_Package\Invoke-AppDeployToolkit.ps1: line 134
```

## Root Cause

The `Start-ADTProcess` function in PSADT v4 uses `-ArgumentList` as the parameter name for passing arguments to the executable, not `-Arguments`.

| Incorrect | Correct |
|-----------|---------|
| `Start-ADTProcess -Arguments` | `Start-ADTProcess -ArgumentList` |

## Solution

Updated all calls to `Start-ADTProcess` to use the correct parameter name.

### Install Function (line 134)

Before:
```powershell
$result = Start-ADTProcess -FilePath $installerPath -Arguments $SilentArgs -PassThru
```

After:
```powershell
$result = Start-ADTProcess -FilePath $installerPath -ArgumentList $SilentArgs -PassThru
```

### Uninstall Function (line 207)

Before:
```powershell
Start-ADTProcess -FilePath $uninstallPath -Arguments $UninstallArgs
```

After:
```powershell
Start-ADTProcess -FilePath $uninstallPath -ArgumentList $UninstallArgs
```

## Files Modified

- `C:\Temp\WinRAR\WinRAR_Package\Invoke-AppDeployToolkit.ps1`
- `C:\Temp\WinRAR\WinRAR_Package\fixpsm.md` (updated documentation)

## Reference

From `PSAppDeployToolkit.psm1` line 21562:
```
.PARAMETER ArgumentList
    Arguments to be passed to the executable.
```
