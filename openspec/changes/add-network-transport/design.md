## Context

The MCP server needs to support network-based transports in addition to stdio to enable remote clients and web applications to use the packaging assistant. The MCP SDK v1.24.3 provides `StreamableHTTPServerTransport` which implements the MCP Streamable HTTP transport specification.

### Constraints
- Must maintain backwards compatibility with stdio transport
- Must work on Windows (primary deployment target)
- Default port should be 8081 to avoid conflicts with common services
- Should support running both transports simultaneously for flexibility

### Stakeholders
- Enterprise IT administrators deploying the server remotely
- AI tool developers integrating with the packaging assistant
- DevOps teams managing server infrastructure

## Goals / Non-Goals

### Goals
- Add HTTP/SSE transport on configurable port (default 8081)
- Support both stateful (session-based) and stateless operation modes
- Enable running stdio and HTTP transports simultaneously
- Provide health check endpoint for load balancer integration
- Maintain graceful shutdown behavior for HTTP connections

### Non-Goals
- Authentication/authorization (out of scope, handled by network infrastructure)
- TLS/HTTPS (handled by reverse proxy in production)
- Rate limiting (handled by infrastructure layer)
- Multi-node session affinity (single-server deployment target)

## Decisions

### Decision 1: Use `StreamableHTTPServerTransport` over deprecated `SSEServerTransport`

**Choice**: `StreamableHTTPServerTransport`

**Rationale**:
- `SSEServerTransport` is explicitly marked as deprecated in the SDK
- `StreamableHTTPServerTransport` supports both SSE streaming and direct JSON responses
- Better support for resumability and session management
- Aligns with MCP specification evolution

**Alternatives considered**:
- `SSEServerTransport`: Deprecated, less feature-rich
- Custom HTTP implementation: Unnecessary given SDK support

### Decision 2: Configuration-based transport selection

**Choice**: Add `transport` configuration section with `type: 'stdio' | 'http' | 'both'`

**Rationale**:
- Allows deployment flexibility (CLI vs server vs hybrid)
- Default to `stdio` maintains backwards compatibility
- Environment variable override via `TRANSPORT_TYPE` for container deployments

### Decision 3: Single HTTP server with session support

**Choice**: Stateful mode with session ID generation using `crypto.randomUUID()`

**Rationale**:
- Enables proper connection tracking and cleanup
- Supports future multi-client scenarios
- MCP spec recommends session-based operation for server implementations

### Decision 4: Health check endpoint implementation

**Choice**: Add `/health` endpoint returning JSON status

**Rationale**:
- Required for Kubernetes/load balancer health probes
- Simple JSON response: `{ "status": "healthy", "version": "1.0.0" }`
- Does not require MCP transport handling

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         server.ts                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  stdio transport │  │  HTTP server    │  │  MCP Server     │  │
│  │  (unchanged)     │  │  (new)          │  │  (shared)       │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │            │
│           └────────────────────┼────────────────────┘            │
│                                │                                 │
│                    ┌───────────▼───────────┐                    │
│                    │ registerAllHandlers() │                    │
│                    └───────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │           http-server.ts              │
            │  ┌─────────────────────────────────┐  │
            │  │ createHttpServer()              │  │
            │  │ - Health check route            │  │
            │  │ - MCP endpoint route            │  │
            │  │ - StreamableHTTPServerTransport │  │
            │  └─────────────────────────────────┘  │
            └───────────────────────────────────────┘
```

### HTTP Endpoint Structure

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check for load balancers |
| `/mcp` | GET | SSE stream connection |
| `/mcp` | POST | JSON-RPC message handling |
| `/mcp` | DELETE | Session termination |

## Risks / Trade-offs

### Risk: Port conflicts
**Mitigation**: Default to 8081 (less commonly used), make configurable

### Risk: Security exposure on network
**Mitigation**: Document that TLS termination and authentication should be handled by reverse proxy; bind to localhost by default

### Risk: Memory leaks from abandoned sessions
**Mitigation**: Implement session timeout; rely on transport's built-in cleanup

### Trade-off: Increased complexity
**Accepted**: The complexity is manageable and necessary for production deployments. The stdio-only mode remains available for simple use cases.

## Migration Plan

1. Changes are additive; no migration required
2. Existing configurations continue to work (default transport = stdio)
3. Documentation update to explain new configuration options
4. No breaking changes to existing integrations

## Open Questions

None - the MCP SDK provides clear guidance on StreamableHTTPServerTransport usage.
