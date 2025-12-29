// Intune Win32 app publishing types for Microsoft Graph API

import type { IntuneDetectionRule } from './intune.js';

/**
 * Standard Intune app categories
 */
export type IntuneAppCategory =
  | 'Productivity'
  | 'Business'
  | 'Communication'
  | 'Developer Tools'
  | 'Utilities'
  | 'Other';

/**
 * Input for the publish_to_intune tool
 */
export interface PublishToIntuneInput {
  /** Path to the .intunewin file */
  intunewinPath: string;
  /** Application display name (auto-populated from PSADT if not provided) */
  appName?: string;
  /** Application version (auto-populated from PSADT if not provided) */
  appVersion?: string;
  /** Application vendor/publisher (auto-populated from PSADT if not provided) */
  appVendor?: string;
  /** Application description (fetched via web search if not provided) */
  description?: string;
  /** Path to app logo image (fetched via web search if not provided) */
  logoPath?: string;
  /** Skip logo fetching */
  skipLogo?: boolean;
  /** Detection rule configuration (from generate_intune_detection output) */
  detectionRule?: IntuneDetectionRule;
  /** Custom install command (defaults to PSADT command) */
  installCommand?: string;
  /** Custom uninstall command (defaults to PSADT command) */
  uninstallCommand?: string;
}

/**
 * Output from the publish_to_intune tool
 */
export interface PublishToIntuneOutput {
  /** Whether the operation succeeded */
  success: boolean;
  /** Intune app GUID */
  appId?: string;
  /** App display name as created in Intune */
  appName?: string;
  /** URL to view the app in Intune portal */
  portalUrl?: string;
  /** Category assigned to the app */
  category?: IntuneAppCategory;
  /** Whether a logo was uploaded */
  logoUploaded?: boolean;
  /** Error message (if failed) */
  error?: string;
  /** Recommendations or next steps */
  recommendations?: string[];
}

/**
 * Win32LobApp rule format (detection or requirement rules)
 * Converted from IntuneDetectionRule format for Graph API
 */
export interface Win32LobAppRule {
  '@odata.type': string;
  ruleType: 'detection' | 'requirement';
  [key: string]: unknown;
}

/**
 * Microsoft Graph Win32LobApp resource type
 * https://learn.microsoft.com/en-us/graph/api/resources/intune-apps-win32lobapp
 */
export interface GraphWin32LobApp {
  '@odata.type': '#microsoft.graph.win32LobApp';
  displayName: string;
  description: string;
  publisher: string;
  displayVersion?: string;
  fileName: string;
  installCommandLine: string;
  uninstallCommandLine: string;
  applicableArchitectures: 'x64' | 'x86' | 'arm' | 'neutral' | 'x64,x86';
  minimumSupportedOperatingSystem: {
    v10_1607: boolean;
    [key: string]: boolean;
  };
  setupFilePath: string;
  msiInformation?: {
    productCode: string;
    productVersion: string;
    upgradeCode?: string;
    requiresReboot: boolean;
    packageType: 'perMachine' | 'perUser' | 'dualPurpose';
  };
  rules?: Win32LobAppRule[];
  installExperience: {
    runAsAccount: 'system' | 'user';
    deviceRestartBehavior: 'basedOnReturnCode' | 'allow' | 'suppress' | 'force';
  };
  returnCodes?: Array<{
    returnCode: number;
    type: 'success' | 'failed' | 'softReboot' | 'hardReboot' | 'retry';
  }>;
}

/**
 * Content version for uploading app content
 */
export interface ContentVersion {
  id: string;
}

/**
 * Content file for upload tracking
 */
export interface ContentFile {
  id: string;
  name: string;
  size: number;
  sizeEncrypted: number;
  azureStorageUri?: string;
  isCommitted: boolean;
  uploadState: 'success' | 'pending' | 'failed';
}

/**
 * Azure Storage upload session
 */
export interface AzureStorageUploadSession {
  uploadUrl: string;
  expirationDateTime: string;
}

/**
 * File encryption info for .intunewin packages
 */
export interface FileEncryptionInfo {
  encryptionKey: string;
  macKey: string;
  initializationVector: string;
  mac: string;
  profileIdentifier: string;
  fileDigest: string;
  fileDigestAlgorithm: string;
}

/**
 * Intune category resource
 */
export interface IntuneCategory {
  id: string;
  displayName: string;
}

/**
 * Upload progress callback
 */
export type UploadProgressCallback = (
  bytesUploaded: number,
  totalBytes: number,
  stage: 'preparing' | 'uploading' | 'committing' | 'complete'
) => void;
