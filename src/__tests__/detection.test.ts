import { describe, it, expect, beforeEach } from 'vitest';
import {
  DetectionService,
  getDetectionService,
  resetDetectionService,
} from '../services/detection.js';
import type {
  FileDetectionInput,
  RegistryDetectionInput,
  MsiDetectionInput,
  ScriptDetectionInput,
} from '../types/intune.js';

describe('DetectionService', () => {
  let service: DetectionService;

  beforeEach(() => {
    resetDetectionService();
    service = getDetectionService();
  });

  describe('generateDetection', () => {
    it('should generate file detection rule', async () => {
      const result = await service.generateDetection({
        detectionType: 'file',
        file: {
          path: 'C:\\Program Files\\TestApp',
          fileOrFolderName: 'app.exe',
        },
      });

      expect(result.success).toBe(true);
      expect(result.detectionMethod).toContain('File');
      expect(result.configuration.type).toBe('file');
      expect(result.intuneJson).toBeDefined();
      expect(result.powershellScript).toContain('Test-Path');
    });

    it('should generate registry detection rule', async () => {
      const result = await service.generateDetection({
        detectionType: 'registry',
        registry: {
          keyPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\TestApp',
        },
      });

      expect(result.success).toBe(true);
      expect(result.detectionMethod).toContain('Registry');
      expect(result.configuration.type).toBe('registry');
      expect(result.intuneJson).toBeDefined();
      expect(result.powershellScript).toContain('Test-Path');
    });

    it('should generate MSI detection rule', async () => {
      const result = await service.generateDetection({
        detectionType: 'msi',
        msi: {
          productCode: '{12345678-1234-1234-1234-123456789012}',
        },
      });

      expect(result.success).toBe(true);
      expect(result.detectionMethod).toContain('MSI');
      expect(result.configuration.type).toBe('msi');
      expect(result.intuneJson).toBeDefined();
      expect(result.powershellScript).toContain('ProductCode');
    });

    it('should generate script detection rule', async () => {
      const result = await service.generateDetection({
        detectionType: 'script',
        script: {
          applicationName: 'Test Application',
          installPath: 'C:\\Program Files\\TestApp',
          fileName: 'app.exe',
        },
      });

      expect(result.success).toBe(true);
      expect(result.detectionMethod).toContain('script');
      expect(result.configuration.type).toBe('script');
      expect(result.intuneJson).toBeNull(); // Script detection has no JSON
      expect(result.powershellScript).toContain('Test Application');
    });
  });

  describe('generateFileDetection', () => {
    it('should generate exists detection by default', () => {
      const input: FileDetectionInput = {
        path: 'C:\\Program Files\\App',
        fileOrFolderName: 'app.exe',
      };

      const result = service.generateFileDetection(input);

      expect(result.success).toBe(true);
      expect(result.intuneJson).toMatchObject({
        '@odata.type': '#microsoft.graph.win32LobAppFileSystemDetection',
        path: 'C:\\Program Files\\App',
        fileOrFolderName: 'app.exe',
        check32BitOn64System: false,
        detectionType: 'exists',
      });
    });

    it('should generate version detection with operator', () => {
      const input: FileDetectionInput = {
        path: 'C:\\Program Files\\App',
        fileOrFolderName: 'app.exe',
        detectionType: 'version',
        operator: 'greaterThanOrEqual',
        detectionValue: '2.0.0',
      };

      const result = service.generateFileDetection(input);

      expect(result.intuneJson).toMatchObject({
        '@odata.type': '#microsoft.graph.win32LobAppFileSystemDetection',
        detectionType: 'version',
        operator: 'greaterThanOrEqual',
        detectionValue: '2.0.0',
      });
      expect(result.powershellScript).toContain('FileVersion');
      expect(result.powershellScript).toContain('2.0.0');
    });

    it('should generate size detection', () => {
      const input: FileDetectionInput = {
        path: 'C:\\Program Files\\App',
        fileOrFolderName: 'app.exe',
        detectionType: 'sizeInMB',
        detectionValue: '10',
      };

      const result = service.generateFileDetection(input);

      expect(result.intuneJson).toMatchObject({
        detectionType: 'sizeInMB',
      });
      expect(result.powershellScript).toContain('FileSizeMB');
    });

    it('should set check32BitOn64System when specified', () => {
      const input: FileDetectionInput = {
        path: 'C:\\Program Files\\App',
        fileOrFolderName: 'app.exe',
        check32BitOn64System: true,
      };

      const result = service.generateFileDetection(input);

      expect(result.intuneJson).toMatchObject({
        check32BitOn64System: true,
      });
      // Check that some recommendation mentions this option
      expect(result.recommendations.some(r => r.includes('32'))).toBe(true);
    });

    it('should generate PowerShell script for file detection', () => {
      const input: FileDetectionInput = {
        path: 'C:\\Program Files\\App',
        fileOrFolderName: 'app.exe',
      };

      const result = service.generateFileDetection(input);

      expect(result.powershellScript).toContain('# File existence detection script');
      expect(result.powershellScript).toContain('exit 0');
      expect(result.powershellScript).toContain('exit 1');
    });
  });

  describe('generateRegistryDetection', () => {
    it('should generate key existence detection', () => {
      const input: RegistryDetectionInput = {
        keyPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\App',
      };

      const result = service.generateRegistryDetection(input);

      expect(result.success).toBe(true);
      expect(result.intuneJson).toMatchObject({
        '@odata.type': '#microsoft.graph.win32LobAppRegistryDetection',
        keyPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\App',
        valueName: '',
        detectionType: 'exists',
      });
    });

    it('should generate value detection with comparison', () => {
      const input: RegistryDetectionInput = {
        keyPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\App',
        valueName: 'Version',
        detectionType: 'version',
        operator: 'greaterThanOrEqual',
        detectionValue: '1.0.0',
      };

      const result = service.generateRegistryDetection(input);

      expect(result.intuneJson).toMatchObject({
        valueName: 'Version',
        detectionType: 'version',
        operator: 'greaterThanOrEqual',
        detectionValue: '1.0.0',
      });
    });

    it('should generate string comparison detection', () => {
      const input: RegistryDetectionInput = {
        keyPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\App',
        valueName: 'InstallPath',
        detectionType: 'string',
        operator: 'equal',
        detectionValue: 'C:\\App',
      };

      const result = service.generateRegistryDetection(input);

      expect(result.intuneJson).toMatchObject({
        detectionType: 'string',
        operator: 'equal',
        detectionValue: 'C:\\App',
      });
    });

    it('should convert registry paths for PowerShell', () => {
      const input: RegistryDetectionInput = {
        keyPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\App',
      };

      const result = service.generateRegistryDetection(input);

      expect(result.powershellScript).toContain('HKLM:\\');
    });

    it('should provide uninstall key recommendation', () => {
      const input: RegistryDetectionInput = {
        keyPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\App',
      };

      const result = service.generateRegistryDetection(input);

      // Check that some recommendation mentions uninstall
      expect(result.recommendations.some(r => r.toLowerCase().includes('uninstall'))).toBe(true);
    });
  });

  describe('generateMsiDetection', () => {
    it('should generate MSI product code detection', () => {
      const input: MsiDetectionInput = {
        productCode: '{12345678-1234-1234-1234-123456789012}',
      };

      const result = service.generateMsiDetection(input);

      expect(result.success).toBe(true);
      expect(result.intuneJson).toMatchObject({
        '@odata.type': '#microsoft.graph.win32LobAppProductCodeDetection',
        productCode: '{12345678-1234-1234-1234-123456789012}',
        productVersionOperator: 'greaterThanOrEqual',
        productVersion: '0.0.0',
      });
    });

    it('should include version comparison', () => {
      const input: MsiDetectionInput = {
        productCode: '{12345678-1234-1234-1234-123456789012}',
        productVersionOperator: 'equal',
        productVersion: '2.0.0',
      };

      const result = service.generateMsiDetection(input);

      expect(result.intuneJson).toMatchObject({
        productVersionOperator: 'equal',
        productVersion: '2.0.0',
      });
    });

    it('should uppercase product code', () => {
      const input: MsiDetectionInput = {
        // Using valid hex characters (a-f only)
        productCode: '{abcdef12-abcd-abcd-abcd-abcdef123456}',
      };

      const result = service.generateMsiDetection(input);
      const msiJson = result.intuneJson as { productCode: string };

      expect(msiJson.productCode).toBe(
        '{ABCDEF12-ABCD-ABCD-ABCD-ABCDEF123456}'
      );
    });

    it('should reject invalid product code format', () => {
      const input: MsiDetectionInput = {
        productCode: 'not-a-guid',
      };

      expect(() => service.generateMsiDetection(input)).toThrow(
        /Invalid MSI product code format/
      );
    });

    it('should generate PowerShell script for MSI detection', () => {
      const input: MsiDetectionInput = {
        productCode: '{12345678-1234-1234-1234-123456789012}',
      };

      const result = service.generateMsiDetection(input);

      expect(result.powershellScript).toContain('MSI product code detection');
      expect(result.powershellScript).toContain('12345678-1234-1234-1234-123456789012');
      expect(result.powershellScript).toContain('Uninstall');
    });

    it('should provide MSI-specific recommendations', () => {
      const input: MsiDetectionInput = {
        productCode: '{12345678-1234-1234-1234-123456789012}',
      };

      const result = service.generateMsiDetection(input);

      // Check that some recommendation mentions MSI being reliable
      expect(result.recommendations.some(r => r.toLowerCase().includes('reliable'))).toBe(true);
    });
  });

  describe('generateScriptDetection', () => {
    it('should generate file-based script detection', () => {
      const input: ScriptDetectionInput = {
        applicationName: 'Test App',
        installPath: 'C:\\Program Files\\TestApp',
        fileName: 'app.exe',
      };

      const result = service.generateScriptDetection(input);

      expect(result.success).toBe(true);
      expect(result.intuneJson).toBeNull();
      expect(result.powershellScript).toContain('Test App');
      expect(result.powershellScript).toContain('C:\\Program Files\\TestApp');
      expect(result.powershellScript).toContain('app.exe');
    });

    it('should include version comparison in script', () => {
      const input: ScriptDetectionInput = {
        applicationName: 'Test App',
        installPath: 'C:\\Program Files\\TestApp',
        fileName: 'app.exe',
        version: '2.0.0',
        operator: 'greaterThanOrEqual',
      };

      const result = service.generateScriptDetection(input);

      expect(result.powershellScript).toContain('2.0.0');
      expect(result.powershellScript).toContain('FileVersion');
    });

    it('should generate registry-based script detection', () => {
      const input: ScriptDetectionInput = {
        applicationName: 'Test App',
        registryKey: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\TestApp',
        registryValueName: 'Version',
        version: '1.0.0',
      };

      const result = service.generateScriptDetection(input);

      expect(result.powershellScript).toContain('HKLM:\\');
      expect(result.powershellScript).toContain('Version');
    });

    it('should generate generic template when no path specified', () => {
      const input: ScriptDetectionInput = {
        applicationName: 'Test App',
      };

      const result = service.generateScriptDetection(input);

      expect(result.powershellScript).toContain('Customize this script');
      expect(result.powershellScript).toContain('PossiblePaths');
    });

    it('should always include exit codes', () => {
      const input: ScriptDetectionInput = {
        applicationName: 'Test App',
      };

      const result = service.generateScriptDetection(input);

      expect(result.powershellScript).toContain('exit 0');
      expect(result.powershellScript).toContain('exit 1');
    });

    it('should provide script-specific recommendations', () => {
      const input: ScriptDetectionInput = {
        applicationName: 'Test App',
      };

      const result = service.generateScriptDetection(input);

      // Check that some recommendations exist and are script-related
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.toLowerCase().includes('script') || r.toLowerCase().includes('exit'))).toBe(true);
    });
  });

  describe('recommendDetectionType', () => {
    it('should recommend MSI for MSI installers', () => {
      const result = service.recommendDetectionType('msi', true, false);

      expect(result.recommended).toBe('msi');
      expect(result.reason).toContain('MSI');
    });

    it('should recommend MSI when product code is available', () => {
      const result = service.recommendDetectionType('exe', true, false);

      expect(result.recommended).toBe('msi');
    });

    it('should recommend file for versioned executables', () => {
      const result = service.recommendDetectionType('exe', false, true);

      expect(result.recommended).toBe('file');
      expect(result.reason).toContain('version');
    });

    it('should recommend registry as fallback', () => {
      const result = service.recommendDetectionType('exe', false, false);

      expect(result.recommended).toBe('registry');
      expect(result.reason).toContain('uninstall');
    });

    it('should include alternatives', () => {
      const result = service.recommendDetectionType('msi', true, false);

      expect(result.alternatives.length).toBeGreaterThan(0);
      const firstAlt = result.alternatives[0];
      expect(firstAlt).toBeDefined();
      expect(firstAlt!.type).toBeDefined();
      expect(firstAlt!.reason).toBeDefined();
    });
  });

  describe('PowerShell script validity', () => {
    it('should escape single quotes in paths', () => {
      const result = service.generateFileDetection({
        path: "C:\\Program Files\\App's Folder",
        fileOrFolderName: "test's.exe",
      });

      // Single quotes should be escaped
      expect(result.powershellScript).toContain("''");
    });

    it('should handle various comparison operators', () => {
      const operators: Array<'equal' | 'notEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual'> = [
        'equal',
        'notEqual',
        'greaterThan',
        'greaterThanOrEqual',
        'lessThan',
        'lessThanOrEqual',
      ];

      for (const op of operators) {
        const result = service.generateFileDetection({
          path: 'C:\\App',
          fileOrFolderName: 'app.exe',
          detectionType: 'version',
          operator: op,
          detectionValue: '1.0.0',
        });

        expect(result.success).toBe(true);
        expect(result.powershellScript).toBeDefined();
      }
    });
  });

  describe('Intune JSON schema compliance', () => {
    it('should include correct @odata.type for file detection', () => {
      const result = service.generateFileDetection({
        path: 'C:\\App',
        fileOrFolderName: 'app.exe',
      });

      expect(result.intuneJson?.['@odata.type']).toBe(
        '#microsoft.graph.win32LobAppFileSystemDetection'
      );
    });

    it('should include correct @odata.type for registry detection', () => {
      const result = service.generateRegistryDetection({
        keyPath: 'HKLM\\SOFTWARE\\App',
      });

      expect(result.intuneJson?.['@odata.type']).toBe(
        '#microsoft.graph.win32LobAppRegistryDetection'
      );
    });

    it('should include correct @odata.type for MSI detection', () => {
      const result = service.generateMsiDetection({
        productCode: '{12345678-1234-1234-1234-123456789012}',
      });

      expect(result.intuneJson?.['@odata.type']).toBe(
        '#microsoft.graph.win32LobAppProductCodeDetection'
      );
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getDetectionService();
      const instance2 = getDetectionService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getDetectionService();
      resetDetectionService();
      const instance2 = getDetectionService();

      expect(instance1).not.toBe(instance2);
    });
  });
});
