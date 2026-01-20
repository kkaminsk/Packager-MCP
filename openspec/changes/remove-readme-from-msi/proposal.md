# Remove Readme.txt from MSI Installer

## Summary

Remove the `Readme.txt` file from the MSI installer package. This includes removing the file from the installation directory and the associated Start Menu shortcut.

## Motivation

The `Readme.txt` file is redundant since the project already includes a comprehensive `README.md` file with full documentation. Including both files in the installer adds unnecessary complexity without providing additional value to users.

## Scope

This change affects only the WiX installer configuration:
- Remove the `ReadmeTxtFile` component that installs `Readme.txt`
- Remove the `ReadmeShortcut` Start Menu shortcut pointing to `Readme.txt`

## Impact

- **Low risk**: No functional changes to the MCP server
- **Files affected**: `installer/Product.wxs` only
- **Testing**: Rebuild MSI and verify installation completes without the Readme.txt file

## Out of Scope

- The source `Readme.txt` file in the repository root will remain (not deleted)
- The `README.md` file installation is unchanged
- No changes to documentation content
