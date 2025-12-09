import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { getCacheManager } from '../cache/lru-cache.js';
import { getLogger } from '../utils/logger.js';
import { GithubApiError } from '../utils/errors.js';
import { loadConfig } from '../config/loader.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GITHUB_API_BASE = 'https://api.github.com';
const WINGET_REPO = 'microsoft/winget-pkgs';
const MANIFEST_BASE_PATH = 'manifests';
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MANIFEST_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
export class WingetService {
    logger;
    searchCache;
    manifestCache;
    silentArgsDb;
    githubToken;
    constructor() {
        this.logger = getLogger().child({ service: 'winget' });
        const cacheManager = getCacheManager();
        this.searchCache = cacheManager.getSearchCache();
        this.manifestCache = cacheManager.getManifestCache();
        this.silentArgsDb = this.loadSilentArgsDatabase();
        const config = loadConfig();
        this.githubToken = config.github.token ?? process.env.GITHUB_TOKEN;
    }
    loadSilentArgsDatabase() {
        try {
            const dbPath = join(__dirname, '..', 'knowledge', 'reference', 'silent-args.json');
            const content = readFileSync(dbPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            this.logger.warn('Failed to load silent args database, using empty database', {
                error: error instanceof Error ? error.message : String(error),
            });
            return { installerTypes: [], applicationOverrides: [] };
        }
    }
    async searchPackages(input) {
        const cacheKey = `search:${input.query}:${input.exactMatch ?? false}:${input.includeVersions ?? false}:${input.limit ?? 10}`;
        const cached = this.searchCache.get(cacheKey);
        if (cached) {
            this.logger.debug('Returning cached search results', { query: input.query });
            return { ...cached, cached: true };
        }
        try {
            const results = await this.searchGitHub(input);
            const output = {
                query: input.query,
                totalResults: results.length,
                results,
                cached: false,
            };
            this.searchCache.set(cacheKey, output, SEARCH_CACHE_TTL_MS);
            return output;
        }
        catch (error) {
            // Try to return stale cache on error
            const staleKey = `search:${input.query}`;
            for (const key of this.searchCache.keys()) {
                if (key.startsWith(staleKey)) {
                    const stale = this.searchCache.get(key);
                    if (stale) {
                        this.logger.warn('Returning stale cache due to API error', { query: input.query });
                        return {
                            ...stale,
                            cached: true,
                            message: 'Warning: Returning cached data due to API error. Data may be stale.',
                        };
                    }
                }
            }
            throw error;
        }
    }
    async searchGitHub(input) {
        const { query, exactMatch, includeVersions, limit = 10 } = input;
        // Build GitHub search query
        let searchQuery;
        if (exactMatch) {
            // Search for exact package ID in the path
            searchQuery = `repo:${WINGET_REPO} path:${MANIFEST_BASE_PATH} filename:installer.yaml "${query}"`;
        }
        else {
            // Broader search for package name or ID
            searchQuery = `repo:${WINGET_REPO} path:${MANIFEST_BASE_PATH} filename:installer.yaml ${query}`;
        }
        const url = `${GITHUB_API_BASE}/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${Math.min(limit * 3, 100)}`;
        const response = await this.fetchGitHub(url);
        const data = await response.json();
        // Parse results and deduplicate by package ID
        const packageMap = new Map();
        for (const item of data.items) {
            const packageInfo = this.parseManifestPath(item.path);
            if (!packageInfo)
                continue;
            const { publisher, packageName, version } = packageInfo;
            const packageId = `${publisher}.${packageName}`;
            if (exactMatch && packageId.toLowerCase() !== query.toLowerCase()) {
                continue;
            }
            const existing = packageMap.get(packageId);
            if (existing) {
                // Add version to existing entry if tracking versions
                if (includeVersions && existing.versions) {
                    existing.versions.push({ version, manifestPath: item.path });
                    // Update latest version if this is newer
                    if (this.isNewerVersion(version, existing.latestVersion)) {
                        existing.latestVersion = version;
                    }
                }
            }
            else {
                const result = {
                    packageIdentifier: packageId,
                    packageName: packageName,
                    publisher: publisher,
                    latestVersion: version,
                };
                if (includeVersions) {
                    result.versions = [{ version, manifestPath: item.path }];
                }
                packageMap.set(packageId, result);
            }
        }
        // Sort versions for each result
        if (includeVersions) {
            for (const result of packageMap.values()) {
                if (result.versions) {
                    result.versions.sort((a, b) => this.compareVersions(b.version, a.version));
                }
            }
        }
        const results = Array.from(packageMap.values()).slice(0, limit);
        // Enrich results with manifest data for better descriptions
        await Promise.all(results.map(async (result) => {
            try {
                const manifest = await this.getManifest(result.packageIdentifier, result.latestVersion);
                if (manifest) {
                    result.description = manifest.shortDescription;
                    result.moniker = manifest.moniker;
                    result.tags = manifest.tags;
                }
            }
            catch {
                // Ignore errors when enriching - the basic info is sufficient
            }
        }));
        return results;
    }
    parseManifestPath(path) {
        // Path format: manifests/{first-letter}/{Publisher}/{PackageName}/{Version}/{files}
        const parts = path.split('/');
        if (parts.length < 5 || parts[0] !== MANIFEST_BASE_PATH) {
            return undefined;
        }
        // parts[1] = first letter
        // parts[2] = Publisher
        // parts[3] = PackageName (might contain dots for nested packages)
        // parts[4] = Version
        const publisher = parts[2];
        const packageName = parts[3];
        const version = parts[4];
        if (!publisher || !packageName || !version) {
            return undefined;
        }
        return { publisher, packageName, version };
    }
    async getManifest(packageId, version) {
        const cacheKey = `manifest:${packageId}:${version ?? 'latest'}`;
        const cached = this.manifestCache.get(cacheKey);
        if (cached) {
            this.logger.debug('Returning cached manifest', { packageId, version });
            return cached;
        }
        try {
            // Parse package ID
            const parts = packageId.split('.');
            if (parts.length < 2) {
                throw new Error(`Invalid package ID format: ${packageId}`);
            }
            const publisher = parts[0];
            const packageName = parts.slice(1).join('.');
            const firstLetter = publisher[0].toLowerCase();
            // If no version specified, we need to find the latest
            let targetVersion = version;
            if (!targetVersion) {
                targetVersion = await this.findLatestVersion(packageId);
                if (!targetVersion) {
                    return undefined;
                }
            }
            // Construct manifest URLs
            const basePath = `${MANIFEST_BASE_PATH}/${firstLetter}/${publisher}/${packageName}/${targetVersion}`;
            // Try to fetch the installer manifest (has most detailed info)
            const installerYamlUrl = `${GITHUB_API_BASE}/repos/${WINGET_REPO}/contents/${basePath}/${publisher}.${packageName}.installer.yaml`;
            const versionYamlUrl = `${GITHUB_API_BASE}/repos/${WINGET_REPO}/contents/${basePath}/${publisher}.${packageName}.yaml`;
            const localeYamlUrl = `${GITHUB_API_BASE}/repos/${WINGET_REPO}/contents/${basePath}/${publisher}.${packageName}.locale.en-US.yaml`;
            // Fetch all manifests in parallel
            const [installerResponse, versionResponse, localeResponse] = await Promise.allSettled([
                this.fetchGitHubFile(installerYamlUrl),
                this.fetchGitHubFile(versionYamlUrl),
                this.fetchGitHubFile(localeYamlUrl),
            ]);
            // Parse manifests
            let installerManifest;
            let versionManifest;
            let localeManifest;
            if (installerResponse.status === 'fulfilled' && installerResponse.value) {
                installerManifest = parseYaml(installerResponse.value);
            }
            if (versionResponse.status === 'fulfilled' && versionResponse.value) {
                versionManifest = parseYaml(versionResponse.value);
            }
            if (localeResponse.status === 'fulfilled' && localeResponse.value) {
                localeManifest = parseYaml(localeResponse.value);
            }
            if (!installerManifest && !versionManifest) {
                return undefined;
            }
            // Merge manifests into unified structure
            const manifest = this.mergeManifests(packageId, targetVersion, installerManifest, versionManifest, localeManifest);
            this.manifestCache.set(cacheKey, manifest, MANIFEST_CACHE_TTL_MS);
            return manifest;
        }
        catch (error) {
            if (error instanceof GithubApiError) {
                throw error;
            }
            this.logger.error('Failed to fetch manifest', {
                packageId,
                version,
                error: error instanceof Error ? error.message : String(error),
            });
            return undefined;
        }
    }
    async findLatestVersion(packageId) {
        // Search for all versions of this package
        const searchResults = await this.searchPackages({
            query: packageId,
            exactMatch: true,
            includeVersions: true,
            limit: 1,
        });
        const firstResult = searchResults.results[0];
        if (firstResult) {
            return firstResult.latestVersion;
        }
        return undefined;
    }
    async fetchGitHubFile(url) {
        const response = await this.fetchGitHub(url);
        const data = await response.json();
        if (data.content && data.encoding === 'base64') {
            return Buffer.from(data.content, 'base64').toString('utf-8');
        }
        return undefined;
    }
    mergeManifests(packageId, version, installer, versionInfo, locale) {
        const parts = packageId.split('.');
        const publisher = parts[0] ?? '';
        const packageName = parts.slice(1).join('.');
        return {
            packageIdentifier: packageId,
            packageName: locale?.PackageName ?? versionInfo?.PackageName ?? packageName,
            packageVersion: version,
            publisher: locale?.Publisher ?? versionInfo?.Publisher ?? publisher,
            publisherUrl: locale?.PublisherUrl ?? versionInfo?.PublisherUrl,
            publisherSupportUrl: locale?.PublisherSupportUrl ?? versionInfo?.PublisherSupportUrl,
            privacyUrl: locale?.PrivacyUrl ?? versionInfo?.PrivacyUrl,
            author: locale?.Author ?? versionInfo?.Author,
            moniker: versionInfo?.Moniker,
            license: locale?.License ?? versionInfo?.License,
            licenseUrl: locale?.LicenseUrl ?? versionInfo?.LicenseUrl,
            copyright: locale?.Copyright ?? versionInfo?.Copyright,
            copyrightUrl: locale?.CopyrightUrl ?? versionInfo?.CopyrightUrl,
            shortDescription: locale?.ShortDescription ?? versionInfo?.ShortDescription,
            description: locale?.Description ?? versionInfo?.Description,
            tags: locale?.Tags ?? versionInfo?.Tags,
            releaseNotes: locale?.ReleaseNotes ?? versionInfo?.ReleaseNotes,
            releaseNotesUrl: locale?.ReleaseNotesUrl ?? versionInfo?.ReleaseNotesUrl,
            defaultLocale: versionInfo?.DefaultLocale,
            installers: (installer?.Installers ?? []).map((inst) => this.parseInstaller(inst)),
        };
    }
    parseInstaller(raw) {
        return {
            architecture: (raw.Architecture?.toLowerCase() ?? 'x64'),
            installerType: this.normalizeInstallerType(raw.InstallerType),
            installerUrl: raw.InstallerUrl ?? '',
            installerSha256: raw.InstallerSha256,
            scope: raw.Scope?.toLowerCase(),
            installerSwitches: raw.InstallerSwitches
                ? {
                    silent: raw.InstallerSwitches.Silent,
                    silentWithProgress: raw.InstallerSwitches.SilentWithProgress,
                    interactive: raw.InstallerSwitches.Interactive,
                    installLocation: raw.InstallerSwitches.InstallLocation,
                    log: raw.InstallerSwitches.Log,
                    upgrade: raw.InstallerSwitches.Upgrade,
                    custom: raw.InstallerSwitches.Custom,
                }
                : undefined,
            productCode: raw.ProductCode,
            upgradeBehavior: raw.UpgradeBehavior,
            installerLocale: raw.InstallerLocale,
            platform: raw.Platform,
            minimumOsVersion: raw.MinimumOSVersion,
            nestedInstallerType: raw.NestedInstallerType
                ? this.normalizeInstallerType(raw.NestedInstallerType)
                : undefined,
            nestedInstallerFiles: raw.NestedInstallerFiles?.map((f) => ({
                relativeFilePath: f.RelativeFilePath,
            })),
        };
    }
    normalizeInstallerType(type) {
        if (!type)
            return 'unknown';
        const normalized = type.toLowerCase();
        const typeMap = {
            msi: 'msi',
            msix: 'msix',
            appx: 'msix',
            exe: 'exe',
            zip: 'zip',
            inno: 'inno',
            nullsoft: 'nullsoft',
            nsis: 'nullsoft',
            wix: 'wix',
            burn: 'burn',
            portable: 'portable',
        };
        return typeMap[normalized] ?? 'unknown';
    }
    async getSilentInstallArgs(input) {
        const { packageId, installerType, installerUrl } = input;
        let detectedType = installerType ?? 'unknown';
        let manifest;
        // If package ID provided, try to get manifest
        if (packageId) {
            try {
                manifest = await this.getManifest(packageId);
                const firstInstaller = manifest?.installers?.[0];
                if (firstInstaller) {
                    detectedType = firstInstaller.installerType;
                }
            }
            catch {
                // Continue without manifest
            }
        }
        // Check for application-specific overrides first
        if (packageId) {
            const override = this.silentArgsDb.applicationOverrides.find((o) => o.packageId.toLowerCase() === packageId.toLowerCase());
            if (override) {
                return {
                    packageId,
                    installerType: detectedType,
                    args: {
                        silent: override.silent,
                        silentWithProgress: override.silentWithProgress,
                        log: override.log,
                        uninstall: override.uninstall,
                        confidence: 'high',
                        source: 'known_installer',
                        installerType: detectedType,
                        notes: override.notes,
                    },
                    cached: false,
                };
            }
        }
        // Check if manifest has silent switches
        const manifestInstaller = manifest?.installers?.[0];
        if (manifestInstaller?.installerSwitches?.silent) {
            return {
                packageId,
                installerType: manifestInstaller.installerType,
                args: {
                    silent: manifestInstaller.installerSwitches.silent,
                    silentWithProgress: manifestInstaller.installerSwitches.silentWithProgress,
                    log: manifestInstaller.installerSwitches.log,
                    confidence: 'verified',
                    source: 'winget',
                    installerType: manifestInstaller.installerType,
                    notes: 'Arguments from Winget manifest',
                },
                cached: false,
            };
        }
        // Try to detect installer type from URL if not specified
        if (detectedType === 'unknown' && installerUrl) {
            detectedType = this.detectInstallerTypeFromUrl(installerUrl);
        }
        // Look up by installer type
        const typeArgs = this.silentArgsDb.installerTypes.find((t) => t.type === detectedType);
        if (typeArgs) {
            return {
                packageId,
                installerType: detectedType,
                args: {
                    silent: typeArgs.silent,
                    silentWithProgress: typeArgs.silentWithProgress,
                    log: typeArgs.log,
                    uninstall: typeArgs.uninstall,
                    confidence: detectedType !== 'unknown' ? 'high' : 'medium',
                    source: 'known_installer',
                    installerType: detectedType,
                    notes: typeArgs.notes,
                },
                cached: false,
            };
        }
        // Fallback for completely unknown installers
        return {
            packageId,
            installerType: detectedType,
            args: {
                silent: '/S /silent /quiet /q',
                confidence: 'low',
                source: 'fallback',
                installerType: 'unknown',
                notes: 'Generic fallback arguments. Test these carefully as they may not work for all installers.',
            },
            cached: false,
        };
    }
    detectInstallerTypeFromUrl(url) {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.endsWith('.msi'))
            return 'msi';
        if (lowerUrl.endsWith('.msix') || lowerUrl.endsWith('.appx'))
            return 'msix';
        if (lowerUrl.endsWith('.zip'))
            return 'zip';
        // Check for known patterns in filename
        if (lowerUrl.includes('innosetup') || lowerUrl.includes('inno'))
            return 'inno';
        if (lowerUrl.includes('nsis') || lowerUrl.includes('nullsoft'))
            return 'nullsoft';
        if (lowerUrl.endsWith('.exe'))
            return 'exe';
        return 'unknown';
    }
    async fetchGitHub(url) {
        const headers = {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'intune-packaging-assistant-mcp',
        };
        if (this.githubToken) {
            headers['Authorization'] = `Bearer ${this.githubToken}`;
        }
        this.logger.debug('Fetching from GitHub', { url });
        const response = await fetch(url, { headers });
        if (response.status === 403) {
            const remaining = response.headers.get('X-RateLimit-Remaining');
            const reset = response.headers.get('X-RateLimit-Reset');
            if (remaining === '0') {
                const resetDate = reset ? new Date(parseInt(reset) * 1000).toISOString() : 'unknown';
                throw new GithubApiError(`GitHub API rate limit exceeded. Resets at ${resetDate}. Configure a GitHub PAT token (GITHUB_TOKEN env var) for higher limits.`, 429, { remaining, reset: resetDate });
            }
        }
        if (response.status === 404) {
            throw new GithubApiError('Resource not found in Winget repository', 404);
        }
        if (!response.ok) {
            throw new GithubApiError(`GitHub API error: ${response.statusText}`, response.status);
        }
        return response;
    }
    isNewerVersion(a, b) {
        return this.compareVersions(a, b) > 0;
    }
    compareVersions(a, b) {
        const partsA = a.split(/[.\-]/).map((p) => parseInt(p, 10) || 0);
        const partsB = b.split(/[.\-]/).map((p) => parseInt(p, 10) || 0);
        const maxLength = Math.max(partsA.length, partsB.length);
        for (let i = 0; i < maxLength; i++) {
            const numA = partsA[i] ?? 0;
            const numB = partsB[i] ?? 0;
            if (numA > numB)
                return 1;
            if (numA < numB)
                return -1;
        }
        return 0;
    }
}
// Singleton instance
let wingetService;
export function getWingetService() {
    if (!wingetService) {
        wingetService = new WingetService();
    }
    return wingetService;
}
//# sourceMappingURL=winget.js.map