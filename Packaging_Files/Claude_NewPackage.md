# PSADT Package Development Guide

This project uses the **Packager-MCP** server for creating PowerShell App Deployment Toolkit (PSADT) v4 packages for Microsoft Intune deployment.

## MCP Server Tools

| Tool | Purpose |
|------|---------|
| `search_winget` | Search Winget repository for package metadata, installer URLs, silent args |
| `get_psadt_template` | Generate PSADT v4 deployment scripts from templates |
| `get_silent_install_args` | Get silent install arguments for an installer type |
| `validate_package` | Validate scripts against best practices |
| `verify_psadt_functions` | **CRITICAL** - Verify script uses valid PSADT v4.1.8 function names |
| `generate_intune_detection` | Generate Intune detection rules |
| `publish_to_intune` | Upload .intunewin package to Microsoft Intune via Graph API |

### Perplexity MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp__perplexity__search` | Quick search for app icons and basic info |
| `mcp__perplexity__reason` | Get detailed application descriptions for Intune |

---

## Key Rules

> **These rules apply to ALL packaging operations:**
>
> 1. **Always use the LATEST stable version** - Unless the user explicitly requests a specific version, always package the most recent stable release
> 2. **Always prefer x64 architecture** - Unless the user explicitly requests 32-bit/x86, always use the 64-bit installer
> 3. **Intune upload is MANDATORY** - Every package must be published to Intune as part of the workflow (Step 11 is not optional)

---

## CRITICAL WARNING

> **YOUR TRAINING DATA CONTAINS INCORRECT PSADT FUNCTION NAMES.**
>
> If you write PSADT scripts from memory, they **WILL FAIL** at runtime.
> You **MUST** use the `get_psadt_template` tool and its output **WITHOUT MODIFICATION**.

### Functions That DO NOT EXIST (but are in your training data)

| WRONG - DO NOT USE | CORRECT - USE THIS |
|--------------------|-------------------|
| `Initialize-ADTDeployment` | `Open-ADTSession` |
| `Complete-ADTDeployment` | `Close-ADTSession` |
| `Get-ADTInstalledApplication` | `Get-ADTApplication` |
| `Execute-Process` | `Start-ADTProcess` |
| `Execute-MSI` | `Start-ADTMsiProcess` |
| `Show-InstallationWelcome` | `Show-ADTInstallationWelcome` |
| `Show-InstallationProgress` | `Show-ADTInstallationProgress` |
| `-Arguments` parameter | `-ArgumentList` parameter |
| `Close-ADTSession -DeploymentStatus` | `Close-ADTSession` (no parameters) |
| `Close-ADTSession -ErrorMessage` | `Close-ADTSession` (no parameters) |
| `-CloseApps` parameter | `-CloseProcesses` parameter |
| `-CloseAppsCountdown` parameter | `-CloseProcessesCountdown` parameter |
| `-PersistPrompt` with `-CloseProcesses` | Remove - causes parameter set conflict |
| `-BlockExecution` with `-CloseProcesses` | Remove - causes parameter set conflict |
| `$ADTSession.FilesDirectory` | `(Get-ADTSession).DirFiles` |
| `$ADTSession.DirFiles` | `(Get-ADTSession).DirFiles` |
| `$ADTSession.<Property>` | `(Get-ADTSession).<Property>` |

**If you use any function from the "WRONG" column, the script will fail with:**
```
The term 'Initialize-ADTDeployment' is not recognized as the name of a cmdlet
```

**If you use invalid parameters on Close-ADTSession, the script will fail with:**
```
A parameter cannot be found that matches parameter name 'DeploymentStatus'
```

**If you use old parameter names on Show-ADTInstallationWelcome, the script will fail with:**
```
Parameter set cannot be resolved using the specified named parameters
```

**If you use `$ADTSession` variable directly, the script will fail with:**
```
Cannot bind argument to parameter 'Path' because it is null
```

---

## Mandatory Workflow

When creating a new PSADT package, you **MUST** follow these steps in order:

### Step 1: Search for Package
```
search_winget(query: "<application name>")
```
- Get package ID, version, installer URL, installer type
- **ALWAYS use the latest stable version** unless the user explicitly requests a specific version
- **ALWAYS prefer x64 (64-bit) architecture** unless the user explicitly requests x86/32-bit
- Note the silent install arguments AND uninstall arguments
- If uninstall args not provided, derive from installer type (see "Common Installer Types and Silent Args" section)
- Exclude beta/preview/insider versions unless specifically requested
- **IMPORTANT: Capture these values for Intune publication:**
  - `packageName` - Use as the Intune application display name (`app_name`)
  - `publisher` - Use as the Intune application publisher (`app_vendor`)

### Step 2: Get Application Info from Perplexity
Use Perplexity MCP to gather application metadata for Intune:

#### Get Application Icon (MANDATORY)

**Primary Method - Icons8 (Most Reliable):**
```powershell
# Icons8 provides reliable PNG icons at 256x256 for most popular applications
Invoke-WebRequest -Uri "https://img.icons8.com/color/256/<appname>.png" -OutFile "<package_path>/AppIcon.png" -UseBasicParsing
```

**Common Icons8 URLs:**
| Application | URL |
|-------------|-----|
| WinRAR | `https://img.icons8.com/color/256/winrar.png` |
| 7-Zip | `https://img.icons8.com/color/256/7zip.png` |
| Chrome | `https://img.icons8.com/color/256/chrome.png` |
| Firefox | `https://img.icons8.com/color/256/firefox.png` |
| VLC | `https://img.icons8.com/color/256/vlc.png` |
| Notepad++ | `https://img.icons8.com/color/256/notepad-plus-plus.png` |
| VS Code | `https://img.icons8.com/color/256/visual-studio-code-2019.png` |
| Zoom | `https://img.icons8.com/color/256/zoom.png` |
| Slack | `https://img.icons8.com/color/256/slack-new.png` |
| Teams | `https://img.icons8.com/color/256/microsoft-teams.png` |

**Fallback Method - Perplexity Search:**
If Icons8 doesn't have the app icon, search using Perplexity:
```
mcp__perplexity__search(query: "<application name> official logo PNG 256x256 pixels download site:github.com OR site:wikipedia.org")
```

**Icon Requirements:**
- **MUST be PNG or JPEG format** - ICO files are NOT supported by Intune
- Target size: 256x256 pixels (Intune will resize if needed)
- Download to package folder as `AppIcon.png` or `AppIcon.jpg`
- **VERIFY the file was downloaded** before proceeding to publish

**Preferred sources (in order):**
1. **Icons8** (`https://img.icons8.com/color/256/<appname>.png`) - Most reliable
2. GitHub repositories (raw.githubusercontent.com)
3. Wikipedia/Wikimedia Commons
4. Official vendor website

**DO NOT download ICO files** - they will fail to upload to Intune

**Verification Step (MANDATORY):**
```powershell
# After downloading, verify the icon exists and has content
$iconPath = "<package_path>/AppIcon.png"
if (Test-Path $iconPath) {
    $size = (Get-Item $iconPath).Length
    if ($size -gt 0) {
        Write-Host "Icon downloaded successfully: $size bytes"
    } else {
        Write-Host "ERROR: Icon file is empty!"
    }
} else {
    Write-Host "ERROR: Icon not found at $iconPath"
}
```

#### Get Application Description
```
mcp__perplexity__reason(query: "Write a professional application description for <application name> for use in Microsoft Intune. Include: what the application does, key features, typical use cases, and system requirements. Keep the description under 10000 characters. Do not include installation instructions.")
```
- Get a comprehensive description suitable for Intune Company Portal
- Maximum 10000 characters (Intune limit)
- Should include: purpose, features, use cases, requirements
- Save to `AppDescription.txt` in package folder for reference
- Use this description when calling `publish_to_intune`

**Example Workflow:**
```powershell
# Step 2a: Download icon from Icons8
Invoke-WebRequest -Uri "https://img.icons8.com/color/256/winrar.png" -OutFile "C:\Packages\WinRAR\AppIcon.png" -UseBasicParsing

# Step 2b: Verify icon downloaded
Get-Item "C:\Packages\WinRAR\AppIcon.png" | Select-Object Name, Length

# Step 2c: Get description from Perplexity (call mcp__perplexity__reason)
# Save result to AppDescription.txt
```

**Example Perplexity queries:**
```
# For 7-Zip:
mcp__perplexity__reason(query: "Write a professional application description for 7-Zip file archiver for use in Microsoft Intune. Include: what the application does, key features, typical use cases, and system requirements. Keep the description under 10000 characters.")

# For Google Chrome:
mcp__perplexity__reason(query: "Write a professional application description for Google Chrome web browser for use in Microsoft Intune. Include: what the application does, key features, typical use cases, and system requirements. Keep the description under 10000 characters.")
```

### Step 3: Generate PSADT Script
```
get_psadt_template(
  application_name: "<name>",
  application_vendor: "<vendor>",
  application_version: "<version>",
  installer_type: "<msi|exe|msix|zip>",
  installer_file_name: "<filename>",
  silent_args: "<install_args>",
  uninstall_args: "<uninstall_args>",
  output_directory: "<path>"
)
```
- The tool creates `Deploy-Application.ps1` with **CORRECT** function names
- **DO NOT** read and rewrite the generated script
- **DO NOT** "improve" or modify the output
- **CRITICAL:** Both `silent_args` AND `uninstall_args` MUST include silent switches
- If `uninstall_args` is not known from winget metadata, derive from installer type (see table below)

### Step 4: Verify the Script (MANDATORY)
```
verify_psadt_functions(file_path: "<path>/Deploy-Application.ps1")
```
- This step is **NOT OPTIONAL**
- If `isValid: false`, fix the errors before proceeding
- **NEVER** deliver a package that failed verification

### Step 5: Download Installer
```powershell
Invoke-WebRequest -Uri "<installer_url>" -OutFile "<path>/Files/<filename>" -UseBasicParsing
```

### Step 6: Test Installation (MANDATORY)
```powershell
# Run from elevated PowerShell prompt
Set-Location "<path>"
powershell.exe -ExecutionPolicy Bypass -File "Deploy-Application.ps1" -DeploymentType "Install" -DeployMode "Silent"
```
- **STOP if installation fails** - do not proceed until resolved
- Verify the application installed correctly
- Check PSADT logs for any errors

### Step 7: Create and Test Detection Script
- Use `generate_intune_detection` tool or create manually
- **IMPORTANT:** Fix version comparison for 3-part versions (see Troubleshooting section)
- Test the detection script returns exit code 0 when app is installed:
```powershell
& .\Detection.ps1; Write-Host "Exit code: $LASTEXITCODE"
```

### Step 8: Test Uninstall (MANDATORY)
```powershell
powershell.exe -ExecutionPolicy Bypass -File "Deploy-Application.ps1" -DeploymentType "UnInstall" -DeployMode "Silent"
```
- Verify the application was removed
- Test detection script returns exit code 1 after uninstall

### Step 9: Create .intunewin Package
1. Download IntuneWinAppUtil if not present:
```powershell
New-Item -ItemType Directory -Path "<tools_path>\IntuneWinAppUtil" -Force
Invoke-WebRequest -Uri "https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool/raw/master/IntuneWinAppUtil.exe" -OutFile "<tools_path>\IntuneWinAppUtil\IntuneWinAppUtil.exe"
```

2. Create the .intunewin file:
```powershell
& "<tools_path>\IntuneWinAppUtil\IntuneWinAppUtil.exe" -c "<package_path>" -s "Deploy-Application.ps1" -o "<package_path>"
```

3. Rename to standard format: `<ApplicationName>-v<Version>.intunewin`

### Step 10: Create README.md
Create comprehensive documentation including:
- Application info (name, version, vendor)
- Package contents
- Intune deployment settings (install/uninstall commands)
- Detection rules
- Return codes
- Requirements
- Testing checklist
- Troubleshooting

### Step 11: Publish to Intune (MANDATORY)
```
publish_to_intune(
  intunewin_path: "<path>/<AppName>-v<Version>.intunewin",
  detection_rule: <detection_rule_from_generate_intune_detection>,
  app_name: "<packageName from winget>",
  app_vendor: "<publisher from winget>",
  description: "<description from Step 2>",
  logo_path: "<path>/AppIcon.png"
)
```
- **This step is MANDATORY** - all packages must be uploaded to Intune as part of the packaging workflow
- **IMPORTANT:** Always use winget metadata for app naming:
  - `app_name` - Use the `packageName` from winget search results (e.g., "WinRAR", "Google Chrome")
  - `app_vendor` - Use the `publisher` from winget search results (e.g., "RARLab", "Google")
- Uploads the .intunewin package to Microsoft Intune via Graph API
- Requires certificate-based service principal authentication configured via environment variables
- Fetches app description via web search if not provided
- Optionally fetches app logo automatically (use `skip_logo: true` to disable)

**Prerequisites:**
- Environment variables configured for Intune Graph API authentication:
  - `AZURE_TENANT_ID` - Azure AD tenant ID
  - `AZURE_CLIENT_ID` - Service principal application ID
  - `AZURE_CLIENT_CERTIFICATE_PATH` - Path to certificate file (.pfx or .pem)
  - `AZURE_CLIENT_CERTIFICATE_PASSWORD` - Certificate password (if .pfx)
- Service principal must have `DeviceManagementApps.ReadWrite.All` permission

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `intunewin_path` | Yes | Path to the .intunewin package file |
| `detection_rule` | Yes | Detection rule from `generate_intune_detection` output |
| `app_name` | **Yes*** | Display name - **use `packageName` from winget** |
| `app_vendor` | **Yes*** | Publisher - **use `publisher` from winget** |
| `app_version` | No | Version (auto-populated from PSADT) |
| `description` | No | App description (fetched via web search if not provided) |
| `install_command` | No | Custom install command (defaults to PSADT command) |
| `uninstall_command` | No | Custom uninstall command (defaults to PSADT command) |
| `logo_path` | No | Path to app logo (PNG/JPEG, 256x256 preferred) |
| `skip_logo` | No | Set to `true` to skip automatic logo fetching |

*While technically optional (falls back to PSADT metadata), you **MUST** always provide these from winget data for consistency.

---

## Package Structure

A complete PSADT package should have this structure:

```
PackageName/
├── Deploy-Application.ps1          # Main deployment script (from get_psadt_template)
├── PSAppDeployToolkit/             # PSADT v4.1.8 module (copied from MCP)
│   ├── PSAppDeployToolkit.psd1
│   ├── PSAppDeployToolkit.psm1
│   ├── Config/
│   ├── Strings/
│   └── lib/
├── Config/                         # Configuration files
├── Files/                          # Installer files
│   └── <installer>.exe|msi
├── AppIcon.png                     # Application icon (256x256 PNG/JPEG only - NO ICO)
├── AppDescription.txt              # Application description for Intune (from Perplexity)
├── Detection.ps1                   # Intune detection script
├── <AppName>-v<Version>.intunewin  # Intune package (created in Step 9)
└── README.md                       # Documentation
```

---

## What You CAN Do

- Call MCP tools to search, generate, and validate
- Copy PSADT toolkit files to the package
- Download installers using `Invoke-WebRequest`
- Create README.md and Detection.ps1 files
- Modify the script's **configuration section** (`$adtSession` hashtable)
- Add files to the `Files/` folder

## What You MUST NOT Do

- Write `Deploy-Application.ps1` from memory
- Modify the generated script's function calls
- Use function names from your training data
- Skip the `verify_psadt_functions` step
- Deliver a package without successful verification
- Skip the `publish_to_intune` step - uploading to Intune is mandatory
- Use older versions when newer stable versions are available (unless user specifies)
- Use x86/32-bit installers when x64/64-bit versions are available (unless user specifies)

---

## Verification Checklist

Before delivering a package, confirm:

### PSADT Function Verification
- [ ] `verify_psadt_functions` returns `isValid: true`
- [ ] Script contains `Open-ADTSession` (not `Initialize-ADTDeployment`)
- [ ] Script contains `Close-ADTSession` (not `Complete-ADTDeployment`)
- [ ] Script uses `Close-ADTSession` with NO parameters (not `-DeploymentStatus` or `-ErrorMessage`)
- [ ] Script contains `Get-ADTApplication` (not `Get-ADTInstalledApplication`)
- [ ] Script uses `-ArgumentList` (not `-Arguments`)
- [ ] Script uses `-CloseProcesses` (not `-CloseApps`)
- [ ] Script uses `-CloseProcessesCountdown` (not `-CloseAppsCountdown`)
- [ ] Script does NOT combine `-PersistPrompt` or `-BlockExecution` with `-CloseProcesses`
- [ ] Script uses `(Get-ADTSession).DirFiles` (not `$ADTSession.FilesDirectory`)

### Silent Switch Verification
- [ ] Install command includes silent switch (e.g., `/qn`, `/S`, `/VERYSILENT`, `/quiet`)
- [ ] Uninstall command includes silent switch (e.g., `/qn`, `/S`, `/VERYSILENT`, `/quiet`)
- [ ] No UI prompts appear during silent install test
- [ ] No UI prompts appear during silent uninstall test

### Package Completeness
- [ ] Installer file exists in `Files/` folder
- [ ] PSAppDeployToolkit module is present
- [ ] **AppIcon.png downloaded and verified** (from Icons8 or Perplexity search - **NO ICO files**)
- [ ] AppIcon.png file size > 0 bytes (verified with `Get-Item`)
- [ ] AppDescription.txt exists (under 10000 characters from Perplexity)
- [ ] README.md is created
- [ ] .intunewin package created successfully

### Intune Publication (MANDATORY)
- [ ] Environment variables configured for Graph API authentication
- [ ] Detection rule generated and tested
- [ ] **`logo_path` parameter included** in `publish_to_intune` call
- [ ] `publish_to_intune` returns success with App ID **and** `logoUploaded: true`
- [ ] App visible in Intune admin center with logo

---

## Common Installer Types and Silent Args

> **IMPORTANT:** Both install AND uninstall MUST use silent switches to prevent UI prompts during Intune deployment.

| Type | Silent Install | Silent Uninstall | Notes |
|------|---------------|------------------|-------|
| MSI | `/qn /norestart` | `/qn /norestart` | Uninstall uses same args as install |
| Inno Setup | `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-` | `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART` | Drop `/SP-` for uninstall |
| NSIS (Nullsoft) | `/S` | `/S` | Case-sensitive! Must be uppercase |
| InstallShield | `/s /v"/qn"` | `/s /v"/qn"` | Same args for both |
| WiX Burn | `/quiet /norestart` | `/quiet /norestart` or `/uninstall /quiet /norestart` | Some need explicit `/uninstall` |
| 7-Zip (custom) | `/S` | `/S` | Uses NSIS-style switches |

### Deriving Uninstall Args When Unknown

If winget metadata doesn't provide uninstall arguments, use this logic:

1. **Same as install args**: Most installer types use identical silent switches for both install and uninstall (MSI, NSIS, InstallShield, 7-Zip custom)

2. **Based on installer type detection**:
   - If install uses `/qn` → uninstall uses `/qn /norestart`
   - If install uses `/S` → uninstall uses `/S`
   - If install uses `/VERYSILENT` → uninstall uses `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART`
   - If install uses `/quiet` → uninstall uses `/quiet /norestart`
   - If install uses `/silent` → uninstall uses `/silent`

3. **When in doubt**: Use the same silent switches from the install command, as this is correct for 90%+ of installers

---

## Intune Deployment Settings

### Install Command
```
powershell.exe -ExecutionPolicy Bypass -File "Deploy-Application.ps1" -DeploymentType "Install" -DeployMode "Silent"
```

### Uninstall Command
```
powershell.exe -ExecutionPolicy Bypass -File "Deploy-Application.ps1" -DeploymentType "UnInstall" -DeployMode "Silent"
```

### Return Codes
| Code | Type | Description |
|------|------|-------------|
| 0 | Success | Completed successfully |
| 1641 | Soft Reboot | Success, restart initiated |
| 3010 | Soft Reboot | Success, restart required |
| 60001 | Failed | Script error |
| 60008 | Failed | Module initialization failed |

---

## Example Session

```
User: Create a package for Google Chrome

AI: I'll create a PSADT package for Google Chrome.

Step 1: Searching winget...
[calls search_winget(query: "Google.Chrome")]
Found: Google.Chrome v120.0.6099.109
  - packageName: "Google Chrome"      <- Use for Intune app_name
  - publisher: "Google LLC"           <- Use for Intune app_vendor

Step 2: Getting application icon and description...

Step 2a: Downloading icon from Icons8 (primary method)...
[runs: Invoke-WebRequest -Uri "https://img.icons8.com/color/256/chrome.png" -OutFile "<path>/AppIcon.png"]
Result: AppIcon.png downloaded (8,234 bytes)

Step 2b: Verifying icon...
[runs: Get-Item "<path>/AppIcon.png" | Select-Object Name, Length]
Result: Icon verified - 8,234 bytes

Step 2c: Getting description from Perplexity...
[calls mcp__perplexity__reason(query: "Write a professional application description for Google Chrome web browser for use in Microsoft Intune...")]
Result: "Google Chrome is a fast, secure, and free web browser developed by Google..."
[saves to AppDescription.txt - 2,847 characters]

Step 3: Generating PSADT script...
[calls get_psadt_template with output_directory]

Step 4: Verifying script...
[calls verify_psadt_functions]
Result: isValid: true, 0 invalid functions

Step 5: Downloading installer...
[downloads installer to Files folder]

Step 6: Testing installation...
[runs powershell.exe -ExecutionPolicy Bypass -File "Deploy-Application.ps1" -DeploymentType "Install" -DeployMode "Silent"]
Result: Installation successful, exit code 0

Step 7: Creating and testing detection script...
[creates Detection.ps1 with version normalization fix]
[tests detection - returns exit code 0]

Step 8: Testing uninstall...
[runs powershell.exe -ExecutionPolicy Bypass -File "Deploy-Application.ps1" -DeploymentType "UnInstall" -DeployMode "Silent"]
Result: Uninstall successful, exit code 0
[tests detection - returns exit code 1]

Step 9: Creating .intunewin package...
[downloads IntuneWinAppUtil]
[creates GoogleChrome-v120.0.6099.109.intunewin]

Step 10: Creating README.md...
[creates comprehensive documentation]

Step 11: Publishing to Intune...
[calls publish_to_intune with:
  - intunewin_path: "<path>/GoogleChrome-v120.0.6099.109.intunewin"
  - detection_rule: <from generate_intune_detection>
  - app_name: "Google Chrome" (from winget packageName)
  - app_vendor: "Google LLC" (from winget publisher)
  - description: <from AppDescription.txt>
  - logo_path: "<path>/AppIcon.png"]   <- REQUIRED: Include logo!
Result: Successfully published to Intune
  - App Name: Google Chrome
  - Publisher: Google LLC
  - App ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  - logoUploaded: true   <- Verify logo was uploaded!

Package complete and published to Intune with logo!
```

---

## Troubleshooting

### "Function is not recognized as the name of a cmdlet"
**Cause:** AI wrote the script from training data instead of using `get_psadt_template`
**Solution:** Delete the script and regenerate using `get_psadt_template`

### "Module initialization failed" (Exit 60008)
**Cause:** PSAppDeployToolkit folder missing or incomplete
**Solution:** Copy the module from the MCP server's `dist/knowledge/v4github/PSAppDeployToolkit`

### verify_psadt_functions returns isValid: false
**Cause:** Script contains incorrect function names
**Solution:** Report the errors, regenerate the script using `get_psadt_template`

### "A parameter cannot be found that matches parameter name 'DeploymentStatus'"
**Cause:** Script uses `Close-ADTSession -DeploymentStatus 'Complete'` or `-DeploymentStatus 'Failed'` which are INVALID parameters in PSADT v4.1.8
**Solution:** Replace with just `Close-ADTSession` (no parameters). The function does not accept `-DeploymentStatus` or `-ErrorMessage` parameters.

**Wrong:**
```powershell
Close-ADTSession -DeploymentStatus 'Complete'
Close-ADTSession -DeploymentStatus 'Failed' -ErrorMessage $_.Exception.Message
```

**Correct:**
```powershell
Close-ADTSession
```

### "Parameter set cannot be resolved using the specified named parameters" (Show-ADTInstallationWelcome)
**Cause:** Script uses PSADT v3 parameter names (`-CloseApps`, `-CloseAppsCountdown`) or incompatible parameter combinations (`-PersistPrompt`, `-BlockExecution` with `-CloseProcesses`)
**Solution:** Use PSADT v4.1.8 parameter names and avoid conflicting parameter combinations.

**Wrong:**
```powershell
Show-ADTInstallationWelcome -CloseApps 'app1,app2' -CloseAppsCountdown 300 -PersistPrompt -BlockExecution
```

**Correct:**
```powershell
Show-ADTInstallationWelcome -CloseProcesses 'app1,app2' -CloseProcessesCountdown 300
```

### "Cannot bind argument to parameter 'Path' because it is null"
**Cause:** Script uses `$ADTSession.FilesDirectory` or `$ADTSession.DirFiles` directly. In PSADT v4.1.8, `$ADTSession` is not a global variable - you must use `Get-ADTSession` function to retrieve session properties.
**Solution:** Replace `$ADTSession.<Property>` with `(Get-ADTSession).<Property>`

**Wrong:**
```powershell
$installerPath = Join-Path -Path $ADTSession.FilesDirectory -ChildPath $InstallerFile
$installerPath = Join-Path -Path $ADTSession.DirFiles -ChildPath $InstallerFile
```

**Correct:**
```powershell
$installerPath = Join-Path -Path (Get-ADTSession).DirFiles -ChildPath $InstallerFile
```

### Detection script version comparison fails

**Cause:** The `generate_intune_detection` tool creates detection scripts using 4-part version numbers (e.g., `7.13.0.0`), but many applications report only 3-part versions (e.g., `7.13.0`). When PowerShell compares `[version]'7.13.0'` against `[version]'7.13.0.0'`, the 3-part version is treated as having `-1` for the missing revision part, causing the `>=` comparison to fail.

**Symptom:**
```
Not detected: Version 7.13.0 does not meet requirement 7.13.0.0
```

**Solution:** Normalize both versions to 4-part format before comparing. Replace the generated detection script with this pattern:

**Wrong (generated by tool):**
```powershell
$RequiredVersion = '7.13.0.0'
if ([version]$FileVersion -ge [version]'7.13.0.0') {
    # This fails when FileVersion is "7.13.0"
}
```

**Correct (normalize versions):**
```powershell
$RequiredVersion = [version]'7.13.0'

# Normalize version to handle 3-part versions
$versionParts = $FileVersion -split '\.'
while ($versionParts.Count -lt 4) {
    $versionParts += '0'
}
$normalizedVersion = [version]($versionParts[0..3] -join '.')

$normalizedRequired = [version]('{0}.{1}.{2}.{3}' -f $RequiredVersion.Major, $RequiredVersion.Minor, $RequiredVersion.Build, 0)

if ($normalizedVersion -ge $normalizedRequired) {
    Write-Host "Detected: $AppName version $FileVersion"
    exit 0
}
```

**Complete corrected Detection.ps1 template:**
```powershell
# Detection script for <AppName> <Version>
# Exit 0 if detected, Exit 1 if not detected

$AppPath = 'C:\Program Files\<AppName>\<AppName>.exe'
$RequiredVersion = [version]'<Major>.<Minor>.<Build>'

if (Test-Path -Path $AppPath) {
    $FileVersion = (Get-Item $AppPath).VersionInfo.FileVersion
    if ($FileVersion) {
        # Clean version string and handle different formats
        $FileVersion = ($FileVersion -split ' ')[0]

        # Normalize version to handle 3-part versions
        $versionParts = $FileVersion -split '\.'
        while ($versionParts.Count -lt 4) {
            $versionParts += '0'
        }
        $normalizedVersion = [version]($versionParts[0..3] -join '.')

        $normalizedRequired = [version]('{0}.{1}.{2}.{3}' -f $RequiredVersion.Major, $RequiredVersion.Minor, $RequiredVersion.Build, 0)

        try {
            if ($normalizedVersion -ge $normalizedRequired) {
                Write-Host "Detected: <AppName> version $FileVersion"
                exit 0
            }
            Write-Host "Not detected: Version $FileVersion does not meet requirement $RequiredVersion"
        } catch {
            Write-Host "Not detected: Could not parse version '$FileVersion'"
        }
        exit 1
    }
    # File exists but no version - still detected based on existence
    Write-Host "Detected: <AppName> found at $AppPath (no version info)"
    exit 0
}

Write-Host "Not detected: <AppName> not found at $AppPath"
exit 1
```

### UI prompts appear during silent install/uninstall

**Cause:** Missing or incorrect silent switches in the install or uninstall command
**Symptom:** Installation or uninstallation stops waiting for user input, or shows dialog boxes

**Solution:** Verify silent switches are correct for the installer type:
1. Check the installer type (MSI, Inno, NSIS, etc.)
2. Use the correct silent switches from the "Common Installer Types and Silent Args" table
3. Re-test with the correct switches

**Common mistakes:**
- Using `/s` instead of `/S` for NSIS (case-sensitive!)
- Missing `/SUPPRESSMSGBOXES` for Inno Setup
- Forgetting to add `/norestart` to prevent automatic reboots
- Not including silent switch for uninstall command at all

---

### Uninstall path parsing fails for paths with spaces

**Cause:** The generated PSADT script uses a regex pattern `'^(\S+)(.*)$'` to parse the uninstall string, which only captures non-whitespace characters. Paths like `C:\Program Files\WinRAR\uninstall.exe` get truncated to just `C:\Program`.

**Symptom:**
```
[Warning] :: Uninstaller not found at: C:\Program
```

**Solution:** Update the uninstall path parsing regex to handle paths ending in `.exe`:

**Wrong (generated by tool):**
```powershell
if ($uninstallCmd -match '^"([^"]+)"(.*)$') {
    $uninstallPath = $Matches[1]
} elseif ($uninstallCmd -match '^(\S+)(.*)$') {
    # This breaks on paths with spaces!
    $uninstallPath = $Matches[1]
}
```

**Correct:**
```powershell
if ($uninstallCmd -match '^"([^"]+)"(.*)$') {
    # Quoted path
    $uninstallPath = $Matches[1]
    $existingArgs = $Matches[2].Trim()
} elseif ($uninstallCmd -match '^(.+\.exe)(.*)$') {
    # Unquoted path ending in .exe
    $uninstallPath = $Matches[1].Trim()
    $existingArgs = $Matches[2].Trim()
} else {
    $uninstallPath = $uninstallCmd
    $existingArgs = ''
}

Write-ADTLogEntry -Message "Parsed uninstall path: $uninstallPath"
```

---

### Intune publish fails with authentication error

**Cause:** Missing or invalid Azure service principal credentials

**Solution:** Configure the MCP server with Azure credentials using the Claude CLI:

#### Step 1: Run Initial Setup (First Time Only)

If you haven't set up Azure AD app registration yet, run the setup script:

```powershell
# Requires PowerShell 7 and Microsoft.Graph module
pwsh -File "C:\temp\Packager-MCP\scripts\Setup-PackagerMcpIntune.ps1"
```

This creates:
- Azure AD application registration with required permissions
- Self-signed certificate for authentication
- Configuration file at `scripts/intune_mcp_config.yaml`

#### Step 2: Configure MCP Server with Claude CLI

Remove any existing configuration and add with environment variables:

```bash
# Remove existing configuration
claude mcp remove packager-mcp -s user

# Add with Azure credentials (use values from intune_mcp_config.yaml)
claude mcp add packager-mcp -s user \
  -e AZURE_TENANT_ID=your-tenant-guid \
  -e AZURE_CLIENT_ID=your-app-client-id \
  -e AZURE_CLIENT_CERTIFICATE_PATH=C:/path/to/certificate.pem \
  -- node C:/temp/Packager-MCP/dist/server.js
```

**Example with actual values:**
```bash
claude mcp add packager-mcp -s user \
  -e AZURE_TENANT_ID=5a01497e-1bcb-4711-b6e6-d24f4ab00393 \
  -e AZURE_CLIENT_ID=61474ea4-32db-4389-a88f-8751f9eb85bb \
  -e AZURE_CLIENT_CERTIFICATE_PATH=C:/temp/Packager-MCP/scripts/packager-mcp.pem \
  -- node C:/temp/Packager-MCP/dist/server.js
```

#### Step 3: Verify Configuration

```bash
claude mcp get packager-mcp
```

Expected output:
```
packager-mcp:
  Scope: User config (available in all your projects)
  Status: ✓ Connected
  Type: stdio
  Command: node
  Args: C:/temp/Packager-MCP/dist/server.js
  Environment:
    AZURE_TENANT_ID=5a01497e-1bcb-4711-b6e6-d24f4ab00393
    AZURE_CLIENT_ID=61474ea4-32db-4389-a88f-8751f9eb85bb
    AZURE_CLIENT_CERTIFICATE_PATH=C:/temp/Packager-MCP/scripts/packager-mcp.pem
```

#### Step 4: Restart Claude Code

**Important:** After updating MCP configuration, you must restart Claude Code for changes to take effect:

```bash
# Exit Claude Code
/exit

# Restart from your project directory
claude
```

#### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_TENANT_ID` | Yes | Azure AD tenant GUID |
| `AZURE_CLIENT_ID` | Yes | Service principal application ID |
| `AZURE_CLIENT_CERTIFICATE_PATH` | Yes | Path to PEM or PFX certificate |
| `AZURE_CLIENT_CERTIFICATE_PASSWORD` | No | Password for PFX certificates (not needed for PEM) |

**Note:** Use forward slashes (`/`) in paths for cross-platform compatibility.

### Intune publish fails with "Insufficient privileges"

**Cause:** Service principal lacks required permissions
**Solution:** In Azure AD > App registrations > API permissions, add:
- `DeviceManagementApps.ReadWrite.All` (Application permission)
- Grant admin consent for the permission

### Intune publish fails with "Invalid detection rule"

**Cause:** Detection rule format incompatible with Graph API
**Solution:** Use the `generate_intune_detection` tool to create a properly formatted detection rule, then pass the JSON output directly to `publish_to_intune`

### Intune publish fails with "Unsupported logo format: .ico"

**Cause:** ICO files are not supported by Intune Graph API - only PNG and JPEG formats work
**Symptom:**
```
Logo upload failed: Unsupported logo format: .ico. Use PNG or JPEG.
```

**Solution:**
1. Use Perplexity to search for a PNG version of the logo:
   ```
   mcp__perplexity__search(query: "<app name> official logo PNG 256x256 download site:github.com OR site:wikipedia.org")
   ```
2. Download the PNG/JPEG file (not ICO)
3. Save as `AppIcon.png` or `AppIcon.jpg`
4. Re-run `publish_to_intune` with the correct logo path

**Common PNG sources:**
- GitHub raw content: `https://raw.githubusercontent.com/...`
- Wikipedia/Wikimedia: `https://upload.wikimedia.org/wikipedia/commons/...`
- Official vendor CDN or assets folder

---

## Reference

- **PSADT Version:** 4.1.8
- **Valid Functions:** 135 (all use `ADT` prefix)
- **Documentation:** https://psappdeploytoolkit.com
- **MCP Server:** Packager-MCP
