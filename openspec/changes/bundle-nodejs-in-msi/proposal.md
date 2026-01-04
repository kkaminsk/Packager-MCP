# Change: Bundle Node.js Runtime in MSI Installer

## Why

The current MSI installer requires users to have Node.js 20+ pre-installed, which creates friction for enterprise deployments. IT administrators deploying via Intune/SCCM need a self-contained installer that doesn't depend on external prerequisites. Bundling Node.js inside the MSI:

1. Enables true zero-dependency deployment
2. Eliminates prerequisite check failures and support tickets
3. Ensures consistent Node.js version across all installations
4. Simplifies Intune/SCCM deployment without chained installs

## What Changes

- **MODIFIED**: MSI installer to include Node.js runtime in a private `nodejs/` directory
- **MODIFIED**: Build script to download and extract Node.js Windows binary during MSI build
- **MODIFIED**: Server launch mechanism to use bundled Node.js instead of system PATH
- **REMOVED**: Launch condition that fails if Node.js is not installed
- **NEW**: Start Menu shortcut that launches MCP server using bundled Node.js
- **NEW**: Batch script wrapper to invoke `node.exe` from the bundled location

## Impact

- **Affected specs**: None existing (extends `add-wix-installer` change)
- **Affected code**:
  - `installer/Product.wxs` - Add NodeJS directory and components
  - `scripts/build-msi.ps1` - Add Node.js download/extract step
  - New `installer/launch-server.cmd` - Wrapper script for launching server
- **Size impact**: MSI will increase by ~30-35MB (Node.js Windows x64 binary)

## Compatibility

- Node.js version: 20.x LTS (latest stable)
- Architecture: Windows x64 only (matches current installer)
- Bundled Node.js is isolated in `[INSTALLFOLDER]\nodejs\` - does not affect system PATH
