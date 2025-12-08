import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PsadtDownloadService } from '../services/psadt-download.js';
import { initCacheManager } from '../cache/lru-cache.js';
import { initLogger } from '../utils/logger.js';
import { GithubApiError, DownloadError } from '../utils/errors.js';
import type { CacheConfig } from '../types/config.js';

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
    readdirSync: vi.fn().mockReturnValue([]),
    rmSync: vi.fn(),
    cpSync: vi.fn(),
  };
});

vi.mock('node:fs/promises', () => ({
  stat: vi.fn().mockResolvedValue({ size: 1024, isDirectory: () => false }),
  readdir: vi.fn().mockResolvedValue([]),
}));

vi.mock('node:stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
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
    download: {
      largeFileSizeThreshold: 500 * 1024 * 1024,
      timeoutMs: 5 * 60 * 1000,
    },
    psadt: {
      cacheTtlHours: 24,
      defaultVersion: 'latest',
    },
  }),
  getConfigLoader: () => ({
    load: () => ({}),
    getConfig: () => ({
      name: 'test',
      version: '1.0.0',
      cache: cacheConfig,
      logging: { level: 'error', format: 'json' },
      github: { rateLimitRetries: 3 },
      download: {
        largeFileSizeThreshold: 500 * 1024 * 1024,
        timeoutMs: 5 * 60 * 1000,
      },
      psadt: {
        cacheTtlHours: 24,
        defaultVersion: 'latest',
      },
    }),
  }),
}));

describe('PsadtDownloadService', () => {
  let service: PsadtDownloadService;

  const mockLatestReleaseResponse = {
    tag_name: 'v4.0.4',
    name: 'PSAppDeployToolkit v4.0.4',
    published_at: '2024-01-15T00:00:00Z',
    html_url: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases/tag/v4.0.4',
    assets: [
      {
        name: 'PSAppDeployToolkit_v4.0.4.zip',
        browser_download_url: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases/download/v4.0.4/PSAppDeployToolkit_v4.0.4.zip',
        size: 2850000,
      },
    ],
  };

  beforeEach(() => {
    initLogger({ level: 'error', format: 'json' });
    initCacheManager(cacheConfig);
    mockFetch.mockReset();
    service = new PsadtDownloadService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getLatestRelease', () => {
    it('should fetch latest release from GitHub API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLatestReleaseResponse),
      });

      const release = await service.getLatestRelease();

      expect(release.tagName).toBe('v4.0.4');
      expect(release.name).toBe('PSAppDeployToolkit v4.0.4');
      expect(release.isLatest).toBe(true);
      expect(release.zipDownloadUrl).toContain('PSAppDeployToolkit_v4.0.4.zip');
      expect(release.zipSize).toBe(2850000);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/releases/latest'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.github+json',
          }),
        })
      );
    });

    it('should throw GithubApiError on 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(service.getLatestRelease()).rejects.toThrow(GithubApiError);
    });

    it('should throw GithubApiError on rate limit (429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      try {
        await service.getLatestRelease();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GithubApiError);
        expect((error as GithubApiError).message).toMatch(/rate limit/i);
      }
    });
  });

  describe('getReleaseByVersion', () => {
    it('should fetch specific version from GitHub API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLatestReleaseResponse),
      });

      const release = await service.getReleaseByVersion('4.0.4');

      expect(release.tagName).toBe('v4.0.4');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/releases/tags/v4.0.4'),
        expect.any(Object)
      );
    });

    it('should handle version with v prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLatestReleaseResponse),
      });

      const release = await service.getReleaseByVersion('v4.0.4');

      expect(release.tagName).toBe('v4.0.4');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/releases/tags/v4.0.4'),
        expect.any(Object)
      );
    });

    it('should throw GithubApiError for non-existent version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      try {
        await service.getReleaseByVersion('99.99.99');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GithubApiError);
        expect((error as GithubApiError).message).toMatch(/not found/i);
      }
    });
  });

  describe('parseReleaseResponse', () => {
    it('should throw DownloadError when no ZIP asset found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          tag_name: 'v4.0.4',
          name: 'PSAppDeployToolkit v4.0.4',
          published_at: '2024-01-15T00:00:00Z',
          html_url: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases/tag/v4.0.4',
          assets: [], // No assets
        }),
      });

      try {
        await service.getLatestRelease();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DownloadError);
        expect((error as DownloadError).message).toMatch(/No toolkit ZIP found/i);
      }
    });

    it('should select correct ZIP asset (not template)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          tag_name: 'v4.0.4',
          name: 'PSAppDeployToolkit v4.0.4',
          published_at: '2024-01-15T00:00:00Z',
          html_url: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases/tag/v4.0.4',
          assets: [
            {
              name: 'PSAppDeployToolkit_Template.zip',
              browser_download_url: 'https://example.com/template.zip',
              size: 100000,
            },
            {
              name: 'PSAppDeployToolkit_v4.0.4.zip',
              browser_download_url: 'https://example.com/toolkit.zip',
              size: 2850000,
            },
          ],
        }),
      });

      const release = await service.getLatestRelease();

      expect(release.zipDownloadUrl).toBe('https://example.com/toolkit.zip');
      expect(release.zipSize).toBe(2850000);
    });
  });

  describe('error types', () => {
    it('should have proper GithubApiError structure for rate limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      try {
        await service.getLatestRelease();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GithubApiError);
        expect((error as GithubApiError).statusCode).toBe(429);
      }
    });

    it('should have proper GithubApiError structure for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      try {
        await service.getReleaseByVersion('99.99.99');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GithubApiError);
        expect((error as GithubApiError).statusCode).toBe(404);
      }
    });
  });
});
