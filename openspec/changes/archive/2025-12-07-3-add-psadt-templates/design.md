## Context

PSADT (PowerShell Application Deployment Toolkit) v4 is the industry standard for enterprise application packaging. Users need both documentation and ready-to-use templates. This proposal provides a knowledge base and template generation service.

**Stakeholders**: IT admins, MSP engineers, endpoint specialists
**Constraints**: Must align with PSADT v4 module-based architecture

## Goals / Non-Goals

**Goals**:
- Provide `get_psadt_template` tool for generating deployment scripts
- Expose PSADT documentation via MCP resources
- Generate templates for all major installer types (MSI, EXE, MSIX, ZIP)
- Include customization points with clear guidance
- Support different complexity levels (basic, standard, advanced)

**Non-Goals**:
- Executing PSADT scripts (user responsibility)
- Managing PSADT installation
- Supporting PSADT v3 (use `/convert-legacy` prompt for migration)

## Decisions

### Decision 1: Template-based generation with Handlebars
- **Why**: Simple, logic-less templates with clear placeholders
- **Alternatives considered**:
  - String concatenation: Error-prone, hard to maintain
  - EJS: Too powerful, allows arbitrary code
  - Plain text with markers: Less structured

### Decision 2: Three complexity levels
- **Basic**: Minimal script for simple installers
- **Standard**: Full workflow with pre/post phases, user prompts
- **Advanced**: Multi-phase, prerequisites, custom actions, repair support
- **Why**: Match user expertise levels, avoid overwhelming beginners

### Decision 3: Embedded knowledge base (not fetched)
- **Why**: Always available offline, consistent version, no API dependencies
- **Alternatives considered**:
  - Fetch from PSADT website: Availability risk, version drift
  - Link to external docs: Less integrated experience

### Decision 4: MCP Resources for documentation
- **Why**: Allows Claude to access docs contextually without tool calls
- **Pattern**: `psadt://docs/{topic}` for PSADT, `kb://installers/{type}` for installer guides

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tool Layer                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              get_psadt_template Tool                 │   │
│  └──────────────────────────┬──────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PSADT Service                             │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ generateScript │  │ loadTemplate   │  │ getCustomize │  │
│  │                │  │                │  │   Points     │  │
│  └───────┬────────┘  └───────┬────────┘  └──────────────┘  │
│          │                   │                              │
│  ┌───────┴───────────────────┴───────────────────────────┐  │
│  │              Template Engine (Handlebars)              │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Knowledge Base (Embedded)                  │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ templates/       │  │ knowledge/                    │    │
│  │ ├── msi.hbs      │  │ ├── psadt/                    │    │
│  │ ├── exe.hbs      │  │ │   ├── overview.md           │    │
│  │ ├── msix.hbs     │  │ │   ├── functions.md          │    │
│  │ └── zip.hbs      │  │ │   └── best-practices.md     │    │
│  └──────────────────┘  │ └── installers/               │    │
│                        │     ├── msi.md                 │    │
│                        │     ├── exe.md                 │    │
│                        │     └── msix.md                │    │
│                        └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  MCP Resource Layer                          │
│  psadt://docs/*           kb://installers/*                 │
│  kb://patterns/*          ref://exit-codes                  │
└─────────────────────────────────────────────────────────────┘
```

## Template Structure

Each template includes:
1. **Header section**: Parameters, imports, initialization
2. **Pre-installation phase**: Close apps, prerequisites, user prompts
3. **Installation phase**: Main installer execution
4. **Post-installation phase**: Cleanup, configuration, verification
5. **Uninstallation phase**: Removal logic (optional)
6. **Repair phase**: Fix corrupted installations (optional)
7. **Error handling**: Structured try/catch with proper exit codes

## Resource URI Mapping

| URI | Content | File |
|-----|---------|------|
| `psadt://docs/overview` | PSADT v4 architecture | `knowledge/psadt/overview.md` |
| `psadt://docs/functions` | Function reference | `knowledge/psadt/functions.md` |
| `psadt://docs/variables` | Built-in variables | `knowledge/psadt/variables.md` |
| `psadt://docs/migration` | v3 to v4 migration | `knowledge/psadt/migration.md` |
| `psadt://docs/best-practices` | Recommended patterns | `knowledge/psadt/best-practices.md` |
| `kb://installers/msi` | MSI packaging guide | `knowledge/installers/msi.md` |
| `kb://installers/exe` | EXE installer types | `knowledge/installers/exe.md` |
| `kb://installers/msix` | MSIX/AppX guide | `knowledge/installers/msix.md` |
| `kb://patterns/detection` | Detection rules | `knowledge/patterns/detection.md` |
| `kb://patterns/prerequisites` | Prerequisites handling | `knowledge/patterns/prerequisites.md` |
| `ref://exit-codes` | Installer exit codes | `knowledge/reference/exit-codes.md` |

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| PSADT v5 release | Medium | Abstract template layer, monitor releases |
| Knowledge base becomes stale | Low | Version metadata, update schedule |
| Templates too rigid | Medium | Customization points, multiple complexity levels |

## Migration Plan

N/A - New capability.

## Open Questions

1. Should templates support PSADT v3 format?
   - **Decision**: No, use `/convert-legacy` prompt for migration
