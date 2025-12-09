# winget-service Specification

## Purpose
TBD - created by archiving change 2-add-winget-integration. Update Purpose after archive.
## Requirements
### Requirement: Search Winget Repository
The system SHALL provide a `search_winget` MCP tool that queries the Winget package repository for application metadata.

#### Scenario: Search by application name
- **WHEN** the user invokes `search_winget` with a query string (e.g., "Google Chrome")
- **THEN** the system SHALL return matching packages from the Winget repository
- **AND** the response SHALL include package ID, name, publisher, and latest version

#### Scenario: Search with exact match
- **WHEN** the user invokes `search_winget` with `exact_match: true` and a package ID
- **THEN** the system SHALL return only packages with an exact ID match

#### Scenario: Search includes version history
- **WHEN** the user invokes `search_winget` with `include_versions: true`
- **THEN** the response SHALL include available version history for matched packages

#### Scenario: No matches found
- **WHEN** the search query returns no results
- **THEN** the system SHALL return an empty result set with a message indicating no matches

#### Scenario: Ambiguous search results
- **WHEN** the search query matches multiple packages
- **THEN** the system SHALL return a list of candidates for the user to choose from

### Requirement: Retrieve Package Manifest
The system SHALL fetch and parse Winget YAML manifests from the GitHub repository.

#### Scenario: Fetch manifest for known package
- **WHEN** the system needs manifest data for a valid package ID
- **THEN** the system SHALL fetch the manifest from `microsoft/winget-pkgs` repository
- **AND** the system SHALL parse the YAML into structured data

#### Scenario: Package not found
- **WHEN** the requested package ID does not exist in the repository
- **THEN** the system SHALL return an error indicating the package was not found

#### Scenario: Multiple installer architectures
- **WHEN** a package has installers for multiple architectures (x64, x86, arm64)
- **THEN** the response SHALL include all available installer variants

### Requirement: Get Silent Install Arguments
The system SHALL provide a `get_silent_install_args` MCP tool that retrieves or derives silent installation arguments for applications.

#### Scenario: Arguments from Winget manifest
- **WHEN** the Winget manifest contains `InstallerSwitches.Silent`
- **THEN** the system SHALL return those arguments with confidence level "verified"
- **AND** the source SHALL indicate "winget"

#### Scenario: Arguments from known installer type
- **WHEN** the manifest does not contain silent args but specifies a known installer type
- **THEN** the system SHALL return arguments based on installer type patterns
- **AND** the confidence level SHALL be "high"
- **AND** the source SHALL indicate "known_installer"

#### Scenario: Arguments from heuristic matching
- **WHEN** the installer type is unknown but patterns can be detected
- **THEN** the system SHALL attempt to derive arguments from heuristics
- **AND** the confidence level SHALL be "medium" or "low"
- **AND** the source SHALL indicate "heuristic"

#### Scenario: MSI silent arguments
- **WHEN** the installer type is "msi"
- **THEN** the system SHALL return `/qn /norestart` as silent arguments
- **AND** the system SHALL return `/qn /norestart /l*v "<logpath>"` for log arguments

#### Scenario: NSIS silent arguments
- **WHEN** the installer type is detected as NSIS (Nullsoft)
- **THEN** the system SHALL return `/S` as silent arguments

#### Scenario: Inno Setup silent arguments
- **WHEN** the installer type is detected as Inno Setup
- **THEN** the system SHALL return `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART` as silent arguments

### Requirement: Winget API Caching
The system SHALL cache Winget API responses to minimize GitHub API calls and improve performance.

#### Scenario: Cache manifest results
- **WHEN** a manifest is fetched from GitHub
- **THEN** the system SHALL cache the result for 1 hour

#### Scenario: Cache search results
- **WHEN** a search is performed
- **THEN** the system SHALL cache the result for 15 minutes

#### Scenario: Return cached data
- **WHEN** a cached response exists and has not expired
- **THEN** the system SHALL return the cached data without making an API call

### Requirement: GitHub Rate Limit Handling
The system SHALL handle GitHub API rate limits gracefully with clear user feedback.

#### Scenario: Rate limit reached
- **WHEN** the GitHub API returns a 429 rate limit response
- **THEN** the system SHALL return an error message explaining the rate limit
- **AND** the message SHALL suggest configuring a GitHub PAT token

#### Scenario: Rate limit with cached fallback
- **WHEN** the rate limit is reached but cached data exists (even if stale)
- **THEN** the system SHALL return the cached data with a warning about staleness

### Requirement: GitHub PAT Token Support
The system SHALL support an optional GitHub Personal Access Token for higher rate limits.

#### Scenario: Token configured via environment
- **WHEN** `GITHUB_TOKEN` environment variable is set
- **THEN** the system SHALL use this token for authenticated GitHub API requests
- **AND** the rate limit SHALL increase to 5000 requests per hour

#### Scenario: Token configured via config file
- **WHEN** `github.token` is set in the configuration file
- **THEN** the system SHALL use this token for authenticated requests

#### Scenario: No token configured
- **WHEN** no GitHub token is configured
- **THEN** the system SHALL use unauthenticated requests with 60 requests per hour limit

