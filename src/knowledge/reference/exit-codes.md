---
title: "Installer Exit Codes Reference"
id: "ref-exit-codes"
psadt_target: "4.0.x"
last_updated: "2024-12-07"
verified_by: "maintainer"
source_ref: "ReferenceKnowledge/V4DOCS.md#exit-codes"
tags: ["exit-codes", "reference", "msi", "troubleshooting"]
---

# Installer Exit Codes Reference

Understanding exit codes is critical for proper error handling and deployment automation.

## Windows Installer (MSI) Exit Codes

### Success Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | ERROR_SUCCESS | Action completed successfully |
| 1641 | ERROR_SUCCESS_REBOOT_INITIATED | Restart initiated |
| 3010 | ERROR_SUCCESS_REBOOT_REQUIRED | Restart required to complete |

### Common Error Codes

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 1 | ERROR_INVALID_FUNCTION | Invalid function | Check MSI syntax |
| 2 | ERROR_FILE_NOT_FOUND | File not found | Verify MSI path |
| 5 | ERROR_ACCESS_DENIED | Access denied | Run as admin |
| 13 | ERROR_INVALID_DATA | Data is invalid | MSI may be corrupt |
| 87 | ERROR_INVALID_PARAMETER | Invalid parameter | Check command line arguments |
| 1601 | ERROR_INSTALL_SERVICE_FAILURE | Windows Installer service could not be accessed | Restart Windows Installer service |
| 1602 | ERROR_INSTALL_USEREXIT | User cancelled installation | User intervention |
| 1603 | ERROR_INSTALL_FAILURE | Fatal error during installation | Check verbose log |
| 1604 | ERROR_INSTALL_SUSPEND | Installation suspended, incomplete | Check for interruptions |
| 1605 | ERROR_UNKNOWN_PRODUCT | Product not registered | Product not installed |
| 1606 | ERROR_UNKNOWN_FEATURE | Feature ID not registered | Invalid feature specified |
| 1607 | ERROR_UNKNOWN_COMPONENT | Component ID not registered | Invalid component |
| 1608 | ERROR_UNKNOWN_PROPERTY | Unknown property | Invalid property specified |
| 1609 | ERROR_INVALID_HANDLE_STATE | Handle is in an invalid state | Internal error |
| 1610 | ERROR_BAD_CONFIGURATION | Configuration data corrupt | Repair registry |
| 1612 | ERROR_INSTALL_SOURCE_ABSENT | Installation source unavailable | Source files missing |
| 1613 | ERROR_INSTALL_PACKAGE_VERSION | Package version not supported | Wrong installer version |
| 1614 | ERROR_PRODUCT_UNINSTALLED | Product is uninstalled | Already removed |
| 1618 | ERROR_INSTALL_ALREADY_RUNNING | Another installation is in progress | Wait or use WaitForMsiExec |
| 1619 | ERROR_INSTALL_PACKAGE_OPEN_FAILED | Could not open installation package | Invalid or missing MSI |
| 1620 | ERROR_INSTALL_PACKAGE_INVALID | Installation package is invalid | MSI corrupt or wrong format |
| 1621 | ERROR_INSTALL_UI_FAILURE | Error starting Windows Installer service UI | Service issue |
| 1622 | ERROR_INSTALL_LOG_FAILURE | Error opening installation log file | Check log path/permissions |
| 1623 | ERROR_INSTALL_LANGUAGE_UNSUPPORTED | Language not supported | Wrong language pack |
| 1624 | ERROR_INSTALL_TRANSFORM_FAILURE | Error applying transforms | Check MST file |
| 1625 | ERROR_INSTALL_PACKAGE_REJECTED | Installation prohibited by policy | Group Policy blocking |
| 1627 | ERROR_FUNCTION_NOT_CALLED | Function could not be executed | Custom action failure |
| 1628 | ERROR_FUNCTION_FAILED | Function failed during execution | Custom action error |
| 1629 | ERROR_INVALID_TABLE | Invalid or unknown table | MSI database error |
| 1630 | ERROR_DATATYPE_MISMATCH | Data type mismatch | Invalid property value |
| 1631 | ERROR_UNSUPPORTED_TYPE | Unsupported data type | Invalid property type |
| 1632 | ERROR_CREATE_FAILED | Windows Installer service failed to start | Service issue |
| 1633 | ERROR_INSTALL_TEMP_UNWRITABLE | Temp folder inaccessible | Check TEMP permissions |
| 1634 | ERROR_INSTALL_PLATFORM_UNSUPPORTED | Platform not supported | Architecture mismatch |
| 1635 | ERROR_INSTALL_NOTUSED | Component not used | Internal error |
| 1636 | ERROR_PATCH_PACKAGE_OPEN_FAILED | Patch package could not be opened | Invalid MSP |
| 1637 | ERROR_PATCH_PACKAGE_INVALID | Patch package invalid | MSP corrupt |
| 1638 | ERROR_PATCH_PACKAGE_UNSUPPORTED | Product version already installed | Downgrade blocked |
| 1639 | ERROR_INVALID_COMMAND_LINE | Invalid command line | Check syntax |
| 1642 | ERROR_INSTALL_SERVICE_SAFEBOOT | Cannot install in safe mode | Boot normally |
| 1643 | ERROR_ROLLBACK_DISABLED | Rollback disabled | Enable rollback |
| 1644 | ERROR_INSTALL_REJECTED | Installation rejected by digital signature policy | Signing issue |

### Less Common Codes

| Code | Name | Description |
|------|------|-------------|
| 1645 | ERROR_SIGNATURE_OR_CATALOG_INVALID | Windows cannot verify signature |
| 1646 | ERROR_INSTALL_NOTRANSFORM | Transform not applied |
| 1647 | ERROR_INSTALL_NOT_LOCAL | Network install location unavailable |
| 1648 | ERROR_INSTALL_PACKAGING_OVERFLOW | Package too large |
| 1649 | ERROR_INSTALL_USERINSTALL_DISALLOWED | User installations disabled |
| 1650 | ERROR_INSTALL_SYSTEM_POLICY_CONFLICT | System policy conflict |
| 1651 | ERROR_INSTALL_IMAGE_FAILURE | Could not access installation image |
| 1652 | ERROR_INSTALL_ENGINE_FAILURE | Engine failure |

## PSADT Exit Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | Success | Deployment completed successfully |
| 1 | General Error | Unspecified error |
| 60001 | Fast Retry | Retry deployment soon |
| 60002 | Block Execution | Application execution was blocked |
| 60003 | Defer | User deferred the installation |
| 60004 | Installation Pending | Previous installation pending |
| 60005 | Installation Suspended | Installation was suspended |
| 60006 | RestartRequired | Restart required (same as 3010) |
| 60007 | Installation Aborted | Installation was aborted |
| 60008 | Installation Failed | Generic installation failure |
| 60009 | Installation Timeout | Timeout during installation |
| 60010 | User Cancelled | User cancelled the installation |

## Inno Setup Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Setup failed to initialize |
| 2 | User clicked Cancel or closed Setup |
| 3 | Fatal error preparing for install |
| 4 | Fatal error during installation |
| 5 | User clicked Cancel during install |
| 6 | Setup aborted due to /VERYSILENT message box |
| 7 | User requested Selective Deferred actions after restart |
| 8 | Fatal error while preparing to move to new directory |

## NSIS Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Installation aborted by script |
| 2 | User abort |

## InstallShield Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| -1 | General error |
| -2 | Invalid mode |
| -3 | Required data not found |
| -4 | Not enough memory |
| -5 | File does not exist |
| -6 | Cannot write to response file |
| -7 | Unable to write to log file |
| -8 | Invalid path to .iss file |
| -9 | Not a valid list type |
| -10 | Data type is invalid |
| -11 | Unknown error in Setup.exe |
| -12 | Dialog box is not supported |
| -51 | Cannot create folder |
| -52 | Cannot access file or folder |
| -53 | Selected folder is invalid |

## WiX Burn Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Generic error |
| 1602 | User cancelled |
| 1618 | Another install in progress |
| 1641 | Restart initiated |
| 3010 | Restart required |

## Handling Exit Codes in PSADT

### Basic Exit Code Handling

```powershell
$result = Start-ADTProcess -FilePath 'setup.exe' -Arguments '/S' -PassThru

switch ($result.ExitCode) {
    0 {
        Write-ADTLogEntry -Message "Installation successful"
    }
    3010 {
        Write-ADTLogEntry -Message "Installation successful - restart required" -Severity 2
        Complete-ADTDeployment -DeploymentStatus 'RestartRequired'
        return
    }
    1641 {
        Write-ADTLogEntry -Message "Installation successful - restart initiated" -Severity 2
        Complete-ADTDeployment -DeploymentStatus 'RestartRequired'
        return
    }
    1602 {
        Write-ADTLogEntry -Message "Installation cancelled by user" -Severity 2
        Complete-ADTDeployment -DeploymentStatus 'Failed' -ErrorMessage "User cancelled"
        return
    }
    1618 {
        Write-ADTLogEntry -Message "Another installation in progress" -Severity 2
        Complete-ADTDeployment -DeploymentStatus 'FastRetry'
        return
    }
    default {
        $errorMessage = "Installation failed with exit code: $($result.ExitCode)"
        Write-ADTLogEntry -Message $errorMessage -Severity 3
        throw $errorMessage
    }
}
```

### Using IgnoreExitCodes

```powershell
# Ignore specific non-fatal exit codes
Start-ADTProcess -FilePath 'setup.exe' -Arguments '/S' -IgnoreExitCodes '1,2,3010'
```

### Mapping Exit Codes to PSADT Status

```powershell
function Convert-InstallerExitCode {
    param (
        [int]$ExitCode,
        [string]$InstallerType = 'msi'
    )

    # Success codes
    if ($ExitCode -eq 0) {
        return @{Status = 'Complete'; Message = 'Success'}
    }

    # Restart codes
    if ($ExitCode -in @(3010, 1641)) {
        return @{Status = 'RestartRequired'; Message = 'Restart required'}
    }

    # Retry codes
    if ($ExitCode -eq 1618) {
        return @{Status = 'FastRetry'; Message = 'Another installation in progress'}
    }

    # User cancellation
    if ($ExitCode -in @(1602, 2)) {
        return @{Status = 'Failed'; Message = 'User cancelled'}
    }

    # All other codes are failures
    return @{Status = 'Failed'; Message = "Exit code: $ExitCode"}
}

# Usage
$result = Start-ADTProcess -FilePath 'setup.exe' -Arguments '/S' -PassThru
$status = Convert-InstallerExitCode -ExitCode $result.ExitCode

if ($status.Status -eq 'Complete') {
    Complete-ADTDeployment -DeploymentStatus 'Complete'
} elseif ($status.Status -eq 'RestartRequired') {
    Complete-ADTDeployment -DeploymentStatus 'RestartRequired'
} elseif ($status.Status -eq 'FastRetry') {
    Complete-ADTDeployment -DeploymentStatus 'FastRetry'
} else {
    throw $status.Message
}
```

## Intune Exit Code Behavior

| Exit Code | Intune Interpretation | Retry Behavior |
|-----------|----------------------|----------------|
| 0 | Success | No retry |
| 3010 | Success (soft reboot) | No retry |
| 1707 | Success | No retry |
| 1641 | Success (hard reboot) | No retry |
| 1618 | Retry | Will retry |
| Other | Failed | May retry based on settings |

### Custom Exit Code Mapping in Intune

When configuring Win32 apps in Intune, you can specify custom return codes:

- **Success codes**: 0, 1707 (default)
- **Soft reboot**: 3010 (default)
- **Hard reboot**: 1641 (default)
- **Retry**: 1618 (default)

## Troubleshooting by Exit Code

### Exit Code 1603

Most common MSI failure. Check:

1. Enable verbose logging: `/l*v install.log`
2. Search log for "Return value 3"
3. Look at action before failure
4. Common causes:
   - Custom action failure
   - File in use
   - Insufficient disk space
   - Missing prerequisites
   - Invalid file permissions

### Exit Code 1618

Another installation is running:

```powershell
# Wait for other installations
$timeout = 300  # 5 minutes
$timer = [Diagnostics.Stopwatch]::StartNew()

while ((Get-Process msiexec -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*msiexec*' }).Count -gt 0) {
    if ($timer.Elapsed.TotalSeconds -gt $timeout) {
        throw "Timeout waiting for other MSI operations"
    }
    Start-Sleep -Seconds 5
}
```

### Exit Code 1619

Installation package could not be opened:

- Verify file exists
- Check file is not corrupted
- Ensure path doesn't have special characters
- Try copying to local path first

### Exit Code 1625

Installation prohibited by policy:

- Check Group Policy for software restrictions
- Verify code signing
- Check AppLocker policies
