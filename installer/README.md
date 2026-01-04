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
- Node.js 20.0 or later

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

# Clean before building
.\scripts\build-msi.ps1 -Clean

# Combine options
.\scripts\build-msi.ps1 -Version "1.0.1" -SkipBuild -SkipNpmCi
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
```

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
├── examples\               # Sample files from Packaging_Files
│   ├── Claude_NewPackage.md
│   ├── Prompt.txt
│   └── Set-ClaudeCLIEnv.ps1
├── node_modules\           # Production dependencies
├── package.json
└── README.md
```

## Registry Entries

The installer creates:
```
HKEY_LOCAL_MACHINE\SOFTWARE\Packager-MCP
├── InstallPath = "C:\Program Files\Packager-MCP"
└── Version = "1.0.0"
```

## Post-Installation Configuration

After installation, configure Claude Code to use the MCP server:

```bash
claude mcp add packager-mcp -s user -- node "C:\Program Files\Packager-MCP\dist\server.js"
```

### With Azure/Intune Integration

```bash
claude mcp add packager-mcp -s user \
  -e AZURE_TENANT_ID=your-tenant-guid \
  -e AZURE_CLIENT_ID=your-app-client-id \
  -e AZURE_CLIENT_CERTIFICATE_PATH=C:/path/to/certificate.pem \
  -- node "C:\Program Files\Packager-MCP\dist\server.js"
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

### "Node.js not found" Error

The installer requires Node.js 20+ to be installed. Install from:
https://nodejs.org

Verify installation:
```powershell
node --version  # Should show v20.x.x or later
```

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

## File Structure

```
installer/
├── Packager-MCP.wixproj    # WiX project file
├── Product.wxs             # Main product definition
├── Directories.wxi         # Directory structure
├── Components.wxi          # Static component definitions
├── Features.wxi            # Feature tree
├── README.md               # This file
├── bin/                    # Build output (MSI files)
└── Harvested*.wxs          # Auto-generated component files (created by build)
```
