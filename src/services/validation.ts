// Validation service for PSADT package validation

import { getLogger } from '../utils/logger.js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import type {
  ValidationRule,
  ValidationMatch,
  ValidationIssue,
  PassedCheck,
  ValidationResult,
  ValidatePackageInput,
  ValidatePackageOutput,
  ValidationSeverity,
  ValidationCategory,
  ValidationLevel,
  TargetEnvironment,
  VerifyPsadtFunctionsInput,
  VerifyPsadtFunctionsOutput,
  VerifyPsadtFunctionsResult,
  InvalidFunctionEntry,
  ParameterIssueEntry,
  VerificationSummary,
} from '../types/validation.js';

// Load PSADT function reference data
interface PsadtFunctionReference {
  validFunctions: string[];
  incorrectFunctionMappings: Record<string, { correctFunction: string; reason: string }>;
  parameterCorrections: Record<string, Record<string, { correctParam: string; reason: string }>>;
}

let psadtFunctionReference: PsadtFunctionReference | null = null;

function loadPsadtFunctionReference(): PsadtFunctionReference {
  if (psadtFunctionReference) {
    return psadtFunctionReference;
  }

  const currentFilePath = fileURLToPath(import.meta.url);
  const projectRoot = join(dirname(currentFilePath), '..');
  const refPath = join(projectRoot, 'knowledge', 'reference', 'psadt-functions.json');

  try {
    const content = readFileSync(refPath, 'utf-8');
    psadtFunctionReference = JSON.parse(content) as PsadtFunctionReference;
    return psadtFunctionReference;
  } catch (error) {
    // Fallback to minimal inline reference
    psadtFunctionReference = {
      validFunctions: [
        'Open-ADTSession', 'Close-ADTSession', 'Get-ADTSession', 'Get-ADTConfig',
        'Show-ADTInstallationWelcome', 'Show-ADTInstallationProgress', 'Close-ADTInstallationProgress',
        'Show-ADTInstallationPrompt', 'Show-ADTInstallationRestartPrompt',
        'Start-ADTProcess', 'Start-ADTProcessAsUser', 'Start-ADTMsiProcess',
        'Get-ADTApplication', 'Uninstall-ADTApplication',
        'Write-ADTLogEntry', 'Copy-ADTFile', 'Remove-ADTFile',
        'Install-ADTDeployment', 'Uninstall-ADTDeployment', 'Repair-ADTDeployment',
      ],
      incorrectFunctionMappings: {
        'Initialize-ADTDeployment': { correctFunction: 'Open-ADTSession', reason: 'Function does not exist in PSADT v4.' },
        'Complete-ADTDeployment': { correctFunction: 'Close-ADTSession', reason: 'Function does not exist in PSADT v4.' },
        'Get-ADTInstalledApplication': { correctFunction: 'Get-ADTApplication', reason: 'Function does not exist in PSADT v4.' },
      },
      parameterCorrections: {
        'Start-ADTProcess': {
          '-Arguments': { correctParam: '-ArgumentList', reason: 'Parameter does not exist.' },
          '-Path': { correctParam: '-FilePath', reason: 'Parameter does not exist.' },
        },
      },
    };
    return psadtFunctionReference;
  }
}

const logger = getLogger().child({ service: 'validation' });

// Score penalties by severity
const SCORE_PENALTIES: Record<ValidationSeverity, number> = {
  error: 10,
  warning: 3,
  info: 1,
};

// Which severities apply at each level
const LEVEL_SEVERITIES: Record<ValidationLevel, ValidationSeverity[]> = {
  basic: ['error'],
  standard: ['error', 'warning'],
  strict: ['error', 'warning', 'info'],
};

/**
 * All validation rules organized by category
 */
const VALIDATION_RULES: ValidationRule[] = [
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
    check: (script: string, _lines: string[]): ValidationMatch[] => {
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
    check: (script: string, _lines: string[]): ValidationMatch[] => {
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
    check: (script: string, _lines: string[]): ValidationMatch[] => {
      const issues: ValidationMatch[] = [];
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
    check: (script: string, lines: string[]): ValidationMatch[] => {
      // Check for either Import-Module PSAppDeployToolkit or using namespace
      const hasImport =
        /Import-Module.*PSAppDeployToolkit/i.test(script) ||
        /using\s+module\s+PSAppDeployToolkit/i.test(script) ||
        /using\s+namespace\s+PSADT/i.test(script);
      if (!hasImport) {
        return [{ context: 'PSAppDeployToolkit module not imported' }];
      }
      return [];
    },
  },
  {
    id: 'open-session-called',
    name: 'Open-ADTSession Called',
    description: 'Must call Open-ADTSession to initialize PSADT v4 workflow',
    severity: 'error',
    category: 'psadt',
    minLevel: 'basic',
    suggestion: 'Add: Open-ADTSession at the start of your deployment logic',
    check: (script: string, lines: string[]): ValidationMatch[] => {
      if (!/Open-ADTSession/i.test(script)) {
        // Check for legacy incorrect function name
        if (/Initialize-ADTDeployment/i.test(script)) {
          return [{ context: 'Initialize-ADTDeployment is not a valid PSADT v4 function. Use Open-ADTSession instead.' }];
        }
        return [{ context: 'Open-ADTSession not called' }];
      }
      return [];
    },
  },
  {
    id: 'close-session-called',
    name: 'Close-ADTSession Called',
    description: 'Must call Close-ADTSession to finalize PSADT v4 workflow',
    severity: 'error',
    category: 'psadt',
    minLevel: 'basic',
    suggestion: 'Add: Close-ADTSession at the end of your deployment logic',
    check: (script: string, lines: string[]): ValidationMatch[] => {
      if (!/Close-ADTSession/i.test(script)) {
        // Check for legacy incorrect function name
        if (/Complete-ADTDeployment/i.test(script)) {
          return [{ context: 'Complete-ADTDeployment is not a valid PSADT v4 function. Use Close-ADTSession instead.' }];
        }
        return [{ context: 'Close-ADTSession not called' }];
      }
      return [];
    },
  },
  {
    id: 'uses-adt-prefix',
    name: 'Uses ADT-Prefixed Functions',
    description: 'PSADT v4 functions must use ADT prefix (e.g., Show-ADTInstallationWelcome)',
    severity: 'warning',
    category: 'psadt',
    minLevel: 'standard',
    suggestion: 'Use the correct ADT-prefixed function name',
    check: (script: string, lines: string[]): ValidationMatch[] => {
      const issues: ValidationMatch[] = [];
      // Incorrect function names and their correct ADT-prefixed equivalents
      const incorrectPatterns = [
        { incorrect: /\bShow-InstallationWelcome\b/gi, correct: 'Show-ADTInstallationWelcome' },
        { incorrect: /\bShow-InstallationProgress\b/gi, correct: 'Show-ADTInstallationProgress' },
        { incorrect: /\bShow-InstallationPrompt\b/gi, correct: 'Show-ADTInstallationPrompt' },
        { incorrect: /\bExecute-Process\b/gi, correct: 'Start-ADTProcess' },
        { incorrect: /\bExecute-MSI\b/gi, correct: 'Start-ADTMsiProcess' },
        { incorrect: /\bRemove-MSIApplications\b/gi, correct: 'Remove-ADTApplication' },
        { incorrect: /\bGet-InstalledApplication\b/gi, correct: 'Get-ADTApplication' },
        { incorrect: /\bGet-ADTInstalledApplication\b/gi, correct: 'Get-ADTApplication' },
        { incorrect: /\bInitialize-ADTDeployment\b/gi, correct: 'Open-ADTSession' },
        { incorrect: /\bComplete-ADTDeployment\b/gi, correct: 'Close-ADTSession' },
        { incorrect: /\bClose-InstallationProgress\b/gi, correct: 'Close-ADTInstallationProgress' },
      ];

      for (const { incorrect, correct } of incorrectPatterns) {
        let match: RegExpExecArray | null;
        incorrect.lastIndex = 0;
        while ((match = incorrect.exec(script)) !== null) {
          const lineNumber = getLineNumber(script, match.index);
          issues.push({
            lineNumber,
            lineContent: lines[lineNumber - 1]?.trim(),
            context: `Incorrect function "${match[0]}" found. Use "${correct}" instead.`,
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
    suggestion: 'Use Close-ADTSession with -ExitCode parameter to report non-zero status',
    check: (script: string, lines: string[]): ValidationMatch[] => {
      // Check if Close-ADTSession is called (exit code 0 is implicit)
      if (/Close-ADTSession/i.test(script)) {
        // This is valid - exit code 0 is default
        return [];
      }
      return [];
    },
  },
  {
    id: 'start-adtprocess-argumentlist',
    name: 'Start-ADTProcess Uses ArgumentList',
    description: 'Start-ADTProcess uses -ArgumentList parameter, not -Arguments',
    severity: 'error',
    category: 'psadt',
    minLevel: 'basic',
    suggestion: 'Change -Arguments to -ArgumentList for Start-ADTProcess',
    check: (script: string, lines: string[]): ValidationMatch[] => {
      const issues: ValidationMatch[] = [];
      // Match Start-ADTProcess followed by -Arguments (incorrect parameter name)
      const incorrectPattern = /Start-ADTProcess\s+[^|;\n]*-Arguments\b/gi;

      let match: RegExpExecArray | null;
      while ((match = incorrectPattern.exec(script)) !== null) {
        const lineNumber = getLineNumber(script, match.index);
        issues.push({
          lineNumber,
          lineContent: lines[lineNumber - 1]?.trim(),
          context: 'Start-ADTProcess uses -ArgumentList, not -Arguments. This parameter name does not exist.',
        });
      }
      return issues;
    },
  },
  {
    id: 'adt-session-usage',
    name: 'adtSession Object Usage',
    description: 'PSADT v4 uses $adtSession hashtable for session configuration',
    severity: 'info',
    category: 'psadt',
    minLevel: 'strict',
    suggestion: 'Use $adtSession hashtable for session configuration and accessing deployment state',
    check: (script: string, _lines: string[]): ValidationMatch[] => {
      // Only flag if PSADT functions are used but $adtSession is not
      const usesPsadt = /Open-ADTSession/i.test(script);
      const usesAdtSession = /\$adtSession/i.test(script);
      if (usesPsadt && !usesAdtSession) {
        return [{ context: '$adtSession hashtable not used for session configuration' }];
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
    check: (script: string, _lines: string[]): ValidationMatch[] => {
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
    check: (script: string, _lines: string[]): ValidationMatch[] => {
      // Check for deployment mode handling
      const hasDeployModeCheck = /\$deployMode|\$adtSession\.DeployMode|DeployMode/i.test(script);
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
    check: (script: string, lines: string[]): ValidationMatch[] => {
      const issues: ValidationMatch[] = [];
      // Look for potentially blocking prompts without mode checks
      const promptPatterns = [
        /Read-Host/gi,
        /\$host\.UI\.PromptForChoice/gi,
        /\[System\.Windows\.Forms\.MessageBox\]/gi,
      ];

      for (const pattern of promptPatterns) {
        let match: RegExpExecArray | null;
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
    check: (script: string, _lines: string[]): ValidationMatch[] => {
      const hasExitStatement = /\bexit\s+\d+|\bexit\s+\$|Close-ADTSession/i.test(script);
      if (!hasExitStatement) {
        return [{ context: 'No explicit exit code found. Use "exit 0" or Close-ADTSession' }];
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
    check: (script: string, lines: string[]): ValidationMatch[] => {
      const issues: ValidationMatch[] = [];
      const hardcodedPathPattern = /C:\\Users\\[^\\$\s]+\\/gi;

      let match: RegExpExecArray | null;
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
    check: (script: string, lines: string[]): ValidationMatch[] => {
      const issues: ValidationMatch[] = [];
      const credentialPatterns = [
        { pattern: /password\s*=\s*["'][^"']+["']/gi, type: 'password' },
        { pattern: /apikey\s*=\s*["'][^"']+["']/gi, type: 'API key' },
        { pattern: /api_key\s*=\s*["'][^"']+["']/gi, type: 'API key' },
        { pattern: /secret\s*=\s*["'][^"']+["']/gi, type: 'secret' },
        { pattern: /token\s*=\s*["'][A-Za-z0-9+/=]{20,}["']/gi, type: 'token' },
        { pattern: /ConvertTo-SecureString\s+["'][^"']+["']\s+-AsPlainText/gi, type: 'plaintext secure string' },
      ];

      for (const { pattern, type } of credentialPatterns) {
        let match: RegExpExecArray | null;
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
    check: (script: string, lines: string[]): ValidationMatch[] => {
      const issues: ValidationMatch[] = [];
      const unsafePattern = /\bInvoke-Expression\b|\biex\b/gi;

      let match: RegExpExecArray | null;
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
    check: (script: string, lines: string[]): ValidationMatch[] => {
      const issues: ValidationMatch[] = [];
      const remoteExecPatterns = [
        /\(New-Object.*WebClient\)\.DownloadString/gi,
        /Invoke-WebRequest.*\|\s*Invoke-Expression/gi,
        /Invoke-RestMethod.*\|\s*iex/gi,
        /\(iwr.*\)\.Content\s*\|\s*iex/gi,
      ];

      for (const pattern of remoteExecPatterns) {
        let match: RegExpExecArray | null;
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
    check: (script: string, _lines: string[]): ValidationMatch[] => {
      const hasLogging =
        /Write-ADTLogEntry/i.test(script) ||
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
    check: (script: string, lines: string[]): ValidationMatch[] => {
      const issues: ValidationMatch[] = [];
      // Find catch blocks and check if they have error handling
      const catchPattern = /catch\s*\{([^}]*)\}/gi;

      let match: RegExpExecArray | null;
      while ((match = catchPattern.exec(script)) !== null) {
        const catchContent = match[1] ?? '';
        const hasErrorHandling =
          /Write-|throw|\$_|\$Error|\$PSItem/i.test(catchContent);
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
    check: (script: string, _lines: string[]): ValidationMatch[] => {
      const hasInfoBlock =
        /\.SYNOPSIS|\.DESCRIPTION|\.NOTES|<#.*#>/is.test(script) ||
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
    check: (script: string, _lines: string[]): ValidationMatch[] => {
      const issues: ValidationMatch[] = [];
      // Find double-quoted strings without variables
      const doubleQuotePattern = /"([^"$`\\]*)"/g;

      let match: RegExpExecArray | null;
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
function getLineNumber(script: string, index: number): number {
  return script.substring(0, index).split('\n').length;
}

/**
 * Validation service class
 */
class ValidationService {
  /**
   * Verify PSADT function names in a script file
   */
  async verifyPsadtFunctions(input: VerifyPsadtFunctionsInput): Promise<VerifyPsadtFunctionsOutput> {
    const startTime = Date.now();
    const { filePath } = input;

    logger.debug('Starting PSADT function verification', { filePath });

    // Check if file exists
    if (!existsSync(filePath)) {
      logger.warn('File not found for verification', { filePath });
      return {
        success: false,
        error: `File not found: ${filePath}`,
      };
    }

    // Read file content
    let script: string;
    try {
      script = readFileSync(filePath, 'utf-8');
    } catch (error) {
      logger.error('Failed to read file', { filePath, error });
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    const lines = script.split('\n');
    const ref = loadPsadtFunctionReference();

    // Build case-insensitive lookup sets
    const validFunctionsLower = new Set(ref.validFunctions.map(f => f.toLowerCase()));
    const incorrectMappingsLower = new Map<string, { correctFunction: string; reason: string }>();
    for (const [key, value] of Object.entries(ref.incorrectFunctionMappings)) {
      incorrectMappingsLower.set(key.toLowerCase(), value);
    }

    // Track found functions
    const invalidFunctions: InvalidFunctionEntry[] = [];
    const parameterIssues: ParameterIssueEntry[] = [];
    const validFunctionsFound = new Set<string>();
    let totalAdtFunctionsFound = 0;

    // Regex to find ADT function calls (Verb-ADT... or ADT-related v3 functions)
    // Matches functions like: Show-ADTInstallationWelcome, Initialize-ADTDeployment, etc.
    const functionPattern = /\b([A-Za-z]+-ADT[A-Za-z]+|Show-Installation\w+|Execute-\w+|Get-InstalledApplication|Remove-MSIApplications|Write-Log|Copy-File|Remove-File|New-Folder|Remove-Folder|Set-RegistryKey|Get-RegistryKey|Remove-RegistryKey|New-Shortcut|Block-AppExecution|Unblock-AppExecution|Get-PendingReboot|Get-LoggedOnUser|Get-FreeDiskSpace|Set-ActiveSetup)\b/gi;

    let match: RegExpExecArray | null;
    while ((match = functionPattern.exec(script)) !== null) {
      const functionName = match[1] ?? '';
      if (!functionName) continue;

      const functionNameLower = functionName.toLowerCase();
      const lineNumber = getLineNumber(script, match.index);
      const lineContent = lines[lineNumber - 1]?.trim() || '';

      totalAdtFunctionsFound++;

      // Check if it's a known incorrect function
      const incorrectMapping = incorrectMappingsLower.get(functionNameLower);
      if (incorrectMapping) {
        invalidFunctions.push({
          functionName,
          lineNumber,
          lineContent,
          suggestedReplacement: incorrectMapping.correctFunction,
          reason: incorrectMapping.reason,
        });
        continue;
      }

      // Check if it's a valid function
      if (validFunctionsLower.has(functionNameLower)) {
        // Find the proper-cased version
        const properCase = ref.validFunctions.find(f => f.toLowerCase() === functionNameLower) ?? functionName;
        validFunctionsFound.add(properCase);
      } else {
        // Unknown ADT function - might be a hallucination or typo
        invalidFunctions.push({
          functionName,
          lineNumber,
          lineContent,
          reason: `Function "${functionName}" is not a valid PSADT v4.1.8 function. Check spelling or consult PSADT documentation.`,
        });
      }
    }

    // Check for parameter issues on specific functions
    for (const [funcName, paramMap] of Object.entries(ref.parameterCorrections)) {
      const funcPattern = new RegExp(`\\b${funcName}\\b[^|;\\n]*`, 'gi');
      let funcMatch: RegExpExecArray | null;

      while ((funcMatch = funcPattern.exec(script)) !== null) {
        const callText = funcMatch[0];
        const lineNumber = getLineNumber(script, funcMatch.index);
        const lineContent = lines[lineNumber - 1]?.trim() || '';

        for (const [incorrectParam, correction] of Object.entries(paramMap)) {
          // Create pattern that matches the incorrect parameter
          const paramRegex = new RegExp(`${incorrectParam}\\b`, 'i');
          if (paramRegex.test(callText)) {
            parameterIssues.push({
              functionName: funcName,
              incorrectParam,
              correctParam: correction.correctParam,
              lineNumber,
              lineContent,
              reason: correction.reason,
            });
          }
        }
      }
    }

    const isValid = invalidFunctions.length === 0 && parameterIssues.length === 0;

    const summary: VerificationSummary = {
      totalAdtFunctionsFound,
      validFunctions: Array.from(validFunctionsFound).sort(),
      invalidFunctionsCount: invalidFunctions.length,
      parameterIssuesCount: parameterIssues.length,
    };

    const result: VerifyPsadtFunctionsResult = {
      isValid,
      filePath,
      summary,
      invalidFunctions,
      parameterIssues,
    };

    logger.info('PSADT function verification completed', {
      isValid,
      totalFunctions: totalAdtFunctionsFound,
      validCount: validFunctionsFound.size,
      invalidCount: invalidFunctions.length,
      parameterIssues: parameterIssues.length,
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      result,
    };
  }

  /**
   * Validate a PSADT script
   */
  async validatePackage(input: ValidatePackageInput): Promise<ValidatePackageOutput> {
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

    const issues: ValidationIssue[] = [];
    const passedChecks: PassedCheck[] = [];

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
        } else {
          // Rule passed
          passedChecks.push({
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            description: rule.description,
          });
        }
      } catch (error) {
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
    let summary: string;
    if (issues.length === 0) {
      summary = 'Validation passed with no issues found.';
    } else if (isValid) {
      summary = `Validation passed with ${warningCount} warning(s) and ${infoCount} info message(s).`;
    } else {
      summary = `Validation failed with ${errorCount} error(s), ${warningCount} warning(s), and ${infoCount} info message(s).`;
    }

    const result: ValidationResult = {
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
let validationServiceInstance: ValidationService | null = null;

/**
 * Get the validation service instance
 */
export function getValidationService(): ValidationService {
  if (!validationServiceInstance) {
    validationServiceInstance = new ValidationService();
  }
  return validationServiceInstance;
}

/**
 * Reset the validation service (for testing)
 */
export function resetValidationService(): void {
  validationServiceInstance = null;
}

export { ValidationService };
