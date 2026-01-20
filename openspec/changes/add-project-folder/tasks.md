# Tasks: Add Secondary Project Folder with Claude.md

## 1. WiX Installer Modifications

- [x] 1.1 Add `TempDir` and `ProjectFolder` directory definitions to `Product.wxs`
- [x] 1.2 Add component for creating the project folder at `C:\Temp\Packager-MCP`
- [x] 1.3 Add component for `CLAUDE.md` file (copied from `Claude_NewPackage.md`)
- [x] 1.4 Add Start Menu shortcut to open the project folder

## 2. Build Script Updates

- [x] 2.1 Verify build script includes new components in MSI (no changes needed - static components in Product.wxs are automatically included)

## 3. Testing

- [ ] 3.1 Build MSI and verify `C:\Temp\Packager-MCP` is created
- [ ] 3.2 Verify `CLAUDE.md` file exists with correct content
- [ ] 3.3 Verify Start Menu shortcut opens the project folder
- [ ] 3.4 Verify uninstall removes the folder (or leaves it if user files exist)
