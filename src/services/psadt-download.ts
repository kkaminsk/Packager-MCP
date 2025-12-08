import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, cpSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { getLogger, type Logger } from '../utils/logger.js';
import { DownloadError, ExtractionError, GithubApiError } from '../utils/errors.js';
import { loadConfig } from '../config/loader.js';
import type {
  DownloadPsadtToolkitInput,
  DownloadPsadtToolkitOutput,
  PsadtReleaseInfo,
  PsadtReleaseCacheEntry,
} from '../types/psadt-download.js';

const PSADT_REPO_OWNER = 'PSAppDeployToolkit';
const PSADT_REPO_NAME = 'PSAppDeployToolkit';
const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_CACHE_TTL_HOURS = 24;
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Service for downloading and caching PSADT toolkit from GitHub releases
 */
export class PsadtDownloadService {
  private logger: Logger;
  private cacheDirectory: string;
  private cacheTtlMs: number;
  private githubToken?: string;
  private releaseCache: Map<string, PsadtReleaseCacheEntry> = new Map();

  constructor() {
    this.logger = getLogger().child({ service: 'psadt-download' });
    const config = loadConfig();

    // Set cache directory from config or use temp directory
    this.cacheDirectory = config.psadt?.cacheDirectory ?? join(tmpdir(), 'psadt-toolkit-cache');
    this.cacheTtlMs = (config.psadt?.cacheTtlHours ?? DEFAULT_CACHE_TTL_HOURS) * 60 * 60 * 1000;
    this.githubToken = config.github?.token ?? process.env.GITHUB_TOKEN;

    // Ensure cache directory exists
    if (!existsSync(this.cacheDirectory)) {
      mkdirSync(this.cacheDirectory, { recursive: true });
    }

    this.logger.debug('PsadtDownloadService initialized', {
      cacheDirectory: this.cacheDirectory,
      cacheTtlHours: this.cacheTtlMs / (60 * 60 * 1000),
      hasGithubToken: !!this.githubToken,
    });
  }

  /**
   * Download the PSADT toolkit to the specified directory
   */
  async downloadToolkit(input: DownloadPsadtToolkitInput): Promise<DownloadPsadtToolkitOutput> {
    const startTime = Date.now();
    this.logger.info('Starting PSADT toolkit download', {
      outputDirectory: input.outputDirectory,
      version: input.version ?? 'latest',
      includeExtensions: input.includeExtensions ?? false,
    });

    // Get release info
    const release = input.version
      ? await this.getReleaseByVersion(input.version)
      : await this.getLatestRelease();

    // Check cache
    const cacheKey = release.tagName;
    const cached = this.releaseCache.get(cacheKey);
    let downloadedFrom: 'cache' | 'github' = 'github';
    let cachedPath: string;

    if (cached && cached.expiresAt > Date.now() && existsSync(cached.cachedPath)) {
      this.logger.debug('Using cached toolkit', {
        version: release.tagName,
        cachedPath: cached.cachedPath,
      });
      cachedPath = cached.cachedPath;
      downloadedFrom = 'cache';
    } else {
      // Download and extract to cache
      cachedPath = await this.downloadAndExtract(release);

      // Update cache
      this.releaseCache.set(cacheKey, {
        release,
        cachedPath,
        cachedAt: Date.now(),
        expiresAt: Date.now() + this.cacheTtlMs,
      });
    }

    // Ensure output directory exists
    if (!existsSync(input.outputDirectory)) {
      mkdirSync(input.outputDirectory, { recursive: true });
    }

    // Copy toolkit files to output directory
    const files = await this.copyToolkitToOutput(cachedPath, input.outputDirectory, input.includeExtensions);

    const duration = Date.now() - startTime;

    const output: DownloadPsadtToolkitOutput = {
      success: true,
      version: release.tagName.replace(/^v/, ''),
      outputDirectory: input.outputDirectory,
      files,
      downloadedFrom,
      releaseUrl: release.htmlUrl,
      downloadSize: release.zipSize,
      duration,
    };

    this.logger.info('PSADT toolkit download completed', {
      version: output.version,
      filesCount: files.length,
      downloadedFrom,
      duration,
    });

    return output;
  }

  /**
   * Get the latest PSADT release from GitHub
   */
  async getLatestRelease(): Promise<PsadtReleaseInfo> {
    this.logger.debug('Fetching latest PSADT release');

    const url = `${GITHUB_API_BASE}/repos/${PSADT_REPO_OWNER}/${PSADT_REPO_NAME}/releases/latest`;
    const response = await this.fetchWithAuth(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new GithubApiError(
          'PSADT repository not found or no releases available',
          response.status,
          { url }
        );
      }
      if (response.status === 429) {
        throw new GithubApiError(
          'GitHub API rate limit exceeded. Configure GITHUB_TOKEN for higher limits.',
          response.status,
          { url }
        );
      }
      throw new GithubApiError(
        `Failed to fetch latest release: HTTP ${response.status}`,
        response.status,
        { url }
      );
    }

    const data = await response.json();
    return this.parseReleaseResponse(data, true);
  }

  /**
   * Get a specific PSADT release by version
   */
  async getReleaseByVersion(version: string): Promise<PsadtReleaseInfo> {
    this.logger.debug('Fetching PSADT release by version', { version });

    // Normalize version tag (add 'v' prefix if not present)
    const tag = version.startsWith('v') ? version : `v${version}`;

    const url = `${GITHUB_API_BASE}/repos/${PSADT_REPO_OWNER}/${PSADT_REPO_NAME}/releases/tags/${tag}`;
    const response = await this.fetchWithAuth(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new GithubApiError(
          `PSADT version ${version} not found. Check available versions at https://github.com/${PSADT_REPO_OWNER}/${PSADT_REPO_NAME}/releases`,
          response.status,
          { url }
        );
      }
      if (response.status === 429) {
        throw new GithubApiError(
          'GitHub API rate limit exceeded. Configure GITHUB_TOKEN for higher limits.',
          response.status,
          { url }
        );
      }
      throw new GithubApiError(
        `Failed to fetch release ${version}: HTTP ${response.status}`,
        response.status,
        { url }
      );
    }

    const data = await response.json();
    return this.parseReleaseResponse(data, false);
  }

  /**
   * Parse GitHub release API response
   */
  private parseReleaseResponse(data: any, isLatest: boolean): PsadtReleaseInfo {
    // Find the main toolkit ZIP asset
    const zipAsset = data.assets?.find((asset: any) =>
      asset.name.toLowerCase().includes('psappdeploytoolkit') &&
      asset.name.endsWith('.zip') &&
      !asset.name.toLowerCase().includes('template')
    );

    if (!zipAsset) {
      throw new DownloadError(
        `No toolkit ZIP found in release ${data.tag_name}. Available assets: ${data.assets?.map((a: any) => a.name).join(', ') ?? 'none'}`,
        data.html_url
      );
    }

    return {
      tagName: data.tag_name,
      name: data.name,
      isLatest,
      publishedAt: data.published_at,
      htmlUrl: data.html_url,
      zipDownloadUrl: zipAsset.browser_download_url,
      zipSize: zipAsset.size,
    };
  }

  /**
   * Download and extract the toolkit to cache directory
   */
  private async downloadAndExtract(release: PsadtReleaseInfo): Promise<string> {
    this.logger.debug('Downloading PSADT toolkit', {
      version: release.tagName,
      url: release.zipDownloadUrl,
    });

    const cacheVersionDir = join(this.cacheDirectory, release.tagName);

    // Clean up existing cache for this version
    if (existsSync(cacheVersionDir)) {
      rmSync(cacheVersionDir, { recursive: true, force: true });
    }
    mkdirSync(cacheVersionDir, { recursive: true });

    // Download ZIP to temp file
    const tempZipPath = join(this.cacheDirectory, `${release.tagName}.zip`);

    try {
      await this.downloadFile(release.zipDownloadUrl, tempZipPath);

      // Extract ZIP
      await this.extractZip(tempZipPath, cacheVersionDir);

      return cacheVersionDir;
    } finally {
      // Clean up temp ZIP
      if (existsSync(tempZipPath)) {
        try {
          rmSync(tempZipPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Download a file from URL to local path
   */
  private async downloadFile(url: string, outputPath: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'intune-packaging-assistant-mcp/1.0',
          ...(this.githubToken ? { Authorization: `Bearer ${this.githubToken}` } : {}),
        },
      });

      if (!response.ok) {
        throw new DownloadError(
          `Failed to download PSADT toolkit: HTTP ${response.status} ${response.statusText}`,
          url,
          response.status
        );
      }

      if (!response.body) {
        throw new DownloadError('Response has no body', url);
      }

      const fileStream = createWriteStream(outputPath);
      const reader = response.body.getReader();

      const nodeStream = new Readable({
        async read() {
          try {
            const { done, value } = await reader.read();
            if (done) {
              this.push(null);
            } else {
              this.push(value);
            }
          } catch (err) {
            this.destroy(err instanceof Error ? err : new Error(String(err)));
          }
        },
      });

      await pipeline(nodeStream, fileStream);

      this.logger.debug('ZIP download completed', { outputPath });
    } catch (error) {
      if (error instanceof DownloadError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new DownloadError(
          `Download timed out after ${DOWNLOAD_TIMEOUT_MS / 1000} seconds. ` +
            'For slow connections, download manually from GitHub.',
          url
        );
      }

      throw new DownloadError(
        `Download failed: ${error instanceof Error ? error.message : String(error)}`,
        url
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Extract ZIP archive
   */
  private async extractZip(zipPath: string, outputDir: string): Promise<void> {
    const { execSync } = await import('node:child_process');

    this.logger.debug('Extracting ZIP archive', { zipPath, outputDir });

    try {
      if (process.platform === 'win32') {
        // Use PowerShell Expand-Archive on Windows
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
        `Failed to extract PSADT toolkit: ${error instanceof Error ? error.message : String(error)}`,
        zipPath
      );
    }
  }

  /**
   * Copy toolkit files from cache to output directory
   */
  private async copyToolkitToOutput(
    cachePath: string,
    outputDirectory: string,
    includeExtensions?: boolean
  ): Promise<string[]> {
    this.logger.debug('Copying toolkit files to output', { cachePath, outputDirectory });

    const files: string[] = [];

    // Find the toolkit root directory (may have version prefix)
    const entries = readdirSync(cachePath, { withFileTypes: true });
    let toolkitRoot = cachePath;

    // Look for nested directory (e.g., PSAppDeployToolkit_v4.0.4/)
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.toLowerCase().includes('psappdeploytoolkit')) {
        const nestedPath = join(cachePath, entry.name);
        const nestedEntries = readdirSync(nestedPath);

        // Check if this contains Toolkit subdirectory
        if (nestedEntries.includes('Toolkit')) {
          toolkitRoot = join(nestedPath, 'Toolkit');
        } else if (nestedEntries.includes('PSAppDeployToolkit')) {
          toolkitRoot = nestedPath;
        }
        break;
      }
    }

    // If we couldn't find the expected structure, try to find PSAppDeployToolkit directly
    const rootEntries = readdirSync(toolkitRoot);
    if (!rootEntries.includes('PSAppDeployToolkit')) {
      // Search recursively for the module directory
      toolkitRoot = await this.findToolkitDirectory(cachePath);
    }

    this.logger.debug('Found toolkit root', { toolkitRoot });

    // Define files to copy
    const itemsToCopy = [
      'PSAppDeployToolkit',
      'Config',
      'Assets',
      'Strings',
      'Files',
      'Invoke-AppDeployToolkit.exe',
      'Invoke-AppDeployToolkit.ps1',
    ];

    if (includeExtensions) {
      itemsToCopy.push('PSAppDeployToolkit.Extensions');
    }

    // Copy each item
    for (const item of itemsToCopy) {
      const sourcePath = join(toolkitRoot, item);
      const destPath = join(outputDirectory, item);

      if (existsSync(sourcePath)) {
        const srcStat = await stat(sourcePath);

        if (srcStat.isDirectory()) {
          cpSync(sourcePath, destPath, { recursive: true });
          // Add all files in directory
          const dirFiles = await this.listFilesRecursive(destPath, item);
          files.push(...dirFiles);
        } else {
          cpSync(sourcePath, destPath);
          files.push(item);
        }
      } else if (item === 'Files') {
        // Create empty Files directory if it doesn't exist
        mkdirSync(destPath, { recursive: true });
        files.push('Files/');
      }
    }

    return files;
  }

  /**
   * Find the toolkit directory recursively
   */
  private async findToolkitDirectory(searchPath: string, depth = 0): Promise<string> {
    if (depth > 3) {
      throw new ExtractionError(
        'Could not locate PSAppDeployToolkit module in extracted archive. The release structure may have changed.',
        searchPath
      );
    }

    const entries = readdirSync(searchPath, { withFileTypes: true });

    // Check if PSAppDeployToolkit directory exists here
    if (entries.some(e => e.isDirectory() && e.name === 'PSAppDeployToolkit')) {
      return searchPath;
    }

    // Search subdirectories
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = join(searchPath, entry.name);
        try {
          return await this.findToolkitDirectory(subPath, depth + 1);
        } catch {
          // Continue searching
        }
      }
    }

    throw new ExtractionError(
      'Could not locate PSAppDeployToolkit module in extracted archive',
      searchPath
    );
  }

  /**
   * List all files in a directory recursively
   */
  private async listFilesRecursive(dir: string, prefix: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(prefix, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.listFilesRecursive(join(dir, entry.name), fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Fetch with GitHub authentication if available
   */
  private async fetchWithAuth(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'intune-packaging-assistant-mcp/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (this.githubToken) {
      headers.Authorization = `Bearer ${this.githubToken}`;
    }

    return fetch(url, { headers });
  }
}

// Singleton instance
let psadtDownloadService: PsadtDownloadService | undefined;

export function getPsadtDownloadService(): PsadtDownloadService {
  if (!psadtDownloadService) {
    psadtDownloadService = new PsadtDownloadService();
  }
  return psadtDownloadService;
}
