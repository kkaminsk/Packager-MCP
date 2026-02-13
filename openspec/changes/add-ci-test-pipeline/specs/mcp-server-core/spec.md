## ADDED Requirements

### Requirement: Continuous Integration Testing
The project SHALL run the full test suite on every pull request and push to `main` via GitHub Actions. The CI pipeline SHALL test against Node.js 20 and 24.

#### Scenario: PR opened with passing tests
- **WHEN** a pull request is opened and all tests pass
- **THEN** the CI check SHALL report success

#### Scenario: PR opened with failing tests
- **WHEN** a pull request is opened and any test fails
- **THEN** the CI check SHALL report failure
- **AND** the failure details SHALL be visible in the workflow log

#### Scenario: CI runs build before tests
- **WHEN** the CI pipeline executes
- **THEN** it SHALL run `npm run build` before `npm test` to ensure the project compiles
