## Context

Intune Win32 apps require detection rules to verify installation status. The four detection methods have different trade-offs and use cases. This proposal adds intelligent detection rule generation based on application characteristics.

**Stakeholders**: IT admins deploying to Intune
**Constraints**: Must match Intune's detection rule schema exactly

## Goals / Non-Goals

**Goals**:
- Provide `generate_intune_detection` tool for all detection types
- Generate file-based detection (path, version, size)
- Generate registry-based detection (key, value)
- Generate MSI product code detection
- Generate PowerShell script detection with exit code logic
- Output Intune API-compatible JSON

**Non-Goals**:
- Direct Intune API integration (user copies output)
- IntuneWinAppUtil packaging (separate tool)
- Detection rule testing/simulation

## Decisions

### Decision 1: Support all four detection types
- **File**: Check file exists with optional version/size
- **Registry**: Check registry key/value exists
- **MSI**: Check MSI product code in registry
- **Script**: Custom PowerShell script returns exit 0 for detected
- **Why**: Cover all Intune detection scenarios

### Decision 2: Output both JSON and PowerShell
- **JSON**: Ready for Intune Graph API or manual portal entry
- **PowerShell**: For script-based detection, also useful for testing
- **Why**: Support different workflows (API automation vs manual upload)

### Decision 3: Version comparison operators
- Support: equal, notEqual, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual
- **Why**: Match Intune's version comparison capabilities

### Decision 4: Suggest best detection method
- If MSI: Recommend product code (most reliable)
- If EXE with consistent version file: Recommend file detection
- If EXE without version: Recommend registry (uninstall key)
- **Why**: Guide users to best practice

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tool Layer                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           generate_intune_detection Tool             │   │
│  └──────────────────────────┬──────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Detection Service                           │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ generateFile   │  │ generateReg    │  │ generateMsi  │  │
│  │   Detection    │  │   Detection    │  │  Detection   │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
│  ┌────────────────┐  ┌────────────────┐                    │
│  │ generateScript │  │ toIntuneJson   │                    │
│  │   Detection    │  │                │                    │
│  └────────────────┘  └────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## Detection Type Details

### File Detection
```json
{
  "@odata.type": "#microsoft.graph.win32LobAppFileSystemDetection",
  "path": "C:\\Program Files\\App",
  "fileOrFolderName": "app.exe",
  "check32BitOn64System": false,
  "detectionType": "version",
  "operator": "greaterThanOrEqual",
  "detectionValue": "1.0.0"
}
```

### Registry Detection
```json
{
  "@odata.type": "#microsoft.graph.win32LobAppRegistryDetection",
  "keyPath": "HKEY_LOCAL_MACHINE\\SOFTWARE\\App",
  "valueName": "Version",
  "check32BitOn64System": false,
  "detectionType": "string",
  "operator": "equal",
  "detectionValue": "1.0.0"
}
```

### MSI Detection
```json
{
  "@odata.type": "#microsoft.graph.win32LobAppProductCodeDetection",
  "productCode": "{GUID}",
  "productVersionOperator": "greaterThanOrEqual",
  "productVersion": "1.0.0"
}
```

### Script Detection
```powershell
# Detection script - Exit 0 if installed, Exit 1 if not
$AppPath = "C:\Program Files\App\app.exe"
if (Test-Path $AppPath) {
    $Version = (Get-Item $AppPath).VersionInfo.FileVersion
    if ([version]$Version -ge [version]"1.0.0") {
        Write-Host "Detected: $Version"
        exit 0
    }
}
exit 1
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Intune schema changes | Medium | Abstract schema, version detection |
| Incorrect detection type chosen | Medium | Provide recommendations, explain trade-offs |
| Version format variations | Low | Handle common formats, document edge cases |

## Migration Plan

N/A - New capability.

## Open Questions

1. Should we support requirement rules as well as detection?
   - **Decision**: Not in MVP, focus on detection first
