/**
 * Types for PSADT toolkit download functionality
 */

/**
 * Input for the download_psadt_toolkit tool
 */
export interface DownloadPsadtToolkitInput {
  /** Directory where the toolkit will be extracted */
  outputDirectory: string;

  /** Specific version to download (e.g., "4.0.4"). Default: latest */
  version?: string;

  /** Include the Extensions module. Default: false */
  includeExtensions?: boolean;
}

/**
 * Output from the download_psadt_toolkit tool
 */
export interface DownloadPsadtToolkitOutput {
  /** Success indicator */
  success: boolean;

  /** Downloaded version */
  version: string;

  /** Where the toolkit was extracted */
  outputDirectory: string;

  /** List of extracted file paths (relative to outputDirectory) */
  files: string[];

  /** Source of the download: "cache" or "github" */
  downloadedFrom: 'cache' | 'github';

  /** URL to the GitHub release page */
  releaseUrl: string;

  /** Size of the downloaded ZIP in bytes */
  downloadSize: number;

  /** Duration of the download operation in milliseconds */
  duration: number;
}

/**
 * GitHub release metadata
 */
export interface PsadtReleaseInfo {
  /** Version tag (e.g., "v4.0.4") */
  tagName: string;

  /** Release name (e.g., "PSAppDeployToolkit v4.0.4") */
  name: string;

  /** Whether this is the latest release */
  isLatest: boolean;

  /** Release publication date */
  publishedAt: string;

  /** URL to the release page */
  htmlUrl: string;

  /** ZIP asset download URL */
  zipDownloadUrl: string;

  /** ZIP asset size in bytes */
  zipSize: number;
}

/**
 * Cache entry for PSADT releases
 */
export interface PsadtReleaseCacheEntry {
  /** Release information */
  release: PsadtReleaseInfo;

  /** Path to cached extracted toolkit */
  cachedPath: string;

  /** Timestamp when cached */
  cachedAt: number;

  /** TTL expiration timestamp */
  expiresAt: number;
}

/**
 * Configuration options for PSADT download service
 */
export interface PsadtDownloadConfig {
  /** Directory for caching downloaded toolkits. Default: OS temp directory */
  cacheDirectory: string;

  /** Cache TTL in hours. Default: 24 */
  cacheTtlHours: number;

  /** Default version to download. Default: "latest" */
  defaultVersion: string;
}
