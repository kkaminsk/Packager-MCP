## 1. Project Setup

- [x] 1.1 Create `installer/` directory at project root
- [x] 1.2 Initialize WiX v4 project (`dotnet new wix` or manual `.wixproj`)
- [x] 1.3 Add WiX NuGet package references to project file

## 2. WiX Source Files

- [x] 2.1 Create `Product.wxs` with product definition (Name, Version, Manufacturer, UpgradeCode)
- [x] 2.2 Create `Directories.wxi` include file for directory structure
- [x] 2.3 Create `Components.wxi` include file for file components
- [x] 2.4 Create `Features.wxi` include file for feature definitions

## 3. Directory Harvesting

- [x] 3.1 Add component group for `dist/` folder contents
- [x] 3.2 Add component group for `node_modules/` folder contents
- [x] 3.3 Add component group for `Packaging_Files/` as examples
- [x] 3.4 Add component for `package.json` and `README.md`

## 4. Registry and Shortcuts

- [x] 4.1 Add registry component for HKLM\SOFTWARE\Packager-MCP
- [x] 4.2 Add Start Menu folder with shortcuts
- [x] 4.3 Add uninstall shortcut to Start Menu

## 5. Launch Conditions

- [x] 5.1 Add launch condition to check Node.js 20+ is installed
- [x] 5.2 Add clear error message if Node.js not found
- [x] 5.3 Add minimum OS version check (Windows 10)

## 6. Upgrade Support

- [x] 6.1 Configure MajorUpgrade element for clean upgrades
- [x] 6.2 Set UpgradeCode GUID (stable across versions)
- [ ] 6.3 Test upgrade from v1.0.0 to v1.0.1 scenario

## 7. Build Script

- [x] 7.1 Create `scripts/build-msi.ps1` PowerShell build script
- [x] 7.2 Script runs `npm run build` to ensure dist/ is current
- [x] 7.3 Script runs `npm ci --production` for clean node_modules
- [x] 7.4 Script invokes `dotnet build` on WiX project
- [x] 7.5 Script outputs MSI to `installer/bin/` folder

## 8. Documentation

- [x] 8.1 Add `installer/README.md` with build prerequisites
- [x] 8.2 Document WiX Toolset v4 installation steps
- [x] 8.3 Document silent install command line options
- [x] 8.4 Document post-install Claude CLI configuration
- [x] 8.5 Update main `README.md` with installation section

## 9. Testing

- [ ] 9.1 Test fresh install on clean Windows 10 VM
- [ ] 9.2 Test fresh install on Windows 11
- [ ] 9.3 Test silent install (`msiexec /i ... /qn`)
- [ ] 9.4 Test uninstall removes all files and registry
- [ ] 9.5 Test upgrade preserves user configuration
- [ ] 9.6 Test install fails gracefully without Node.js
