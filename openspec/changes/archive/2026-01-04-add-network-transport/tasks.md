## 1. Configuration Updates

- [x] 1.1 Add `TransportConfig` interface to `src/types/config.ts` with type, port, host, and sessionTimeout fields
- [x] 1.2 Add `transportConfigSchema` to `src/config/schema.ts` with zod validation
- [x] 1.3 Update `ServerConfig` interface to include optional `transport` property
- [x] 1.4 Add transport defaults to `DEFAULT_CONFIG` (type: 'stdio', port: 8081, host: '127.0.0.1')
- [x] 1.5 Update `ConfigLoader.mergeWithDefaults()` to handle transport configuration

## 2. HTTP Server Implementation

- [x] 2.1 Create `src/http-server.ts` with `createHttpServer()` function
- [x] 2.2 Implement health check handler for `/health` endpoint
- [x] 2.3 Implement MCP endpoint handlers using `StreamableHTTPServerTransport`
- [x] 2.4 Add session management with `crypto.randomUUID()` generator
- [x] 2.5 Add graceful shutdown support for HTTP server

## 3. Server Integration

- [x] 3.1 Refactor `src/server.ts` to support multiple transport modes
- [x] 3.2 Add transport selection logic based on configuration
- [x] 3.3 Update signal handlers to close HTTP server if active
- [x] 3.4 Add logging for HTTP server startup (port, host binding)

## 4. Environment Variable Support

- [x] 4.1 Add `TRANSPORT_TYPE` environment variable override
- [x] 4.2 Add `TRANSPORT_PORT` environment variable override
- [x] 4.3 Add `TRANSPORT_HOST` environment variable override
- [x] 4.4 Document environment variables in configuration schema

## 5. Testing

- [x] 5.1 Add unit tests for transport configuration schema validation
- [x] 5.2 Add unit tests for HTTP server creation and health check
- [x] 5.3 Add integration test for HTTP transport message handling
- [x] 5.4 Verify stdio transport continues to work unchanged

## 6. Documentation

- [x] 6.1 Update `CLAUDE.md` with HTTP transport configuration section
- [x] 6.2 Update `DOCKER.md` with HTTP port exposure instructions
- [x] 6.3 Add example YAML configuration for HTTP transport mode
