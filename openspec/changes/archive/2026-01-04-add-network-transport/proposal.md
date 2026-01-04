# Change: Add Network Transport Support (HTTP/SSE on Port 8081)

## Why

The MCP server currently only supports stdio transport, which works for local CLI integrations (Claude CLI, Claude Desktop) but prevents network-based MCP clients from connecting. Adding HTTP/SSE transport enables:

1. Remote MCP clients to connect over the network
2. Web-based applications to use the packaging assistant
3. Multi-client scenarios where multiple AI tools connect simultaneously
4. Deployment behind load balancers and reverse proxies

## What Changes

- **Add `StreamableHTTPServerTransport`** - Use the MCP SDK's built-in HTTP transport that supports both SSE streaming and direct JSON responses
- **Add transport configuration** - New `transport` section in config with type (`stdio`, `http`, or `both`), port (default 8081), and host binding options
- **Modify server startup** - Support running both transports simultaneously or selecting one via configuration
- **Add health check endpoint** - HTTP `/health` endpoint for load balancer probes
- **Add graceful shutdown for HTTP** - Properly close HTTP server and active connections on SIGTERM/SIGINT

## Impact

- Affected specs: `mcp-server-core`
- Affected code:
  - `src/server.ts` - Main server entry point, add HTTP server creation and transport selection
  - `src/types/config.ts` - Add transport configuration types
  - `src/config/schema.ts` - Add transport config schema with zod validation
  - `src/config/loader.ts` - Merge transport config with defaults
- New files:
  - `src/http-server.ts` - HTTP server setup with StreamableHTTPServerTransport

## Compatibility

- **Backwards compatible**: Default transport remains `stdio`, existing configurations continue to work unchanged
- **MCP SDK**: Uses `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk` v1.24.3 (already installed)
- **No new dependencies**: Node.js native `http` module used for server
