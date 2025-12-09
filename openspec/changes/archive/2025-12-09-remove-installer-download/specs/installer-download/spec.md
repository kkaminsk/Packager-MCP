## REMOVED Requirements

### Requirement: Download Installer from Winget

**Reason**: The `download_installer` tool has proven unreliable due to timeout issues with large files, hash verification failures from network problems, and complex nested ZIP extraction. Clients can achieve the same result using `Invoke-WebRequest` with the installer URL provided by `search_winget`.

**Migration**:
1. Use `search_winget` to retrieve the package metadata including `InstallerUrl` and `InstallerSha256`
2. Use PowerShell `Invoke-WebRequest -Uri $installerUrl -OutFile ".\Files\installer.exe"` to download
3. Optionally verify the hash using `Get-FileHash` and compare with `InstallerSha256`

### Requirement: SHA256 Hash Verification

**Reason**: No longer needed as a built-in feature. Clients can verify hashes using PowerShell's `Get-FileHash` cmdlet.

**Migration**: After downloading with `Invoke-WebRequest`, verify the hash:
```powershell
$hash = (Get-FileHash -Path ".\Files\installer.exe" -Algorithm SHA256).Hash
if ($hash -ne $expectedSha256) { throw "Hash mismatch!" }
```

### Requirement: Download Progress Reporting

**Reason**: Not needed when clients download directly via PowerShell.

**Migration**: PowerShell `Invoke-WebRequest` provides its own progress indication.

### Requirement: Nested Installer Handling

**Reason**: Complex extraction logic was a source of failures. Clients can handle ZIP extraction themselves when needed.

**Migration**: For nested installers, use `Expand-Archive` after downloading:
```powershell
Expand-Archive -Path ".\Files\archive.zip" -DestinationPath ".\Files"
```

### Requirement: Download Output Metadata

**Reason**: No longer applicable.

**Migration**: Clients get file information from the filesystem after downloading.

### Requirement: Large File Threshold Configuration

**Reason**: No longer applicable without the download tool.

**Migration**: Not needed.
