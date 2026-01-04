## Context

Packager-MCP is an MCP server (Node.js) that assists AI tools with Windows application packaging. Currently, users must manually clone the repository, install dependencies, and configure the MCP server. An MSI installer enables:

- Enterprise deployment via SCCM, Intune, or GPO
- Consistent installation paths across environments
- Professional distribution mechanism for IT administrators

**Stakeholders**: Enterprise IT admins, MSP engineers, Claude Code users

**Constraints**:
- Must work on Windows 10/11 x64
- Node.js 20+ runtime required (either pre-installed or bundled)
- WiX Toolset v4 for modern MSI authoring
- Installer size should remain reasonable (<50MB without Node.js bundle)

## Goals / Non-Goals

**Goals**:
- Create MSI installer using WiX Toolset v4
- Install compiled dist/ folder to `%ProgramFiles%\Packager-MCP`
- Install example files from `Packaging_Files/` to user-accessible location
- Register the MCP server path in registry for discovery
- Provide Start Menu shortcuts
- Support silent installation for enterprise deployment
- Support clean uninstall and upgrade scenarios

**Non-Goals**:
- Bundling Node.js runtime (users expected to have Node.js 20+ installed)
- Auto-configuring Claude CLI (documented in post-install)
- Building Mac/Linux installers (Windows-only project)
- Signing the MSI (can be added later with code signing certificate)

## Decisions

### Decision 1: WiX Toolset v4 (not v3)

**Choice**: WiX v4 with `dotnet tool` CLI

**Rationale**:
- WiX v4 is the current maintained version
- Uses modern .NET SDK tooling (`dotnet tool install wix`)
- Better integration with CI/CD pipelines
- Cleaner project file structure (`.wixproj`)

**Alternatives considered**:
- WiX v3.x: Older but widely documented; rejected for maintenance reasons
- NSIS: Script-based; rejected as MSI provides better enterprise management
- Inno Setup: EXE-based; rejected as MSI preferred for enterprise deployment

### Decision 2: Installation Directory Structure

**Choice**:
```
%ProgramFiles%\Packager-MCP\
├── dist\                    # Compiled MCP server
│   ├── server.js
│   ├── handlers\
│   ├── services\
│   ├── templates\
│   ├── knowledge\
│   └── ...
├── examples\                # From Packaging_Files\
│   ├── Claude_NewPackage.md
│   ├── Prompt.txt
│   └── Set-ClaudeCLIEnv.ps1
├── node_modules\            # Dependencies (bundled)
├── package.json
└── README.md
```

**Rationale**:
- Standard Program Files location for enterprise apps
- Examples in separate folder for easy user access
- All runtime files self-contained

### Decision 3: Node.js Dependency Handling

**Choice**: Require Node.js 20+ pre-installed; check at install time

**Rationale**:
- Most developers/IT admins already have Node.js
- Bundling Node.js adds significant installer size (~30MB)
- Pre-installed Node.js receives security updates independently
- Launch condition displays clear error if Node.js missing

**Alternative considered**:
- Bundle portable Node.js: Rejected due to size and update complexity

### Decision 4: Registry Entries

**Choice**: Register installation path in HKLM for discovery

**Registry keys**:
```
HKEY_LOCAL_MACHINE\SOFTWARE\Packager-MCP
  InstallPath = "C:\Program Files\Packager-MCP"
  Version = "1.0.0"
```

**Rationale**:
- Enables other tools to discover installation path
- Standard pattern for Windows applications
- Per-machine installation (HKLM, not HKCU)

### Decision 5: Start Menu and Documentation

**Choice**: Add Start Menu folder with shortcuts

**Shortcuts**:
- "Packager-MCP Examples" - Opens examples folder
- "Packager-MCP Documentation" - Opens README.md
- "Uninstall Packager-MCP" - Standard uninstall

**Rationale**:
- Provides easy access for users unfamiliar with command line
- Standard Windows application behavior

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| WiX v4 learning curve | Low | Extensive documentation available; simpler than v3 |
| Node.js not installed | Medium | Launch condition with clear error message |
| Large installer size | Low | dist/ folder is ~5MB; node_modules adds ~20MB |
| Path conflicts | Low | Per-machine install to Program Files with ProductCode GUID |
| Upgrade failures | Medium | Use MajorUpgrade pattern; test upgrade scenarios |

## Migration Plan

This is a new capability; no migration needed for existing users.

**Post-install user action**:
Users must manually configure Claude CLI:
```bash
claude mcp add packager-mcp -s user -- node "C:\Program Files\Packager-MCP\dist\server.js"
```

This could be documented in post-install dialog or README.

## Open Questions

1. **Should we create a post-install script to auto-configure Claude CLI?**
   - Pro: Better user experience
   - Con: Requires Claude CLI installed at install time; may not be the case
   - Recommendation: Document manual configuration; add optional post-install script in examples

2. **Should node_modules be bundled or installed post-install?**
   - Recommendation: Bundle node_modules (npm ci output) for offline installation support

3. **Should we add MSI to CI/CD for automated release builds?**
   - Recommendation: Add GitHub Actions workflow in future change; not scope of this proposal
