## ADDED Requirements

### Requirement: HTTP/SSE Transport Support
The system SHALL support HTTP-based transport using the MCP StreamableHTTP specification in addition to stdio transport, enabling network-based MCP clients to connect.

#### Scenario: HTTP transport startup
- **WHEN** the server is configured with `transport.type` set to `'http'` or `'both'`
- **THEN** the server SHALL create an HTTP server listening on the configured port (default 8081)
- **AND** the server SHALL bind to the configured host address (default '127.0.0.1')
- **AND** the server SHALL log the HTTP server startup with port and host information

#### Scenario: SSE stream connection
- **WHEN** a client sends a GET request to the `/mcp` endpoint
- **THEN** the server SHALL establish an SSE stream connection
- **AND** the server SHALL generate a session ID using cryptographically secure random UUID
- **AND** the server SHALL include the session ID in the response headers

#### Scenario: JSON-RPC message handling
- **WHEN** a client sends a POST request to the `/mcp` endpoint with a JSON-RPC message
- **THEN** the server SHALL process the message using the registered MCP handlers
- **AND** the server SHALL return the response via the established SSE stream or as direct JSON response

#### Scenario: Session termination
- **WHEN** a client sends a DELETE request to the `/mcp` endpoint with a valid session ID
- **THEN** the server SHALL terminate the session and clean up associated resources
- **AND** the server SHALL return a 204 No Content response

### Requirement: Transport Configuration
The system SHALL support configurable transport mode selection through configuration files and environment variables.

#### Scenario: Configuration file transport settings
- **WHEN** the configuration file contains a `transport` section
- **THEN** the system SHALL apply the transport type, port, and host settings from the configuration
- **AND** the system SHALL validate that port is a valid number between 1 and 65535

#### Scenario: Environment variable override
- **WHEN** the `TRANSPORT_TYPE` environment variable is set
- **THEN** the system SHALL use this value to override the configuration file transport type
- **AND** the system SHALL accept values 'stdio', 'http', or 'both'

#### Scenario: Default transport configuration
- **WHEN** no transport configuration is provided
- **THEN** the system SHALL default to stdio transport for backwards compatibility
- **AND** the HTTP transport settings SHALL default to port 8081 and host '127.0.0.1'

### Requirement: Health Check Endpoint
The system SHALL provide a health check endpoint for load balancer integration when HTTP transport is enabled.

#### Scenario: Health check request
- **WHEN** a GET request is made to the `/health` endpoint
- **THEN** the server SHALL return HTTP 200 status code
- **AND** the server SHALL return JSON body with `status: 'healthy'` and `version` fields

#### Scenario: Health check availability
- **WHEN** the HTTP transport is disabled (stdio-only mode)
- **THEN** the health check endpoint SHALL NOT be available
- **AND** health checks SHALL rely on process-level monitoring

### Requirement: Dual Transport Mode
The system SHALL support running both stdio and HTTP transports simultaneously when configured.

#### Scenario: Both transports active
- **WHEN** the server is configured with `transport.type` set to `'both'`
- **THEN** the server SHALL accept connections via stdio transport
- **AND** the server SHALL accept connections via HTTP transport on the configured port
- **AND** both transports SHALL use the same MCP handler registrations

#### Scenario: Independent operation
- **WHEN** both transports are active
- **THEN** messages received on one transport SHALL NOT affect the other transport
- **AND** each transport SHALL maintain its own session state

## MODIFIED Requirements

### Requirement: Graceful Shutdown
The system SHALL handle shutdown signals gracefully, completing any in-progress operations before exiting.

#### Scenario: SIGTERM received
- **WHEN** the server process receives a SIGTERM signal
- **THEN** the server SHALL stop accepting new requests
- **AND** the server SHALL complete any in-progress operations
- **AND** the server SHALL close the HTTP server if active
- **AND** the server SHALL exit with code 0

#### Scenario: SIGINT received
- **WHEN** the server process receives a SIGINT signal (Ctrl+C)
- **THEN** the server SHALL perform graceful shutdown as with SIGTERM

#### Scenario: HTTP connection cleanup
- **WHEN** the server receives a shutdown signal with active HTTP connections
- **THEN** the server SHALL close all active SSE streams gracefully
- **AND** the server SHALL wait for pending responses to complete (up to timeout)
- **AND** the server SHALL forcefully terminate remaining connections after timeout
