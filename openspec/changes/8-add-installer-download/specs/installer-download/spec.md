# installer-download Specification

## Purpose

Provides capabilities to download installer files from Winget manifest URLs and place them in the PSADT Files folder, with SHA256 integrity verification.

## ADDED Requirements

### Requirement: Download Installer from Winget

The system SHALL provide a `download_installer` MCP tool that downloads application installers using metadata from the Winget repository.

#### Scenario: Download installer by package ID

- **WHEN** the user invokes `download_installer` with a valid Winget `package_id` and `output_directory`
- **THEN** the system SHALL fetch the package manifest from Winget
- **AND** the system SHALL download the installer file from the manifest's `InstallerUrl`
- **AND** the system SHALL save the file to the specified output directory

#### Scenario: Download specific version

- **WHEN** the user specifies a `version` parameter
- **THEN** the system SHALL download the installer for that specific version
- **AND** if the version does not exist, the system SHALL return an error with available versions

#### Scenario: Select architecture preference

- **WHEN** the user specifies an `architecture` parameter (x64, x86, arm64)
- **THEN** the system SHALL download the installer matching that architecture
- **AND** if the architecture is not available, the system SHALL fall back to x64 or return an error

#### Scenario: Custom output filename

- **WHEN** the user specifies an `output_filename` parameter
- **THEN** the system SHALL save the file with that name instead of the original filename

#### Scenario: Package not found

- **WHEN** the specified `package_id` does not exist in the Winget repository
- **THEN** the system SHALL return an error indicating the package was not found
- **AND** the error SHALL suggest checking the package ID format

### Requirement: SHA256 Hash Verification

The system SHALL verify downloaded files against the SHA256 hash from the Winget manifest to ensure integrity.

#### Scenario: Hash verification succeeds

- **WHEN** the download completes successfully
- **THEN** the system SHALL compute the SHA256 hash of the downloaded file
- **AND** the system SHALL compare it to the `InstallerSha256` from the manifest
- **AND** if hashes match, the operation SHALL succeed

#### Scenario: Hash verification fails

- **WHEN** the computed hash does not match the expected hash
- **THEN** the system SHALL delete the corrupted file
- **AND** the system SHALL return an error indicating hash mismatch
- **AND** the error SHALL include both expected and actual hash values

#### Scenario: Manifest missing hash

- **WHEN** the Winget manifest does not include `InstallerSha256`
- **THEN** the system SHALL proceed with the download without verification
- **AND** the response SHALL include a warning about unverified download

### Requirement: Download Progress Reporting

The system SHALL report download progress for large installer files.

#### Scenario: Progress during download

- **WHEN** downloading a file larger than 1MB
- **THEN** the system SHALL track download progress
- **AND** the final response SHALL include total bytes downloaded and elapsed time

#### Scenario: Download timeout

- **WHEN** the download does not complete within the timeout period (default 5 minutes)
- **THEN** the system SHALL abort the download
- **AND** the system SHALL return an error suggesting retry or checking network

### Requirement: Nested Installer Handling

The system SHALL handle nested installers where the download is a ZIP file containing the actual installer.

#### Scenario: ZIP with nested MSI

- **WHEN** the Winget manifest indicates `NestedInstallerType: msi` with `NestedInstallerFiles`
- **THEN** the system SHALL download and extract the ZIP file
- **AND** the system SHALL locate the nested installer using the `RelativeFilePath`
- **AND** the system SHALL place the extracted installer in the output directory

#### Scenario: ZIP with nested EXE

- **WHEN** the Winget manifest indicates `NestedInstallerType: exe`
- **THEN** the system SHALL handle extraction identically to MSI

#### Scenario: Nested file not found

- **WHEN** the specified nested file path does not exist in the archive
- **THEN** the system SHALL return an error listing available files in the archive

### Requirement: Download Output Metadata

The system SHALL return comprehensive metadata about the download operation.

#### Scenario: Successful download response

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

#### Scenario: Response includes package metadata

- **WHEN** the download completes successfully
- **THEN** the response SHALL include package information:
  - `packageId`: Winget package identifier
  - `packageName`: Display name
  - `packageVersion`: Downloaded version
  - `publisher`: Publisher name
