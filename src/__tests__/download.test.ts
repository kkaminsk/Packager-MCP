import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { InstallerDownloadService } from '../services/download.js';
import { initCacheManager } from '../cache/lru-cache.js';
import { initLogger } from '../utils/logger.js';
import { DownloadError, HashVerificationError } from '../utils/errors.js';
import type { CacheConfig } from '../types/config.js';
import type { WingetManifest, Installer } from '../types/winget.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock fs operations
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    createWriteStream: vi.fn().mockReturnValue({
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn((event, cb) => {
        if (event === 'finish') setTimeout(cb, 0);
        return { write: vi.fn(), end: vi.fn(), on: vi.fn() };
      }),
    }),
    unlinkSync: vi.fn(),
    renameSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
  };
});

vi.mock('node:fs/promises', () => ({
  stat: vi.fn().mockResolvedValue({ size: 1024 }),
}));

vi.mock('node:stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

// Initialize dependencies before tests
const cacheConfig: CacheConfig = {
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

// Mock winget service
const mockGetManifest = vi.fn();
vi.mock('../services/winget.js', () => ({
  getWingetService: () => ({
    getManifest: mockGetManifest,
  }),
  WingetService: vi.fn(),
}));

describe('InstallerDownloadService', () => {
  let service: InstallerDownloadService;

  const createMockManifest = (overrides?: Partial<WingetManifest>): WingetManifest => ({
    packageIdentifier: 'Test.App',
    packageName: 'Test Application',
    packageVersion: '1.0.0',
    publisher: 'Test Publisher',
    installers: [
      {
        architecture: 'x64',
        installerType: 'exe',
        installerUrl: 'https://example.com/installer.exe',
        installerSha256: 'ABC123DEF456ABC123DEF456ABC123DEF456ABC123DEF456ABC123DEF456ABCD',
      } as Installer,
    ],
    ...overrides,
  });

  beforeEach(() => {
    initLogger({ level: 'error', format: 'json' });
    initCacheManager(cacheConfig);
    mockFetch.mockReset();
    mockGetManifest.mockReset();
    service = new InstallerDownloadService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('selectInstaller', () => {
    it('should select x64 installer by default', () => {
      const manifest = createMockManifest({
        installers: [
          { architecture: 'x86', installerType: 'exe', installerUrl: 'https://example.com/x86.exe' } as Installer,
          { architecture: 'x64', installerType: 'exe', installerUrl: 'https://example.com/x64.exe' } as Installer,
        ],
      });

      const result = service.selectInstaller(manifest);

      expect(result).toBeDefined();
      expect(result!.architecture).toBe('x64');
      expect(result!.installerUrl).toBe('https://example.com/x64.exe');
    });

    it('should select preferred architecture when specified', () => {
      const manifest = createMockManifest({
        installers: [
          { architecture: 'x86', installerType: 'exe', installerUrl: 'https://example.com/x86.exe' } as Installer,
          { architecture: 'x64', installerType: 'exe', installerUrl: 'https://example.com/x64.exe' } as Installer,
          { architecture: 'arm64', installerType: 'exe', installerUrl: 'https://example.com/arm64.exe' } as Installer,
        ],
      });

      const result = service.selectInstaller(manifest, 'arm64');

      expect(result).toBeDefined();
      expect(result!.architecture).toBe('arm64');
    });

    it('should fall back to x64 when preferred architecture not available', () => {
      const manifest = createMockManifest({
        installers: [
          { architecture: 'x64', installerType: 'exe', installerUrl: 'https://example.com/x64.exe' } as Installer,
        ],
      });

      const result = service.selectInstaller(manifest, 'arm64');

      expect(result).toBeDefined();
      expect(result!.architecture).toBe('x64');
    });

    it('should extract original filename from URL', () => {
      const manifest = createMockManifest({
        installers: [
          {
            architecture: 'x64',
            installerType: 'msi',
            installerUrl: 'https://example.com/downloads/MyApp_Setup_1.0.msi',
          } as Installer,
        ],
      });

      const result = service.selectInstaller(manifest);

      expect(result).toBeDefined();
      expect(result!.originalFilename).toBe('MyApp_Setup_1.0.msi');
    });

    it('should handle nested installer configuration', () => {
      const manifest = createMockManifest({
        installers: [
          {
            architecture: 'x64',
            installerType: 'zip',
            installerUrl: 'https://example.com/app.zip',
            nestedInstallerType: 'msi',
            nestedInstallerFiles: [{ relativeFilePath: 'setup/installer.msi' }],
          } as Installer,
        ],
      });

      const result = service.selectInstaller(manifest);

      expect(result).toBeDefined();
      expect(result!.nestedInstaller).toBeDefined();
      expect(result!.nestedInstaller!.nestedInstallerType).toBe('msi');
      expect(result!.nestedInstaller!.relativeFilePath).toBe('setup/installer.msi');
    });

    it('should return undefined for empty installers array', () => {
      const manifest = createMockManifest({ installers: [] });

      const result = service.selectInstaller(manifest);

      expect(result).toBeUndefined();
    });
  });

  describe('downloadInstaller', () => {
    it('should throw DownloadError when package not found', async () => {
      mockGetManifest.mockResolvedValue(undefined);

      await expect(
        service.downloadInstaller({
          packageId: 'NonExistent.Package',
          outputDirectory: 'C:\\test',
        })
      ).rejects.toThrow(DownloadError);
    });

    it('should throw DownloadError when no suitable installer found', async () => {
      mockGetManifest.mockResolvedValue(createMockManifest({ installers: [] }));

      await expect(
        service.downloadInstaller({
          packageId: 'Test.App',
          outputDirectory: 'C:\\test',
        })
      ).rejects.toThrow(DownloadError);
    });
  });

  describe('error types', () => {
    it('should have proper DownloadError structure', () => {
      const error = new DownloadError('Test message', 'https://example.com', 404);

      expect(error.message).toBe('Test message');
      expect(error.url).toBe('https://example.com');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('DOWNLOAD_ERROR');
    });

    it('should have proper HashVerificationError structure', () => {
      const error = new HashVerificationError('Hash mismatch', 'expected123', 'actual456');

      expect(error.message).toBe('Hash mismatch');
      expect(error.expectedHash).toBe('expected123');
      expect(error.actualHash).toBe('actual456');
      expect(error.code).toBe('HASH_VERIFICATION_ERROR');
    });
  });
});
