## MODIFIED Requirements

### Requirement: Service Architecture
The system SHALL use constructor-based dependency injection for all services. A `ServiceContainer` SHALL be the single composition root, created during server initialization, and passed to handler registration functions. Services SHALL NOT use module-level singletons.

#### Scenario: Server initializes services
- **WHEN** the MCP server starts
- **THEN** `server.ts` SHALL create a `ServiceContainer` with the loaded config
- **AND** the container SHALL construct all services with their dependencies

#### Scenario: Handler receives services
- **WHEN** handler registration functions are called
- **THEN** they SHALL receive the `ServiceContainer` (or individual services) as parameters
- **AND** they SHALL NOT call global `get*Service()` functions

#### Scenario: Service constructed with config
- **WHEN** a service is instantiated
- **THEN** it SHALL receive its configuration via constructor parameters
- **AND** it SHALL NOT call `loadConfig()` internally

## ADDED Requirements

### Requirement: Schema Organization
Tool input schemas SHALL be defined in `src/schemas/` and imported by handlers. Handlers SHALL NOT define schemas inline.

#### Scenario: Adding a new tool
- **WHEN** a developer adds a new MCP tool
- **THEN** the Zod schema SHALL be defined in `src/schemas/tools.ts`
- **AND** the handler in `src/handlers/tools.ts` SHALL import and reference it
