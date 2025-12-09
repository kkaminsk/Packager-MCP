## Context

Package validation catches errors before deployment, reducing failed installations and support tickets. This proposal adds a rule-based validation engine for PSADT scripts targeting Intune and other deployment systems.

**Stakeholders**: IT admins validating packages, MSP engineers ensuring quality
**Constraints**: Must not execute scripts, static analysis only

## Goals / Non-Goals

**Goals**:
- Provide `validate_package` tool for automated script checking
- Support configurable validation levels (basic, standard, strict)
- Check PSADT compliance (required functions, proper structure)
- Check Intune compatibility (detection rules possible, exit codes)
- Check security (no hardcoded credentials, safe paths)
- Return actionable feedback with line numbers and suggestions

**Non-Goals**:
- Dynamic analysis or script execution
- Guaranteed bug detection (static analysis has limits)
- Auto-fixing issues (suggestions only)

## Decisions

### Decision 1: Rule-based validation with categories
- **Why**: Modular, extensible, allows selective enforcement
- **Categories**: `structure`, `psadt`, `intune`, `security`, `best-practice`
- **Alternatives considered**:
  - Single pass validation: Less flexible
  - AST parsing: Too complex for MVP

### Decision 2: Three validation levels
- **Basic**: Critical errors only (missing functions, syntax)
- **Standard**: Basic + warnings (best practices, potential issues)
- **Strict**: Standard + info (style, optimization suggestions)
- **Why**: Match user needs - quick check vs thorough audit

### Decision 3: Pattern-based detection (regex + string matching)
- **Why**: Simple, effective for common patterns, no PowerShell parser dependency
- **Alternatives considered**:
  - PowerShell AST via child process: Complex, platform-specific
  - Full parser: Overkill for validation needs

### Decision 4: Return score 0-100
- **Why**: Quick quality indicator, easy to set thresholds
- **Calculation**: Start at 100, deduct for errors (10), warnings (3), info (1)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tool Layer                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              validate_package Tool                   │   │
│  └──────────────────────────┬──────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Validation Service                          │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  validatePkg   │  │  scorePackage  │  │ formatOutput │  │
│  └───────┬────────┘  └───────┬────────┘  └──────────────┘  │
│          │                   │                              │
│  ┌───────┴───────────────────┴───────────────────────────┐  │
│  │                   Rule Engine                          │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │  │
│  │  │Structure│ │  PSADT  │ │  Intune │ │Security │     │  │
│  │  │  Rules  │ │  Rules  │ │  Rules  │ │ Rules   │     │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Validation Rules

### Structure Rules
| Rule | Severity | Description |
|------|----------|-------------|
| `param-block-exists` | error | Script must have param block |
| `try-catch-exists` | error | Must use try/catch for error handling |
| `valid-powershell-syntax` | error | Script must be syntactically valid |

### PSADT Rules
| Rule | Severity | Description |
|------|----------|-------------|
| `psadt-import-exists` | error | Must import PSAppDeployToolkit module |
| `initialize-called` | error | Must call Initialize-ADTDeployment |
| `complete-called` | error | Must call Complete-ADTDeployment |
| `uses-adt-prefix` | warning | Should use ADT-prefixed functions |
| `exit-code-handling` | warning | Should handle exit codes properly |

### Intune Rules
| Rule | Severity | Description |
|------|----------|-------------|
| `detection-possible` | warning | Should support detection rule generation |
| `silent-install-supported` | warning | Must support silent installation |
| `no-user-interaction-required` | info | Should not require user interaction in silent mode |

### Security Rules
| Rule | Severity | Description |
|------|----------|-------------|
| `no-hardcoded-paths` | warning | Avoid hardcoded user-specific paths |
| `no-credentials` | error | No plaintext credentials or secrets |
| `safe-execution` | warning | Use Start-ADTProcess, not Invoke-Expression |

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| False positives | Medium | Clear suggestions, allow rule suppression |
| False negatives | Medium | Document limitations, iterative improvement |
| Rule maintenance | Low | Modular rules, easy to add/update |

## Migration Plan

N/A - New capability.

## Open Questions

1. Should users be able to add custom rules?
   - **Decision**: Not in MVP, planned for Enterprise tier
