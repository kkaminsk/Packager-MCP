# Change: Refactor to Dependency Injection

## Why

All services use a module-level singleton pattern (`get*Service()` / `reset*Service()`) that hides dependencies, makes testing harder, and creates implicit global state. Handler files mix schema definitions, input mapping, file I/O, and error handling in 500+ line functions. Dynamic `await import('node:fs')` calls are used for built-in modules that should be statically imported.

## What Changes

- **REFACTOR**: Create a `ServiceContainer` that owns all service instances, initialized in `server.ts`
- **REFACTOR**: Pass services to handler registration functions via constructor/parameter injection
- **REFACTOR**: Move Zod tool schemas to `src/schemas/` directory
- **REFACTOR**: Extract PSADT package assembly (file copy/write) from the `get_psadt_template` handler into a `PackageAssemblyService`
- **FIX**: Replace dynamic `await import('node:fs')` and `await import('node:path')` with static imports
- **REFACTOR**: Create a `snakeToCamel` utility or use Zod `.transform()` to eliminate manual input mapping boilerplate

## Impact

- **Affected specs**: `mcp-server-core`
- **Affected code**:
  - `src/server.ts` — service container creation
  - `src/services/*.ts` — remove singleton pattern, accept dependencies via constructor
  - `src/handlers/tools.ts` — slim down, extract schemas and assembly logic
  - `src/schemas/` — new directory for Zod schemas
  - `src/services/package-assembly.ts` — new service
