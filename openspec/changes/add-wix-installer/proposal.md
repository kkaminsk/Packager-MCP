# Change: Add WiX Installer for Packager-MCP Distribution

## Why

Packager-MCP currently lacks a Windows installer, requiring manual setup (clone repository, run `npm install`, configure MCP server manually). A WiX-based MSI installer would:
- Enable enterprise deployment via Intune, SCCM, or Group Policy
- Provide standardized installation path and registry entries
- Include example files and documentation for end users
- Simplify onboarding for IT administrators who use the tool

## What Changes

- **NEW**: WiX Toolset v4 source files (`.wxs`, `.wxi`) for building MSI installer
- **NEW**: Build script to compile WiX source into `.msi` package
- **NEW**: Installer includes:
  - Node.js runtime dependency check or bundled portable Node
  - Compiled `dist/` folder (server.js, handlers, services, templates, knowledge)
  - `Packaging_Files/` example folder with documentation and sample prompts
  - Registry entries for MCP server discovery
  - Start Menu shortcuts and documentation links
- **NEW**: Uninstaller that cleanly removes all installed components
- **NEW**: Upgrade support for future versions (major upgrade pattern)

## Impact

- **Affected specs**: None existing (new capability)
- **Affected code**:
  - New `installer/` directory at project root
  - New build script in `scripts/` or `installer/`
  - Updates to `package.json` scripts for MSI build target
- **Dependencies**:
  - WiX Toolset v4 (build-time only)
  - .NET SDK 6.0+ (for WiX v4 `dotnet tool`)
