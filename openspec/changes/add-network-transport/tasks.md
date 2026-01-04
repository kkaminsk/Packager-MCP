## 1. Configuration Updates

- [ ] 1.1 Add `TransportConfig` interface to `src/types/config.ts` with type, port, host, and sessionTimeout fields
- [ ] 1.2 Add `transportConfigSchema` to `src/config/schema.ts` with zod validation
- [ ] 1.3 Update `ServerConfig` interface to include optional `transport` property
- [ ] 1.4 Add transport defaults to `DEFAULT_CONFIG` (type: 'stdio', port: 8081, host: '127.0.0.1')
- [ ] 1.5 Update `ConfigLoader.mergeWithDefaults()` to handle transport configuration

## 2. HTTP Server Implementation

- [ ] 2.1 Create `src/http-server.ts` with `createHttpServer()` function
- [ ] 2.2 Implement health check handler for `/health` endpoint
- [ ] 2.3 Implement MCP endpoint handlers using `StreamableHTTPServerTransport`
- [ ] 2.4 Add session management with `crypto.randomUUID()` generator
- [ ] 2.5 Add graceful shutdown support for HTTP server

## 3. Server Integration

- [ ] 3.1 Refactor `src/server.ts` to support multiple transport modes
- [ ] 3.2 Add transport selection logic based on configuration
- [ ] 3.3 Update signal handlers to close HTTP server if active
- [ ] 3.4 Add logging for HTTP server startup (port, host binding)

## 4. Environment Variable Support

- [ ] 4.1 Add `TRANSPORT_TYPE` environment variable override
- [ ] 4.2 Add `TRANSPORT_PORT` environment variable override
- [ ] 4.3 Add `TRANSPORT_HOST` environment variable override
- [ ] 4.4 Document environment variables in configuration schema

## 5. Testing

- [ ] 5.1 Add unit tests for transport configuration schema validation
- [ ] 5.2 Add unit tests for HTTP server creation and health check
- [ ] 5.3 Add integration test for HTTP transport message handling
- [ ] 5.4 Verify stdio transport continues to work unchanged

## 6. Documentation

- [ ] 6.1 Update `CLAUDE.md` with HTTP transport configuration section
- [ ] 6.2 Update `DOCKER.md` with HTTP port exposure instructions
- [ ] 6.3 Add example YAML configuration for HTTP transport mode
