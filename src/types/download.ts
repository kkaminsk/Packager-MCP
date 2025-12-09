import type { Architecture, InstallerType } from './winget.js';

// Download tool input types

export interface DownloadInstallerInput {
  packageId: string;
  version?: string;
  architecture?: Architecture;
  outputDirectory: string;
  outputFilename?: string;
}

// Large file warning type

export interface LargeFileWarning {
  sizeBytes: number;
  sizeFormatted: string;
  directDownloadUrl: string;
  message: string;
}

// Download tool output types

export interface DownloadInstallerOutput {
  success: boolean;
  filePath: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  verified: boolean;
  installerType: InstallerType;
  downloadedFrom: string;
  installerUrl: string;
  duration: number;
  packageId: string;
  packageName: string;
  packageVersion: string;
  publisher: string;
  warning?: string;
  largeFileWarning?: LargeFileWarning;
}

// Progress tracking

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number | undefined;
  percentage: number | undefined;
  elapsedMs: number;
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

// Nested installer configuration

export interface NestedInstallerConfig {
  nestedInstallerType: InstallerType;
  relativeFilePath: string;
}

// Internal service types

export interface InstallerSelection {
  installerUrl: string;
  installerSha256?: string;
  installerType: InstallerType;
  architecture: Architecture;
  nestedInstaller?: NestedInstallerConfig;
  originalFilename: string;
}

export interface DownloadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  verified: boolean;
  duration: number;
}
