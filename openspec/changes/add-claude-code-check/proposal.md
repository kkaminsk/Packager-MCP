# Change: Add Claude Code Installation Check to MSI Installer

## Why

Packager-MCP is an MCP server designed to work with Claude Code (the CLI tool). Users installing Packager-MCP without Claude Code installed won't be able to use the server effectively. Adding a non-blocking warning during installation helps users understand this dependency upfront.

## What Changes

- Add a property search to detect Claude Code installation (checks `%USERPROFILE%\.claude\local\claude.exe`)
- Display a warning dialog if Claude Code is not detected
- Allow user to acknowledge and continue installation (non-blocking)
- No changes to install/uninstall behavior

## Impact

- Affected specs: `wix-installer`
- Affected code: `installer/Product.wxs`
