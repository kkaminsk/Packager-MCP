# installer-download Specification Delta

## MODIFIED Requirements

### Requirement: Download Progress Reporting

The system SHALL report download progress for large installer files AND warn users before downloading very large files.

#### Scenario: Pre-flight size check

- **WHEN** `download_installer` is invoked
- **THEN** the system SHALL perform a HEAD request to determine file size before downloading
- **AND** if the HEAD request fails, the system SHALL proceed with the download without size information

#### Scenario: Large file warning

- **WHEN** the file size exceeds the configured threshold (default 500MB)
- **THEN** the response SHALL include a `largeFileWarning` object containing:
  - `sizeBytes`: Actual file size in bytes
  - `sizeFormatted`: Human-readable size (e.g., "1.2 GB")
  - `directDownloadUrl`: The installer URL for manual download
  - `message`: Suggestion to download manually if on slow connection
- **AND** the download SHALL still proceed unless explicitly configured otherwise

#### Scenario: Progress during download (existing)

- **WHEN** downloading a file larger than 1MB
- **THEN** the system SHALL track download progress
- **AND** the final response SHALL include total bytes downloaded and elapsed time

#### Scenario: Download timeout with URL

- **WHEN** the download does not complete within the timeout period
- **THEN** the system SHALL abort the download
- **AND** the error response SHALL include the `installerUrl` for manual download
- **AND** the error message SHALL suggest: "For large files, consider downloading manually"

### Requirement: Download Output Metadata

The system SHALL return comprehensive metadata about the download operation including the source URL.

#### Scenario: Successful download response (modified)

- **WHEN** the download completes successfully
- **THEN** the response SHALL include:
  - `success`: true
  - `filePath`: Full path to the downloaded/extracted file
  - `fileName`: Name of the final file
  - `fileSize`: Size in bytes
  - `sha256`: Computed hash of the file
  - `verified`: Whether hash was verified against manifest
  - `installerType`: Detected installer type
  - `downloadedFrom`: Original URL
  - `duration`: Download time in milliseconds
  - `installerUrl`: Direct URL to the installer (for reference/manual download)

#### Scenario: Response includes large file warning

- **WHEN** the downloaded file exceeds the large file threshold
- **THEN** the response SHALL include `largeFileWarning` with the direct download URL
- **AND** the download SHALL complete successfully despite the warning

## ADDED Requirements

### Requirement: Large File Threshold Configuration

The system SHALL allow configuration of the file size threshold for large file warnings.

#### Scenario: Default threshold

- **WHEN** no threshold is configured
- **THEN** the system SHALL use 500MB (524288000 bytes) as the default threshold

#### Scenario: Custom threshold via config

- **WHEN** `download.largeFileSizeThreshold` is set in configuration
- **THEN** the system SHALL use that value as the threshold in bytes

#### Scenario: Threshold disabled

- **WHEN** the threshold is set to 0 or negative
- **THEN** the system SHALL disable large file warnings
