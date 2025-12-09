/**
 * Integration tests for InstallerDownloadService
 *
 * These tests make real network requests to download actual installers.
 * Run manually with: npm run test -- --run download.integration
 *
 * Skip in CI with: npm run test -- --exclude download.integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { InstallerDownloadService } from '../services/download.js';
import { initCacheManager } from '../cache/lru-cache.js';
import { initLogger } from '../utils/logger.js';

// Skip if CI environment
const shouldSkip = process.env.CI === 'true' || process.env.SKIP_INTEGRATION === 'true';

describe.skipIf(shouldSkip)('InstallerDownloadService Integration', () => {
  let service: InstallerDownloadService;
  let testDir: string;

  beforeAll(() => {
    initLogger({ level: 'info', format: 'text' });
    initCacheManager({
      maxSize: 100,
      defaultTtlMs: 60000,
      manifestTtlMs: 60000,
      searchTtlMs: 60000,
    });
    service = new InstallerDownloadService();

    // Create temp test directory
    testDir = join(tmpdir(), `mcp-download-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should download a small portable application', async () => {
    // Using a small portable app for fast testing
    // This test downloads a real file and verifies integrity
    const result = await service.downloadInstaller({
      packageId: 'jqlang.jq', // jq is a lightweight JSON processor
      outputDirectory: testDir,
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBeDefined();
    expect(existsSync(result.filePath)).toBe(true);
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.sha256).toMatch(/^[A-F0-9]{64}$/);
    expect(result.verified).toBe(true);
    expect(result.packageId).toBe('jqlang.jq');

    // Verify file exists and size matches
    const stats = statSync(result.filePath);
    expect(stats.size).toBe(result.fileSize);
  }, 120000); // 2 minute timeout for download

  it('should handle version specification', async () => {
    const result = await service.downloadInstaller({
      packageId: 'jqlang.jq',
      version: '1.7.1',
      outputDirectory: testDir,
      outputFilename: 'jq-specific-version.exe',
    });

    expect(result.success).toBe(true);
    expect(result.packageVersion).toBe('1.7.1');
    expect(result.fileName).toBe('jq-specific-version.exe');
  }, 120000);

  it('should handle architecture preference', async () => {
    const result = await service.downloadInstaller({
      packageId: 'jqlang.jq',
      architecture: 'x64',
      outputDirectory: testDir,
      outputFilename: 'jq-x64.exe',
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toContain('jq-x64.exe');
  }, 120000);
});
