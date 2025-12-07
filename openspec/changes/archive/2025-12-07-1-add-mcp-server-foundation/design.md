## Context

This proposal establishes the MCP server foundation for the Intune Packaging Assistant. The server must comply with the Model Context Protocol specification and be compatible with Claude CLI, Claude Desktop, and other MCP clients.

**Stakeholders**: Developers building on this foundation, end users via MCP clients
**Constraints**: Node.js 20+, TypeScript strict mode, MCP protocol compliance

## Goals / Non-Goals

**Goals**:
- Provide a working MCP server that can register tools, resources, and prompts
- Establish configuration management with YAML files
- Implement caching layer for external API calls
- Set up structured logging and error handling
- Create type-safe TypeScript foundation

**Non-Goals**:
- Implementing specific tools (covered in later proposals)
- Remote deployment / Docker (Phase 3)
- License enforcement (future feature)

## Decisions

### Decision 1: Use `@modelcontextprotocol/sdk` TypeScript SDK
- **Why**: Official SDK with full protocol support, better TypeScript integration than Python alternative
- **Alternatives considered**:
  - Python `mcp` package: Rejected due to Node.js being primary runtime choice
  - Raw protocol implementation: Rejected due to unnecessary complexity

### Decision 2: Stdio transport for local deployment
- **Why**: Simplest deployment model, works with Claude CLI `mcp add` command
- **Alternatives considered**:
  - HTTP transport: Added complexity, not needed for MVP local install
  - SSE transport: Overkill for initial release

### Decision 3: In-memory LRU cache with TTL support
- **Why**: Simple, no external dependencies, sufficient for local single-user deployment
- **Alternatives considered**:
  - Redis: Too heavy for MVP, planned for remote deployment phase
  - File-based cache: More complex, less performant

### Decision 4: YAML configuration files
- **Why**: Human-readable, supports comments, common in DevOps tooling
- **Alternatives considered**:
  - JSON: No comment support, less readable
  - TOML: Less familiar to target users
  - Environment variables only: Not flexible enough for complex config

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Server Core                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Server    │  │   Config    │  │   Logger    │         │
│  │   (stdio)   │  │   Manager   │  │             │         │
│  └──────┬──────┘  └─────────────┘  └─────────────┘         │
│         │                                                    │
│  ┌──────┴──────────────────────────────────────────┐       │
│  │                 Handler Router                   │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │       │
│  │  │  Tools   │  │ Resources│  │ Prompts  │      │       │
│  │  │ Handler  │  │ Handler  │  │ Handler  │      │       │
│  │  └──────────┘  └──────────┘  └──────────┘      │       │
│  └──────────────────────────────────────────────────┘       │
│                          │                                   │
│  ┌───────────────────────┴─────────────────────────┐       │
│  │                  Cache Layer                     │       │
│  │            (LRU with TTL support)                │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── server.ts              # Entry point, server initialization
├── handlers/
│   ├── index.ts           # Handler registration
│   ├── tools.ts           # Tool handler (placeholder)
│   ├── resources.ts       # Resource handler (placeholder)
│   └── prompts.ts         # Prompt handler (placeholder)
├── cache/
│   └── lru-cache.ts       # LRU cache implementation
├── config/
│   ├── loader.ts          # YAML config loader
│   └── schema.ts          # Config validation
├── utils/
│   ├── logger.ts          # Structured logging
│   └── errors.ts          # Custom error types
└── types/
    ├── index.ts           # Type exports
    ├── mcp.ts             # MCP protocol types
    └── config.ts          # Configuration types
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| SDK breaking changes | Medium | Pin SDK version, monitor releases |
| Config file corruption | Low | Validate on load, provide defaults |
| Memory pressure from cache | Low | Configurable cache limits |

## Migration Plan

N/A - This is a greenfield implementation.

## Open Questions

1. Should we support multiple transport types from the start?
   - **Decision**: No, start with stdio only for MVP simplicity
2. Default cache TTL values?
   - **Decision**: 1 hour for manifests, 15 minutes for search results (per spec)
