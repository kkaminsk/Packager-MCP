import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, unlinkSync, renameSync, readdirSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { getLogger, type Logger } from '../utils/logger.js';
import { DownloadError, HashVerificationError, ExtractionError } from '../utils/errors.js';
import { getWingetService, type WingetService } from './winget.js';
import { loadConfig } from '../config/loader.js';
import type {
  DownloadInstallerInput,
  DownloadInstallerOutput,
  DownloadProgress,
  DownloadProgressCallback,
  InstallerSelection,
  DownloadResult,
  NestedInstallerConfig,
  LargeFileWarning,
} from '../types/download.js';
import type { WingetManifest, Installer, Architecture, InstallerType } from '../types/winget.js';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const PROGRESS_THRESHOLD_BYTES = 1024 * 1024; // 1MB

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export class InstallerDownloadService {
  private logger: Logger;
  private wingetService: WingetService;
  private largeFileSizeThreshold: number;
  private timeoutMs: number;

  constructor() {
    this.logger = getLogger().child({ service: 'download' });
    this.wingetService = getWingetService();
    const config = loadConfig();
    this.largeFileSizeThreshold = config.download.largeFileSizeThreshold;
    this.timeoutMs = config.download.timeoutMs;
  }

  async checkFileSize(url: string): Promise<number | undefined> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for HEAD

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'intune-packaging-assistant-mcp/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.debug('HEAD request failed, proceeding without size info', {
          url,
          status: response.status,
        });
        return undefined;
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        this.logger.debug('Pre-flight size check completed', {
          url,
          sizeBytes: size,
          sizeFormatted: formatBytes(size),
        });
        return size;
      }

      return undefined;
    } catch (error) {
      this.logger.debug('Pre-flight size check failed, proceeding without size info', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  private createLargeFileWarning(sizeBytes: number, url: string): LargeFileWarning | undefined {
    if (this.largeFileSizeThreshold <= 0 || sizeBytes < this.largeFileSizeThreshold) {
      return undefined;
    }

    return {
      sizeBytes,
      sizeFormatted: formatBytes(sizeBytes),
      directDownloadUrl: url,
      message:
        `This is a large file (${formatBytes(sizeBytes)}). ` +
        'If you experience timeouts or slow downloads, consider downloading manually from the URL provided.',
    };
  }

  async downloadInstaller(input: DownloadInstallerInput): Promise<DownloadInstallerOutput> {
    const startTime = Date.now();
    this.logger.info('Starting installer download', {
      packageId: input.packageId,
      version: input.version,
      architecture: input.architecture,
    });

    // Fetch manifest from Winget
    const manifest = await this.wingetService.getManifest(input.packageId, input.version);
    if (!manifest) {
      throw new DownloadError(
        `Package not found: ${input.packageId}${input.version ? ` version ${input.version}` : ''}. ` +
          'Verify the package ID is correct (e.g., "Google.Chrome").',
        undefined,
        404
      );
    }

    // Select the appropriate installer
    const selection = this.selectInstaller(manifest, input.architecture);
    if (!selection) {
      throw new DownloadError(
        `No suitable installer found for ${input.packageId}. ` +
          `Requested architecture: ${input.architecture ?? 'any'}. ` +
          `Available: ${manifest.installers.map((i) => i.architecture).join(', ')}`,
        undefined,
        404
      );
    }

    // Ensure output directory exists
    if (!existsSync(input.outputDirectory)) {
      mkdirSync(input.outputDirectory, { recursive: true });
    }

    // Pre-flight size check
    const preFlightSize = await this.checkFileSize(selection.installerUrl);
    const largeFileWarning = preFlightSize
      ? this.createLargeFileWarning(preFlightSize, selection.installerUrl)
      : undefined;

    // Determine output filename
    const outputFilename = input.outputFilename ?? selection.originalFilename;
    let outputPath = join(input.outputDirectory, outputFilename);

    // Download the file
    const downloadResult = await this.downloadFile(
      selection.installerUrl,
      outputPath,
      selection.installerSha256
    );

    // Handle nested installer extraction if needed
    if (selection.nestedInstaller) {
      outputPath = await this.extractNestedInstaller(
        downloadResult.filePath,
        input.outputDirectory,
        selection.nestedInstaller,
        input.outputFilename
      );

      // Update result with extracted file info
      const extractedStats = await stat(outputPath);
      downloadResult.filePath = outputPath;
      downloadResult.fileName = basename(outputPath);
      downloadResult.fileSize = extractedStats.size;
      // Re-compute hash for extracted file
      downloadResult.sha256 = await this.computeFileHash(outputPath);
      downloadResult.verified = false; // Can't verify extracted file against original hash
    }

    const duration = Date.now() - startTime;

    const output: DownloadInstallerOutput = {
      success: true,
      filePath: downloadResult.filePath,
      fileName: downloadResult.fileName,
      fileSize: downloadResult.fileSize,
      sha256: downloadResult.sha256,
      verified: downloadResult.verified,
      installerType: selection.nestedInstaller?.nestedInstallerType ?? selection.installerType,
      downloadedFrom: selection.installerUrl,
      installerUrl: selection.installerUrl,
      duration,
      packageId: manifest.packageIdentifier,
      packageName: manifest.packageName,
      packageVersion: manifest.packageVersion,
      publisher: manifest.publisher,
      largeFileWarning,
    };

    if (!selection.installerSha256) {
      output.warning =
        'Downloaded file could not be verified - Winget manifest does not include SHA256 hash. ' +
        'Consider verifying the file manually before deployment.';
    }

    this.logger.info('Download completed successfully', {
      packageId: input.packageId,
      filePath: output.filePath,
      fileSize: output.fileSize,
      duration,
      verified: output.verified,
    });

    return output;
  }

  selectInstaller(
    manifest: WingetManifest,
    preferredArchitecture?: Architecture
  ): InstallerSelection | undefined {
    const installers = manifest.installers;
    if (!installers.length) {
      return undefined;
    }

    // Architecture priority
    const archPriority: Architecture[] = preferredArchitecture
      ? [preferredArchitecture, 'x64', 'x86', 'neutral', 'arm64']
      : ['x64', 'x86', 'neutral', 'arm64'];

    // Find best matching installer
    let selected: Installer | undefined;
    for (const arch of archPriority) {
      selected = installers.find((i) => i.architecture === arch);
      if (selected) break;
    }

    // Fallback to first available
    if (!selected) {
      selected = installers[0];
    }

    if (!selected) {
      return undefined;
    }

    // Extract filename from URL
    const urlPath = new URL(selected.installerUrl).pathname;
    const originalFilename = basename(urlPath) || `${manifest.packageIdentifier}_${manifest.packageVersion}${this.getExtension(selected.installerType)}`;

    // Check for nested installer
    let nestedInstaller: NestedInstallerConfig | undefined;
    if (selected.nestedInstallerType && selected.nestedInstallerFiles?.length) {
      nestedInstaller = {
        nestedInstallerType: selected.nestedInstallerType,
        relativeFilePath: selected.nestedInstallerFiles[0]!.relativeFilePath,
      };
    }

    return {
      installerUrl: selected.installerUrl,
      installerSha256: selected.installerSha256,
      installerType: selected.installerType,
      architecture: selected.architecture,
      nestedInstaller,
      originalFilename,
    };
  }

  private getExtension(installerType: InstallerType): string {
    const extensions: Record<InstallerType, string> = {
      msi: '.msi',
      msix: '.msix',
      exe: '.exe',
      inno: '.exe',
      nullsoft: '.exe',
      wix: '.exe',
      burn: '.exe',
      zip: '.zip',
      portable: '.zip',
      unknown: '.exe',
    };
    return extensions[installerType];
  }

  private async downloadFile(
    url: string,
    outputPath: string,
    expectedSha256?: string,
    progressCallback?: DownloadProgressCallback
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    this.logger.debug('Starting file download', { url, outputPath });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'intune-packaging-assistant-mcp/1.0',
        },
      });

      if (!response.ok) {
        throw new DownloadError(
          `HTTP ${response.status}: ${response.statusText}. ` +
            'The installer URL may be invalid or the server is unavailable.',
          url,
          response.status
        );
      }

      if (!response.body) {
        throw new DownloadError('Response has no body', url);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : undefined;

      // Create hash for verification
      const hash = createHash('sha256');
      let bytesDownloaded = 0;

      // Create write stream
      const fileStream = createWriteStream(outputPath);

      // Convert web ReadableStream to Node.js stream and process
      const reader = response.body.getReader();
      const nodeStream = new Readable({
        async read() {
          try {
            const { done, value } = await reader.read();
            if (done) {
              this.push(null);
            } else {
              bytesDownloaded += value.length;
              hash.update(value);

              // Report progress for large files
              if (progressCallback && totalBytes && totalBytes > PROGRESS_THRESHOLD_BYTES) {
                progressCallback({
                  bytesDownloaded,
                  totalBytes,
                  percentage: Math.round((bytesDownloaded / totalBytes) * 100),
                  elapsedMs: Date.now() - startTime,
                });
              }

              this.push(value);
            }
          } catch (err) {
            this.destroy(err instanceof Error ? err : new Error(String(err)));
          }
        },
      });

      await pipeline(nodeStream, fileStream);

      const computedHash = hash.digest('hex').toUpperCase();
      const duration = Date.now() - startTime;

      this.logger.debug('File download complete', {
        bytesDownloaded,
        duration,
        computedHash: computedHash.substring(0, 16) + '...',
      });

      // Verify hash if expected hash is provided
      let verified = false;
      if (expectedSha256) {
        const expectedUpper = expectedSha256.toUpperCase();
        if (computedHash !== expectedUpper) {
          // Clean up corrupted file
          try {
            unlinkSync(outputPath);
          } catch {
            // Ignore cleanup errors
          }
          throw new HashVerificationError(
            `SHA256 hash mismatch. The downloaded file may be corrupted or tampered with. ` +
              `Try downloading again. If the problem persists, the package manifest may be outdated.`,
            expectedUpper,
            computedHash
          );
        }
        verified = true;
      }

      return {
        filePath: outputPath,
        fileName: basename(outputPath),
        fileSize: bytesDownloaded,
        sha256: computedHash,
        verified,
        duration,
      };
    } catch (error) {
      // Clean up partial download on error
      try {
        if (existsSync(outputPath)) {
          unlinkSync(outputPath);
        }
      } catch {
        // Ignore cleanup errors
      }

      if (error instanceof DownloadError || error instanceof HashVerificationError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new DownloadError(
          `Download timed out after ${this.timeoutMs / 1000} seconds. ` +
            'For large files, consider downloading manually from the installer URL provided.',
          url
        );
      }

      throw new DownloadError(
        `Download failed: ${error instanceof Error ? error.message : String(error)}. ` +
          'Check your network connection and try again.',
        url
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async extractNestedInstaller(
    archivePath: string,
    outputDirectory: string,
    config: NestedInstallerConfig,
    outputFilename?: string
  ): Promise<string> {
    this.logger.debug('Extracting nested installer', {
      archivePath,
      relativeFilePath: config.relativeFilePath,
    });

    // Create temp directory for extraction
    const tempDir = join(tmpdir(), `mcp-extract-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      // Use native unzip on Windows, or built-in extraction
      await this.extractZip(archivePath, tempDir);

      // Find the nested installer
      const nestedPath = join(tempDir, config.relativeFilePath);
      if (!existsSync(nestedPath)) {
        // List available files for debugging
        const availableFiles = this.listFilesRecursive(tempDir);
        throw new ExtractionError(
          `Nested installer not found at path: ${config.relativeFilePath}. ` +
            `Available files in archive: ${availableFiles.slice(0, 10).join(', ')}${availableFiles.length > 10 ? '...' : ''}`,
          archivePath
        );
      }

      // Determine final filename
      const finalFilename = outputFilename ?? basename(config.relativeFilePath);
      const finalPath = join(outputDirectory, finalFilename);

      // Move to output directory
      renameSync(nestedPath, finalPath);

      this.logger.debug('Nested installer extracted', { finalPath });

      return finalPath;
    } finally {
      // Cleanup temp directory and original archive
      try {
        this.removeDirectoryRecursive(tempDir);
        unlinkSync(archivePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private async extractZip(zipPath: string, outputDir: string): Promise<void> {
    // Use PowerShell's Expand-Archive on Windows for simplicity
    const { execSync } = await import('node:child_process');

    try {
      if (process.platform === 'win32') {
        // Use PowerShell Expand-Archive
        execSync(
          `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outputDir}' -Force"`,
          { stdio: 'pipe' }
        );
      } else {
        // Use unzip on Unix systems
        execSync(`unzip -q "${zipPath}" -d "${outputDir}"`, { stdio: 'pipe' });
      }
    } catch (error) {
      throw new ExtractionError(
        `Failed to extract ZIP archive: ${error instanceof Error ? error.message : String(error)}`,
        zipPath
      );
    }
  }

  private listFilesRecursive(dir: string, prefix = ''): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        files.push(...this.listFilesRecursive(join(dir, entry.name), fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private removeDirectoryRecursive(dir: string): void {
    const { rmSync } = require('node:fs');
    rmSync(dir, { recursive: true, force: true });
  }

  private async computeFileHash(filePath: string): Promise<string> {
    const { createReadStream } = await import('node:fs');
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex').toUpperCase()));
      stream.on('error', reject);
    });
  }
}

// Singleton instance
let downloadService: InstallerDownloadService | undefined;

export function getDownloadService(): InstallerDownloadService {
  if (!downloadService) {
    downloadService = new InstallerDownloadService();
  }
  return downloadService;
}
