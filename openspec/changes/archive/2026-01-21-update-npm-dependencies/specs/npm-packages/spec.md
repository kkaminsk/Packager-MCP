# npm Packages - Dependency Updates

## MODIFIED Requirements

### Requirement: Current Dependency Versions
The project MUST maintain npm dependencies at their latest compatible versions to receive bug fixes and improvements.

#### Scenario: npm outdated shows no outdated packages
**Given** the project dependencies are installed
**When** `npm outdated` is executed
**Then** no packages SHALL be listed as outdated
**Or** only intentionally pinned packages SHALL be listed

### Requirement: Zod Schema Validation Library
The `zod` dependency MUST be at version 4.3.x or higher.

#### Scenario: Zod is current version
**Given** the project `package.json` is examined
**When** the `zod` version is checked
**Then** the version SHALL be `^4.3.0` or higher

### Requirement: Node.js Type Definitions
The `@types/node` devDependency MUST be at a version compatible with the project's Node.js runtime requirements.

#### Scenario: Type definitions match runtime
**Given** the project uses Node.js 20+ as documented in CLAUDE.md
**When** TypeScript compilation is executed
**Then** the build SHALL succeed without type errors
**And** `@types/node` SHALL be at version 24.x or 25.x

### Requirement: TypeScript Build Success
The project MUST compile successfully with updated dependencies.

#### Scenario: Build passes after updates
**Given** all dependencies have been updated
**When** `npm run build` is executed
**Then** the build SHALL complete successfully
**And** no TypeScript errors SHALL be reported
