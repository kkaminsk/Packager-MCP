// Validation service for PSADT package validation
import { getLogger } from '../utils/logger.js';
const logger = getLogger().child({ service: 'validation' });
// Score penalties by severity
const SCORE_PENALTIES = {
    error: 10,
    warning: 3,
    info: 1,
};
// Which severities apply at each level
const LEVEL_SEVERITIES = {
    basic: ['error'],
    standard: ['error', 'warning'],
    strict: ['error', 'warning', 'info'],
};
/**
 * All validation rules organized by category
 */
const VALIDATION_RULES = [
    // ============================================
    // STRUCTURE RULES
    // ============================================
    {
        id: 'param-block-exists',
        name: 'Parameter Block Required',
        description: 'PSADT scripts must have a param block for configuration',
        severity: 'error',
        category: 'structure',
        minLevel: 'basic',
        suggestion: 'Add a param() block at the top of your script with deployment parameters',
        check: (script, _lines) => {
            const hasParam = /^\s*param\s*\(/m.test(script);
            if (!hasParam) {
                return [{ context: 'No param() block found in script' }];
            }
            return [];
        },
    },
    {
        id: 'try-catch-exists',
        name: 'Error Handling Required',
        description: 'Scripts should use try/catch blocks for proper error handling',
        severity: 'error',
        category: 'structure',
        minLevel: 'basic',
        suggestion: 'Wrap main installation logic in try { } catch { } blocks',
        check: (script, _lines) => {
            const hasTryCatch = /\btry\s*\{/i.test(script) && /\bcatch\s*\{/i.test(script);
            if (!hasTryCatch) {
                return [{ context: 'No try/catch error handling found' }];
            }
            return [];
        },
    },
    {
        id: 'valid-powershell-structure',
        name: 'Valid PowerShell Structure',
        description: 'Script must have basic valid PowerShell structure',
        severity: 'error',
        category: 'structure',
        minLevel: 'basic',
        suggestion: 'Ensure script has matching braces and valid PowerShell syntax',
        check: (script, _lines) => {
            const issues = [];
            const openBraces = (script.match(/\{/g) || []).length;
            const closeBraces = (script.match(/\}/g) || []).length;
            if (openBraces !== closeBraces) {
                issues.push({
                    context: `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`,
                });
            }
            return issues;
        },
    },
    // ============================================
    // PSADT RULES
    // ============================================
    {
        id: 'psadt-import-exists',
        name: 'PSADT Module Import',
        description: 'Must import PSAppDeployToolkit module for PSADT v4',
        severity: 'error',
        category: 'psadt',
        minLevel: 'basic',
        suggestion: 'Add: Import-Module -Name PSAppDeployToolkit',
        check: (script, lines) => {
            // Check for either Import-Module PSAppDeployToolkit or using namespace
            const hasImport = /Import-Module.*PSAppDeployToolkit/i.test(script) ||
                /using\s+module\s+PSAppDeployToolkit/i.test(script) ||
                /using\s+namespace\s+PSADT/i.test(script);
            if (!hasImport) {
                return [{ context: 'PSAppDeployToolkit module not imported' }];
            }
            return [];
        },
    },
    {
        id: 'initialize-called',
        name: 'Initialize-ADTDeployment Called',
        description: 'Must call Initialize-ADTDeployment to start PSADT workflow',
        severity: 'error',
        category: 'psadt',
        minLevel: 'basic',
        suggestion: 'Add: Initialize-ADTDeployment at the start of your deployment logic',
        check: (script, lines) => {
            if (!/Initialize-ADTDeployment/i.test(script)) {
                return [{ context: 'Initialize-ADTDeployment not called' }];
            }
            return [];
        },
    },
    {
        id: 'complete-called',
        name: 'Complete-ADTDeployment Called',
        description: 'Must call Complete-ADTDeployment to finalize PSADT workflow',
        severity: 'error',
        category: 'psadt',
        minLevel: 'basic',
        suggestion: 'Add: Complete-ADTDeployment at the end of your deployment logic',
        check: (script, lines) => {
            if (!/Complete-ADTDeployment/i.test(script)) {
                return [{ context: 'Complete-ADTDeployment not called' }];
            }
            return [];
        },
    },
    {
        id: 'uses-adt-prefix',
        name: 'Uses ADT-Prefixed Functions',
        description: 'PSADT v4 functions should use ADT prefix (e.g., Show-ADTInstallationWelcome)',
        severity: 'warning',
        category: 'psadt',
        minLevel: 'standard',
        suggestion: 'Use PSADT v4 functions with ADT prefix instead of legacy v3 functions',
        check: (script, lines) => {
            const issues = [];
            // Legacy v3 function patterns that should be v4 with ADT prefix
            const legacyPatterns = [
                { legacy: /\bShow-InstallationWelcome\b/gi, v4: 'Show-ADTInstallationWelcome' },
                { legacy: /\bShow-InstallationProgress\b/gi, v4: 'Show-ADTInstallationProgress' },
                { legacy: /\bShow-InstallationPrompt\b/gi, v4: 'Show-ADTInstallationPrompt' },
                { legacy: /\bExecute-Process\b/gi, v4: 'Start-ADTProcess' },
                { legacy: /\bExecute-MSI\b/gi, v4: 'Start-ADTMsiProcess' },
                { legacy: /\bRemove-MSIApplications\b/gi, v4: 'Remove-ADTApplication' },
                { legacy: /\bGet-InstalledApplication\b/gi, v4: 'Get-ADTApplication' },
                { legacy: /\bClose-InstallationProgress\b/gi, v4: 'Close-ADTInstallationProgress' },
            ];
            for (const { legacy, v4 } of legacyPatterns) {
                let match;
                legacy.lastIndex = 0;
                while ((match = legacy.exec(script)) !== null) {
                    const lineNumber = getLineNumber(script, match.index);
                    issues.push({
                        lineNumber,
                        lineContent: lines[lineNumber - 1]?.trim(),
                        context: `Legacy function "${match[0]}" found. Use "${v4}" instead.`,
                    });
                }
            }
            return issues;
        },
    },
    {
        id: 'exit-code-handling',
        name: 'Exit Code Handling',
        description: 'Should handle exit codes properly for deployment status reporting',
        severity: 'warning',
        category: 'psadt',
        minLevel: 'standard',
        suggestion: 'Use Complete-ADTDeployment with -ExitCode parameter to report status',
        check: (script, lines) => {
            // Check if Complete-ADTDeployment uses exit code
            if (/Complete-ADTDeployment/i.test(script)) {
                if (!/Complete-ADTDeployment.*-ExitCode/i.test(script) && !/-ExitCode.*Complete-ADTDeployment/i.test(script)) {
                    return [{ context: 'Complete-ADTDeployment called without -ExitCode parameter' }];
                }
            }
            return [];
        },
    },
    {
        id: 'adt-session-usage',
        name: 'ADTSession Object Usage',
        description: 'PSADT v4 uses $ADTSession for state management',
        severity: 'info',
        category: 'psadt',
        minLevel: 'strict',
        suggestion: 'Consider using $ADTSession object for accessing deployment state',
        check: (script, _lines) => {
            // Only flag if PSADT functions are used but $ADTSession is not
            const usesPsadt = /Initialize-ADTDeployment/i.test(script);
            const usesAdtSession = /\$ADTSession/i.test(script);
            if (usesPsadt && !usesAdtSession) {
                return [{ context: '$ADTSession object not used for state management' }];
            }
            return [];
        },
    },
    // ============================================
    // INTUNE RULES
    // ============================================
    {
        id: 'detection-possible',
        name: 'Detection Rule Support',
        description: 'Package should support Intune detection rule generation',
        severity: 'warning',
        category: 'intune',
        minLevel: 'standard',
        environments: ['intune'],
        suggestion: 'Include product code, file path, or registry key for detection rule generation',
        check: (script, _lines) => {
            // Check for common detection identifiers
            const hasProductCode = /\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}/.test(script);
            const hasFilePath = /\$env:ProgramFiles|\$env:ProgramData|C:\\Program Files/i.test(script);
            const hasRegistry = /HKLM:|HKCU:|Registry::/i.test(script);
            if (!hasProductCode && !hasFilePath && !hasRegistry) {
                return [{ context: 'No clear detection identifiers (product code, file path, or registry key) found' }];
            }
            return [];
        },
    },
    {
        id: 'silent-install-supported',
        name: 'Silent Installation Support',
        description: 'Must support fully silent installation for Intune',
        severity: 'warning',
        category: 'intune',
        minLevel: 'standard',
        environments: ['intune', 'sccm'],
        suggestion: 'Ensure all user prompts can be suppressed in silent mode',
        check: (script, _lines) => {
            // Check for deployment mode handling
            const hasDeployModeCheck = /\$deployMode|\$ADTSession\.DeployMode|DeployMode/i.test(script);
            const hasSilentSwitch = /-DeployMode\s+(Silent|NonInteractive)/i.test(script);
            if (!hasDeployModeCheck && !hasSilentSwitch) {
                return [{ context: 'No deployment mode handling found for silent installation' }];
            }
            return [];
        },
    },
    {
        id: 'no-user-interaction-required',
        name: 'No Required User Interaction',
        description: 'Should not require user interaction in silent deployment mode',
        severity: 'info',
        category: 'intune',
        minLevel: 'strict',
        environments: ['intune'],
        suggestion: 'Wrap interactive prompts with deployment mode checks',
        check: (script, lines) => {
            const issues = [];
            // Look for potentially blocking prompts without mode checks
            const promptPatterns = [
                /Read-Host/gi,
                /\$host\.UI\.PromptForChoice/gi,
                /\[System\.Windows\.Forms\.MessageBox\]/gi,
            ];
            for (const pattern of promptPatterns) {
                let match;
                pattern.lastIndex = 0;
                while ((match = pattern.exec(script)) !== null) {
                    const lineNumber = getLineNumber(script, match.index);
                    issues.push({
                        lineNumber,
                        lineContent: lines[lineNumber - 1]?.trim(),
                        context: `Potential user interaction: ${match[0]}`,
                    });
                }
            }
            return issues;
        },
    },
    {
        id: 'return-exit-code',
        name: 'Return Exit Code',
        description: 'Script should return proper exit code for Intune to detect success/failure',
        severity: 'warning',
        category: 'intune',
        minLevel: 'standard',
        environments: ['intune', 'sccm'],
        suggestion: 'Ensure script exits with 0 for success, non-zero for failure',
        check: (script, _lines) => {
            const hasExitStatement = /\bexit\s+\d+|\bexit\s+\$|Complete-ADTDeployment.*-ExitCode/i.test(script);
            if (!hasExitStatement) {
                return [{ context: 'No explicit exit code found. Use "exit 0" or Complete-ADTDeployment -ExitCode' }];
            }
            return [];
        },
    },
    // ============================================
    // SECURITY RULES
    // ============================================
    {
        id: 'no-hardcoded-paths',
        name: 'No Hardcoded User Paths',
        description: 'Avoid hardcoded user-specific paths like C:\\Users\\username',
        severity: 'warning',
        category: 'security',
        minLevel: 'standard',
        suggestion: 'Use environment variables like $env:USERPROFILE or $env:APPDATA instead',
        check: (script, lines) => {
            const issues = [];
            const hardcodedPathPattern = /C:\\Users\\[^\\$\s]+\\/gi;
            let match;
            while ((match = hardcodedPathPattern.exec(script)) !== null) {
                const lineNumber = getLineNumber(script, match.index);
                issues.push({
                    lineNumber,
                    lineContent: lines[lineNumber - 1]?.trim(),
                    context: `Hardcoded user path: ${match[0]}`,
                });
            }
            return issues;
        },
    },
    {
        id: 'no-credentials',
        name: 'No Plaintext Credentials',
        description: 'No plaintext credentials, passwords, API keys, or secrets',
        severity: 'error',
        category: 'security',
        minLevel: 'basic',
        suggestion: 'Use secure credential storage or environment variables for sensitive data',
        check: (script, lines) => {
            const issues = [];
            const credentialPatterns = [
                { pattern: /password\s*=\s*["'][^"']+["']/gi, type: 'password' },
                { pattern: /apikey\s*=\s*["'][^"']+["']/gi, type: 'API key' },
                { pattern: /api_key\s*=\s*["'][^"']+["']/gi, type: 'API key' },
                { pattern: /secret\s*=\s*["'][^"']+["']/gi, type: 'secret' },
                { pattern: /token\s*=\s*["'][A-Za-z0-9+/=]{20,}["']/gi, type: 'token' },
                { pattern: /ConvertTo-SecureString\s+["'][^"']+["']\s+-AsPlainText/gi, type: 'plaintext secure string' },
            ];
            for (const { pattern, type } of credentialPatterns) {
                let match;
                pattern.lastIndex = 0;
                while ((match = pattern.exec(script)) !== null) {
                    const lineNumber = getLineNumber(script, match.index);
                    issues.push({
                        lineNumber,
                        lineContent: lines[lineNumber - 1]?.trim(),
                        context: `Potential plaintext ${type} found`,
                    });
                }
            }
            return issues;
        },
    },
    {
        id: 'safe-execution',
        name: 'Safe Command Execution',
        description: 'Use Start-ADTProcess instead of Invoke-Expression for safety',
        severity: 'warning',
        category: 'security',
        minLevel: 'standard',
        suggestion: 'Replace Invoke-Expression with Start-ADTProcess or Start-Process for safer execution',
        check: (script, lines) => {
            const issues = [];
            const unsafePattern = /\bInvoke-Expression\b|\biex\b/gi;
            let match;
            while ((match = unsafePattern.exec(script)) !== null) {
                const lineNumber = getLineNumber(script, match.index);
                issues.push({
                    lineNumber,
                    lineContent: lines[lineNumber - 1]?.trim(),
                    context: `Unsafe command execution: ${match[0]}`,
                });
            }
            return issues;
        },
    },
    {
        id: 'no-downloadstring',
        name: 'No Remote Code Execution',
        description: 'Avoid downloading and executing code from remote sources',
        severity: 'error',
        category: 'security',
        minLevel: 'basic',
        suggestion: 'Include all required scripts in the package rather than downloading them',
        check: (script, lines) => {
            const issues = [];
            const remoteExecPatterns = [
                /\(New-Object.*WebClient\)\.DownloadString/gi,
                /Invoke-WebRequest.*\|\s*Invoke-Expression/gi,
                /Invoke-RestMethod.*\|\s*iex/gi,
                /\(iwr.*\)\.Content\s*\|\s*iex/gi,
            ];
            for (const pattern of remoteExecPatterns) {
                let match;
                pattern.lastIndex = 0;
                while ((match = pattern.exec(script)) !== null) {
                    const lineNumber = getLineNumber(script, match.index);
                    issues.push({
                        lineNumber,
                        lineContent: lines[lineNumber - 1]?.trim(),
                        context: 'Remote code execution pattern detected',
                    });
                }
            }
            return issues;
        },
    },
    // ============================================
    // BEST PRACTICE RULES
    // ============================================
    {
        id: 'has-logging',
        name: 'Logging Implemented',
        description: 'Scripts should include logging for troubleshooting',
        severity: 'info',
        category: 'best-practice',
        minLevel: 'strict',
        suggestion: 'Use Write-ADTLogEntry for consistent logging',
        check: (script, _lines) => {
            const hasLogging = /Write-ADTLogEntry/i.test(script) ||
                /Write-Log/i.test(script) ||
                /Write-Host/i.test(script) ||
                /Write-Verbose/i.test(script);
            if (!hasLogging) {
                return [{ context: 'No logging statements found' }];
            }
            return [];
        },
    },
    {
        id: 'has-error-messages',
        name: 'Descriptive Error Messages',
        description: 'Catch blocks should include descriptive error messages',
        severity: 'info',
        category: 'best-practice',
        minLevel: 'strict',
        suggestion: 'Add descriptive error messages in catch blocks for easier troubleshooting',
        check: (script, lines) => {
            const issues = [];
            // Find catch blocks and check if they have error handling
            const catchPattern = /catch\s*\{([^}]*)\}/gi;
            let match;
            while ((match = catchPattern.exec(script)) !== null) {
                const catchContent = match[1] ?? '';
                const hasErrorHandling = /Write-|throw|\$_|\$Error|\$PSItem/i.test(catchContent);
                if (!hasErrorHandling || catchContent.trim() === '') {
                    const lineNumber = getLineNumber(script, match.index);
                    issues.push({
                        lineNumber,
                        lineContent: lines[lineNumber - 1]?.trim(),
                        context: 'Empty or silent catch block',
                    });
                }
            }
            return issues;
        },
    },
    {
        id: 'has-script-info',
        name: 'Script Information Block',
        description: 'Scripts should include metadata comments',
        severity: 'info',
        category: 'best-practice',
        minLevel: 'strict',
        suggestion: 'Add a comment block with script name, version, author, and description',
        check: (script, _lines) => {
            const hasInfoBlock = /\.SYNOPSIS|\.DESCRIPTION|\.NOTES|<#.*#>/is.test(script) ||
                /#.*version|#.*author|#.*description/i.test(script);
            if (!hasInfoBlock) {
                return [{ context: 'No script information/metadata block found' }];
            }
            return [];
        },
    },
    {
        id: 'consistent-quotes',
        name: 'Consistent Quote Usage',
        description: 'Use single quotes for literal strings, double quotes for expandable strings',
        severity: 'info',
        category: 'best-practice',
        minLevel: 'strict',
        suggestion: 'Use single quotes when no variable expansion is needed',
        check: (script, _lines) => {
            const issues = [];
            // Find double-quoted strings without variables
            const doubleQuotePattern = /"([^"$`\\]*)"/g;
            let match;
            let count = 0;
            while ((match = doubleQuotePattern.exec(script)) !== null && count < 3) {
                // Only flag if the string could be single-quoted (no special chars)
                const content = match[1] ?? '';
                if (content.length > 0 && !/[\n\r\t]/.test(content)) {
                    count++;
                    if (count === 3) {
                        issues.push({
                            context: 'Multiple literal strings use double quotes where single quotes would suffice',
                        });
                    }
                }
            }
            return issues;
        },
    },
];
/**
 * Get line number from character index
 */
function getLineNumber(script, index) {
    return script.substring(0, index).split('\n').length;
}
/**
 * Validation service class
 */
class ValidationService {
    /**
     * Validate a PSADT script
     */
    async validatePackage(input) {
        const startTime = Date.now();
        const level = input.level || 'standard';
        const environment = input.environment || 'intune';
        const categories = input.categories || ['structure', 'psadt', 'intune', 'security', 'best-practice'];
        logger.debug('Starting validation', { level, environment, categories });
        const lines = input.script.split('\n');
        const applicableSeverities = LEVEL_SEVERITIES[level];
        // Filter rules by level, environment, and categories
        const applicableRules = VALIDATION_RULES.filter((rule) => {
            // Check severity level
            if (!applicableSeverities.includes(rule.severity)) {
                return false;
            }
            // Check category
            if (!categories.includes(rule.category)) {
                return false;
            }
            // Check environment
            if (rule.environments && !rule.environments.includes(environment)) {
                return false;
            }
            return true;
        });
        const issues = [];
        const passedChecks = [];
        // Run each rule
        for (const rule of applicableRules) {
            try {
                const matches = rule.check(input.script, lines);
                if (matches.length > 0) {
                    // Rule failed - add issues
                    for (const match of matches) {
                        issues.push({
                            ruleId: rule.id,
                            ruleName: rule.name,
                            severity: rule.severity,
                            category: rule.category,
                            message: match.context || rule.description,
                            lineNumber: match.lineNumber,
                            lineContent: match.lineContent,
                            suggestion: rule.suggestion,
                        });
                    }
                }
                else {
                    // Rule passed
                    passedChecks.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        category: rule.category,
                        description: rule.description,
                    });
                }
            }
            catch (error) {
                logger.warn('Rule check failed', {
                    ruleId: rule.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        // Calculate score
        let score = 100;
        for (const issue of issues) {
            score -= SCORE_PENALTIES[issue.severity];
        }
        score = Math.max(0, score);
        // Count by severity
        const errorCount = issues.filter((i) => i.severity === 'error').length;
        const warningCount = issues.filter((i) => i.severity === 'warning').length;
        const infoCount = issues.filter((i) => i.severity === 'info').length;
        // Determine validity (no errors = valid)
        const isValid = errorCount === 0;
        // Generate summary
        let summary;
        if (issues.length === 0) {
            summary = 'Validation passed with no issues found.';
        }
        else if (isValid) {
            summary = `Validation passed with ${warningCount} warning(s) and ${infoCount} info message(s).`;
        }
        else {
            summary = `Validation failed with ${errorCount} error(s), ${warningCount} warning(s), and ${infoCount} info message(s).`;
        }
        const result = {
            isValid,
            score,
            totalIssues: issues.length,
            errorCount,
            warningCount,
            infoCount,
            issues,
            passedChecks,
            summary,
            level,
            environment,
            categoriesChecked: categories,
        };
        logger.info('Validation completed', {
            isValid,
            score,
            totalIssues: issues.length,
            duration: Date.now() - startTime,
        });
        return {
            success: true,
            result,
        };
    }
}
// Singleton instance
let validationServiceInstance = null;
/**
 * Get the validation service instance
 */
export function getValidationService() {
    if (!validationServiceInstance) {
        validationServiceInstance = new ValidationService();
    }
    return validationServiceInstance;
}
/**
 * Reset the validation service (for testing)
 */
export function resetValidationService() {
    validationServiceInstance = null;
}
export { ValidationService };
//# sourceMappingURL=validation.js.map