# Packager-MCP Installer

This directory contains the WiX Toolset v5 source files for building the Packager-MCP MSI installer.

## Prerequisites

### Build Requirements

1. **.NET SDK 6.0 or later**
   ```powershell
   # Check if installed
   dotnet --version

   # Install from https://dotnet.microsoft.com/download
   ```

2. **WiX Toolset v5** (installed automatically by build script, or manually)
   ```powershell
   # Install globally
   dotnet tool install --global wix

   # Verify installation
   wix --version
   ```

3. **Node.js 20+** (for building the TypeScript source)
   ```powershell
   node --version
   ```

### Runtime Requirements (for installation)

- Windows 10 or later (64-bit)
- **No Node.js required** - Node.js runtime is bundled with the installer
- **Claude Code recommended** - The MCP server requires Claude Code to function. Install via: `winget install Anthropic.ClaudeCode`

> **Note:** During interactive installation, a warning will be displayed if Claude Code is not detected. Silent installations (`/qn`) proceed without interruption.

## Building the MSI

### Quick Build

From the project root directory:

```powershell
.\scripts\build-msi.ps1
```

### Build Options

```powershell
# Specify version explicitly
.\scripts\build-msi.ps1 -Version "1.0.1"

# Skip TypeScript build (use existing dist/)
.\scripts\build-msi.ps1 -SkipBuild

# Skip npm ci (use existing node_modules/)
.\scripts\build-msi.ps1 -SkipNpmCi

# Skip Node.js download (use existing nodejs-bundle/)
.\scripts\build-msi.ps1 -SkipNodeDownload

# Use specific Node.js version (default: 20.18.1)
.\scripts\build-msi.ps1 -NodeVersion "22.11.0"

# Clean before building (removes bin/, nodejs-bundle/, and Harvested*.wxs)
.\scripts\build-msi.ps1 -Clean

# Combine options
.\scripts\build-msi.ps1 -Version "1.0.1" -SkipBuild -SkipNpmCi -SkipNodeDownload
```

### Build Output

The MSI is generated in `installer/bin/`:

```
installer/bin/Packager-MCP-1.0.0.msi
```

## Installation

### Interactive Installation

Double-click the MSI or run:

```powershell
msiexec /i "Packager-MCP-1.0.0.msi"
```

### Silent Installation (Enterprise Deployment)

```powershell
# Silent install
msiexec /i "Packager-MCP-1.0.0.msi" /qn

# Silent install with logging
msiexec /i "Packager-MCP-1.0.0.msi" /qn /l*v "install.log"

# Silent install to custom location
msiexec /i "Packager-MCP-1.0.0.msi" /qn INSTALLFOLDER="D:\Tools\Packager-MCP"

# Silent install with GitHub PAT (recommended for higher API rate limits)
msiexec /i "Packager-MCP-1.0.0.msi" /qn GITHUBPAT="ghp_xxxxxxxxxxxx"

# Silent install without Claude Code registration
msiexec /i "Packager-MCP-1.0.0.msi" /qn REGISTERWITHCLAUDE=0
```

### Installation Properties

| Property | Default | Description |
|----------|---------|-------------|
| `INSTALLFOLDER` | `C:\Program Files\Packager-MCP` | Installation directory |
| `GITHUBPAT` | (empty) | GitHub Personal Access Token for Winget API access |
| `REGISTERWITHCLAUDE` | `1` | Set to `0` to skip automatic Claude Code registration |

#### GitHub Personal Access Token (PAT)

The GitHub PAT enables higher rate limits for the Winget package repository API:
- Without PAT: 60 requests/hour
- With PAT: 5,000 requests/hour

During interactive installation, a dialog prompts for the PAT. For silent installs, use the `GITHUBPAT` property.

#### Claude Code Registration

By default, the installer automatically registers Packager-MCP with Claude Code using:
```bash
claude mcp add packager-mcp -s user [-e GITHUB_TOKEN=<pat>] -- "<InstallPath>\nodejs\node.exe" "<InstallPath>\dist\server.js"
```

If Claude Code is not installed, registration is skipped gracefully. To disable automatic registration, set `REGISTERWITHCLAUDE=0`.

### Uninstallation

```powershell
# Interactive
msiexec /x "Packager-MCP-1.0.0.msi"

# Silent
msiexec /x "Packager-MCP-1.0.0.msi" /qn

# By Product Code (from registry or Programs and Features)
msiexec /x {ProductCode-GUID} /qn
```

## Installation Directory

Default installation path:
```
C:\Program Files\Packager-MCP\
├── dist\                    # Compiled MCP server
│   ├── server.js           # Main entry point
│   ├── handlers\
│   ├── services\
│   ├── templates\
│   └── knowledge\
├── nodejs\                  # Bundled Node.js runtime
│   ├── node.exe            # Node.js executable
│   ├── npm.cmd
│   └── ...
├── examples\               # Sample files from Packaging_Files
│   ├── Claude_NewPackage.md
│   ├── Prompt.txt
│   └── Set-ClaudeCLIEnv.ps1
├── launch-server.cmd       # Server launcher script
├── package.json
└── README.md
```

## Registry Entries

The installer creates:
```
HKEY_LOCAL_MACHINE\SOFTWARE\Packager-MCP
├── InstallPath = "C:\Program Files\Packager-MCP"
├── Version = "1.0.0"
└── NodePath = "C:\Program Files\Packager-MCP\nodejs"
```

## Post-Installation Configuration

After installation, configure Claude Code to use the MCP server.

### Using Bundled Node.js (Recommended)

```bash
claude mcp add packager-mcp -s user -- "C:\Program Files\Packager-MCP\nodejs\node.exe" "C:\Program Files\Packager-MCP\dist\server.js"
```

### With Azure/Intune Integration

```bash
claude mcp add packager-mcp -s user \
  -e AZURE_TENANT_ID=your-tenant-guid \
  -e AZURE_CLIENT_ID=your-app-client-id \
  -e AZURE_CLIENT_CERTIFICATE_PATH=C:/path/to/certificate.pem \
  -- "C:\Program Files\Packager-MCP\nodejs\node.exe" "C:\Program Files\Packager-MCP\dist\server.js"
```

### Using Launch Script

You can also use the launch script directly:
```bash
claude mcp add packager-mcp -s user -- "C:\Program Files\Packager-MCP\launch-server.cmd"
```

## Features

The installer provides three features:

| Feature | Default | Description |
|---------|---------|-------------|
| MCP Server | Required | Core MCP server files |
| Example Files | Included | Sample prompts and documentation |
| Start Menu Shortcuts | Included | Shortcuts to examples and documentation |

To install without optional features:

```powershell
# Install core only (no examples, no shortcuts)
msiexec /i "Packager-MCP-1.0.0.msi" /qn ADDLOCAL=CoreFeature

# Install without shortcuts
msiexec /i "Packager-MCP-1.0.0.msi" /qn ADDLOCAL=CoreFeature,ExamplesFeature
```

## Troubleshooting

### Build Fails with "wix not found"

Install WiX Toolset:
```powershell
dotnet tool install --global wix
```

Ensure the .NET tools directory is in your PATH:
```powershell
$env:PATH += ";$env:USERPROFILE\.dotnet\tools"
```

### MSI Build Errors

Check the WiX build output for specific errors. Common issues:

1. **Missing files**: Ensure `npm run build` completed successfully
2. **GUID conflicts**: Each component needs a unique GUID
3. **Path too long**: Windows has 260 character path limit; node_modules can exceed this

### Silent Install Fails

Check the install log:
```powershell
msiexec /i "Packager-MCP-1.0.0.msi" /qn /l*v "install.log"
type install.log | Select-String "error"
```

### Claude Code Registration Fails

Registration issues are logged to `%TEMP%\Packager-MCP-Registration.log`. Common issues:

1. **Claude Code not installed**: Install via `winget install Anthropic.ClaudeCode`
2. **Claude Code not in PATH**: The installer checks common locations but may miss custom installs
3. **Permission issues**: Registration runs in user context; ensure the user has write access to Claude config

To manually register after installation:
```powershell
claude mcp add packager-mcp -s user -- "C:\Program Files\Packager-MCP\nodejs\node.exe" "C:\Program Files\Packager-MCP\dist\server.js"

# With GitHub PAT:
claude mcp add packager-mcp -s user -e GITHUB_TOKEN=ghp_xxx -- "C:\Program Files\Packager-MCP\nodejs\node.exe" "C:\Program Files\Packager-MCP\dist\server.js"
```

Verify registration:
```powershell
claude mcp list
```

## File Structure

```
installer/
├── Product.wxs               # Main product definition
├── ClaudeRegistration.wxs    # Custom dialog for GitHub PAT and registration
├── Register-PackagerMcp.ps1  # Registration script (bundled in MSI)
├── launch-server.cmd         # Server launcher script (bundled in MSI)
├── Packager-MCP.wixproj      # WiX project file
├── README.md                 # This file
├── bin/                      # Build output (MSI files)
├── nodejs-bundle/            # Downloaded Node.js runtime (created by build)
└── Harvested*.wxs            # Auto-generated component files (created by build)
```

## Bundled Node.js

The installer bundles Node.js runtime (default: 20.18.1 LTS) to ensure the MCP server works without requiring a system-wide Node.js installation.

### Updating Node.js Version

1. Update the `$NodeChecksums` hashtable in `scripts/build-msi.ps1` with the new version's SHA256 hash
2. Get the checksum from https://nodejs.org/dist/vX.Y.Z/SHASUMS256.txt
3. Rebuild the MSI: `.\scripts\build-msi.ps1 -NodeVersion "X.Y.Z" -Clean`

### Size Impact

The bundled Node.js adds approximately 30-35 MB to the MSI package size.
