# GitHub Workflows - Action Version Updates

## MODIFIED Requirements

### Requirement: Current GitHub Action Versions
GitHub workflows MUST use current, maintained versions of third-party actions.

#### Scenario: Release action is current version
**Given** the `.github/workflows/build-msi.yml` file is examined
**When** the `softprops/action-gh-release` action usage is checked
**Then** the version SHALL be `@v2`
**And** the action SHALL use a supported Node.js runtime

### Requirement: Workflow Syntax Validity
All workflow files MUST pass GitHub's workflow syntax validation.

#### Scenario: Workflow file is valid YAML
**Given** the updated workflow file is pushed to a branch
**When** GitHub processes the workflow file
**Then** no syntax errors SHALL be reported
**And** the workflow SHALL be recognized as valid

### Requirement: Release Workflow Functionality
The release workflow MUST continue to create GitHub releases with attached MSI artifacts.

#### Scenario: Release workflow creates release
**Given** a version tag is pushed (e.g., `v1.0.1`)
**When** the build-msi workflow completes
**Then** a draft GitHub release SHALL be created
**And** the signed MSI file SHALL be attached to the release
**And** release notes SHALL be auto-generated
