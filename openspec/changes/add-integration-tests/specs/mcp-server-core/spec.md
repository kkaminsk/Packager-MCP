## ADDED Requirements

### Requirement: MCP Protocol Integration Tests
The project SHALL include integration tests that exercise the MCP protocol end-to-end using the SDK client over stdio transport.

#### Scenario: Tool listing
- **WHEN** an MCP client connects and lists tools
- **THEN** the server SHALL return all registered tools with correct schemas

#### Scenario: Tool invocation
- **WHEN** an MCP client calls a tool with valid input
- **THEN** the server SHALL return a well-formed tool result

#### Scenario: Resource listing
- **WHEN** an MCP client lists resources
- **THEN** the server SHALL return all registered resources

### Requirement: External API Response Validation
The system SHALL validate responses from external APIs (GitHub, Microsoft Graph) using Zod schemas at trust boundaries. The system SHALL NOT use TypeScript `as` assertions for external data.

#### Scenario: Valid GitHub API response
- **WHEN** the GitHub API returns a well-formed search response
- **THEN** the system SHALL parse and validate it successfully

#### Scenario: Malformed GitHub API response
- **WHEN** the GitHub API returns an unexpected response shape
- **THEN** the system SHALL throw a descriptive error instead of silently misinterpreting the data

### Requirement: Intune Publisher Test Coverage
The `intune-publisher` service SHALL have unit tests covering input validation, app creation, content upload, error handling, and category determination with mocked HTTP calls.

#### Scenario: Publisher tests mock Graph API
- **WHEN** intune-publisher tests execute
- **THEN** they SHALL mock all `fetch` calls to Graph API
- **AND** they SHALL NOT require real Azure credentials
