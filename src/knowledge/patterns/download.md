---
title: "Installer Download Patterns"
id: "kb-patterns-download"
psadt_target: "4.1.7"
last_updated: "2025-12-08"
verified_by: "maintainer"
source_ref: "MCP download_installer tool"
tags: ["download", "patterns", "winget", "installer", "v4.1.7"]
---

# Installer Download Patterns

This guide covers patterns for downloading installers and integrating them with PSADT package creation.

## Using the download_installer Tool

The `download_installer` MCP tool retrieves installers from the Winget repository with SHA256 verification.

### Basic Download

Download the latest version of an application:

```json
{
  "package_id": "Google.Chrome",
  "output_directory": "C:\\Packages\\Chrome\\Files"
}
```

### Version-Specific Download

Download a specific version:

```json
{
  "package_id": "Mozilla.Firefox",
  "version": "121.0",
  "output_directory": "C:\\Packages\\Firefox\\Files"
}
```

### Architecture Selection

Download for a specific architecture:

```json
{
  "package_id": "Microsoft.VisualStudioCode",
  "architecture": "x64",
  "output_directory": "C:\\Packages\\VSCode\\Files"
}
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

3. **Download Installer**
   ```json
   // download_installer
   {
     "package_id": "7zip.7zip",
     "output_directory": "C:\\Packages\\7zip\\Files"
   }
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

## Nested Installer Handling

Some Winget packages contain ZIP files with nested installers. The `download_installer` tool automatically:

1. Downloads the ZIP archive
2. Extracts to a temporary directory
3. Locates the nested installer (MSI/EXE)
4. Moves it to the output directory
5. Cleans up temporary files

### Example: Nested MSI in ZIP

```json
{
  "package_id": "SomeApp.WithNestedInstaller",
  "output_directory": "C:\\Packages\\SomeApp\\Files"
}
```

The tool uses metadata from the Winget manifest:
- `NestedInstallerType`: msi, exe, etc.
- `NestedInstallerFiles.RelativeFilePath`: Path within the archive

## Hash Verification

### How Verification Works

1. SHA256 hash is computed during download (streaming)
2. Hash is compared against `InstallerSha256` from Winget manifest
3. If mismatch, file is deleted and error returned

### Response Fields

| Field | Description |
|-------|-------------|
| `sha256` | Computed hash of downloaded file |
| `verified` | `true` if hash matched manifest |
| `warning` | Present if manifest had no hash |
| `installerUrl` | Direct download URL for manual download |
| `largeFileWarning` | Present for files exceeding threshold |

### Handling Verification Failures

If hash verification fails:

1. **Retry Download**: Network corruption during transfer
2. **Check Manifest**: Winget manifest may be outdated
3. **Report Issue**: If persistent, report to winget-pkgs repository

## Architecture Priority

When no architecture specified, selection priority:

1. x64 (most common in enterprise)
2. x86 (fallback)
3. neutral (architecture-independent)
4. arm64 (ARM devices)

Override with the `architecture` parameter when needed:
- ARM devices: `"architecture": "arm64"`
- 32-bit apps: `"architecture": "x86"`

## Large File Handling

The tool performs a pre-flight size check before downloading and warns about large files.

### Large File Warning

When a file exceeds 500MB (configurable), the response includes a `largeFileWarning`:

```json
{
  "largeFileWarning": {
    "sizeBytes": 734003200,
    "sizeFormatted": "700.0 MB",
    "directDownloadUrl": "https://example.com/large-installer.exe",
    "message": "This is a large file (700.0 MB). If you experience timeouts or slow downloads, consider downloading manually from the URL provided."
  }
}
```

### Manual Download Option

Every download response includes an `installerUrl` field with the direct download link. This allows you to:

1. Download the file manually using a browser or download manager
2. Resume interrupted downloads
3. Use alternative download tools with better network handling

### Timeout Handling

If a download times out:

1. The error response includes the `installerUrl` for manual download
2. The suggestion recommends downloading manually for large files
3. Consider increasing the timeout via configuration for very large installers

### Configuration

Configure large file handling in your config:

```yaml
download:
  largeFileSizeThreshold: 524288000  # 500MB in bytes (set to 0 to disable warnings)
  timeoutMs: 300000  # 5 minutes default
```

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Package not found` | Invalid package ID | Verify ID with `search_winget` |
| `No suitable installer` | Architecture mismatch | Specify different architecture |
| `Hash verification failed` | Corrupted download | Retry, or manifest outdated |
| `Download timeout` | Large file/slow network | Download manually using `installerUrl` |
| `Rate limit exceeded` | GitHub API limits | Configure GITHUB_TOKEN |

### Rate Limits

Without authentication: 60 requests/hour
With GITHUB_TOKEN: 5000 requests/hour

Set environment variable for higher limits:
```powershell
$env:GITHUB_TOKEN = "ghp_your_token_here"
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

### Configuration

Configure toolkit download in your config file:

```yaml
psadt:
  cacheDirectory: "C:\\PackagerCache\\psadt"  # Default: OS temp directory
  cacheTtlHours: 24                            # Default: 24 hours
  defaultVersion: "latest"                     # Default: "latest"
```

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
- Override with `output_filename` for consistency

### Security Considerations

1. **Always Verify Hashes**: Ensure `verified: true` in response
2. **Review Warnings**: Unverified downloads require manual validation
3. **Use HTTPS**: All Winget URLs use HTTPS
4. **Check Publisher**: Verify package publisher before deployment
