---
title: "Installer Download Patterns"
id: "kb-patterns-download"
psadt_target: "4.1.7"
last_updated: "2025-12-09"
verified_by: "maintainer"
source_ref: "search_winget tool, Invoke-WebRequest"
tags: ["download", "patterns", "winget", "installer", "v4.1.7"]
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

## PSADT Toolkit Download

The `download_psadt_toolkit` tool downloads the PSAppDeployToolkit from GitHub releases, creating a complete package structure.

### Basic Toolkit Download

Download the latest version:

```json
{
  "output_directory": "C:\\Packages\\MyApp"
}
```

### Version-Specific Download

Download a specific version for reproducible builds:

```json
{
  "output_directory": "C:\\Packages\\MyApp",
  "version": "4.0.4"
}
```

### Include Extensions Module

Download with the optional Extensions module:

```json
{
  "output_directory": "C:\\Packages\\MyApp",
  "include_extensions": true
}
```

### Toolkit Output Structure

After download, the output directory contains:

```
{output_directory}/
├── PSAppDeployToolkit/
│   ├── PSAppDeployToolkit.psd1
│   ├── PSAppDeployToolkit.psm1
│   └── ...
├── PSAppDeployToolkit.Extensions/ (if requested)
├── Config/
├── Assets/
├── Strings/
├── Files/                    # Place installers here
├── Invoke-AppDeployToolkit.exe
└── Invoke-AppDeployToolkit.ps1
```

### Caching Behavior

- Downloaded releases are cached for 24 hours (configurable)
- Cache key is based on version tag
- Subsequent downloads of the same version use cached files
- Response indicates source: `"downloadedFrom": "cache"` or `"github"`

### Combined Template and Toolkit Download

Use `get_psadt_template` with `download_toolkit: true` to generate a script and download the toolkit in one operation:

```json
{
  "application_name": "7-Zip",
  "application_vendor": "Igor Pavlov",
  "application_version": "23.01",
  "installer_type": "exe",
  "download_toolkit": true,
  "output_directory": "C:\\Packages\\7zip"
}
```

This creates:
- Complete toolkit structure
- Customized `Invoke-AppDeployToolkit.ps1` with your application details
- Empty `Files/` directory ready for the installer

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
