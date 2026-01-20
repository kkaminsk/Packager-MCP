# Change: Add Secondary Project Folder with Claude.md

## Why

Users need a dedicated project folder at `C:\Temp\Packager-MCP` where they can work on packaging tasks. This folder should include a `CLAUDE.md` file (renamed from `Claude_NewPackage.md`) that provides Claude Code with the packaging workflow instructions when working in that directory.

## What Changes

- MSI installer creates `C:\Temp\Packager-MCP` directory during installation
- Copies `Claude_NewPackage.md` to `C:\Temp\Packager-MCP\CLAUDE.md` (renamed)
- Adds Start Menu shortcut to open the project folder

## Impact

- Affected specs: `wix-installer` (delta)
- Affected code: `installer/Product.wxs`
