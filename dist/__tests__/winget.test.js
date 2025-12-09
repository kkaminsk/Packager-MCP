import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WingetService } from '../services/winget.js';
import { initCacheManager } from '../cache/lru-cache.js';
import { initLogger } from '../utils/logger.js';
// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;
// Initialize dependencies before tests
const cacheConfig = {
    maxSize: 100,
    defaultTtlMs: 1000,
    manifestTtlMs: 2000,
    searchTtlMs: 500,
};
// Mock the config loader
vi.mock('../config/loader.js', () => ({
    loadConfig: () => ({
        name: 'test',
        version: '1.0.0',
        cache: cacheConfig,
        logging: { level: 'error', format: 'json' },
        github: { rateLimitRetries: 3 },
    }),
    getConfigLoader: () => ({
        load: () => ({}),
        getConfig: () => ({
            name: 'test',
            version: '1.0.0',
            cache: cacheConfig,
            logging: { level: 'error', format: 'json' },
            github: { rateLimitRetries: 3 },
        }),
    }),
}));
describe('WingetService', () => {
    let service;
    beforeEach(() => {
        initLogger({ level: 'error', format: 'json' });
        initCacheManager(cacheConfig);
        mockFetch.mockReset();
        service = new WingetService();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('getSilentInstallArgs', () => {
        it('should return high confidence args from application overrides', async () => {
            const result = await service.getSilentInstallArgs({
                packageId: 'Google.Chrome',
            });
            expect(result.packageId).toBe('Google.Chrome');
            expect(result.args.confidence).toBe('high');
            expect(result.args.source).toBe('known_installer');
            expect(result.args.silent).toContain('/silent');
        });
        it('should return high confidence args for known MSI installer type', async () => {
            const result = await service.getSilentInstallArgs({
                installerType: 'msi',
            });
            expect(result.installerType).toBe('msi');
            expect(result.args.confidence).toBe('high');
            expect(result.args.silent).toBe('/qn /norestart');
        });
        it('should return high confidence args for NSIS/Nullsoft installer type', async () => {
            const result = await service.getSilentInstallArgs({
                installerType: 'nullsoft',
            });
            expect(result.installerType).toBe('nullsoft');
            expect(result.args.confidence).toBe('high');
            expect(result.args.silent).toBe('/S');
        });
        it('should return high confidence args for Inno Setup installer type', async () => {
            const result = await service.getSilentInstallArgs({
                installerType: 'inno',
            });
            expect(result.installerType).toBe('inno');
            expect(result.args.confidence).toBe('high');
            expect(result.args.silent).toContain('/VERYSILENT');
        });
        it('should detect MSI type from installer URL', async () => {
            const result = await service.getSilentInstallArgs({
                installerUrl: 'https://example.com/installer.msi',
            });
            expect(result.installerType).toBe('msi');
            expect(result.args.confidence).toBe('high');
            expect(result.args.silent).toBe('/qn /norestart');
        });
        it('should detect MSIX type from installer URL', async () => {
            const result = await service.getSilentInstallArgs({
                installerUrl: 'https://example.com/app.msix',
            });
            expect(result.installerType).toBe('msix');
            expect(result.args.confidence).toBe('high');
        });
        it('should return low confidence fallback for unknown types', async () => {
            const result = await service.getSilentInstallArgs({
                installerUrl: 'https://example.com/unknown-installer.bin',
            });
            expect(result.args.confidence).toBe('low');
            expect(result.args.source).toBe('fallback');
        });
        it('should include uninstall args when available', async () => {
            const result = await service.getSilentInstallArgs({
                installerType: 'msi',
            });
            expect(result.args.uninstall).toBeDefined();
            expect(result.args.uninstall).toContain('/x');
        });
        it('should include log args when available', async () => {
            const result = await service.getSilentInstallArgs({
                installerType: 'msi',
            });
            expect(result.args.log).toBeDefined();
            expect(result.args.log).toContain('/l*v');
        });
    });
    describe('searchPackages', () => {
        it('should return cached results on subsequent calls', async () => {
            const mockSearchResponse = {
                total_count: 1,
                incomplete_results: false,
                items: [
                    {
                        name: 'Google.Chrome.installer.yaml',
                        path: 'manifests/g/Google/Chrome/120.0.0.0/Google.Chrome.installer.yaml',
                        sha: 'abc123',
                        url: 'https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/g/Google/Chrome/120.0.0.0/Google.Chrome.installer.yaml',
                        html_url: 'https://github.com/microsoft/winget-pkgs/blob/master/manifests/g/Google/Chrome/120.0.0.0/Google.Chrome.installer.yaml',
                        repository: { full_name: 'microsoft/winget-pkgs' },
                    },
                ],
            };
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockSearchResponse),
                headers: new Headers(),
            });
            // First call - should hit API (1 for search + 3 for manifest enrichment per result)
            const result1 = await service.searchPackages({ query: 'Chrome' });
            expect(result1.cached).toBe(false);
            const firstCallCount = mockFetch.mock.calls.length;
            expect(firstCallCount).toBeGreaterThan(0);
            // Second call - should return cached (no new fetch calls)
            const result2 = await service.searchPackages({ query: 'Chrome' });
            expect(result2.cached).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(firstCallCount); // No additional calls
        });
        it('should handle empty search results', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ total_count: 0, incomplete_results: false, items: [] }),
                headers: new Headers(),
            });
            const result = await service.searchPackages({ query: 'nonexistent-package-xyz' });
            expect(result.totalResults).toBe(0);
            expect(result.results).toHaveLength(0);
        });
        it('should handle rate limit errors', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                headers: new Headers({
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
                }),
            });
            await expect(service.searchPackages({ query: 'Chrome' })).rejects.toThrow('rate limit');
        });
        it('should parse manifest paths correctly', async () => {
            const mockSearchResponse = {
                total_count: 2,
                incomplete_results: false,
                items: [
                    {
                        name: 'Google.Chrome.installer.yaml',
                        path: 'manifests/g/Google/Chrome/120.0.0.0/Google.Chrome.installer.yaml',
                        sha: 'abc123',
                        url: 'https://api.github.com/url1',
                        html_url: 'https://github.com/url1',
                        repository: { full_name: 'microsoft/winget-pkgs' },
                    },
                    {
                        name: 'Mozilla.Firefox.installer.yaml',
                        path: 'manifests/m/Mozilla/Firefox/121.0/Mozilla.Firefox.installer.yaml',
                        sha: 'def456',
                        url: 'https://api.github.com/url2',
                        html_url: 'https://github.com/url2',
                        repository: { full_name: 'microsoft/winget-pkgs' },
                    },
                ],
            };
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockSearchResponse),
                headers: new Headers(),
            });
            const result = await service.searchPackages({ query: 'browser', limit: 10 });
            expect(result.results.length).toBeGreaterThan(0);
            const chromeResult = result.results.find(r => r.packageIdentifier === 'Google.Chrome');
            if (chromeResult) {
                expect(chromeResult.publisher).toBe('Google');
                expect(chromeResult.latestVersion).toBe('120.0.0.0');
            }
        });
        it('should respect limit parameter', async () => {
            const items = Array.from({ length: 20 }, (_, i) => ({
                name: `App${i}.installer.yaml`,
                path: `manifests/a/App${i}/App${i}/1.0.0/App${i}.App${i}.installer.yaml`,
                sha: `sha${i}`,
                url: `https://api.github.com/url${i}`,
                html_url: `https://github.com/url${i}`,
                repository: { full_name: 'microsoft/winget-pkgs' },
            }));
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ total_count: 20, incomplete_results: false, items }),
                headers: new Headers(),
            });
            const result = await service.searchPackages({ query: 'App', limit: 5 });
            expect(result.results.length).toBeLessThanOrEqual(5);
        });
    });
    describe('getManifest', () => {
        it('should return undefined when no manifest files are found', async () => {
            // When all manifest files return 404, Promise.allSettled catches them
            // and the method returns undefined (no installer or version manifest found)
            mockFetch.mockImplementation(async () => {
                throw new Error('Not found');
            });
            // The service returns undefined when no manifests can be fetched
            const result = await service.getManifest('Nonexistent.Package', '1.0.0');
            expect(result).toBeUndefined();
        });
        it('should parse and merge manifest files correctly', async () => {
            const installerYaml = `
PackageIdentifier: Test.App
PackageVersion: 1.0.0
Installers:
  - Architecture: x64
    InstallerType: msi
    InstallerUrl: https://example.com/installer.msi
    InstallerSha256: abc123
    InstallerSwitches:
      Silent: /qn
`;
            const versionYaml = `
PackageIdentifier: Test.App
PackageVersion: 1.0.0
DefaultLocale: en-US
Moniker: testapp
`;
            const localeYaml = `
PackageIdentifier: Test.App
PackageVersion: 1.0.0
PackageLocale: en-US
PackageName: Test Application
Publisher: Test Publisher
ShortDescription: A test application
`;
            // Mock fetch to return different content for different URLs
            mockFetch.mockImplementation(async (url) => {
                if (url.includes('installer.yaml')) {
                    return {
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({
                            content: Buffer.from(installerYaml).toString('base64'),
                            encoding: 'base64',
                        }),
                        headers: new Headers(),
                    };
                }
                else if (url.includes('.locale.en-US.yaml')) {
                    return {
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({
                            content: Buffer.from(localeYaml).toString('base64'),
                            encoding: 'base64',
                        }),
                        headers: new Headers(),
                    };
                }
                else if (url.includes('.yaml') && !url.includes('installer') && !url.includes('locale')) {
                    return {
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({
                            content: Buffer.from(versionYaml).toString('base64'),
                            encoding: 'base64',
                        }),
                        headers: new Headers(),
                    };
                }
                return {
                    ok: false,
                    status: 404,
                    statusText: 'Not Found',
                    headers: new Headers(),
                };
            });
            const manifest = await service.getManifest('Test.App', '1.0.0');
            expect(manifest).toBeDefined();
            expect(manifest?.packageIdentifier).toBe('Test.App');
            expect(manifest?.packageVersion).toBe('1.0.0');
            expect(manifest?.packageName).toBe('Test Application');
            expect(manifest?.publisher).toBe('Test Publisher');
            expect(manifest?.shortDescription).toBe('A test application');
            expect(manifest?.installers).toHaveLength(1);
            expect(manifest?.installers[0]?.installerType).toBe('msi');
            expect(manifest?.installers[0]?.installerSwitches?.silent).toBe('/qn');
        });
    });
    describe('version comparison', () => {
        it('should correctly identify newer versions', async () => {
            const mockSearchResponse = {
                total_count: 3,
                incomplete_results: false,
                items: [
                    {
                        name: 'Test.App.installer.yaml',
                        path: 'manifests/t/Test/App/1.0.0/Test.App.installer.yaml',
                        sha: 'abc1',
                        url: 'https://api.github.com/url1',
                        html_url: 'https://github.com/url1',
                        repository: { full_name: 'microsoft/winget-pkgs' },
                    },
                    {
                        name: 'Test.App.installer.yaml',
                        path: 'manifests/t/Test/App/2.0.0/Test.App.installer.yaml',
                        sha: 'abc2',
                        url: 'https://api.github.com/url2',
                        html_url: 'https://github.com/url2',
                        repository: { full_name: 'microsoft/winget-pkgs' },
                    },
                    {
                        name: 'Test.App.installer.yaml',
                        path: 'manifests/t/Test/App/1.5.0/Test.App.installer.yaml',
                        sha: 'abc3',
                        url: 'https://api.github.com/url3',
                        html_url: 'https://github.com/url3',
                        repository: { full_name: 'microsoft/winget-pkgs' },
                    },
                ],
            };
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockSearchResponse),
                headers: new Headers(),
            });
            const result = await service.searchPackages({
                query: 'Test.App',
                exactMatch: true,
                includeVersions: true,
            });
            const testApp = result.results.find(r => r.packageIdentifier === 'Test.App');
            expect(testApp).toBeDefined();
            expect(testApp?.latestVersion).toBe('2.0.0');
            expect(testApp?.versions).toHaveLength(3);
            // Versions should be sorted descending
            expect(testApp?.versions?.[0]?.version).toBe('2.0.0');
            expect(testApp?.versions?.[1]?.version).toBe('1.5.0');
            expect(testApp?.versions?.[2]?.version).toBe('1.0.0');
        });
    });
});
describe('Silent Args Database', () => {
    let service;
    beforeEach(() => {
        initLogger({ level: 'error', format: 'json' });
        initCacheManager(cacheConfig);
        mockFetch.mockReset();
        service = new WingetService();
    });
    it('should have entries for common installer types', async () => {
        const types = [
            'msi', 'nullsoft', 'inno', 'wix', 'burn', 'msix', 'zip'
        ];
        for (const type of types) {
            const result = await service.getSilentInstallArgs({ installerType: type });
            expect(result.args.silent).toBeDefined();
            expect(result.args.silent.length).toBeGreaterThan(0);
        }
    });
    it('should have application overrides for popular apps', async () => {
        const popularApps = [
            'Google.Chrome',
            'Mozilla.Firefox',
            '7zip.7zip',
            'Microsoft.VisualStudioCode',
            'Git.Git',
        ];
        for (const packageId of popularApps) {
            const result = await service.getSilentInstallArgs({ packageId });
            expect(result.args.confidence).toBe('high');
            expect(result.args.source).toBe('known_installer');
        }
    });
});
//# sourceMappingURL=winget.test.js.map