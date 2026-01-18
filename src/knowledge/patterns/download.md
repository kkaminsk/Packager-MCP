---
title: "Installer Download Patterns"
id: "kb-patterns-download"
psadt_target: "4.1.8"
last_updated: "2025-12-09"
verified_by: "maintainer"
source_ref: "search_winget tool, Invoke-WebRequest"
tags: ["download", "patterns", "winget", "installer", "v4.1.8"]
---

# Installer Download Patterns

This guide covers patterns for downloading installers and integrating them with PSADT package creation.

## Downloading Installers with PowerShell

The `search_winget` tool provides installer URLs and SHA256 hashes from the Winget repository. Use PowerShell's `Invoke-WebRequest` to download installers directly to your PSADT Files folder.

### Basic Download Workflow

1. **Search for Package and Get Installer URL**
   ```json
   // search_winget
   { "query": "7zip", "exact_match": true }
   ```

   The response includes `InstallerUrl` and `InstallerSha256` for verification.

2. **Download Using PowerShell**
   ```powershell
   # Download installer to Files folder
   $InstallerUrl = "https://www.7-zip.org/a/7z2301-x64.exe"
   $OutputPath = "C:\Packages\7zip\Files\7z2301-x64.exe"

   Invoke-WebRequest -Uri $InstallerUrl -OutFile $OutputPath
   ```

3. **Verify Hash (Recommended)**
   ```powershell
   # Verify downloaded file matches Winget manifest
   $ExpectedHash = "ABC123..."  # From search_winget response
   $ActualHash = (Get-FileHash -Path $OutputPath -Algorithm SHA256).Hash

   if ($ActualHash -ne $ExpectedHash) {
       Write-Error "Hash mismatch! File may be corrupted."
   }
   ```

### Complete PowerShell Download Function

```powershell
function Download-Installer {
    param(
        [Parameter(Mandatory)]
        [string]$Url,

        [Parameter(Mandatory)]
        [string]$OutputPath,

        [string]$ExpectedSha256
    )

    # Create output directory if needed
    $OutputDir = Split-Path -Parent $OutputPath
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }

    # Download file
    Write-Host "Downloading from: $Url"
    Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing

    # Verify hash if provided
    if ($ExpectedSha256) {
        $ActualHash = (Get-FileHash -Path $OutputPath -Algorithm SHA256).Hash
        if ($ActualHash -ne $ExpectedSha256.ToUpper()) {
            Remove-Item $OutputPath -Force
            throw "SHA256 hash mismatch. Expected: $ExpectedSha256, Got: $ActualHash"
        }
        Write-Host "Hash verified successfully"
    }

    Write-Host "Downloaded to: $OutputPath"
    return $OutputPath
}

# Usage
Download-Installer `
    -Url "https://www.7-zip.org/a/7z2301-x64.exe" `
    -OutputPath "C:\Packages\7zip\Files\7z2301-x64.exe" `
    -ExpectedSha256 "ABC123..."
```

## PSADT Integration Workflow

### Complete Packaging Workflow

1. **Search for Package**
   ```json
   // search_winget
   { "query": "7zip" }
   ```

2. **Get Silent Install Arguments**
   ```json
   // get_silent_install_args
   { "package_id": "7zip.7zip" }
   ```

3. **Download Installer** (PowerShell)
   ```powershell
   $InstallerUrl = "https://www.7-zip.org/a/7z2301-x64.exe"  # From search_winget
   Invoke-WebRequest -Uri $InstallerUrl -OutFile "C:\Packages\7zip\Files\7z2301-x64.exe"
   ```

4. **Generate PSADT Template**
   ```json
   // get_psadt_template
   {
     "application_name": "7-Zip",
     "application_vendor": "Igor Pavlov",
     "application_version": "23.01",
     "installer_type": "exe",
     "installer_file_name": "7z2301-x64.exe",
     "silent_args": "/S"
   }
   ```

## Large File Downloads

For large installers (>100MB), consider these approaches:

### Progress Display
```powershell
$ProgressPreference = 'Continue'  # Shows progress bar
Invoke-WebRequest -Uri $InstallerUrl -OutFile $OutputPath
```

### Background Download
```powershell
Start-BitsTransfer -Source $InstallerUrl -Destination $OutputPath -Asynchronous
```

### Timeout Handling
```powershell
# Set longer timeout for large files
$WebClient = New-Object System.Net.WebClient
$WebClient.DownloadFile($InstallerUrl, $OutputPath)
```

## Hash Verification

### How Verification Works

1. SHA256 hash is provided by `search_winget` in the `InstallerSha256` field
2. Compute hash of downloaded file using `Get-FileHash`
3. Compare hashes (case-insensitive)

### Handling Verification Failures

If hash verification fails:

1. **Retry Download**: Network corruption during transfer
2. **Check Manifest**: Winget manifest may be outdated
3. **Report Issue**: If persistent, report to winget-pkgs repository

## Architecture Selection

When `search_winget` returns multiple installers, select based on architecture:

| Architecture | Use Case |
|-------------|----------|
| x64 | 64-bit Windows (most common) |
| x86 | 32-bit Windows or legacy apps |
| arm64 | Windows on ARM devices |
| neutral | Architecture-independent |

### Example: Multiple Architectures
```powershell
# Response from search_winget includes installers array
# Select the appropriate one for your target environment
$Installer = $Installers | Where-Object { $_.Architecture -eq 'x64' }
Invoke-WebRequest -Uri $Installer.InstallerUrl -OutFile $OutputPath
```

## PSADT Toolkit Files

The MCP server includes PSADT v4.1.8 toolkit files in `ReferenceKnowledge/PSAppDeployToolkit_Template_v4/`. The `get_psadt_template` tool can automatically copy these files when you specify `output_directory`.

### Automatic Package Creation

Use the `get_psadt_template` tool with `output_directory` to create a complete package:

```json
{
  "application_name": "7-Zip",
  "application_vendor": "Igor Pavlov",
  "application_version": "23.01",
  "installer_type": "exe",
  "installer_file_name": "7z2301-x64.exe",
  "silent_args": "/S",
  "output_directory": "C:\\Packages\\7zip"
}
```

This automatically creates:

```
C:\Packages\7zip\
├── PSAppDeployToolkit/
│   ├── PSAppDeployToolkit.psd1    # Module manifest (v4.1.8)
│   ├── PSAppDeployToolkit.psm1    # Module implementation
│   └── ...
├── Config/
│   └── config.psd1
├── Assets/
│   ├── AppIcon.png
│   └── Banner.Classic.png
├── Files/                         # Place installers here
├── Invoke-AppDeployToolkit.exe    # Launcher executable
└── Invoke-AppDeployToolkit.ps1    # Generated deployment script
```

### Complete Packaging Workflow

1. Use `search_winget` to find the application and get installer URL
2. Download the installer using PowerShell's `Invoke-WebRequest`
3. Use `get_psadt_template` with `output_directory` to create the package
4. Copy your downloaded installer to the `Files/` directory
5. Package for Intune deployment

### Benefits

- **No network dependency**: Toolkit bundled with MCP server
- **Version consistency**: Pinned to v4.1.8 for reproducible builds
- **Instant access**: No download delays or GitHub rate limits
- **Verified source**: From official PSAppDeployToolkit release

## Best Practices

### Package Organization

```
Vendor_AppName_Version/
├── PSAppDeployToolkit/
├── Config/
├── Assets/
├── Strings/
├── Files/
│   └── installer.msi  <- Downloaded here
├── Invoke-AppDeployToolkit.exe
├── Invoke-AppDeployToolkit.ps1  <- Generated script
└── Detection.ps1
```

### Filename Conventions

- Use original filename when possible
- For version tracking: `AppName_Version_Arch.ext`

### Security Considerations

1. **Always Verify Hashes**: Use the SHA256 from `search_winget`
2. **Use HTTPS**: All Winget URLs use HTTPS
3. **Check Publisher**: Verify package publisher before deployment
