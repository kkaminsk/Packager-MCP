## MODIFIED Requirements

### Requirement: GitHub API Integration
The system SHALL query the GitHub API for Winget package data with automatic retry on transient failures. Retries SHALL use exponential backoff and respect the `Retry-After` header.

#### Scenario: Rate limit with retries configured
- **WHEN** the GitHub API returns HTTP 429 (rate limited)
- **AND** `rateLimitRetries` is set to 3
- **THEN** the system SHALL retry up to 3 times with exponential backoff
- **AND** the system SHALL respect the `Retry-After` header if present

#### Scenario: Server error with retry
- **WHEN** the GitHub API returns HTTP 500, 502, 503, or 504
- **THEN** the system SHALL retry with exponential backoff up to the configured retry count

#### Scenario: All retries exhausted
- **WHEN** retries are exhausted without a successful response
- **THEN** the system SHALL throw a `GithubApiError` with the last error details
- **AND** the system SHALL attempt to return stale cached data if available

#### Scenario: Successful response on retry
- **WHEN** a retry attempt receives a successful response
- **THEN** the system SHALL process it normally and cache the result

### Requirement: Cache Key Normalization
The system SHALL normalize search cache keys by lowercasing and trimming the query string to prevent duplicate cache entries for equivalent queries.

#### Scenario: Case-insensitive cache hit
- **WHEN** a search for "Chrome" is cached
- **AND** a subsequent search for "chrome" is made
- **THEN** the system SHALL return the cached result
