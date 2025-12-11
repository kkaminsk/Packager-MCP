# Reference Knowledge

This folder contains the authoritative source material for Packager-MCP's knowledge base. Content here serves as the **source of truth** for updating the curated `src/knowledge/` files.

## Contents

| File/Folder | Description | Source |
|-------------|-------------|--------|
| `V4DOCS.md` | Complete PSADT v4 documentation | [psappdeploytoolkit.com](https://psappdeploytoolkit.com/docs) |
| `V3DOCS.md` | Complete PSADT v3 documentation (for migration reference) | [psappdeploytoolkit.com](https://psappdeploytoolkit.com/docs/3.10.2) |
| `Examples/` | Real-world PSADT deployment scripts | Community contributions |

## Version Information

- **PSADT v4 Target**: 4.0.x (as documented in V4DOCS.md)
- **PSADT v3 Reference**: 3.10.2 (deprecated, migration reference only)
- **Last Updated**: 2024-12-07

## Update Process

### When to Update

1. **New PSADT Release**: When PSAppDeployToolkit releases a new version
2. **Critical Fixes**: When documentation contains errors affecting package generation
3. **Quarterly Review**: Scheduled review to check for upstream changes

### How to Update V4DOCS.md

1. Visit [psappdeploytoolkit.com/docs](https://psappdeploytoolkit.com/docs)
2. Export/copy relevant documentation sections
3. Replace content in `V4DOCS.md`
4. Update the version information above
5. Run through the curation process (see below)

### Curation Process

After updating reference docs, curated content must be regenerated:

1. Review changes between old and new reference docs
2. Update corresponding files in `src/knowledge/`:
   - `psadt/overview.md` - Key concepts and architecture
   - `psadt/functions.md` - Function reference (common functions)
   - `psadt/variables.md` - Session variables and properties
   - `psadt/migration.md` - v3 to v4 migration guide
   - `psadt/best-practices.md` - Patterns derived from Examples/
3. Update `source_ref` frontmatter in each curated file
4. Update `src/knowledge/VERSION`
5. Add entry to `src/knowledge/CHANGELOG.md`

## Examples Directory Structure

```
Examples/
├── LaunchingPowerShellAppDeploymentToolkit/  # CMD wrapper scripts for PSADT
│   ├── README.md
│   ├── install_silent.cmd
│   ├── install_interactive.cmd
│   └── ...
├── Multi-session Installation/               # Multi-session deployment patterns
│   └── Invoke-AppDeployToolkitMultiSession.ps1
├── VLC/                                      # VLC Media Player deployment
│   ├── README.md
│   ├── Invoke-AppDeployToolkitVLCPlayer.ps1
│   └── SupportFiles/
├── WinRAR/                                   # WinRAR deployment
│   └── Deploy-ApplicationWinRAR.ps1
└── WinSCP/                                   # WinSCP deployment
    ├── README.md
    └── Invoke-AppDeployToolkitWinSCP.ps1
```

### Adding New Examples

1. Create a folder named after the application
2. Include the main deployment script (use PSADT v4 format)
3. Add a `README.md` with:
   - Application name and version
   - Installer type (MSI/EXE/MSIX)
   - Notable deployment challenges
   - Detection method used
4. Include any support files in a `SupportFiles/` subfolder

## Relationship to src/knowledge/

```
ReferenceKnowledge/              (Raw, complete documentation)
        │
        │  Manual Curation
        │  (Extract, Focus, Structure)
        ▼
src/knowledge/                   (Curated, MCP-ready content)
```

The curated content in `src/knowledge/` is:
- Focused on common use cases
- Structured for MCP resource consumption
- Cross-referenced with `source_ref` metadata
- Validated for accuracy and completeness

## Quality Checklist

Before committing updates to reference docs:

- [ ] Version number is documented
- [ ] Source URL is recorded
- [ ] Date of retrieval is noted
- [ ] No broken links in documentation
- [ ] Examples are tested and working
- [ ] Curation process is triggered
