// Intune Win32 app publishing service via Microsoft Graph API

import { getLogger } from '../utils/logger.js';
import { getGraphAuthService } from './graph-auth.js';
import type {
  PublishToIntuneInput,
  PublishToIntuneOutput,
  GraphWin32LobApp,
  IntuneCategory,
  IntuneAppCategory,
  FileEncryptionInfo,
  UploadProgressCallback,
} from '../types/intune-publisher.js';
import type { IntuneDetectionRule } from '../types/intune.js';

const logger = getLogger().child({ service: 'intune-publisher' });

/** Microsoft Graph API base URL */
const GRAPH_BASE_URL = 'https://graph.microsoft.com/beta';

/** Default install command for PSADT packages */
const DEFAULT_INSTALL_COMMAND = 'Deploy-Application.exe -DeploymentType Install -DeployMode Silent';

/** Default uninstall command for PSADT packages */
const DEFAULT_UNINSTALL_COMMAND = 'Deploy-Application.exe -DeploymentType Uninstall -DeployMode Silent';

/** Chunk size for file uploads (4 MB) */
const UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024;

/** Category mapping keywords */
const CATEGORY_KEYWORDS: Record<IntuneAppCategory, string[]> = {
  'Productivity': ['office', 'word', 'excel', 'powerpoint', 'outlook', 'teams', 'slack', 'notion', 'evernote', 'todoist'],
  'Business': ['salesforce', 'sap', 'oracle', 'dynamics', 'quickbooks', 'sage', 'erp', 'crm'],
  'Communication': ['zoom', 'webex', 'skype', 'discord', 'telegram', 'signal', 'whatsapp', 'messenger'],
  'Developer Tools': ['visual studio', 'vscode', 'code', 'git', 'github', 'docker', 'node', 'python', 'java', 'intellij', 'sublime', 'notepad++', 'postman'],
  'Utilities': ['7zip', 'winrar', 'vlc', 'adobe reader', 'foxit', 'notepad', 'paint', 'screenshot', 'backup', 'cleanup', 'ccleaner'],
  'Other': [],
};

/**
 * Intune Publisher Service
 * Handles uploading Win32 LOB apps to Microsoft Intune via Graph API
 */
class IntunePublisherService {
  /**
   * Publish a Win32 app to Intune
   */
  async publishApp(
    input: PublishToIntuneInput,
    progressCallback?: UploadProgressCallback
  ): Promise<PublishToIntuneOutput> {
    logger.info('Starting Intune app publishing', {
      appName: input.appName,
      intunewinPath: input.intunewinPath,
    });

    const recommendations: string[] = [];

    try {
      // Step 1: Validate input
      const validationResult = await this.validateInput(input);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          recommendations: validationResult.suggestions,
        };
      }

      // Step 2: Get authentication token
      const authService = getGraphAuthService();
      const authResult = await authService.getAccessToken();
      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed',
          recommendations: authResult.suggestions,
        };
      }

      const accessToken = authResult.accessToken!;

      // Step 3: Read .intunewin metadata
      progressCallback?.(0, 100, 'preparing');
      const metadata = await this.readIntunewinMetadata(input.intunewinPath);

      // Step 4: Determine app metadata
      const appName = input.appName || metadata.name || 'Unknown Application';
      const appVersion = input.appVersion || metadata.version || '1.0.0';
      const appVendor = input.appVendor || metadata.publisher || 'Unknown Publisher';
      const description = input.description || await this.getDefaultDescription(appName, appVendor);

      // Step 5: Determine category
      const category = this.determineCategory(appName, description);
      recommendations.push(`Assigned category: ${category}`);

      // Step 6: Create the Win32 LOB app
      logger.debug('Creating Win32 LOB app in Intune');
      const appDefinition = this.buildAppDefinition({
        displayName: appName,
        description,
        publisher: appVendor,
        displayVersion: appVersion,
        installCommand: input.installCommand || DEFAULT_INSTALL_COMMAND,
        uninstallCommand: input.uninstallCommand || DEFAULT_UNINSTALL_COMMAND,
        setupFilePath: metadata.setupFile || 'Invoke-AppDeployToolkit.exe',
        detectionRule: input.detectionRule,
      });

      const createdApp = await this.createApp(accessToken, appDefinition);
      const appId = createdApp.id;
      logger.info('Win32 LOB app created', { appId, appName });

      // Step 7: Upload content
      progressCallback?.(10, 100, 'uploading');
      await this.uploadAppContent(
        accessToken,
        appId,
        input.intunewinPath,
        metadata,
        (bytes, total) => {
          const progress = 10 + Math.round((bytes / total) * 70);
          progressCallback?.(progress, 100, 'uploading');
        }
      );

      // Step 8: Assign category
      progressCallback?.(85, 100, 'committing');
      const categories = await this.getCategories(accessToken);
      const matchedCategory = categories.find(c =>
        c.displayName.toLowerCase() === category.toLowerCase()
      );
      if (matchedCategory) {
        await this.assignCategory(accessToken, appId, matchedCategory.id);
        logger.debug('Category assigned', { category: matchedCategory.displayName });
      } else {
        recommendations.push(`Category "${category}" not found in tenant. App created without category.`);
      }

      // Step 9: Upload logo (if available and not skipped)
      let logoUploaded = false;
      if (!input.skipLogo && input.logoPath) {
        try {
          await this.uploadLogo(accessToken, appId, input.logoPath);
          logoUploaded = true;
          logger.debug('Logo uploaded');
        } catch (logoError) {
          const msg = logoError instanceof Error ? logoError.message : String(logoError);
          recommendations.push(`Logo upload failed: ${msg}. App created without logo.`);
        }
      } else if (!input.skipLogo && !input.logoPath) {
        recommendations.push('No logo provided. Consider adding a logo for better visibility in Company Portal.');
      }

      progressCallback?.(100, 100, 'complete');

      // Build portal URL
      const portalUrl = `https://intune.microsoft.com/#view/Microsoft_Intune_Apps/SettingsMenu/~/0/appId/${appId}`;

      logger.info('Intune app publishing completed', { appId, appName });

      return {
        success: true,
        appId,
        appName,
        portalUrl,
        category,
        logoUploaded,
        recommendations,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to publish app to Intune', { error: message });

      // Parse Graph API errors for better guidance
      const suggestions = this.parseGraphError(message);

      return {
        success: false,
        error: `Failed to publish app: ${message}`,
        recommendations: suggestions,
      };
    }
  }

  /**
   * Validate input before publishing
   */
  private async validateInput(input: PublishToIntuneInput): Promise<{
    valid: boolean;
    error?: string;
    suggestions?: string[];
  }> {
    const { existsSync, statSync } = await import('node:fs');
    const { extname } = await import('node:path');

    // Check file exists
    if (!existsSync(input.intunewinPath)) {
      return {
        valid: false,
        error: `File not found: ${input.intunewinPath}`,
        suggestions: [
          'Verify the path to the .intunewin file is correct',
          'Ensure the file has been created using IntuneWinAppUtil.exe',
        ],
      };
    }

    // Check file extension
    if (extname(input.intunewinPath).toLowerCase() !== '.intunewin') {
      return {
        valid: false,
        error: 'File must have .intunewin extension',
        suggestions: [
          'Use IntuneWinAppUtil.exe to create an .intunewin package',
          'The tool converts your PSADT folder into the required format',
        ],
      };
    }

    // Check file size
    const stats = statSync(input.intunewinPath);
    if (stats.size === 0) {
      return {
        valid: false,
        error: 'The .intunewin file is empty',
        suggestions: [
          'Regenerate the .intunewin file using IntuneWinAppUtil.exe',
          'Verify the source folder contains the PSADT package',
        ],
      };
    }

    // Check app name length
    if (input.appName && input.appName.length > 256) {
      return {
        valid: false,
        error: 'App name must be 256 characters or less',
        suggestions: ['Shorten the application name'],
      };
    }

    return { valid: true };
  }

  /**
   * Read metadata from .intunewin file
   */
  private async readIntunewinMetadata(filePath: string): Promise<{
    name?: string;
    version?: string;
    publisher?: string;
    setupFile?: string;
    encryptionInfo?: FileEncryptionInfo;
    unencryptedContentSize?: number;
  }> {
    // .intunewin files are ZIP archives containing Detection.xml with metadata
    // For now, return empty metadata - the caller should provide explicit values
    // Full implementation would extract and parse the Detection.xml file

    const { basename } = await import('node:path');
    const fileName = basename(filePath, '.intunewin');

    logger.debug('Reading intunewin metadata', { filePath, fileName });

    // Extract basic info from filename if it follows convention: AppName_Version.intunewin
    const match = fileName.match(/^(.+?)_(\d+[\d.]+)$/);
    if (match && match[1] && match[2]) {
      return {
        name: match[1].replace(/_/g, ' '),
        version: match[2],
        setupFile: 'Invoke-AppDeployToolkit.exe',
      };
    }

    return {
      name: fileName.replace(/_/g, ' '),
      setupFile: 'Invoke-AppDeployToolkit.exe',
    };
  }

  /**
   * Build Graph API app definition
   */
  private buildAppDefinition(params: {
    displayName: string;
    description: string;
    publisher: string;
    displayVersion?: string;
    installCommand: string;
    uninstallCommand: string;
    setupFilePath: string;
    detectionRule?: IntuneDetectionRule;
  }): GraphWin32LobApp {
    const app: GraphWin32LobApp = {
      '@odata.type': '#microsoft.graph.win32LobApp',
      displayName: params.displayName,
      description: params.description,
      publisher: params.publisher,
      displayVersion: params.displayVersion,
      installCommandLine: params.installCommand,
      uninstallCommandLine: params.uninstallCommand,
      applicableArchitectures: 'x64',
      minimumSupportedOperatingSystem: {
        v10_1607: true,
      },
      setupFilePath: params.setupFilePath,
      installExperience: {
        runAsAccount: 'system',
        deviceRestartBehavior: 'basedOnReturnCode',
      },
      returnCodes: [
        { returnCode: 0, type: 'success' },
        { returnCode: 1707, type: 'success' },
        { returnCode: 3010, type: 'softReboot' },
        { returnCode: 1641, type: 'hardReboot' },
        { returnCode: 1618, type: 'retry' },
      ],
    };

    if (params.detectionRule) {
      app.rules = [params.detectionRule];
    }

    return app;
  }

  /**
   * Create Win32 LOB app via Graph API
   */
  private async createApp(
    accessToken: string,
    appDefinition: GraphWin32LobApp
  ): Promise<{ id: string }> {
    const response = await fetch(`${GRAPH_BASE_URL}/deviceAppManagement/mobileApps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appDefinition),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create app: ${response.status} ${errorText}`);
    }

    const result = await response.json() as { id: string };
    return result;
  }

  /**
   * Upload app content to Intune
   */
  private async uploadAppContent(
    accessToken: string,
    appId: string,
    filePath: string,
    metadata: { encryptionInfo?: FileEncryptionInfo; unencryptedContentSize?: number },
    onProgress?: (bytesUploaded: number, totalBytes: number) => void
  ): Promise<void> {
    const { readFileSync, statSync } = await import('node:fs');
    const { basename } = await import('node:path');

    const fileName = basename(filePath);
    const fileStats = statSync(filePath);
    const fileSize = fileStats.size;

    logger.debug('Starting content upload', { fileName, fileSize });

    // Step 1: Create content version
    const contentVersionResponse = await fetch(
      `${GRAPH_BASE_URL}/deviceAppManagement/mobileApps/${appId}/microsoft.graph.win32LobApp/contentVersions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!contentVersionResponse.ok) {
      const errorText = await contentVersionResponse.text();
      throw new Error(`Failed to create content version: ${contentVersionResponse.status} ${errorText}`);
    }

    const contentVersion = await contentVersionResponse.json() as { id: string };
    const contentVersionId = contentVersion.id;

    // Step 2: Create file entry
    const fileEntryResponse = await fetch(
      `${GRAPH_BASE_URL}/deviceAppManagement/mobileApps/${appId}/microsoft.graph.win32LobApp/contentVersions/${contentVersionId}/files`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          '@odata.type': '#microsoft.graph.mobileAppContentFile',
          name: fileName,
          size: fileSize,
          sizeEncrypted: fileSize,
          isDependency: false,
        }),
      }
    );

    if (!fileEntryResponse.ok) {
      const errorText = await fileEntryResponse.text();
      throw new Error(`Failed to create file entry: ${fileEntryResponse.status} ${errorText}`);
    }

    const fileEntry = await fileEntryResponse.json() as { id: string };
    const fileId = fileEntry.id;

    // Step 3: Wait for Azure Storage URI
    let azureStorageUri: string | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const fileStatusResponse = await fetch(
        `${GRAPH_BASE_URL}/deviceAppManagement/mobileApps/${appId}/microsoft.graph.win32LobApp/contentVersions/${contentVersionId}/files/${fileId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (fileStatusResponse.ok) {
        const fileStatus = await fileStatusResponse.json() as { azureStorageUri?: string; uploadState: string };
        if (fileStatus.azureStorageUri) {
          azureStorageUri = fileStatus.azureStorageUri;
          break;
        }
      }
    }

    if (!azureStorageUri) {
      throw new Error('Timed out waiting for Azure Storage URI');
    }

    // Step 4: Upload file chunks to Azure Storage
    const fileContent = readFileSync(filePath);
    const blockIds: string[] = [];
    let bytesUploaded = 0;

    for (let offset = 0; offset < fileSize; offset += UPLOAD_CHUNK_SIZE) {
      const chunkSize = Math.min(UPLOAD_CHUNK_SIZE, fileSize - offset);
      const chunk = fileContent.subarray(offset, offset + chunkSize);
      const blockId = Buffer.from(String(blockIds.length).padStart(6, '0')).toString('base64');
      blockIds.push(blockId);

      const blockResponse = await fetch(`${azureStorageUri}&comp=block&blockid=${encodeURIComponent(blockId)}`, {
        method: 'PUT',
        headers: {
          'Content-Length': String(chunkSize),
          'x-ms-blob-type': 'BlockBlob',
        },
        body: chunk,
      });

      if (!blockResponse.ok) {
        throw new Error(`Failed to upload block: ${blockResponse.status}`);
      }

      bytesUploaded += chunkSize;
      onProgress?.(bytesUploaded, fileSize);
    }

    // Step 5: Commit blocks
    const blockListXml = `<?xml version="1.0" encoding="utf-8"?><BlockList>${blockIds.map(id => `<Latest>${id}</Latest>`).join('')}</BlockList>`;

    const commitResponse = await fetch(`${azureStorageUri}&comp=blocklist`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/xml',
      },
      body: blockListXml,
    });

    if (!commitResponse.ok) {
      throw new Error(`Failed to commit blocks: ${commitResponse.status}`);
    }

    // Step 6: Commit file to Intune
    const commitFileResponse = await fetch(
      `${GRAPH_BASE_URL}/deviceAppManagement/mobileApps/${appId}/microsoft.graph.win32LobApp/contentVersions/${contentVersionId}/files/${fileId}/commit`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileEncryptionInfo: metadata.encryptionInfo || null,
        }),
      }
    );

    if (!commitFileResponse.ok) {
      const errorText = await commitFileResponse.text();
      throw new Error(`Failed to commit file: ${commitFileResponse.status} ${errorText}`);
    }

    // Step 7: Wait for processing and update app with content version
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const fileStatusResponse = await fetch(
        `${GRAPH_BASE_URL}/deviceAppManagement/mobileApps/${appId}/microsoft.graph.win32LobApp/contentVersions/${contentVersionId}/files/${fileId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (fileStatusResponse.ok) {
        const fileStatus = await fileStatusResponse.json() as { uploadState: string };
        if (fileStatus.uploadState === 'commitFileSuccess') {
          break;
        } else if (fileStatus.uploadState === 'commitFileFailed') {
          throw new Error('File commit failed in Intune');
        }
      }
    }

    // Step 8: Set committed content version on app
    const updateAppResponse = await fetch(
      `${GRAPH_BASE_URL}/deviceAppManagement/mobileApps/${appId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          '@odata.type': '#microsoft.graph.win32LobApp',
          committedContentVersion: contentVersionId,
        }),
      }
    );

    if (!updateAppResponse.ok) {
      const errorText = await updateAppResponse.text();
      throw new Error(`Failed to update app with content version: ${updateAppResponse.status} ${errorText}`);
    }

    logger.info('Content upload completed', { appId, contentVersionId });
  }

  /**
   * Get available categories from tenant
   */
  private async getCategories(accessToken: string): Promise<IntuneCategory[]> {
    const response = await fetch(
      `${GRAPH_BASE_URL}/deviceAppManagement/mobileAppCategories`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      logger.warn('Failed to fetch categories', { status: response.status });
      return [];
    }

    const result = await response.json() as { value: IntuneCategory[] };
    return result.value || [];
  }

  /**
   * Assign category to app
   */
  private async assignCategory(
    accessToken: string,
    appId: string,
    categoryId: string
  ): Promise<void> {
    const response = await fetch(
      `${GRAPH_BASE_URL}/deviceAppManagement/mobileApps/${appId}/categories/$ref`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          '@odata.id': `${GRAPH_BASE_URL}/deviceAppManagement/mobileAppCategories('${categoryId}')`,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('Failed to assign category', { status: response.status, error: errorText });
    }
  }

  /**
   * Upload logo to app
   */
  private async uploadLogo(
    accessToken: string,
    appId: string,
    logoPath: string
  ): Promise<void> {
    const { readFileSync, existsSync } = await import('node:fs');
    const { extname } = await import('node:path');

    if (!existsSync(logoPath)) {
      throw new Error(`Logo file not found: ${logoPath}`);
    }

    const ext = extname(logoPath).toLowerCase();
    let mimeType: string;
    if (ext === '.png') {
      mimeType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      mimeType = 'image/jpeg';
    } else {
      throw new Error(`Unsupported logo format: ${ext}. Use PNG or JPEG.`);
    }

    const logoContent = readFileSync(logoPath);
    const base64Logo = logoContent.toString('base64');

    const response = await fetch(
      `${GRAPH_BASE_URL}/deviceAppManagement/mobileApps/${appId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          '@odata.type': '#microsoft.graph.win32LobApp',
          largeIcon: {
            '@odata.type': '#microsoft.graph.mimeContent',
            type: mimeType,
            value: base64Logo,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload logo: ${response.status} ${errorText}`);
    }
  }

  /**
   * Determine app category based on name and description
   */
  private determineCategory(appName: string, description: string): IntuneAppCategory {
    const searchText = `${appName} ${description}`.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (category === 'Other') continue;
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          return category as IntuneAppCategory;
        }
      }
    }

    return 'Other';
  }

  /**
   * Generate a default description if none provided
   */
  private async getDefaultDescription(appName: string, vendor: string): Promise<string> {
    // Simple default description - web search integration would enhance this
    return `${appName} by ${vendor}. Deployed via Microsoft Intune.`;
  }

  /**
   * Parse Graph API error for better guidance
   */
  private parseGraphError(errorMessage: string): string[] {
    const suggestions: string[] = [];

    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      suggestions.push('Authentication token may have expired');
      suggestions.push('Verify the service principal has the required permissions');
      suggestions.push('Required permission: DeviceManagementApps.ReadWrite.All');
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      suggestions.push('The service principal does not have permission to perform this action');
      suggestions.push('Grant admin consent for DeviceManagementApps.ReadWrite.All');
    } else if (errorMessage.includes('404')) {
      suggestions.push('The requested resource was not found');
      suggestions.push('The app ID may be invalid or the app was deleted');
    } else if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
      suggestions.push('An app with this name may already exist');
      suggestions.push('Try using a different app name');
    } else if (errorMessage.includes('413') || errorMessage.includes('too large')) {
      suggestions.push('The .intunewin file may be too large');
      suggestions.push('Maximum file size is approximately 8 GB');
    } else if (errorMessage.includes('429') || errorMessage.includes('throttl')) {
      suggestions.push('Graph API rate limit exceeded');
      suggestions.push('Wait a few minutes and try again');
    } else if (errorMessage.includes('500') || errorMessage.includes('503')) {
      suggestions.push('Microsoft Graph API service error');
      suggestions.push('This is usually temporary - wait and retry');
    }

    if (suggestions.length === 0) {
      suggestions.push('Check network connectivity');
      suggestions.push('Verify the .intunewin file is valid');
      suggestions.push('Review the service principal configuration');
    }

    return suggestions;
  }

  /**
   * Check if publishing is configured (auth is ready)
   */
  isConfigured(): boolean {
    return getGraphAuthService().isConfigured();
  }
}

// Singleton instance
let intunePublisherServiceInstance: IntunePublisherService | null = null;

/**
 * Get the Intune publisher service instance
 */
export function getIntunePublisherService(): IntunePublisherService {
  if (!intunePublisherServiceInstance) {
    intunePublisherServiceInstance = new IntunePublisherService();
  }
  return intunePublisherServiceInstance;
}

/**
 * Reset the Intune publisher service (for testing)
 */
export function resetIntunePublisherService(): void {
  intunePublisherServiceInstance = null;
}

export { IntunePublisherService };
