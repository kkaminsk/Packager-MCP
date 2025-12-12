// Tests for MCP Prompts and Workflows

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the services
vi.mock('../services/winget.js', () => ({
  getWingetService: () => ({
    searchPackages: vi.fn().mockResolvedValue({
      query: 'chrome',
      totalResults: 1,
      results: [
        {
          packageIdentifier: 'Google.Chrome',
          packageName: 'Google Chrome',
          publisher: 'Google',
          latestVersion: '120.0.6099.109',
          description: 'Fast and secure web browser',
        },
      ],
      cached: false,
    }),
    getManifest: vi.fn().mockResolvedValue({
      packageIdentifier: 'Google.Chrome',
      packageName: 'Google Chrome',
      packageVersion: '120.0.6099.109',
      publisher: 'Google',
      installers: [
        {
          architecture: 'x64',
          installerType: 'exe',
          installerUrl: 'https://example.com/chrome.exe',
          installerSwitches: {
            silent: '/silent /install',
          },
        },
      ],
    }),
    getSilentInstallArgs: vi.fn().mockResolvedValue({
      packageId: 'Google.Chrome',
      installerType: 'exe',
      args: {
        silent: '/silent /install',
        confidence: 'verified',
        source: 'winget',
        installerType: 'exe',
      },
      cached: false,
    }),
  }),
}));

vi.mock('../services/psadt.js', () => ({
  getPsadtService: () => ({
    generateTemplate: vi.fn().mockResolvedValue({
      success: true,
      template: {
        script: '# PSADT Script\nparam()',
        files: [],
        customizationPoints: [],
        metadata: {
          complexity: 'standard',
          installerType: 'exe',
          psadtVersion: '4.1.7',
          generatedAt: '2024-01-01T00:00:00.000Z',
          templateVersion: '1.0.0',
        },
      },
      recommendations: ['Test the deployment'],
    }),
  }),
}));

vi.mock('../services/validation.js', () => ({
  getValidationService: () => ({
    validatePackage: vi.fn().mockResolvedValue({
      success: true,
      result: {
        isValid: true,
        score: 90,
        totalIssues: 1,
        errorCount: 0,
        warningCount: 1,
        infoCount: 0,
        issues: [
          {
            ruleId: 'test-warning',
            ruleName: 'Test Warning',
            severity: 'warning',
            category: 'best-practice',
            message: 'Test warning message',
          },
        ],
        passedChecks: [],
        summary: 'Validation passed with 1 warning',
        level: 'standard',
        environment: 'intune',
        categoriesChecked: ['structure'],
      },
    }),
  }),
}));

vi.mock('../services/detection.js', () => ({
  getDetectionService: () => ({
    generateDetection: vi.fn().mockResolvedValue({
      success: true,
      detectionMethod: 'PowerShell script detection',
      configuration: {
        type: 'script',
        details: { applicationName: 'Google Chrome' },
      },
      intuneJson: null,
      powershellScript: '# Detection script',
      recommendations: ['Test detection'],
    }),
    recommendDetectionType: vi.fn().mockReturnValue({
      recommended: 'script',
      reason: 'Default recommendation',
      alternatives: [],
    }),
  }),
}));

vi.mock('../utils/logger.js', () => ({
  getLogger: () => ({
    child: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  initLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  }),
}));

// Import after mocking
import {
  parsePackageAppArgs,
  executePackageAppWorkflow,
  formatPackageAppResult,
} from '../workflows/package-app.js';

import {
  parseConvertLegacyArgs,
  executeConvertLegacyWorkflow,
  formatConvertLegacyResult,
} from '../workflows/convert-legacy.js';

import {
  parseTroubleshootArgs,
  executeTroubleshootWorkflow,
  formatTroubleshootResult,
} from '../workflows/troubleshoot.js';

import {
  parseBulkLookupArgs,
  executeBulkLookupWorkflow,
  formatBulkLookupResult,
} from '../workflows/bulk-lookup.js';

describe('Argument Parsing', () => {
  describe('parsePackageAppArgs', () => {
    it('should parse application name', () => {
      const result = parsePackageAppArgs({ 'application-name': 'Chrome' });
      expect(result.applicationName).toBe('Chrome');
    });

    it('should parse quick flag', () => {
      const result = parsePackageAppArgs({
        'application-name': 'Chrome',
        quick: 'true',
      });
      expect(result.quick).toBe(true);
    });

    it('should parse complexity', () => {
      const result = parsePackageAppArgs({
        'application-name': 'Chrome',
        complexity: 'advanced',
      });
      expect(result.complexity).toBe('advanced');
    });
  });

  describe('parseConvertLegacyArgs', () => {
    it('should parse script content', () => {
      const result = parseConvertLegacyArgs({ script: 'Execute-Process -Path test.exe' });
      expect(result.scriptPathOrContent).toBe('Execute-Process -Path test.exe');
    });

    it('should parse verbose flag', () => {
      const result = parseConvertLegacyArgs({
        script: 'test',
        verbose: 'true',
      });
      expect(result.verbose).toBe(true);
    });
  });

  describe('parseTroubleshootArgs', () => {
    it('should parse error code', () => {
      const result = parseTroubleshootArgs({ 'error-code': '1603' });
      expect(result.errorCode).toBe(1603);
    });

    it('should parse log file path', () => {
      const result = parseTroubleshootArgs({ 'log-file': 'C:\\logs\\install.log' });
      expect(result.logFile).toBe('C:\\logs\\install.log');
    });

    it('should parse installer type', () => {
      const result = parseTroubleshootArgs({ 'installer-type': 'msi' });
      expect(result.installerType).toBe('msi');
    });
  });

  describe('parseBulkLookupArgs', () => {
    it('should parse applications list', () => {
      const result = parseBulkLookupArgs({ applications: 'Chrome, Firefox, Edge' });
      expect(result.applications).toBe('Chrome, Firefox, Edge');
    });

    it('should parse output format', () => {
      const result = parseBulkLookupArgs({
        applications: 'Chrome',
        output: 'json',
      });
      expect(result.output).toBe('json');
    });
  });
});

describe('Package App Workflow', () => {
  it('should execute successfully with valid application', async () => {
    const result = await executePackageAppWorkflow({
      applicationName: 'Chrome',
    });

    expect(result.status).toBe('success');
    expect(result.lookup.found).toBe(true);
    expect(result.lookup.packageId).toBe('Google.Chrome');
    expect(result.script).toBeDefined();
    expect(result.detection).toBeDefined();
  });

  it('should handle workflow with empty application name', async () => {
    const result = await executePackageAppWorkflow({
      applicationName: '',
    });

    // Empty application name should result in error
    expect(result.status).toBe('error');
    expect(result.errors).toBeDefined();
  });

  it('should format result as markdown', async () => {
    const result = await executePackageAppWorkflow({
      applicationName: 'Chrome',
    });

    const formatted = formatPackageAppResult(result);

    expect(formatted).toContain('Package Creation');
    expect(typeof formatted).toBe('string');
  });
});

describe('Convert Legacy Workflow', () => {
  it('should detect v3 script', async () => {
    const v3Script = `
      $appVendor = 'Test'
      $appName = 'App'
      Execute-Process -Path "setup.exe" -Parameters "/S"
      Show-InstallationWelcome
    `;

    const result = await executeConvertLegacyWorkflow({
      scriptPathOrContent: v3Script,
    });

    expect(result.analysis.detectedVersion).toBe('v3');
    expect(result.analysis.functionMappings.length).toBeGreaterThan(0);
  });

  it('should detect v4 script', async () => {
    const v4Script = `
      Import-Module PSAppDeployToolkit
      $adtSession = Open-ADTSession @sessionParams -PassThru
      Start-ADTProcess -FilePath "setup.exe" -ArgumentList "/S"
      Close-ADTSession
    `;

    const result = await executeConvertLegacyWorkflow({
      scriptPathOrContent: v4Script,
    });

    expect(result.analysis.detectedVersion).toBe('v4');
    expect(result.status).toBe('partial'); // Already v4
  });

  it('should map legacy functions', async () => {
    const v3Script = `
      Execute-Process -Path "test.exe"
      Show-InstallationWelcome
      Write-Log -Message "Test"
    `;

    const result = await executeConvertLegacyWorkflow({
      scriptPathOrContent: v3Script,
    });

    const functionNames = result.analysis.functionMappings.map(m => m.v3Function);
    expect(functionNames).toContain('Execute-Process');
    expect(functionNames).toContain('Show-InstallationWelcome');
    expect(functionNames).toContain('Write-Log');
  });

  it('should format result as markdown', async () => {
    const result = await executeConvertLegacyWorkflow({
      scriptPathOrContent: 'Execute-Process -Path test.exe',
    });

    const formatted = formatConvertLegacyResult(result);

    expect(formatted).toContain('PSADT Script Conversion');
    expect(typeof formatted).toBe('string');
  });
});

describe('Troubleshoot Workflow', () => {
  it('should look up MSI exit code 1603', async () => {
    const result = await executeTroubleshootWorkflow({
      errorCode: 1603,
    });

    expect(result.exitCodeInfo).toBeDefined();
    expect(result.exitCodeInfo?.code).toBe(1603);
    expect(result.exitCodeInfo?.name).toBe('ERROR_INSTALL_FAILURE');
    expect(result.causes.length).toBeGreaterThan(0);
    expect(result.fixes.length).toBeGreaterThan(0);
  });

  it('should handle PSADT exit codes', async () => {
    const result = await executeTroubleshootWorkflow({
      errorCode: 60003,
    });

    expect(result.exitCodeInfo).toBeDefined();
    expect(result.exitCodeInfo?.name).toBe('DEFER');
  });

  it('should identify causes from error message', async () => {
    const result = await executeTroubleshootWorkflow({
      errorMessage: 'Access denied while writing to C:\\Program Files',
    });

    const causeDescriptions = result.causes.map(c => c.description.toLowerCase());
    expect(causeDescriptions.some(d => d.includes('permission') || d.includes('access'))).toBe(true);
  });

  it('should format result as markdown', async () => {
    const result = await executeTroubleshootWorkflow({
      errorCode: 1603,
    });

    const formatted = formatTroubleshootResult(result);

    expect(formatted).toContain('Troubleshooting Analysis');
    expect(formatted).toContain('1603');
    expect(typeof formatted).toBe('string');
  });
});

describe('Bulk Lookup Workflow', () => {
  it('should look up multiple applications', async () => {
    const result = await executeBulkLookupWorkflow({
      applications: 'Chrome, Firefox, Edge',
    });

    expect(result.totalRequested).toBe(3);
    expect(result.results).toHaveLength(3);
  });

  it('should format as markdown by default', async () => {
    const result = await executeBulkLookupWorkflow({
      applications: 'Chrome',
    });

    expect(result.outputFormat).toBe('markdown');
    expect(result.formattedOutput).toContain('|'); // Markdown table
  });

  it('should format as CSV when requested', async () => {
    const result = await executeBulkLookupWorkflow({
      applications: 'Chrome',
      output: 'csv',
    });

    expect(result.outputFormat).toBe('csv');
    expect(result.formattedOutput).toContain(','); // CSV separator
    expect(result.formattedOutput).toContain('Query'); // Header
  });

  it('should format as JSON when requested', async () => {
    const result = await executeBulkLookupWorkflow({
      applications: 'Chrome',
      output: 'json',
    });

    expect(result.outputFormat).toBe('json');
    const parsed = JSON.parse(result.formattedOutput);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('should format result summary as markdown', async () => {
    const result = await executeBulkLookupWorkflow({
      applications: 'Chrome',
    });

    const formatted = formatBulkLookupResult(result);

    expect(formatted).toContain('Bulk Application Lookup');
    expect(formatted).toContain('Summary');
    expect(typeof formatted).toBe('string');
  });
});

describe('Workflow Result Formatting', () => {
  describe('formatPackageAppResult', () => {
    it('should include application details section', async () => {
      const result = await executePackageAppWorkflow({
        applicationName: 'Chrome',
      });

      const formatted = formatPackageAppResult(result);

      expect(formatted).toContain('Application Details');
    });

    it('should include next steps', async () => {
      const result = await executePackageAppWorkflow({
        applicationName: 'Chrome',
      });

      const formatted = formatPackageAppResult(result);

      expect(formatted).toContain('Next Steps');
    });
  });

  describe('formatConvertLegacyResult', () => {
    it('should include analysis section', async () => {
      const result = await executeConvertLegacyWorkflow({
        scriptPathOrContent: 'Execute-Process',
      });

      const formatted = formatConvertLegacyResult(result);

      expect(formatted).toContain('Analysis');
      expect(formatted).toContain('Detected Version');
    });

    it('should include checklist', async () => {
      const result = await executeConvertLegacyWorkflow({
        scriptPathOrContent: 'Execute-Process',
      });

      const formatted = formatConvertLegacyResult(result);

      expect(formatted).toContain('Migration Checklist');
    });
  });

  describe('formatTroubleshootResult', () => {
    it('should include exit code information', async () => {
      const result = await executeTroubleshootWorkflow({
        errorCode: 1618,
      });

      const formatted = formatTroubleshootResult(result);

      expect(formatted).toContain('Exit Code Information');
      expect(formatted).toContain('1618');
    });

    it('should include suggested fixes', async () => {
      const result = await executeTroubleshootWorkflow({
        errorCode: 1603,
      });

      const formatted = formatTroubleshootResult(result);

      expect(formatted).toContain('Suggested Fixes');
    });
  });
});
