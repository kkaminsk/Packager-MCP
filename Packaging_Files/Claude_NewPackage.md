# PSADT Package Development Guide

This project uses the **Packager-MCP** server for creating PowerShell App Deployment Toolkit (PSADT) v4 packages for Microsoft Intune deployment.

## MCP Server Tools

| Tool | Purpose |
|------|---------|
| `search_winget` | Search Winget repository for package metadata, installer URLs, silent args |
| `get_psadt_template` | Generate PSADT v4 deployment scripts from templates |
| `get_silent_install_args` | Get silent install arguments for an installer type |
| `validate_package` | Validate scripts against best practices |
| `verify_psadt_functions` | **CRITICAL** - Verify script uses valid PSADT v4.1.7 function names |
| `generate_intune_detection` | Generate Intune detection rules |

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
- Note the silent install arguments

### Step 2: Generate PSADT Script
```
get_psadt_template(
  application_name: "<name>",
  application_vendor: "<vendor>",
  application_version: "<version>",
  installer_type: "<msi|exe|msix|zip>",
  installer_file_name: "<filename>",
  silent_args: "<args>",
  output_directory: "<path>"
)
```
- The tool creates `Invoke-AppDeployToolkit.ps1` with **CORRECT** function names
- **DO NOT** read and rewrite the generated script
- **DO NOT** "improve" or modify the output

### Step 3: Verify the Script (MANDATORY)
```
verify_psadt_functions(file_path: "<path>/Invoke-AppDeployToolkit.ps1")
```
- This step is **NOT OPTIONAL**
- If `isValid: false`, report the errors to the user
- **NEVER** deliver a package that failed verification

### Step 4: Download Installer
```powershell
Invoke-WebRequest -Uri "<installer_url>" -OutFile "<path>/Files/<filename>"
```

### Step 5: Create Documentation
- Create README.md with deployment instructions
- Create Detection.ps1 for Intune

---

## Package Structure

A complete PSADT package should have this structure:

```
PackageName/
├── Invoke-AppDeployToolkit.ps1    # Main script (from get_psadt_template)
├── PSAppDeployToolkit/            # PSADT v4.1.7 module (copied from MCP)
│   ├── PSAppDeployToolkit.psd1
│   ├── PSAppDeployToolkit.psm1
│   ├── Config/
│   ├── Strings/
│   └── lib/
├── Files/                         # Installer files
│   └── <installer>.exe|msi
├── Detection.ps1                  # Intune detection script
└── README.md                      # Documentation
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

- Write `Invoke-AppDeployToolkit.ps1` from memory
- Modify the generated script's function calls
- Use function names from your training data
- Skip the `verify_psadt_functions` step
- Deliver a package without successful verification

---

## Verification Checklist

Before delivering a package, confirm:

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
- [ ] Installer file exists in `Files/` folder
- [ ] PSAppDeployToolkit module is present
- [ ] README.md is created

---

## Common Installer Types and Silent Args

| Type | Silent Install | Silent Uninstall |
|------|---------------|------------------|
| MSI | `/qn /norestart` | `/qn /norestart` |
| Inno Setup | `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-` | `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART` |
| NSIS (Nullsoft) | `/S` | `/S` |
| InstallShield | `/s /v"/qn"` | `/s /v"/qn"` |
| WiX Burn | `/quiet /norestart` | `/quiet /norestart` |

---

## Intune Deployment Settings

### Install Command
```
Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent
```

### Uninstall Command
```
Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent
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

Step 2: Generating PSADT script...
[calls get_psadt_template with parameters]

Step 3: Verifying script...
[calls verify_psadt_functions]
Result: isValid: true, 0 invalid functions

Step 4: Download installer to Files folder...
[provides Invoke-WebRequest command]

Step 5: Creating documentation...
[creates README.md]

Package complete and verified!
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
**Cause:** Script uses `Close-ADTSession -DeploymentStatus 'Complete'` or `-DeploymentStatus 'Failed'` which are INVALID parameters in PSADT v4.1.7
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
**Solution:** Use PSADT v4.1.7 parameter names and avoid conflicting parameter combinations.

**Wrong:**
```powershell
Show-ADTInstallationWelcome -CloseApps 'app1,app2' -CloseAppsCountdown 300 -PersistPrompt -BlockExecution
```

**Correct:**
```powershell
Show-ADTInstallationWelcome -CloseProcesses 'app1,app2' -CloseProcessesCountdown 300
```

### "Cannot bind argument to parameter 'Path' because it is null"
**Cause:** Script uses `$ADTSession.FilesDirectory` or `$ADTSession.DirFiles` directly. In PSADT v4.1.7, `$ADTSession` is not a global variable - you must use `Get-ADTSession` function to retrieve session properties.
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

---

## Reference

- **PSADT Version:** 4.1.7
- **Valid Functions:** 135 (all use `ADT` prefix)
- **Documentation:** https://psappdeploytoolkit.com
- **MCP Server:** Packager-MCP
