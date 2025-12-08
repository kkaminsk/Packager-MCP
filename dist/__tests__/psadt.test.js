import { describe, it, expect, beforeEach } from 'vitest';
import { getPsadtService } from '../services/psadt.js';
describe('PsadtService', () => {
    let service;
    beforeEach(() => {
        // Get fresh service instance
        service = getPsadtService();
    });
    describe('generateScript', () => {
        it('should generate a basic MSI template', () => {
            const options = {
                applicationName: 'Test App',
                applicationVendor: 'Test Vendor',
                applicationVersion: '1.0.0',
                installerType: 'msi',
                complexity: 'basic',
                installerFileName: 'TestApp.msi',
            };
            const result = service.generateScript(options);
            expect(result).toBeDefined();
            expect(result.script).toContain('Test App');
            expect(result.script).toContain('Test Vendor');
            expect(result.script).toContain('1.0.0');
            expect(result.script).toContain('TestApp.msi');
            expect(result.script).toContain('Start-ADTMsiProcess');
            expect(result.metadata.complexity).toBe('basic');
            expect(result.metadata.installerType).toBe('msi');
        });
        it('should generate a standard MSI template with more features', () => {
            const options = {
                applicationName: 'Test App',
                applicationVendor: 'Test Vendor',
                applicationVersion: '2.0.0',
                installerType: 'msi',
                complexity: 'standard',
                productCode: '{12345678-1234-1234-1234-123456789ABC}',
                closeApps: ['testapp', 'testprocess'],
            };
            const result = service.generateScript(options);
            expect(result.script).toContain('{12345678-1234-1234-1234-123456789ABC}');
            expect(result.script).toContain('testapp,testprocess');
            expect(result.script).toContain('Show-ADTInstallationWelcome');
            expect(result.metadata.complexity).toBe('standard');
        });
        it('should generate an advanced MSI template with repair support', () => {
            const options = {
                applicationName: 'Enterprise App',
                applicationVendor: 'Enterprise Vendor',
                applicationVersion: '3.0.0',
                installerType: 'msi',
                complexity: 'advanced',
                includeRepair: true,
                includeUninstall: true,
            };
            const result = service.generateScript(options);
            expect(result.script).toContain("'Repair'");
            expect(result.script).toContain("'Uninstall'");
            expect(result.script).toContain('Test-Prerequisites');
            expect(result.metadata.complexity).toBe('advanced');
        });
        it('should generate an EXE template with Inno Setup arguments', () => {
            const options = {
                applicationName: 'Inno App',
                applicationVendor: 'Inno Vendor',
                applicationVersion: '1.0.0',
                installerType: 'inno',
                complexity: 'standard',
            };
            const result = service.generateScript(options);
            expect(result.script).toContain('/VERYSILENT');
            expect(result.script).toContain('Start-ADTProcess');
            expect(result.metadata.installerType).toBe('inno');
        });
        it('should generate an MSIX template', () => {
            const options = {
                applicationName: 'Modern App',
                applicationVendor: 'Modern Vendor',
                applicationVersion: '1.0.0',
                installerType: 'msix',
                complexity: 'standard',
                installerFileName: 'ModernApp.msix',
            };
            const result = service.generateScript(options);
            expect(result.script).toContain('Add-AppxPackage');
            expect(result.script).toContain('ModernApp.msix');
            expect(result.metadata.installerType).toBe('msix');
        });
        it('should generate a ZIP template', () => {
            const options = {
                applicationName: 'Portable App',
                applicationVendor: 'Portable Vendor',
                applicationVersion: '1.0.0',
                installerType: 'zip',
                complexity: 'standard',
                installerFileName: 'PortableApp.zip',
            };
            const result = service.generateScript(options);
            expect(result.script).toContain('Expand-ZipArchive');
            expect(result.script).toContain('Register-Application');
            expect(result.metadata.installerType).toBe('zip');
        });
        it('should use default silent args when not provided', () => {
            const options = {
                applicationName: 'Default Args App',
                applicationVendor: 'Vendor',
                applicationVersion: '1.0.0',
                installerType: 'msi',
                complexity: 'basic',
            };
            const result = service.generateScript(options);
            expect(result.script).toContain('/qn');
            expect(result.script).toContain('/norestart');
        });
        it('should use custom silent args when provided', () => {
            const options = {
                applicationName: 'Custom Args App',
                applicationVendor: 'Vendor',
                applicationVersion: '1.0.0',
                installerType: 'exe',
                complexity: 'basic',
                silentArgs: '/CUSTOM /ARGS /HERE',
            };
            const result = service.generateScript(options);
            expect(result.script).toContain('/CUSTOM /ARGS /HERE');
        });
    });
    describe('generateTemplate', () => {
        it('should return a complete template output', async () => {
            const input = {
                applicationName: 'Complete Test',
                applicationVendor: 'Test Vendor',
                applicationVersion: '1.0.0',
                installerType: 'msi',
                complexity: 'standard',
            };
            const result = await service.generateTemplate(input);
            expect(result.success).toBe(true);
            expect(result.template).toBeDefined();
            expect(result.template.script).toBeDefined();
            expect(result.template.files).toBeDefined();
            expect(result.template.files.length).toBeGreaterThan(0);
            expect(result.template.customizationPoints).toBeDefined();
            expect(result.recommendations).toBeDefined();
            expect(result.recommendations.length).toBeGreaterThan(0);
        });
        it('should generate detection script', async () => {
            const input = {
                applicationName: 'Detection Test',
                applicationVendor: 'Test Vendor',
                applicationVersion: '1.0.0',
                installerType: 'msi',
                productCode: '{TEST-GUID}',
            };
            const result = await service.generateTemplate(input);
            const detectionScript = result.template.files.find((f) => f.path === 'Detection.ps1');
            expect(detectionScript).toBeDefined();
            expect(detectionScript.content).toContain('{TEST-GUID}');
        });
        it('should generate package structure documentation', async () => {
            const input = {
                applicationName: 'Doc Test',
                applicationVendor: 'Test Vendor',
                applicationVersion: '1.0.0',
                installerType: 'exe',
            };
            const result = await service.generateTemplate(input);
            const structureDoc = result.template.files.find((f) => f.path === 'PACKAGE_STRUCTURE.md');
            expect(structureDoc).toBeDefined();
            expect(structureDoc.content).toContain('Deploy-Application.exe');
        });
    });
    describe('customizationPoints', () => {
        it('should extract CUSTOMIZE comments from generated script', () => {
            const options = {
                applicationName: 'Customize Test',
                applicationVendor: 'Vendor',
                applicationVersion: '1.0.0',
                installerType: 'msi',
                complexity: 'standard',
            };
            const result = service.generateScript(options);
            expect(result.customizationPoints.length).toBeGreaterThan(0);
            result.customizationPoints.forEach((point) => {
                expect(point.id).toBeDefined();
                expect(point.name).toBeDefined();
                expect(point.description).toBeDefined();
                expect(point.lineNumber).toBeGreaterThan(0);
                expect(point.marker).toContain('CUSTOMIZE');
            });
        });
    });
    describe('loadResource', () => {
        it('should load PSADT overview resource', () => {
            const resource = service.loadResource('psadt://docs/overview');
            expect(resource).toBeDefined();
            expect(resource.uri).toBe('psadt://docs/overview');
            expect(resource.content).toContain('PSADT');
            expect(resource.title).toBeDefined();
        });
        it('should load PSADT functions resource', () => {
            const resource = service.loadResource('psadt://docs/functions');
            expect(resource).toBeDefined();
            expect(resource.content).toContain('Start-ADTProcess');
        });
        it('should load installer guide resource', () => {
            const resource = service.loadResource('kb://installers/msi');
            expect(resource).toBeDefined();
            expect(resource.content).toContain('MSI');
            expect(resource.content).toContain('msiexec');
        });
        it('should load pattern resource', () => {
            const resource = service.loadResource('kb://patterns/detection');
            expect(resource).toBeDefined();
            expect(resource.content).toContain('detection');
        });
        it('should load exit codes reference', () => {
            const resource = service.loadResource('ref://exit-codes');
            expect(resource).toBeDefined();
            expect(resource.content).toContain('1603');
            expect(resource.content).toContain('3010');
        });
        it('should return undefined for invalid URI', () => {
            const resource = service.loadResource('invalid://uri');
            expect(resource).toBeUndefined();
        });
        it('should return undefined for non-existent resource', () => {
            const resource = service.loadResource('psadt://docs/nonexistent');
            expect(resource).toBeUndefined();
        });
    });
    describe('listResources', () => {
        it('should return list of all available resources', () => {
            const resources = service.listResources();
            expect(resources).toBeDefined();
            expect(resources.length).toBeGreaterThan(0);
            // Check for expected resources
            const uris = resources.map((r) => r.uri);
            expect(uris).toContain('psadt://docs/overview');
            expect(uris).toContain('psadt://docs/functions');
            expect(uris).toContain('kb://installers/msi');
            expect(uris).toContain('kb://patterns/detection');
            expect(uris).toContain('ref://exit-codes');
        });
        it('should include name and description for each resource', () => {
            const resources = service.listResources();
            resources.forEach((resource) => {
                expect(resource.uri).toBeDefined();
                expect(resource.name).toBeDefined();
                expect(resource.description).toBeDefined();
                expect(resource.name.length).toBeGreaterThan(0);
                expect(resource.description.length).toBeGreaterThan(0);
            });
        });
    });
    describe('template metadata', () => {
        it('should include correct PSADT version', () => {
            const options = {
                applicationName: 'Version Test',
                applicationVendor: 'Vendor',
                applicationVersion: '1.0.0',
                installerType: 'msi',
                complexity: 'basic',
            };
            const result = service.generateScript(options);
            expect(result.metadata.psadtVersion).toBe('4.0');
        });
        it('should include generation timestamp', () => {
            const options = {
                applicationName: 'Timestamp Test',
                applicationVendor: 'Vendor',
                applicationVersion: '1.0.0',
                installerType: 'msi',
                complexity: 'basic',
            };
            const result = service.generateScript(options);
            expect(result.metadata.generatedAt).toBeDefined();
            expect(new Date(result.metadata.generatedAt).getTime()).toBeLessThanOrEqual(Date.now());
        });
    });
    describe('reboot behavior', () => {
        it('should handle prompt reboot behavior', () => {
            const options = {
                applicationName: 'Reboot Test',
                applicationVendor: 'Vendor',
                applicationVersion: '1.0.0',
                installerType: 'msi',
                complexity: 'standard',
                rebootBehavior: 'prompt',
            };
            const result = service.generateScript(options);
            expect(result.script).toContain('Show-ADTInstallationRestartPrompt');
        });
        it('should handle force reboot behavior', () => {
            const options = {
                applicationName: 'Force Reboot Test',
                applicationVendor: 'Vendor',
                applicationVersion: '1.0.0',
                installerType: 'msi',
                complexity: 'standard',
                rebootBehavior: 'force',
            };
            const result = service.generateScript(options);
            expect(result.script).toContain('RestartRequired');
        });
    });
});
//# sourceMappingURL=psadt.test.js.map