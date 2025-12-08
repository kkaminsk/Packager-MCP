---
title: "Installer Download Patterns"
id: "kb-patterns-download"
psadt_target: "4.1.7"
last_updated: "2025-12-07"
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

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Package not found` | Invalid package ID | Verify ID with `search_winget` |
| `No suitable installer` | Architecture mismatch | Specify different architecture |
| `Hash verification failed` | Corrupted download | Retry, or manifest outdated |
| `Download timeout` | Large file/slow network | Check connectivity, retry |
| `Rate limit exceeded` | GitHub API limits | Configure GITHUB_TOKEN |

### Rate Limits

Without authentication: 60 requests/hour
With GITHUB_TOKEN: 5000 requests/hour

Set environment variable for higher limits:
```powershell
$env:GITHUB_TOKEN = "ghp_your_token_here"
```

## Best Practices

### Package Organization

```
Vendor_AppName_Version/
├── PSAppDeployToolkit/
├── AppDeployToolkit/
│   ├── Deploy-Application.ps1
│   └── Files/
│       └── installer.msi  <- Downloaded here
├── Detection.ps1
└── PACKAGE_STRUCTURE.md
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
