## MODIFIED Requirements

### Requirement: Build Process
The system SHALL build on Windows, macOS, and Linux using `npm run build`. The build process SHALL compile TypeScript and copy static assets (templates, knowledge files) to the `dist/` directory using only cross-platform Node.js APIs.

#### Scenario: Build on Linux
- **WHEN** `npm run build` is executed on a Linux system
- **THEN** the build SHALL complete without errors
- **AND** `dist/templates/` and `dist/knowledge/` SHALL contain the copied assets

#### Scenario: Build on Windows
- **WHEN** `npm run build` is executed on a Windows system
- **THEN** the build SHALL complete without errors
- **AND** `dist/templates/` and `dist/knowledge/` SHALL contain the copied assets

#### Scenario: Docker build
- **WHEN** `docker build` is run using the project Dockerfile
- **THEN** the resulting image SHALL contain the compiled server and all static assets
