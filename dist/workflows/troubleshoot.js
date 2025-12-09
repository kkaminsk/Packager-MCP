// Troubleshoot Workflow - Diagnose issues with failing packages
import { readFileSync, existsSync } from 'node:fs';
import { getLogger } from '../utils/logger.js';
const logger = getLogger().child({ workflow: 'troubleshoot' });
// Exit code database for common installer types
const EXIT_CODE_DATABASE = new Map([
    // MSI Success codes
    [0, { code: 0, name: 'ERROR_SUCCESS', description: 'Action completed successfully', installerType: 'all' }],
    [1641, { code: 1641, name: 'ERROR_SUCCESS_REBOOT_INITIATED', description: 'Restart initiated by installation', installerType: 'msi' }],
    [3010, { code: 3010, name: 'ERROR_SUCCESS_REBOOT_REQUIRED', description: 'Restart required to complete installation', installerType: 'msi' }],
    // Common MSI Error codes
    [1, { code: 1, name: 'ERROR_INVALID_FUNCTION', description: 'Invalid function called', installerType: 'msi', resolution: 'Check MSI command syntax' }],
    [2, { code: 2, name: 'ERROR_FILE_NOT_FOUND', description: 'File not found', installerType: 'msi', resolution: 'Verify the MSI file path is correct' }],
    [5, { code: 5, name: 'ERROR_ACCESS_DENIED', description: 'Access denied', installerType: 'msi', resolution: 'Run as administrator or check file permissions' }],
    [87, { code: 87, name: 'ERROR_INVALID_PARAMETER', description: 'Invalid parameter', installerType: 'msi', resolution: 'Check command line arguments for errors' }],
    [1601, { code: 1601, name: 'ERROR_INSTALL_SERVICE_FAILURE', description: 'Windows Installer service failed', installerType: 'msi', resolution: 'Restart the Windows Installer service' }],
    [1602, { code: 1602, name: 'ERROR_INSTALL_USEREXIT', description: 'User cancelled installation', installerType: 'msi', resolution: 'User intervention - ensure silent mode is working' }],
    [1603, { code: 1603, name: 'ERROR_INSTALL_FAILURE', description: 'Fatal error during installation', installerType: 'msi', resolution: 'Enable verbose logging (/l*v) and check for "Return value 3"' }],
    [1618, { code: 1618, name: 'ERROR_INSTALL_ALREADY_RUNNING', description: 'Another installation in progress', installerType: 'msi', resolution: 'Wait for other MSI operations to complete or use WaitForMsiExec' }],
    [1619, { code: 1619, name: 'ERROR_INSTALL_PACKAGE_OPEN_FAILED', description: 'Could not open installation package', installerType: 'msi', resolution: 'Verify MSI file exists and is not corrupted' }],
    [1620, { code: 1620, name: 'ERROR_INSTALL_PACKAGE_INVALID', description: 'Installation package is invalid', installerType: 'msi', resolution: 'Re-download or repair the MSI file' }],
    [1622, { code: 1622, name: 'ERROR_INSTALL_LOG_FAILURE', description: 'Error opening log file', installerType: 'msi', resolution: 'Check log path permissions' }],
    [1624, { code: 1624, name: 'ERROR_INSTALL_TRANSFORM_FAILURE', description: 'Error applying transforms', installerType: 'msi', resolution: 'Verify MST file exists and is compatible' }],
    [1625, { code: 1625, name: 'ERROR_INSTALL_PACKAGE_REJECTED', description: 'Installation prohibited by policy', installerType: 'msi', resolution: 'Check Group Policy software restriction settings' }],
    [1633, { code: 1633, name: 'ERROR_INSTALL_TEMP_UNWRITABLE', description: 'Temp folder inaccessible', installerType: 'msi', resolution: 'Check TEMP folder permissions' }],
    [1638, { code: 1638, name: 'ERROR_PATCH_PACKAGE_UNSUPPORTED', description: 'Newer version already installed', installerType: 'msi', resolution: 'Cannot downgrade - remove newer version first' }],
    // PSADT Exit codes
    [60001, { code: 60001, name: 'FAST_RETRY', description: 'Retry deployment soon', installerType: 'psadt', resolution: 'Check for blocking conditions and retry' }],
    [60002, { code: 60002, name: 'BLOCK_EXECUTION', description: 'Application execution was blocked', installerType: 'psadt', resolution: 'Close blocking applications listed in the deployment' }],
    [60003, { code: 60003, name: 'DEFER', description: 'User deferred the installation', installerType: 'psadt', resolution: 'User chose to defer - will retry later' }],
    [60004, { code: 60004, name: 'INSTALLATION_PENDING', description: 'Previous installation pending', installerType: 'psadt', resolution: 'Wait for previous installation to complete' }],
    [60008, { code: 60008, name: 'INSTALLATION_FAILED', description: 'Generic installation failure', installerType: 'psadt', resolution: 'Check PSADT log for details' }],
    [60010, { code: 60010, name: 'USER_CANCELLED', description: 'User cancelled the installation', installerType: 'psadt', resolution: 'Ensure silent mode is configured correctly' }],
]);
// Common log patterns and their meanings
const LOG_PATTERNS = [
    { pattern: /Return value 3/i, severity: 'error', cause: 'Custom action failed', fix: 'Check the action before this line in the log' },
    { pattern: /Error\s*1603/i, severity: 'error', cause: 'Fatal MSI installation error', fix: 'Look for earlier errors in the log' },
    { pattern: /Access.*denied/i, severity: 'error', cause: 'Permission issue', fix: 'Run as administrator or fix permissions' },
    { pattern: /file.*not found/i, severity: 'error', cause: 'Missing file', fix: 'Verify file paths in the script' },
    { pattern: /already installed/i, severity: 'warning', cause: 'Application already installed', fix: 'Check detection or uninstall first' },
    { pattern: /restart required/i, severity: 'warning', cause: 'Restart needed', fix: 'Handle restart in deployment script' },
    { pattern: /disk space/i, severity: 'error', cause: 'Insufficient disk space', fix: 'Free up disk space or add disk space check' },
    { pattern: /network.*error/i, severity: 'error', cause: 'Network connectivity issue', fix: 'Check network availability' },
    { pattern: /timeout/i, severity: 'error', cause: 'Operation timed out', fix: 'Increase timeout value or check for blocking process' },
    { pattern: /in use/i, severity: 'error', cause: 'File in use', fix: 'Close applications using the file' },
    { pattern: /product.*version.*is newer/i, severity: 'warning', cause: 'Newer version already installed', fix: 'Cannot downgrade - adjust detection or remove newer version' },
    { pattern: /blocked by/i, severity: 'error', cause: 'Process blocked', fix: 'Identify and close blocking application' },
    { pattern: /elevated/i, severity: 'error', cause: 'Elevation required', fix: 'Run as administrator' },
    { pattern: /signature.*invalid/i, severity: 'error', cause: 'Code signing issue', fix: 'Check code signing or policy settings' },
];
/**
 * Parse raw arguments into structured arguments
 */
export function parseTroubleshootArgs(rawArgs) {
    const installerTypeValue = rawArgs['installer-type'] || rawArgs['installerType'];
    return {
        logFile: rawArgs['log-file'] || rawArgs['logFile'] || rawArgs['log'],
        errorCode: rawArgs['error-code'] || rawArgs['errorCode'] ? parseInt(rawArgs['error-code'] || rawArgs['errorCode'] || '0', 10) : undefined,
        errorMessage: rawArgs['error-message'] || rawArgs['errorMessage'] || rawArgs['error'],
        installerType: installerTypeValue,
        issueDescription: rawArgs['description'] || rawArgs['issue'],
    };
}
/**
 * Look up exit code information
 */
function lookupExitCode(code, installerType) {
    const info = EXIT_CODE_DATABASE.get(code);
    if (!info)
        return undefined;
    // If installer type is specified and doesn't match, try to find a more specific match
    if (installerType && info.installerType !== 'all' && info.installerType !== installerType) {
        // Look for installer-specific version
        for (const [, value] of EXIT_CODE_DATABASE) {
            if (value.code === code && (value.installerType === installerType || value.installerType === 'all')) {
                return value;
            }
        }
    }
    return info;
}
/**
 * Analyze a log file for errors
 */
function analyzeLogFile(logPath) {
    if (!existsSync(logPath)) {
        logger.warn('Log file not found', { logPath });
        return undefined;
    }
    try {
        const content = readFileSync(logPath, 'utf-8');
        const lines = content.split('\n');
        const errorEntries = [];
        const patterns = [];
        const foundPatterns = new Set();
        lines.forEach((line, index) => {
            for (const logPattern of LOG_PATTERNS) {
                if (logPattern.pattern.test(line)) {
                    if (!foundPatterns.has(logPattern.cause)) {
                        foundPatterns.add(logPattern.cause);
                        patterns.push(logPattern.cause);
                    }
                    errorEntries.push({
                        lineNumber: index + 1,
                        content: line.substring(0, 200), // Truncate long lines
                        severity: logPattern.severity,
                    });
                }
            }
            // Also capture generic error lines
            if (/\b(error|failed|exception)\b/i.test(line) && errorEntries.length < 20) {
                const alreadyAdded = errorEntries.some(e => e.lineNumber === index + 1);
                if (!alreadyAdded) {
                    errorEntries.push({
                        lineNumber: index + 1,
                        content: line.substring(0, 200),
                        severity: 'error',
                    });
                }
            }
        });
        // Sort by line number
        errorEntries.sort((a, b) => a.lineNumber - b.lineNumber);
        // Generate summary
        let summary = '';
        if (errorEntries.length === 0) {
            summary = 'No obvious errors found in log file. Review manually for subtle issues.';
        }
        else {
            summary = `Found ${errorEntries.length} potential error(s). Key issues: ${patterns.slice(0, 3).join(', ') || 'Generic errors'}.`;
        }
        return {
            logFile: logPath,
            errorEntries: errorEntries.slice(0, 20), // Limit to 20 entries
            patterns,
            summary,
        };
    }
    catch (error) {
        logger.error('Failed to analyze log file', { logPath, error });
        return undefined;
    }
}
/**
 * Identify likely causes based on available information
 */
function identifyCauses(args, exitCodeInfo, logAnalysis) {
    const causes = [];
    // Add cause from exit code
    if (exitCodeInfo && exitCodeInfo.code !== 0) {
        causes.push({
            likelihood: 'high',
            description: exitCodeInfo.description,
            evidence: [`Exit code ${exitCodeInfo.code} (${exitCodeInfo.name})`],
            reference: `ref://exit-codes#${exitCodeInfo.code}`,
        });
    }
    // Add causes from log analysis
    if (logAnalysis) {
        const patternCauses = new Map();
        for (const entry of logAnalysis.errorEntries) {
            for (const logPattern of LOG_PATTERNS) {
                if (logPattern.pattern.test(entry.content)) {
                    const existing = patternCauses.get(logPattern.cause);
                    if (existing) {
                        existing.count++;
                        if (existing.evidence.length < 3) {
                            existing.evidence.push(`Line ${entry.lineNumber}: ${entry.content.substring(0, 100)}`);
                        }
                    }
                    else {
                        patternCauses.set(logPattern.cause, {
                            count: 1,
                            evidence: [`Line ${entry.lineNumber}: ${entry.content.substring(0, 100)}`],
                        });
                    }
                }
            }
        }
        for (const [cause, data] of patternCauses) {
            causes.push({
                likelihood: data.count >= 3 ? 'high' : data.count >= 2 ? 'medium' : 'low',
                description: cause,
                evidence: data.evidence,
            });
        }
    }
    // Add causes from error message
    if (args.errorMessage) {
        for (const logPattern of LOG_PATTERNS) {
            if (logPattern.pattern.test(args.errorMessage)) {
                causes.push({
                    likelihood: 'medium',
                    description: logPattern.cause,
                    evidence: [`Error message: ${args.errorMessage}`],
                });
            }
        }
    }
    // Add causes from issue description
    if (args.issueDescription) {
        const description = args.issueDescription.toLowerCase();
        if (description.includes('silent') || description.includes('user prompt')) {
            causes.push({
                likelihood: 'medium',
                description: 'Silent installation may not be working correctly',
                evidence: ['Issue description mentions silent/user prompt'],
            });
        }
        if (description.includes('detection') || description.includes('reinstall')) {
            causes.push({
                likelihood: 'medium',
                description: 'Detection rule may not be configured correctly',
                evidence: ['Issue description mentions detection/reinstall'],
            });
        }
        if (description.includes('permission') || description.includes('admin')) {
            causes.push({
                likelihood: 'high',
                description: 'Insufficient permissions',
                evidence: ['Issue description mentions permissions'],
            });
        }
    }
    // Sort by likelihood
    const likelihoodOrder = { high: 0, medium: 1, low: 2 };
    causes.sort((a, b) => likelihoodOrder[a.likelihood] - likelihoodOrder[b.likelihood]);
    // Remove duplicates
    const seen = new Set();
    return causes.filter(c => {
        if (seen.has(c.description))
            return false;
        seen.add(c.description);
        return true;
    });
}
/**
 * Generate suggested fixes based on causes
 */
function generateFixes(causes, exitCodeInfo, logAnalysis) {
    const fixes = [];
    let priority = 1;
    // Add fix from exit code resolution
    if (exitCodeInfo?.resolution) {
        fixes.push({
            priority: priority++,
            description: exitCodeInfo.resolution,
            steps: [exitCodeInfo.resolution],
            expectedOutcome: 'Resolves the exit code issue',
        });
    }
    // Add fixes for each cause
    for (const cause of causes) {
        const causeDescription = cause.description.toLowerCase();
        if (causeDescription.includes('custom action')) {
            fixes.push({
                priority: priority++,
                description: 'Debug custom action failure',
                steps: [
                    'Enable verbose MSI logging: msiexec /i package.msi /l*v install.log',
                    'Search log for "Return value 3"',
                    'Look at the action immediately before the failure',
                    'Check if custom action has dependencies',
                ],
                expectedOutcome: 'Identifies the failing custom action',
            });
        }
        if (causeDescription.includes('permission') || causeDescription.includes('access denied')) {
            fixes.push({
                priority: priority++,
                description: 'Fix permission issues',
                steps: [
                    'Ensure deployment runs as SYSTEM or Administrator',
                    'Check file/folder ACLs on target paths',
                    'Verify the installer is not blocked (right-click > Properties > Unblock)',
                    'Check if antivirus is blocking the installation',
                ],
                expectedOutcome: 'Installation completes with proper permissions',
            });
        }
        if (causeDescription.includes('file in use') || causeDescription.includes('blocked')) {
            fixes.push({
                priority: priority++,
                description: 'Close blocking applications',
                steps: [
                    'Use Show-ADTInstallationWelcome -CloseApps to close apps',
                    'Add application processes to CloseApps list',
                    'Consider using -BlockExecution parameter',
                ],
                codeSnippet: "Show-ADTInstallationWelcome -CloseApps 'app1,app2' -CloseAppsCountdown 60",
                expectedOutcome: 'Applications closed before installation',
            });
        }
        if (causeDescription.includes('silent') || causeDescription.includes('user prompt')) {
            fixes.push({
                priority: priority++,
                description: 'Fix silent installation',
                steps: [
                    'Verify silent arguments are correct for installer type',
                    'Use /S, /silent, /quiet, or /qn depending on installer',
                    'Check if installer requires additional parameters',
                    'Test silent args manually: setup.exe /S',
                ],
                codeSnippet: `# MSI: /qn /norestart
# NSIS/Nullsoft: /S
# Inno Setup: /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
# InstallShield: /s /v"/qn"`,
                expectedOutcome: 'Installation runs silently without prompts',
            });
        }
        if (causeDescription.includes('detection')) {
            fixes.push({
                priority: priority++,
                description: 'Fix detection rule',
                steps: [
                    'Verify detection method matches installed files/registry',
                    'For MSI, use product code detection',
                    'For EXE, check file version at installed path',
                    'Test detection script manually on a machine with app installed',
                ],
                expectedOutcome: 'Detection correctly identifies installed application',
            });
        }
        if (causeDescription.includes('already installed') || causeDescription.includes('downgrade')) {
            fixes.push({
                priority: priority++,
                description: 'Handle existing installation',
                steps: [
                    'Check if newer version is installed',
                    'Use Remove-ADTInstalledApplication to uninstall first',
                    'Update detection to handle version comparison',
                ],
                codeSnippet: `# Uninstall existing version first
Remove-ADTInstalledApplication -Name 'Application Name'`,
                expectedOutcome: 'Cleanly upgrades or reinstalls application',
            });
        }
        if (causeDescription.includes('disk space')) {
            fixes.push({
                priority: priority++,
                description: 'Handle disk space requirements',
                steps: [
                    'Add disk space check before installation',
                    'Clean up temporary files if needed',
                    'Specify minimum space in Show-ADTInstallationWelcome',
                ],
                codeSnippet: `Show-ADTInstallationWelcome -CheckDiskSpace -RequiredDiskSpace 500`,
                expectedOutcome: 'Installation fails gracefully if space is insufficient',
            });
        }
    }
    // Add generic troubleshooting steps if no specific fixes
    if (fixes.length === 0) {
        fixes.push({
            priority: 1,
            description: 'Enable detailed logging',
            steps: [
                'Enable PSADT logging in Deploy-Application.ps1',
                'For MSI, add /l*v to get verbose logs',
                'Review logs after failed installation',
                'Check %TEMP% for installation logs',
            ],
            expectedOutcome: 'Detailed logs help identify the root cause',
        });
        fixes.push({
            priority: 2,
            description: 'Test manually',
            steps: [
                'Run the installer manually with silent arguments',
                'Check if installer works in interactive mode',
                'Verify installer file is not corrupted',
                'Test on a clean VM if possible',
            ],
            expectedOutcome: 'Manual testing reveals installation issues',
        });
    }
    return fixes;
}
/**
 * Get relevant resources for troubleshooting
 */
function getRelevantResources(causes, exitCodeInfo) {
    const resources = [];
    // Always include exit codes reference
    resources.push({
        title: 'Installer Exit Codes Reference',
        uri: 'ref://exit-codes',
        description: 'Complete guide to MSI, PSADT, and installer exit codes',
    });
    // Add relevant PSADT docs
    resources.push({
        title: 'PSADT Best Practices',
        uri: 'psadt://docs/best-practices',
        description: 'Recommended patterns for deployment scripts',
    });
    // Add detection patterns if detection mentioned
    const mentionsDetection = causes.some(c => c.description.toLowerCase().includes('detection'));
    if (mentionsDetection) {
        resources.push({
            title: 'Detection Patterns',
            uri: 'kb://patterns/detection',
            description: 'Intune detection rule patterns and examples',
        });
    }
    // Add installer-specific docs
    if (exitCodeInfo) {
        const type = exitCodeInfo.installerType;
        if (type === 'msi') {
            resources.push({
                title: 'MSI Packaging Guide',
                uri: 'kb://installers/msi',
                description: 'Guide for MSI installer packaging',
            });
        }
        else if (type === 'inno' || type === 'nullsoft') {
            resources.push({
                title: 'EXE Packaging Guide',
                uri: 'kb://installers/exe',
                description: 'Guide for EXE installer types',
            });
        }
    }
    return resources;
}
/**
 * Execute the troubleshoot workflow
 */
export async function executeTroubleshootWorkflow(args) {
    logger.info('Starting troubleshoot workflow', { args });
    const result = {
        status: 'error',
        message: '',
        causes: [],
        fixes: [],
        resources: [],
    };
    // Check if we have any input
    if (!args.errorCode && !args.logFile && !args.errorMessage && !args.issueDescription) {
        result.message = 'Please provide at least one of: error code, log file path, error message, or issue description';
        result.errors = ['No troubleshooting input provided'];
        return result;
    }
    // Look up exit code if provided
    if (args.errorCode !== undefined) {
        result.exitCodeInfo = lookupExitCode(args.errorCode, args.installerType);
        if (!result.exitCodeInfo) {
            result.warnings = [`Exit code ${args.errorCode} not found in database. It may be application-specific.`];
        }
    }
    // Analyze log file if provided
    if (args.logFile) {
        result.logAnalysis = analyzeLogFile(args.logFile);
        if (!result.logAnalysis) {
            result.warnings = result.warnings || [];
            result.warnings.push(`Could not read log file: ${args.logFile}`);
        }
    }
    // Identify causes
    result.causes = identifyCauses(args, result.exitCodeInfo, result.logAnalysis);
    // Generate fixes
    result.fixes = generateFixes(result.causes, result.exitCodeInfo, result.logAnalysis);
    // Get relevant resources
    result.resources = getRelevantResources(result.causes, result.exitCodeInfo);
    // Set status and message
    if (result.causes.length > 0 || result.fixes.length > 0) {
        result.status = 'success';
        const highLikelihoodCauses = result.causes.filter(c => c.likelihood === 'high');
        if (highLikelihoodCauses.length > 0) {
            result.message = `Identified ${highLikelihoodCauses.length} likely cause(s) with ${result.fixes.length} suggested fix(es)`;
        }
        else {
            result.message = `Found ${result.causes.length} potential cause(s) and ${result.fixes.length} suggested fix(es)`;
        }
    }
    else {
        result.status = 'partial';
        result.message = 'Could not identify specific causes. Review the troubleshooting resources for guidance.';
    }
    logger.info('Troubleshoot workflow completed', { status: result.status });
    return result;
}
/**
 * Format workflow result as user-friendly text
 */
export function formatTroubleshootResult(result) {
    const lines = [];
    // Header
    lines.push(`## Troubleshooting Analysis`);
    lines.push('');
    lines.push(result.message);
    lines.push('');
    // Exit code info
    if (result.exitCodeInfo) {
        lines.push('### Exit Code Information');
        lines.push(`- **Code**: ${result.exitCodeInfo.code}`);
        lines.push(`- **Name**: ${result.exitCodeInfo.name}`);
        lines.push(`- **Description**: ${result.exitCodeInfo.description}`);
        lines.push(`- **Installer Type**: ${result.exitCodeInfo.installerType}`);
        if (result.exitCodeInfo.resolution) {
            lines.push(`- **Resolution**: ${result.exitCodeInfo.resolution}`);
        }
        lines.push('');
    }
    // Log analysis
    if (result.logAnalysis) {
        lines.push('### Log File Analysis');
        lines.push(result.logAnalysis.summary);
        if (result.logAnalysis.errorEntries.length > 0) {
            lines.push('');
            lines.push('**Key Error Lines:**');
            result.logAnalysis.errorEntries.slice(0, 5).forEach(entry => {
                lines.push(`- Line ${entry.lineNumber} [${entry.severity.toUpperCase()}]: ${entry.content.substring(0, 100)}...`);
            });
        }
        lines.push('');
    }
    // Identified causes
    if (result.causes.length > 0) {
        lines.push('### Identified Causes');
        result.causes.forEach((cause, index) => {
            lines.push(`${index + 1}. **${cause.description}** (${cause.likelihood} likelihood)`);
            cause.evidence.slice(0, 2).forEach(e => {
                lines.push(`   - ${e}`);
            });
        });
        lines.push('');
    }
    // Suggested fixes
    if (result.fixes.length > 0) {
        lines.push('### Suggested Fixes');
        result.fixes.forEach(fix => {
            lines.push(`**${fix.priority}. ${fix.description}**`);
            lines.push('');
            fix.steps.forEach((step, i) => {
                lines.push(`   ${i + 1}. ${step}`);
            });
            if (fix.codeSnippet) {
                lines.push('');
                lines.push('   ```powershell');
                fix.codeSnippet.split('\n').forEach(line => {
                    lines.push(`   ${line}`);
                });
                lines.push('   ```');
            }
            lines.push(`   *Expected outcome: ${fix.expectedOutcome}*`);
            lines.push('');
        });
    }
    // Resources
    if (result.resources.length > 0) {
        lines.push('### Additional Resources');
        result.resources.forEach(resource => {
            lines.push(`- **${resource.title}** (\`${resource.uri}\`): ${resource.description}`);
        });
        lines.push('');
    }
    // Warnings
    if (result.warnings && result.warnings.length > 0) {
        lines.push('### Warnings');
        result.warnings.forEach(w => lines.push(`- ${w}`));
        lines.push('');
    }
    return lines.join('\n');
}
//# sourceMappingURL=troubleshoot.js.map