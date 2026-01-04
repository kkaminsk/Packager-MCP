# Implementation Tasks

## 1. Build Script Updates

- [x] 1.1 Add function to download Node.js Windows x64 binary (zip) from nodejs.org
- [x] 1.2 Add function to extract Node.js zip to `installer/nodejs-bundle/` directory
- [x] 1.3 Add version pinning for Node.js (e.g., `20.18.1` LTS)
- [x] 1.4 Add caching to skip download if Node.js bundle already exists
- [x] 1.5 Add checksum verification for downloaded Node.js zip

## 2. WiX Installer Updates

- [x] 2.1 Add `NodeJSDir` directory under `INSTALLFOLDER`
- [x] 2.2 Add component group for Node.js runtime files
- [x] 2.3 Harvest Node.js directory contents into `HarvestedNodeJS.wxs`
- [x] 2.4 Remove Node.js prerequisite launch condition (was not present)
- [x] 2.5 Add Node.js feature as required component of CoreFeature

## 3. Launch Scripts

- [x] 3.1 Create `launch-server.cmd` batch script that uses bundled Node.js
- [x] 3.2 Update Start Menu shortcuts to use launch script
- [x] 3.3 Add registry entry for bundled Node.js path

## 4. Documentation

- [x] 4.1 Update `installer/README.md` with bundled Node.js information
- [x] 4.2 Document Node.js version pinning and update process
- [x] 4.3 Update size estimates in documentation

## 5. Testing

- [ ] 5.1 Verify MSI builds with bundled Node.js
- [ ] 5.2 Verify installation on system without Node.js installed
- [ ] 5.3 Verify MCP server starts using bundled Node.js
- [ ] 5.4 Verify bundled Node.js doesn't conflict with system Node.js
