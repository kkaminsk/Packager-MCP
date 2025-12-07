## Context

MCP prompts are pre-defined workflows that users can invoke for complex multi-step operations. This proposal adds four prompts that orchestrate the tools from previous proposals into guided experiences.

**Stakeholders**: All users - prompts are the primary interaction model
**Constraints**: Must work within MCP prompt specification, single-turn responses

## Goals / Non-Goals

**Goals**:
- Provide `/package-app` for guided package creation
- Provide `/convert-legacy` for PSADT migration
- Provide `/troubleshoot` for debugging failures
- Provide `/bulk-lookup` for multi-app research
- Generate conversation-driving responses that guide users

**Non-Goals**:
- Multi-turn stateful conversations (MCP prompts are single-turn)
- Direct file system operations (user handles file creation)
- Interactive wizards (prompt returns guidance, user acts)

## Decisions

### Decision 1: Prompts return structured guidance, not raw tool output
- **Why**: Better UX, Claude can present information contextually
- **Pattern**: Prompt returns formatted response with clear next steps
- **Alternatives considered**:
  - Direct tool chaining: Less flexible, harder to customize

### Decision 2: Prompts accept arguments for customization
- **Examples**:
  - `/package-app Google Chrome --quick`
  - `/convert-legacy ./path/to/script.ps1`
  - `/troubleshoot --error-code 1603`
  - `/bulk-lookup app1, app2, app3 --output markdown`
- **Why**: Flexibility without multiple prompt variants

### Decision 3: Prompts provide complete context
- **Why**: Single-turn means all relevant info must be included
- **Pattern**: Include all data Claude needs to guide the user

### Decision 4: Use workflows/ directory for complex logic
- **Why**: Keep prompts.ts handler clean, isolate workflow logic
- **Structure**: One workflow file per prompt

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   MCP Prompt Layer                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │/package-app│ │/convert-   │ │/troubleshoot││/bulk-    │ │
│  │            │ │   legacy   │ │            ││  lookup  │ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘└─────┬────┘ │
└────────┼──────────────┼──────────────┼─────────────┼───────┘
         │              │              │             │
         ▼              ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Workflow Layer                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │ package-   │ │ convert-   │ │ troubleshoot││ bulk-    │ │
│  │  app.ts    │ │ legacy.ts  │ │   .ts       ││lookup.ts │ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘└─────┬────┘ │
└────────┼──────────────┼──────────────┼─────────────┼───────┘
         │              │              │             │
         ▼              ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Winget  │ │  PSADT   │ │Validation│ │Detection │      │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Prompt Specifications

### `/package-app`
**Purpose**: Guided workflow to create a complete Intune-ready package

**Arguments**:
- `application-name` (required): Name or Winget ID
- `--quick`: Skip validation and detailed guidance
- `--no-validate`: Skip validation step

**Workflow**:
1. Search Winget for application metadata
2. Present findings and confirm details
3. Determine installer type and requirements
4. Generate PSADT script
5. Generate detection rules
6. Validate package (unless `--no-validate`)
7. Output complete package structure

### `/convert-legacy`
**Purpose**: Convert PSADT v3 script to v4 format

**Arguments**:
- `path-to-script` (required): Path to v3 script

**Workflow**:
1. Analyze v3 script structure
2. Identify deprecated functions (without ADT prefix)
3. Map to v4 equivalents
4. Generate converted script
5. Highlight manual review points
6. Validate converted script

### `/troubleshoot`
**Purpose**: Diagnose issues with a failing package

**Arguments**:
- `--log-file path`: Path to log file
- `--error-code code`: Specific error code to investigate

**Workflow**:
1. Gather error symptoms
2. Analyze log file if provided
3. Look up error code if provided
4. Identify likely causes
5. Suggest specific fixes
6. Offer to apply fixes

### `/bulk-lookup`
**Purpose**: Retrieve information for multiple applications at once

**Arguments**:
- `app1, app2, app3`: Comma-separated list of applications
- `--output format`: Output format (csv, json, markdown)

**Workflow**:
1. Parse application list
2. Look up each in Winget
3. Compile results
4. Format output per specification

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prompt output too large | Medium | Summarize, offer detailed views |
| User expects multi-turn | Medium | Clear documentation, suggest follow-ups |
| Missing application data | Low | Graceful handling, manual input fallback |

## Migration Plan

N/A - New capability.

## Open Questions

1. Should prompts be able to call tools automatically?
   - **Decision**: Yes, prompts orchestrate tools and return combined results
