## ADDED Requirements
### Requirement: Docker Image Build
The system SHALL provide a Debian-based Docker image using Node.js 21 that builds and ships compiled `dist/` artifacts in the runtime stage.

#### Scenario: Multi-stage build succeeds
- **WHEN** a user builds the Docker image
- **THEN** the build SHALL install dependencies, compile the project, and copy `dist/` into the final image

### Requirement: Runtime Configuration and Secrets
The system SHALL support runtime configuration via environment variables and optional mounted configuration files, including a required `GITHUB_TOKEN` for GitHub API access.

#### Scenario: Environment variable configuration
- **WHEN** the container starts with `GITHUB_TOKEN` and other configuration environment variables
- **THEN** the server SHALL read those values at runtime without logging secrets

### Requirement: Default Container Port
The system SHALL expose TCP port 10101 for MCP connections in containerized deployments.

#### Scenario: Container port mapping
- **WHEN** the container is launched with port mappings
- **THEN** clients SHALL be able to connect to the MCP server on port 10101

### Requirement: Docker Compose Development
The system SHALL provide a `docker-compose.yml` for local development that wires port 10101 and supports configuration via environment variables and mounted files.

#### Scenario: Compose brings up local environment
- **WHEN** a user runs `docker compose up`
- **THEN** the MCP service SHALL start with the configured environment variables and mounted configuration

### Requirement: Multi-Architecture Images
The system SHALL support building container images for `linux/amd64` and `linux/arm64`.

#### Scenario: Multi-arch build
- **WHEN** a user runs the documented build command
- **THEN** the build SHALL produce images for both `linux/amd64` and `linux/arm64`

### Requirement: Container Smoke Test
The system SHALL document a smoke-test flow that builds and runs the Docker image.

#### Scenario: Smoke-test command sequence
- **WHEN** a user follows the documented `docker build` and `docker run` commands
- **THEN** the MCP server SHALL start and listen on port 10101
