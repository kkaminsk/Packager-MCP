## MODIFIED Requirements

### Requirement: HTTP Transport
The system SHALL support an HTTP-based MCP transport with configurable CORS origins. The default CORS origin SHALL be restricted to `localhost` and `127.0.0.1`.

#### Scenario: Default CORS restricts origin
- **WHEN** the HTTP transport is started without CORS configuration
- **THEN** the `Access-Control-Allow-Origin` header SHALL be set to `http://localhost`

#### Scenario: Custom CORS origin configured
- **WHEN** the transport config includes `corsOrigin: "https://my-app.example.com"`
- **THEN** the `Access-Control-Allow-Origin` header SHALL be set to `https://my-app.example.com`

#### Scenario: Wildcard CORS explicitly opted in
- **WHEN** the transport config includes `corsOrigin: "*"`
- **THEN** the `Access-Control-Allow-Origin` header SHALL be set to `*`

## ADDED Requirements

### Requirement: No Secrets in Repository
The repository SHALL NOT contain certificate files (PEM, PFX, P12), private keys, or other credential material. The `.gitignore` SHALL include global patterns to prevent accidental commits of these file types.

#### Scenario: Certificate file added to staging
- **WHEN** a developer attempts to `git add` a `.pem`, `.pfx`, or `.p12` file
- **THEN** git SHALL ignore the file due to `.gitignore` patterns
