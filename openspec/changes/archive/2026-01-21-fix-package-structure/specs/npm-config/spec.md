# npm Configuration - Package Structure

## MODIFIED Requirements

### Requirement: Type Definitions in devDependencies
All `@types/*` packages MUST be listed in `devDependencies`, not `dependencies`, as they are only needed at compile time.

#### Scenario: @types/adm-zip is in devDependencies
**Given** the `package.json` file is examined
**When** the `@types/adm-zip` package location is checked
**Then** it SHALL be listed in `devDependencies`
**And** it SHALL NOT be listed in `dependencies`

### Requirement: Production Install Excludes Type Definitions
Production installations MUST NOT include TypeScript type definitions.

#### Scenario: Production install is minimal
**Given** a clean environment
**When** `npm ci --only=production` is executed
**Then** `@types/adm-zip` SHALL NOT be installed
**And** `@types/node` SHALL NOT be installed
**And** only runtime dependencies SHALL be present

### Requirement: TypeScript Build Still Works
The TypeScript build MUST continue to function with types in devDependencies.

#### Scenario: Build succeeds with relocated types
**Given** `@types/adm-zip` is in devDependencies
**When** `npm run build` is executed
**Then** the build SHALL complete successfully
**And** no type errors SHALL be reported for adm-zip usage
